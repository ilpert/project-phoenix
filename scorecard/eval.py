#!/usr/bin/env python3
"""
The Scorecard — eval harness for LLM-driven refactoring of spring-music.

Checks whether Claude proposes the right extraction boundaries, whether
behavior is preserved after refactoring, and measures false-confidence rate.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python scorecard/eval.py
    python scorecard/eval.py --output-dir scorecard/results/
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

import anthropic

# ---------------------------------------------------------------------------
# Golden set
# ---------------------------------------------------------------------------

GOLDEN_SET = [
    {
        "id": "album-crud-correct",
        "label": "correct_seam",
        "seam": "album-crud",
        "proposal": (
            "Extract AlbumController + all repository implementations as a standalone "
            "album-catalog service with clean REST API. The Album entity becomes an "
            "AlbumResponse DTO dropping the albumId field and converting releaseYear "
            "to integer."
        ),
        "reasoning": (
            "Clean HTTP boundary, no shared state, albumId is dead field, "
            "type correction is straightforward."
        ),
    },
    {
        "id": "album-crud-wrong-boundary",
        "label": "incorrect_seam",
        "seam": "album-crud",
        "proposal": (
            "Extract only AlbumController but keep the JpaAlbumRepository in the "
            "monolith, sharing the database between old and new service."
        ),
        "reasoning": (
            "Shared database creates tight coupling and prevents independent deployment."
        ),
    },
    {
        "id": "health-info-correct",
        "label": "correct_seam",
        "seam": "health-info",
        "proposal": (
            "Replace InfoController with Spring Actuator's /actuator/info endpoint. "
            "Remove CfEnv dependency. Expose environment info via standard Spring Boot "
            "properties."
        ),
        "reasoning": (
            "InfoController is purely infrastructure concern, no business logic, "
            "direct replacement by Actuator."
        ),
    },
    {
        "id": "health-info-wrong",
        "label": "incorrect_seam",
        "seam": "health-info",
        "proposal": (
            "Extract InfoController as a separate microservice that calls back to the "
            "monolith to get its data."
        ),
        "reasoning": (
            "Creates circular dependency — the info service would depend on the "
            "monolith it's extracted from."
        ),
    },
    {
        "id": "db-profile-defer",
        "label": "correct_seam",
        "seam": "database-profile-switch",
        "proposal": (
            "Defer extraction of SpringApplicationContextInitializer. Wrap CfEnv "
            "behind an interface but don't extract yet."
        ),
        "reasoning": (
            "High risk: coupled to Cloud Foundry runtime, profile switching is "
            "cross-cutting, no tests. Extract after other seams stabilize."
        ),
    },
    {
        "id": "db-profile-extract-now",
        "label": "incorrect_seam",
        "seam": "database-profile-switch",
        "proposal": (
            "Extract SpringApplicationContextInitializer as a standalone "
            "configuration service."
        ),
        "reasoning": (
            "High coupling to CF runtime, no tests, cross-cutting concern — "
            "premature extraction."
        ),
    },
]

# The model spec says we want speed for the eval harness.
EVAL_MODEL = "claude-haiku-4-5-20251001"

# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are an expert software architect specializing in microservice extraction
and the strangler fig pattern. You are evaluating whether a proposed code
extraction from a Spring Boot monolith (spring-music) is architecturally sound.

The monolith contains:
- AlbumController: REST CRUD for albums at /albums
- Album entity: id (String UUID), title, artist, releaseYear (String), genre,
  trackCount, albumId (legacy dead field, always null)
- JpaAlbumRepository, RedisAlbumRepository, MongoAlbumRepository — three
  store implementations selected by Spring profile
- InfoController: reads CfEnv (Cloud Foundry env vars) + active profiles
- SpringApplicationContextInitializer: sets Spring profile by inspecting
  CF-bound services at boot time — cross-cutting, no unit tests

When evaluating a proposal, respond ONLY with valid JSON matching this schema:
{
  "verdict": "correct_seam" | "incorrect_seam",
  "confidence": <integer 0-100>,
  "rationale": "<one or two sentences>"
}

Do not include any text outside the JSON object.
"""


def build_user_message(item: dict) -> str:
    return (
        f"Seam under review: {item['seam']}\n\n"
        f"Extraction proposal:\n{item['proposal']}\n\n"
        f"Proposer's stated reasoning:\n{item['reasoning']}\n\n"
        "Is this extraction proposal correct or incorrect? "
        "Rate your confidence 0-100."
    )


# ---------------------------------------------------------------------------
# Claude call
# ---------------------------------------------------------------------------

class EvalResult(TypedDict):
    id: str
    seam: str
    golden_label: str
    claude_verdict: str
    confidence: int
    rationale: str
    is_correct: bool
    raw_response: str
    error: str | None


def call_claude(client: anthropic.Anthropic, item: dict, retry: int = 2) -> EvalResult:
    """Call Claude and return a structured eval result."""
    user_msg = build_user_message(item)

    for attempt in range(retry + 1):
        try:
            response = client.messages.create(
                model=EVAL_MODEL,
                max_tokens=256,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = response.content[0].text.strip()

            # Strip markdown fences if the model wraps its JSON
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            parsed = json.loads(raw)
            verdict = parsed["verdict"]
            confidence = int(parsed["confidence"])
            rationale = parsed.get("rationale", "")

            return EvalResult(
                id=item["id"],
                seam=item["seam"],
                golden_label=item["label"],
                claude_verdict=verdict,
                confidence=confidence,
                rationale=rationale,
                is_correct=(verdict == item["label"]),
                raw_response=raw,
                error=None,
            )

        except (json.JSONDecodeError, KeyError, anthropic.APIError) as exc:
            if attempt < retry:
                time.sleep(1.5 * (attempt + 1))
                continue
            return EvalResult(
                id=item["id"],
                seam=item["seam"],
                golden_label=item["label"],
                claude_verdict="error",
                confidence=0,
                rationale="",
                is_correct=False,
                raw_response="",
                error=str(exc),
            )


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def compute_metrics(results: list[EvalResult]) -> dict:
    total = len(results)
    if total == 0:
        return {}

    correct = [r for r in results if r["is_correct"]]
    incorrect = [r for r in results if not r["is_correct"] and r["error"] is None]

    accuracy = len(correct) / total

    # False confidence: wrong answers where model reported confidence > 80
    high_conf_wrong = [r for r in incorrect if r["confidence"] > 80]
    false_confidence_rate = len(high_conf_wrong) / total

    avg_conf_correct = (
        sum(r["confidence"] for r in correct) / len(correct) if correct else 0.0
    )
    avg_conf_incorrect = (
        sum(r["confidence"] for r in incorrect) / len(incorrect) if incorrect else 0.0
    )

    return {
        "total_items": total,
        "correct_count": len(correct),
        "incorrect_count": len(incorrect),
        "error_count": len([r for r in results if r["error"]]),
        "accuracy": round(accuracy, 4),
        "false_confidence_rate": round(false_confidence_rate, 4),
        "avg_confidence_correct": round(avg_conf_correct, 2),
        "avg_confidence_incorrect": round(avg_conf_incorrect, 2),
        "high_confidence_wrong": [r["id"] for r in high_conf_wrong],
    }


# ---------------------------------------------------------------------------
# Behavior preservation check
# ---------------------------------------------------------------------------

CHARACTERIZATION_TESTS = [
    {
        "id": "GET /albums returns list",
        "description": "GET /albums returns non-empty JSON array of album objects",
        "acl_rule": "no albumId field in response",
    },
    {
        "id": "PUT /albums creates album",
        "description": "PUT /albums with valid body returns saved album with generated id",
        "acl_rule": "releaseYear must be integer in new service response",
    },
    {
        "id": "POST /albums updates album",
        "description": "POST /albums with existing id updates and returns the album",
        "acl_rule": "no albumId field in response",
    },
    {
        "id": "GET /albums/{id} returns single album",
        "description": "GET /albums/{id} for known id returns correct album",
        "acl_rule": "releaseYear must be integer in new service response",
    },
    {
        "id": "DELETE /albums/{id} removes album",
        "description": "DELETE /albums/{id} returns 200 and album is gone on subsequent GET",
        "acl_rule": "none",
    },
    {
        "id": "GET /appinfo returns profiles",
        "description": "GET /appinfo returns active Spring profiles array",
        "acl_rule": "replaced by /actuator/info in new service",
    },
    {
        "id": "GET /health returns ok",
        "description": "GET /health (actuator) returns {status: UP}",
        "acl_rule": "none",
    },
]


def load_characterization_results(base_dir: Path) -> dict:
    """
    Attempt to read characterization test results from
    tests/characterization/results.json relative to the project root.
    Returns a summary dict.
    """
    results_path = base_dir / "tests" / "characterization" / "results.json"
    if not results_path.exists():
        return {
            "status": "not_run",
            "message": "tests/characterization not yet run",
            "results_path": str(results_path),
            "tests": [
                {"id": t["id"], "description": t["description"], "result": "PENDING"}
                for t in CHARACTERIZATION_TESTS
            ],
        }

    try:
        with open(results_path) as f:
            raw = json.load(f)
        return {
            "status": "loaded",
            "message": f"Loaded {len(raw)} results from {results_path}",
            "results_path": str(results_path),
            "tests": raw,
        }
    except (json.JSONDecodeError, OSError) as exc:
        return {
            "status": "error",
            "message": f"Failed to parse {results_path}: {exc}",
            "results_path": str(results_path),
            "tests": [],
        }


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def render_markdown(
    results: list[EvalResult],
    metrics: dict,
    behavior_check: dict,
    run_at: str,
    model: str,
) -> str:
    lines = [
        "# The Scorecard — Refactoring Eval Report",
        "",
        f"**Run at:** {run_at}  ",
        f"**Model:** `{model}`  ",
        f"**Golden set size:** {metrics.get('total_items', 0)}",
        "",
        "---",
        "",
        "## Metrics",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Accuracy | {metrics.get('accuracy', 0):.1%} |",
        f"| False-confidence rate | {metrics.get('false_confidence_rate', 0):.1%} |",
        f"| Avg confidence — correct answers | {metrics.get('avg_confidence_correct', 0):.1f} |",
        f"| Avg confidence — incorrect answers | {metrics.get('avg_confidence_incorrect', 0):.1f} |",
        f"| Correct | {metrics.get('correct_count', 0)} / {metrics.get('total_items', 0)} |",
        f"| Errors | {metrics.get('error_count', 0)} |",
        "",
        "### False-confidence cases (wrong answer, confidence > 80)",
        "",
    ]

    hcw = metrics.get("high_confidence_wrong", [])
    if hcw:
        for item_id in hcw:
            lines.append(f"- `{item_id}`")
    else:
        lines.append("_None — model is well-calibrated on this golden set._")

    lines += [
        "",
        "---",
        "",
        "## Per-Item Results",
        "",
        "| ID | Seam | Golden | Claude | Conf | Correct? |",
        "|----|------|--------|--------|------|----------|",
    ]

    for r in results:
        ok = "YES" if r["is_correct"] else "**NO**"
        err_note = f" _(error: {r['error']})_" if r["error"] else ""
        lines.append(
            f"| `{r['id']}` | {r['seam']} | {r['golden_label']} "
            f"| {r['claude_verdict']} | {r['confidence']} | {ok}{err_note} |"
        )

    lines += [
        "",
        "### Rationales",
        "",
    ]
    for r in results:
        lines.append(f"**`{r['id']}`** — {r['rationale'] or '_no rationale_'}")
        lines.append("")

    lines += [
        "---",
        "",
        "## Behavior Preservation Check",
        "",
        f"**Status:** {behavior_check['status']}  ",
        f"**Message:** {behavior_check['message']}",
        "",
        "### Characterization Test Suite",
        "",
        "| Test ID | Description | Result |",
        "|---------|-------------|--------|",
    ]

    for t in behavior_check.get("tests", []):
        result_val = t.get("result", t.get("status", "PENDING"))
        lines.append(f"| {t['id']} | {t.get('description', '')} | {result_val} |")

    lines += [
        "",
        "_Run `./gradlew test` in `spring-music-master/` to populate "
        "`tests/characterization/results.json`._",
        "",
        "---",
        "",
        "## ACL Contract Rules",
        "",
        "The following field-level rules must hold in the new album-catalog service:",
        "",
        "- `albumId` field **must not** appear in any `/albums` response",
        "- `releaseYear` **must** be an integer (not a string) in any `/albums` response",
        "- `id` field is the canonical album identifier (UUID string)",
        "",
        "_A test that fails loudly when these rules are violated lives in "
        "`services/album-catalog/src/test/`._",
    ]

    return "\n".join(lines)


def render_json_report(
    results: list[EvalResult],
    metrics: dict,
    behavior_check: dict,
    run_at: str,
    model: str,
) -> dict:
    return {
        "run_at": run_at,
        "model": model,
        "golden_set_size": len(GOLDEN_SET),
        "metrics": metrics,
        "results": list(results),
        "behavior_preservation": behavior_check,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="The Scorecard: eval harness for LLM-driven refactoring."
    )
    p.add_argument(
        "--output-dir",
        default="scorecard/results",
        help="Directory to write JSON and Markdown reports (default: scorecard/results)",
    )
    p.add_argument(
        "--project-root",
        default=".",
        help="Project root for locating characterization test results",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip Claude API calls; use mock verdicts for testing the harness itself",
    )
    return p.parse_args()


def mock_result(item: dict) -> EvalResult:
    """Return a deterministic mock result — used for --dry-run."""
    # Simulate a near-perfect model that gets one wrong with high confidence
    wrong_id = "health-info-wrong"
    if item["id"] == wrong_id:
        return EvalResult(
            id=item["id"],
            seam=item["seam"],
            golden_label=item["label"],
            claude_verdict="correct_seam",  # intentionally wrong
            confidence=92,
            rationale="Mock: incorrectly classified as correct seam.",
            is_correct=False,
            raw_response='{"verdict":"correct_seam","confidence":92,"rationale":"Mock"}',
            error=None,
        )
    return EvalResult(
        id=item["id"],
        seam=item["seam"],
        golden_label=item["label"],
        claude_verdict=item["label"],
        confidence=85,
        rationale="Mock: correctly classified.",
        is_correct=True,
        raw_response=f'{{"verdict":"{item["label"]}","confidence":85,"rationale":"Mock"}}',
        error=None,
    )


def main() -> int:
    args = parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not args.dry_run:
        print(
            "ERROR: ANTHROPIC_API_KEY environment variable not set.\n"
            "       Set it or use --dry-run to test the harness without API calls.",
            file=sys.stderr,
        )
        return 1

    run_at = datetime.now(timezone.utc).isoformat()
    project_root = Path(args.project_root).resolve()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # ---- Run eval ---------------------------------------------------------
    client = anthropic.Anthropic(api_key=api_key) if not args.dry_run else None

    print(f"The Scorecard — spring-music refactoring eval")
    print(f"Model:       {EVAL_MODEL}")
    print(f"Golden set:  {len(GOLDEN_SET)} items")
    print(f"Dry run:     {args.dry_run}")
    print(f"Run at:      {run_at}")
    print()

    results: list[EvalResult] = []
    for i, item in enumerate(GOLDEN_SET, 1):
        print(f"[{i}/{len(GOLDEN_SET)}] Evaluating {item['id']} ...", end=" ", flush=True)
        if args.dry_run:
            r = mock_result(item)
        else:
            r = call_claude(client, item)
        results.append(r)

        status = "OK" if r["is_correct"] else "WRONG"
        if r["error"]:
            status = f"ERROR: {r['error']}"
        print(f"{status} (conf={r['confidence']})")

    print()

    # ---- Metrics ----------------------------------------------------------
    metrics = compute_metrics(results)

    print("=== Metrics ===")
    print(f"  Accuracy:                 {metrics['accuracy']:.1%}")
    print(f"  False-confidence rate:    {metrics['false_confidence_rate']:.1%}")
    print(f"  Avg confidence correct:   {metrics['avg_confidence_correct']:.1f}")
    print(f"  Avg confidence incorrect: {metrics['avg_confidence_incorrect']:.1f}")
    if metrics["high_confidence_wrong"]:
        print(f"  High-conf wrong items:    {metrics['high_confidence_wrong']}")
    print()

    # ---- Behavior preservation check -------------------------------------
    behavior_check = load_characterization_results(project_root)
    print(f"Behavior preservation: {behavior_check['message']}")
    print()

    # ---- Write reports ---------------------------------------------------
    json_report = render_json_report(results, metrics, behavior_check, run_at, EVAL_MODEL)
    markdown_report = render_markdown(results, metrics, behavior_check, run_at, EVAL_MODEL)

    json_path = output_dir / "scorecard.json"
    md_path = output_dir / "scorecard.md"

    with open(json_path, "w") as f:
        json.dump(json_report, f, indent=2)

    with open(md_path, "w") as f:
        f.write(markdown_report)

    print(f"Reports written to:")
    print(f"  JSON:     {json_path}")
    print(f"  Markdown: {md_path}")

    # Non-zero exit if accuracy < 100% so CI can catch regressions
    if metrics["accuracy"] < 1.0:
        print(f"\nWARNING: accuracy {metrics['accuracy']:.1%} < 100%", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
