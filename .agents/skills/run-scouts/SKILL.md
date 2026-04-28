---
name: run-scouts
description: Use when analyzing extraction risk for monolith seams, running the parallel scout subagents, or evaluating Claude's own boundary proposals with the scorecard harness.
metadata:
  author: Northwind Logistics modernization team
  version: "1.0.0"
  waypoints: "The Scouts (#9), The Scorecard (#7)"
---

# Scout Analysis and Scorecard Evaluation

How to use the parallel subagent analysis system and the eval harness for extraction risk scoring.

## When to Use

- Before choosing which seam to extract next
- When the human ranking in `adr/001-strangler-fig.md` needs validation
- When evaluating a proposed extraction plan for correctness
- When running the scorecard in CI to measure refactoring quality

## Running The Scouts

```bash
export ANTHROPIC_API_KEY=sk-ant-...
cd scouts && python3 run_scouts.py
```

This fans out **one Claude API call per seam**, each with isolated context. Outputs:
- `scouts/scouts_report.md` — ranked extraction list with reasoning
- `scouts/scouts_results.json` — machine-readable for CI/tooling

**Model used:** `claude-haiku-4-5-20251001` (fast + cheap for parallel analysis)

### What the scores mean

| Dimension | 0 = best | 10 = worst |
|-----------|----------|------------|
| coupling | No dependencies | Everything depends on it |
| test_coverage | Fully tested | Zero tests (riskiest to change) |
| data_model_tangle | Clean boundary | Shared tables, circular refs |
| business_criticality | Nice-to-have | System fails without it |

**Risk levels:**
- `LOW` — extract now, high confidence
- `MEDIUM` — extract next, known complications
- `HIGH` — defer, needs prerequisite work

### Comparing to the human ranking

The human ranking is in `adr/001-strangler-fig.md`. Compare it to the scout output:
- **Agreement** → confidence in both; proceed
- **Disagreement** → examine the reasoning; the scouts may have missed domain context, or the human ranking may have missed a coupling the scouts caught
- Document significant disagreements in the ADR

## Running The Scorecard

```bash
export ANTHROPIC_API_KEY=sk-ant-...
cd scorecard && python3 eval.py

# Dry-run (no API calls, deterministic mock)
cd scorecard && python3 eval.py --dry-run
```

Outputs:
- `scorecard/results/scorecard.md` — human-readable report
- `scorecard/results/scorecard.json` — machine-readable metrics

### Metrics to watch

| Metric | Target | Action if failing |
|--------|--------|------------------|
| accuracy | 100% | Review wrong answers, update golden set if needed |
| false_confidence_rate | < 10% | High false confidence = risky automated refactoring |
| avg_confidence_correct | > 70% | Low = model is uncertain even when right |

### Updating the golden set

The golden set is in `scorecard/eval.py` as `GOLDEN_SET`. Add new items when:
- A new seam is analyzed and the correct extraction approach is known
- A wrong approach is documented as a cautionary example

Each item needs a `label` (`correct_seam` or `incorrect_seam`) and a `reasoning` that explains why.

## Adding a New Seam to the Scouts

When a new seam is identified for analysis, add it to `scouts/run_scouts.py`'s `SEAMS` list:

```python
{
    "name": "new-seam-name",
    "context": "ClassName.java: description of the class, its dependencies, test coverage, data model"
}
```

**Context string guidelines:**
- Include the primary class name and file
- Describe what it depends on (other classes, external services)
- State test coverage honestly (e.g., "no tests", "1 contextLoads test")
- Mention any data model concerns (shared tables, foreign keys)

The context string is the ONLY information the scout has — make it accurate.

## Anti-Patterns to Avoid

- **Running scouts without reviewing the reasoning** — the risk level alone is not enough; read the `reasoning` field
- **Overriding a HIGH risk scout result without documentation** — if you disagree, add a note to the ADR explaining why
- **Using the scorecard as the sole quality gate** — it measures boundary correctness, not code quality
- **Adding items to the golden set without knowing the ground truth** — only add labeled items where you are certain of the correct answer
