# The Scorecard — Refactoring Eval Harness

An eval harness for LLM-driven refactoring of the `spring-music` monolith.
It checks whether Claude proposes the right extraction boundaries, measures
false-confidence rate, and verifies behavior is preserved by the
characterization test suite.

---

## What it measures

| Metric | What it tells you |
|--------|-------------------|
| **accuracy** | % of extraction proposals Claude labels correctly (correct_seam vs incorrect_seam) |
| **false_confidence_rate** | % of wrong answers where Claude reported confidence > 80 — the dangerous failure mode |
| **avg_confidence_correct** | How sure Claude is when it is right |
| **avg_confidence_incorrect** | How sure Claude is when it is wrong — ideally much lower |

A well-calibrated model will show low false-confidence rate and a meaningful
gap between `avg_confidence_correct` and `avg_confidence_incorrect`.

---

## Golden set

Six labeled proposals across three seams from the spring-music monolith:

| Seam | Correct proposal | Incorrect proposal |
|------|-----------------|-------------------|
| `album-crud` | Extract AlbumController + all repos as standalone service | Extract only the controller, share the database |
| `health-info` | Replace InfoController with Spring Actuator | Extract InfoController as a callback microservice |
| `database-profile-switch` | Defer extraction, wrap CfEnv behind interface | Extract SpringApplicationContextInitializer now |

The third seam (database-profile-switch) is the trap: the "correct" answer is
*not* to extract yet. A model that reflexively extracts everything will get it
wrong.

---

## Prerequisites

```
pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...
```

The eval uses `claude-haiku-4-5-20251001` for speed. No other dependencies.

---

## Running the eval

```bash
# From the project root:
python scorecard/eval.py

# Write reports to a custom directory:
python scorecard/eval.py --output-dir scorecard/results/

# Test the harness locally without spending API tokens:
python scorecard/eval.py --dry-run

# Specify a project root for finding characterization results:
python scorecard/eval.py --project-root /path/to/hackton/
```

Exit code `0` = 100% accuracy. Exit code `1` = any wrong answers or errors.
This makes it CI-friendly: plug it into your pipeline and the modernization
workflow stops being a vibe.

---

## Reports

After each run, two files are written to `scorecard/results/` (or your
`--output-dir`):

- `scorecard.json` — machine-readable full results + metrics
- `scorecard.md` — human-readable report for PR review or presentations

---

## Behavior preservation check

The harness reads `tests/characterization/results.json` from the project root.
If the file does not exist it prints `"tests/characterization not yet run"` and
includes the expected test IDs in the report as PENDING.

To populate it, run the characterization suite:

```bash
cd spring-music-master/
./gradlew test
```

Then write results to `tests/characterization/results.json` in the format:

```json
[
  {
    "id": "GET /albums returns list",
    "description": "GET /albums returns non-empty JSON array of album objects",
    "result": "PASSED"
  }
]
```

---

## ACL rules enforced by the harness report

The report reminds you of the three anti-corruption layer rules that must hold
in the `album-catalog` service response:

1. `albumId` field must **not** appear in any `/albums` response
2. `releaseYear` must be an **integer** (not a string)
3. `id` is the canonical identifier (UUID string)

These are also checked by the contract tests in
`services/album-catalog/`.

---

## CI integration

```yaml
# .github/workflows/scorecard.yml (example)
- name: Run Scorecard eval
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: python scorecard/eval.py --output-dir scorecard/results/

- name: Upload scorecard report
  uses: actions/upload-artifact@v4
  with:
    name: scorecard
    path: scorecard/results/
```

The non-zero exit code on accuracy < 100% ensures the pipeline fails and
surfaces regressions in Claude's refactoring judgment immediately.
