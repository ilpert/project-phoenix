# ADR-002: Anti-Corruption Layer Between Monolith and Album Catalog Service

**Status:** Accepted  
**Date:** 2026-04-28  
**Deciders:** Architecture team  

---

## Context

The monolith's `Album` entity has several properties that must not leak into the new service's public API:

| Monolith property | Problem | Correct form in new service |
|-------------------|---------|----------------------------|
| `albumId` | Dead field — always null, never set, never read | Absent entirely |
| `releaseYear: String` | Wrong type — a year is an integer | `releaseYear: number` |
| No validation | Fields can be empty strings, null, or garbage | Validated at input boundary |
| No 404 | `findById().orElse(null)` → 200+null | Proper 404 with error body |

If any of these leak into `services/album-catalog/`, we have imported the monolith's technical debt into the new architecture. That is the definition of a failed extraction.

---

## Decision

The new service defines its own `AlbumResponse` DTO:

```typescript
interface AlbumResponse {
  id: string;           // UUID — always populated, generated server-side
  title: string;
  artist: string;
  releaseYear: number;  // INTEGER — not string
  genre: string;
  trackCount: number;
}
// albumId: does not exist
```

The ACL is enforced at two layers:

**Layer 1 — Contract Test (ground truth):**
`tests/contract/acl.test.ts` (and `services/album-catalog/tests/acl.test.ts`) makes a live HTTP call to `GET /albums` and asserts:
1. No response object contains an `albumId` property
2. Every `releaseYear` value has `typeof === 'number'`

These tests run in CI on every commit. A failure means the ACL has been breached.

**Layer 2 — PreToolUse Hook (developer fast-fail):**
`.claude/hooks/acl_guard.py` runs before every `Write` or `Edit` tool call in `services/`. It scans the content for:
- `albumId` appearing as a field/property (regex: `["']?albumId["']?\s*[:\?]`)
- `releaseYear?: string` or `releaseYear: string` (the wrong type)

If either pattern is found, the hook exits with code 2 and blocks the write with a clear error message.

The contract test is the ground truth; the hook is the fast-fail developer UX. See `adr/003-hooks-vs-prompts.md` for why we use both.

---

## Why These Two Signals

`albumId` and `releaseYear: string` are the exact two points where the monolith's data model is semantically wrong (not just technically outdated). They are also the easiest things for a future developer (or an LLM) to copy from the monolith when writing new code. The ACL specifically guards the lines of least resistance.

---

## Consequences

**Positive:**
- The new service's API contract is independent of the monolith's internal model
- Consumers of the new service never need to handle null `albumId` or parse years from strings
- ACL violations are caught before they reach review (hook) and before they ship (contract test)

**Negative:**
- The ACL must be maintained as both codebases evolve. If the monolith adds a new field that should not leak, the hook's pattern list must be updated.
- The hook is a string-scan heuristic — a sophisticated violation (e.g., a type alias for `string` named `Year`) could evade it. The contract test is the authoritative check.

**Boundary maintenance:**
When a new field is added to `Album` in the monolith, the first question is: "should this appear in the new service's API?" If yes, add it to `AlbumResponse` with the correct type. If no (dead field, internal ID, CF artifact), add its name to `acl_guard.py`'s violation list.
