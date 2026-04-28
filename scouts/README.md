# The Scouts

**Parallel subagent extraction-risk analyzer for the spring-music-master Strangler Fig modernization.**

The Scouts fans out one Claude API call per candidate extraction seam — all running in parallel — and scores each seam on four risk dimensions. Results are aggregated into a ranked report so the team can decide what to extract next.

---

## What it does

1. Defines six candidate seams from spring-music-master (Spring Boot 2.4 / AngularJS 1.2).
2. Fires one Claude (`claude-haiku-4-5-20251001`) call per seam using `asyncio` + `ThreadPoolExecutor`.
3. Each scout receives **only its own seam context** — no shared state, no full codebase dump.
4. Scores each seam on:
   - **coupling** (0-10): how tightly coupled to the rest of the monolith
   - **test_coverage** (0-10): 0 = no tests = worst for safe extraction
   - **data_model_tangle** (0-10): how intertwined is the data model
   - **business_criticality** (0-10): how critical to live business operations
5. Assigns an **extraction_risk** (LOW / MEDIUM / HIGH) and a **recommendation** (extract_now / extract_next / defer).
6. Ranks seams LOW → MEDIUM → HIGH and writes two output files.

---

## Seams analyzed

| Seam | What it covers |
|------|---------------|
| `album-crud` | AlbumController + three repository implementations (JPA/Mongo/Redis) |
| `health-info` | InfoController — CloudFoundry runtime info endpoints |
| `error-testing` | ErrorController — destructive test endpoints (/kill, /fill-heap, /throw) |
| `frontend-ui` | AngularJS 1.2 SPA in static/ (being replaced by React 19) |
| `auth-session` | Absence of auth — fully exposed actuator endpoints |
| `database-profile-switch` | SpringApplicationContextInitializer — CF profile detection |

---

## Prerequisites

- Python 3.11+
- `anthropic` Python SDK

```bash
pip install anthropic
```

---

## Running

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run from the repo root
python scouts/run_scouts.py
```

The script enforces a **30-second timeout per scout**. All six scouts run in parallel, so total wall-clock time is roughly the time of the slowest individual call (typically 3-8 seconds).

---

## Output files

| File | Description |
|------|-------------|
| `scouts/scouts_report.md` | Human-readable ranked Markdown report |
| `scouts/scouts_results.json` | Machine-readable JSON with all scores and metadata |

---

## Architecture

```
run_scouts.py
│
├── SEAMS[]               — seam definitions with isolated context strings
├── run_scout(seam)       — blocking Claude API call (one per thread)
│     ├── builds prompt with ONLY that seam's context
│     ├── calls claude-haiku-4-5-20251001
│     ├── parses + validates JSON response
│     └── returns result dict (errors captured, never raised)
│
├── run_all_scouts()      — asyncio fan-out via ThreadPoolExecutor
│     └── asyncio.wait_for per scout (30s timeout)
│
├── rank_results()        — sort LOW→MEDIUM→HIGH, tiebreak by composite score
│
└── main()                — orchestrate, print summary, write outputs
```

---

## Error handling

- Per-scout API errors (timeout, connection, status) are caught and recorded as `_error` in the result.
- The scout is given `extraction_risk: UNKNOWN` and `recommendation: defer` so the report still renders.
- The script exits with code `2` if any scout errored (vs `0` for full success, `1` for missing API key).

---

## Sample output

See `scouts/sample_output.md` for a realistic example of the ranked report.
