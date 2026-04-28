#!/usr/bin/env python3
"""
The Scouts — parallel subagent extraction-risk analyzer for the Strangler Fig modernization
of spring-music-master.

Each scout is an independent Claude API call that scores one candidate seam on:
  - coupling, test_coverage, data_model_tangle, business_criticality (0-10)
  - extraction_risk (LOW / MEDIUM / HIGH)
  - reasoning + recommendation

Results are aggregated, ranked (LOW → MEDIUM → HIGH), written to:
  - scouts_report.md   (human-readable Markdown)
  - scouts_results.json (machine-readable JSON)

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python scouts/run_scouts.py
"""

import asyncio
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from datetime import datetime
from typing import Optional

import anthropic

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL = "claude-haiku-4-5-20251001"
TIMEOUT_SECONDS = 30
MAX_TOKENS = 512
OUTPUT_MD = "scouts/scouts_report.md"
OUTPUT_JSON = "scouts/scouts_results.json"

RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}

# ---------------------------------------------------------------------------
# Seam definitions — each scout receives ONLY its own context
# ---------------------------------------------------------------------------

SEAMS = [
    {
        "name": "album-crud",
        "context": (
            "AlbumController.java: @RestController at /albums. Injects CrudRepository<Album,String> directly. "
            "No service layer. Album entity: id, title, artist, releaseYear(String), genre, trackCount, albumId(dead). "
            "Three repository implementations: JPA, MongoDB, Redis via Spring profiles. 1 test (contextLoads only)."
        ),
    },
    {
        "name": "health-info",
        "context": (
            "InfoController.java: @RestController at /appinfo and /service. Uses CfEnv (CloudFoundry SDK) to list "
            "bound services. ApplicationInfo DTO has activeProfiles[] and serviceNames[]. "
            "Tightly coupled to Cloud Foundry runtime."
        ),
    },
    {
        "name": "error-testing",
        "context": (
            "ErrorController.java: @RestController at /errors. "
            "Endpoints: /kill (System.exit(1)), /fill-heap (OOM loop), /throw (RuntimeException). "
            "No business logic. No tests. Security risk."
        ),
    },
    {
        "name": "frontend-ui",
        "context": (
            "AngularJS 1.2.16 SPA in src/main/resources/static/. app.js, albums.js, info.js. "
            "Calls /albums REST API. Bootstrap 3.1.1. jQuery 2.1.0. No tests. "
            "Being replaced by React 19."
        ),
    },
    {
        "name": "auth-session",
        "context": (
            "No explicit auth/session in current codebase. Spring Security not included. "
            "Actuator endpoints fully exposed with no auth "
            "(management.endpoints.web.exposure.include=* in application.yml)."
        ),
    },
    {
        "name": "database-profile-switch",
        "context": (
            "SpringApplicationContextInitializer.java: Detects Cloud Foundry env, activates Spring profile "
            "(mysql/postgres/mongodb/redis). Validates single-profile constraint. "
            "Throws IllegalStateException on multi-profile. Coupled to CfEnv library. No tests."
        ),
    },
]

# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are an expert software architect specializing in legacy modernization and the Strangler Fig pattern. "
    "You analyze code seams and assess extraction risk with precision. "
    "You always respond with valid, parseable JSON and nothing else."
)


def build_user_prompt(seam_name: str, seam_context: str) -> str:
    return f"""You are analyzing a code seam for extraction risk in a Strangler Fig modernization.

Seam: {seam_name}
Context: {seam_context}

Score this seam on these dimensions (0-10 scale, 10 = worst):
- coupling: How tightly coupled to other monolith components?
- test_coverage: How well tested? (0 = no tests = worst for safety)
- data_model_tangle: How intertwined is the data model?
- business_criticality: How critical to business? (10 = mission critical)

Then give:
- extraction_risk: LOW, MEDIUM, or HIGH
- reasoning: 2-3 sentences explaining the risk rating
- recommendation: extract_now, extract_next, or defer

Respond ONLY with valid JSON matching this schema:
{{
  "seam": "string",
  "coupling": number,
  "test_coverage": number,
  "data_model_tangle": number,
  "business_criticality": number,
  "extraction_risk": "LOW|MEDIUM|HIGH",
  "reasoning": "string",
  "recommendation": "extract_now|extract_next|defer"
}}"""


# ---------------------------------------------------------------------------
# Single scout — one blocking Claude API call (runs in a thread)
# ---------------------------------------------------------------------------

def run_scout(seam: dict) -> dict:
    """
    Calls the Claude API synchronously for a single seam.
    Returns a result dict (always — errors are captured in the dict).
    """
    seam_name = seam["name"]
    seam_context = seam["context"]
    start = time.monotonic()

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": build_user_prompt(seam_name, seam_context)}
            ],
        )

        raw_text = message.content[0].text.strip()

        # Strip markdown fences if the model wrapped the JSON
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            raw_text = "\n".join(
                line for line in lines if not line.startswith("```")
            ).strip()

        result = json.loads(raw_text)

        # Validate required keys
        required = {
            "seam", "coupling", "test_coverage", "data_model_tangle",
            "business_criticality", "extraction_risk", "reasoning", "recommendation",
        }
        missing = required - result.keys()
        if missing:
            raise ValueError(f"Missing keys in response: {missing}")

        # Normalise risk to uppercase
        result["extraction_risk"] = result["extraction_risk"].upper()
        if result["extraction_risk"] not in RISK_ORDER:
            raise ValueError(f"Invalid extraction_risk: {result['extraction_risk']}")

        result["_elapsed_s"] = round(time.monotonic() - start, 2)
        result["_error"] = None
        return result

    except json.JSONDecodeError as exc:
        return _error_result(seam_name, f"JSON parse error: {exc}", start)
    except anthropic.APITimeoutError:
        return _error_result(seam_name, "API timeout", start)
    except anthropic.APIConnectionError as exc:
        return _error_result(seam_name, f"Connection error: {exc}", start)
    except anthropic.APIStatusError as exc:
        return _error_result(seam_name, f"API error {exc.status_code}: {exc.message}", start)
    except Exception as exc:  # noqa: BLE001
        return _error_result(seam_name, f"Unexpected error: {exc}", start)


def _error_result(seam_name: str, error_msg: str, start: float) -> dict:
    return {
        "seam": seam_name,
        "coupling": -1,
        "test_coverage": -1,
        "data_model_tangle": -1,
        "business_criticality": -1,
        "extraction_risk": "UNKNOWN",
        "reasoning": f"Scout failed: {error_msg}",
        "recommendation": "defer",
        "_elapsed_s": round(time.monotonic() - start, 2),
        "_error": error_msg,
    }


# ---------------------------------------------------------------------------
# Parallel orchestration
# ---------------------------------------------------------------------------

async def run_all_scouts(seams: list[dict]) -> list[dict]:
    """Fan out one thread per seam; enforce per-scout timeout."""
    loop = asyncio.get_running_loop()

    with ThreadPoolExecutor(max_workers=len(seams)) as executor:
        futures = [
            loop.run_in_executor(executor, run_scout, seam)
            for seam in seams
        ]

        results = []
        for seam, fut in zip(seams, futures):
            try:
                result = await asyncio.wait_for(fut, timeout=TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                result = _error_result(seam["name"], f"Timed out after {TIMEOUT_SECONDS}s", time.monotonic())
            results.append(result)

    return results


# ---------------------------------------------------------------------------
# Ranking
# ---------------------------------------------------------------------------

def rank_results(results: list[dict]) -> list[dict]:
    """Sort LOW → MEDIUM → HIGH → UNKNOWN; break ties by composite risk score."""

    def sort_key(r: dict):
        risk_rank = RISK_ORDER.get(r["extraction_risk"], 3)
        # Composite score: lower coupling + lower tangle + lower criticality = safer
        scores = [r.get("coupling", 0), r.get("data_model_tangle", 0), r.get("business_criticality", 0)]
        composite = sum(s for s in scores if s >= 0)
        return (risk_rank, composite)

    return sorted(results, key=sort_key)


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

RISK_EMOJI = {"LOW": "GREEN", "MEDIUM": "AMBER", "HIGH": "RED", "UNKNOWN": "GREY"}
RECOMMENDATION_LABEL = {
    "extract_now": "Extract now",
    "extract_next": "Extract next",
    "defer": "Defer",
}


def build_markdown_report(ranked: list[dict], run_ts: str) -> str:
    lines = [
        "# The Scouts — Extraction Risk Report",
        "",
        f"**Generated:** {run_ts}  ",
        f"**Model:** {MODEL}  ",
        f"**Seams analysed:** {len(ranked)}",
        "",
        "---",
        "",
        "## Ranked Seams (lowest risk first)",
        "",
        "| Rank | Seam | Risk | Coupling | Tests | Data Tangle | Criticality | Recommendation |",
        "|------|------|------|----------|-------|-------------|-------------|----------------|",
    ]

    for i, r in enumerate(ranked, 1):
        risk = r["extraction_risk"]
        flag = RISK_EMOJI.get(risk, "?")
        rec = RECOMMENDATION_LABEL.get(r["recommendation"], r["recommendation"])
        coupling = r["coupling"] if r["coupling"] >= 0 else "N/A"
        tests = r["test_coverage"] if r["test_coverage"] >= 0 else "N/A"
        tangle = r["data_model_tangle"] if r["data_model_tangle"] >= 0 else "N/A"
        crit = r["business_criticality"] if r["business_criticality"] >= 0 else "N/A"
        lines.append(
            f"| {i} | `{r['seam']}` | {flag} {risk} | {coupling}/10 | {tests}/10 | {tangle}/10 | {crit}/10 | {rec} |"
        )

    lines += ["", "---", "", "## Detailed Findings", ""]

    for r in ranked:
        risk = r["extraction_risk"]
        lines += [
            f"### `{r['seam']}` — {RISK_EMOJI.get(risk, '?')} {risk}",
            "",
            f"**Recommendation:** {RECOMMENDATION_LABEL.get(r['recommendation'], r['recommendation'])}  ",
            f"**Scout elapsed:** {r.get('_elapsed_s', '?')}s",
            "",
            "| Dimension | Score |",
            "|-----------|-------|",
            f"| Coupling | {r['coupling']}/10 |",
            f"| Test coverage | {r['test_coverage']}/10 |",
            f"| Data model tangle | {r['data_model_tangle']}/10 |",
            f"| Business criticality | {r['business_criticality']}/10 |",
            "",
            f"> {r['reasoning']}",
            "",
        ]
        if r.get("_error"):
            lines.append(f"**Error:** {r['_error']}")
            lines.append("")

    lines += [
        "---",
        "",
        "*Generated by The Scouts — parallel subagent extraction-risk analyzer*",
        "",
    ]

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable is not set.", file=sys.stderr)
        return 1

    print(f"The Scouts launching {len(SEAMS)} parallel scouts against model {MODEL} ...")
    print(f"Timeout per scout: {TIMEOUT_SECONDS}s\n")

    run_ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    t0 = time.monotonic()

    results = asyncio.run(run_all_scouts(SEAMS))
    ranked = rank_results(results)

    elapsed_total = round(time.monotonic() - t0, 2)

    # Print summary to console
    print(f"All scouts returned in {elapsed_total}s\n")
    print(f"{'Rank':<5} {'Seam':<26} {'Risk':<8} {'Rec':<14} {'Elapsed':>7}")
    print("-" * 65)
    for i, r in enumerate(ranked, 1):
        error_flag = " [ERROR]" if r.get("_error") else ""
        rec = RECOMMENDATION_LABEL.get(r["recommendation"], r["recommendation"])
        print(
            f"{i:<5} {r['seam']:<26} {r['extraction_risk']:<8} {rec:<14} {r.get('_elapsed_s', '?'):>6}s{error_flag}"
        )

    # Write outputs
    os.makedirs("scouts", exist_ok=True)

    md_report = build_markdown_report(ranked, run_ts)
    with open(OUTPUT_MD, "w", encoding="utf-8") as fh:
        fh.write(md_report)
    print(f"\nMarkdown report written to {OUTPUT_MD}")

    json_output = {
        "run_timestamp": run_ts,
        "model": MODEL,
        "total_elapsed_s": elapsed_total,
        "seams": ranked,
    }
    with open(OUTPUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(json_output, fh, indent=2)
    print(f"JSON results written to {OUTPUT_JSON}")

    errors = [r for r in ranked if r.get("_error")]
    if errors:
        print(f"\nWARNING: {len(errors)} scout(s) encountered errors:", file=sys.stderr)
        for r in errors:
            print(f"  - {r['seam']}: {r['_error']}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
