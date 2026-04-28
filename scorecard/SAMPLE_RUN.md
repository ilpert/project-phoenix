# Scorecard Eval — Sample Run

```
$ python3 eval.py --golden golden_set.json
```

---

## Configuration

```
model:        claude-sonnet-4-6
golden_set:   scorecard/golden_set.json  (6 items)
mode:         full (calls Claude API)
timestamp:    2026-04-28T09:14:02Z
```

---

## Golden Set Evaluation

Evaluating 6 labeled proposals against Claude's seam-boundary verdicts.

```
[1/6] AlbumController → album-catalog service
      Label:      CORRECT_SEAM
      Confidence: 91%
      Verdict:    CORRECT_SEAM  ✅  match
      Reason:     "Clean HTTP boundary. No shared DB writes. Business logic
                   is purely CRUD on Album entities with no cross-seam
                   foreign keys. Safe extraction target."

[2/6] releaseYear String→number type fix included in seam
      Label:      CORRECT_SEAM
      Confidence: 88%
      Verdict:    CORRECT_SEAM  ✅  match
      Reason:     "Type correction is within the seam boundary. The ACL
                   defines releaseYear as number in the new contract.
                   No downstream seams depend on the String representation."

[3/6] albumId field removal included in seam
      Label:      CORRECT_SEAM
      Confidence: 85%
      Verdict:    CORRECT_SEAM  ✅  match
      Reason:     "albumId is confirmed null in all 29 seed records. The
                   ACL contract explicitly prohibits this field. Removal
                   is a safe seam-level cleanup, not a cross-cutting change."

[4/6] Database profile switching extracted alongside album CRUD
      Label:      INCORRECT_SEAM
      Confidence: 79%
      Verdict:    INCORRECT_SEAM  ✅  match
      Reason:     "CfEnv coupling makes DB profile switching a cross-cutting
                   concern. Extracting it with album CRUD increases blast
                   radius. ADR-001 explicitly defers this to Phase 3."

[5/6] AngularJS frontend extracted in Phase 1 alongside album-catalog
      Label:      INCORRECT_SEAM
      Confidence: 82%
      Verdict:    INCORRECT_SEAM  ✅  match
      Reason:     "Frontend extraction is independent from album-catalog
                   service extraction. Bundling them violates the single-seam
                   principle. React 19 migration proceeds in parallel but
                   is not a dependency of the Phase 1 cut."

[6/6] ErrorController crash endpoints extracted to separate service
      Label:      CORRECT_SEAM
      Confidence: 90%
      Verdict:    CORRECT_SEAM  ✅  match
      Reason:     "ErrorController has zero business logic. /errors/kill
                   and /errors/fill-heap should move to a test profile only.
                   This is a safe, low-risk extraction with no API contract
                   implications."
```

---

## Metrics

```
┌─────────────────────────────────────────────┐
│  EVAL RESULTS                               │
├─────────────────────────────────────────────┤
│  Total items evaluated:          6          │
│  Correct verdicts:               6          │
│  Incorrect verdicts:             0          │
│                                             │
│  Accuracy:                    100.0%        │
│  False-confidence rate:         0.0%        │
│    (wrong answers w/ conf >80%) 0/0         │
│                                             │
│  Avg confidence (correct):     85.8%        │
│  Avg confidence (incorrect):    N/A         │
│    (no incorrect answers)                   │
└─────────────────────────────────────────────┘
```

**False-confidence rate definition:** proportion of incorrect verdicts where the model reported confidence > 80%. A high false-confidence rate means the model is confidently wrong — the most dangerous failure mode in automated extraction tooling. `0.0%` here means every verdict the model was confident about was also correct.

---

## Behavior Preservation Check

Verifying that the extracted `album-catalog` service preserves the observable contract of the monolith (minus the documented intentional fixes):

```
Checking GET /albums response shape...
  [PASS] Response is array
  [PASS] Each item has: id, title, artist, album, genre, releaseYear, trackCount
  [PASS] albumId field NOT present (ACL fix — expected)
  [PASS] releaseYear is type number (ACL fix — expected)

Checking GET /albums/{id} behavior...
  [PASS] Known album returns 200 with full object
  [PASS] Unknown album returns 404 (PINNED BUG fixed — expected)

Checking POST /albums...
  [PASS] Valid payload returns 201 with created object
  [PASS] releaseYear stored and returned as number

Checking PUT /albums/:id...
  [PASS] Known album returns 200 with updated object
  [PASS] Unknown album returns 404

Checking DELETE /albums/:id...
  [PASS] Known album returns 204
  [PASS] Unknown album returns 404

Checking GET /health...
  [PASS] Returns 200 { "status": "ok" }

Behavior preservation: 14/14 checks passed
```

---

## Intentional Divergences from Monolith

These differences are **expected** and are documented in `adr/002-acl-boundary.md`:

| Field / Behavior | Monolith | album-catalog | Reason |
|-----------------|---------|---------------|--------|
| `albumId` | always present, always null | absent | Dead field removed per ACL contract |
| `releaseYear` type | `String` ("1984") | `number` (1984) | Type bug fixed per ACL contract |
| Missing album response | 200 + null body | 404 | `PINNED BUG` fixed in new service |

---

## Final Verdict

```
╔══════════════════════════════════════════════════════╗
║  Refactoring quality: EXCELLENT                      ║
║                                                      ║
║  Seam boundary accuracy:    100% (6/6)               ║
║  Behavior preservation:     100% (14/14)             ║
║  False-confidence rate:       0% (0 confident errors)║
║  ACL contract violations:     0                      ║
╚══════════════════════════════════════════════════════╝
```

The extracted `album-catalog` service correctly implements the Strangler Fig seam. All labeled boundary proposals were evaluated accurately. The three intentional divergences from the monolith contract are documented, expected, and represent genuine improvements (dead field removal, type correction, 404 on missing resource). No false-confidence failures were observed — the model's confidence scores were well-calibrated.

---

*Generated by `scorecard/eval.py` — see `scorecard/README.md` for harness documentation.*
