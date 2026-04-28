---
name: guard-acl
description: Use when maintaining the anti-corruption layer between the monolith and new services. Covers DTO rules, forbidden fields, type requirements, and how to write and interpret ACL contract tests.
metadata:
  author: Northwind Logistics modernization team
  version: "1.0.0"
  waypoints: "The Fence (#6)"
---

# Anti-Corruption Layer (ACL) Guard

Rules for keeping monolith field leakage out of the new services' public API shapes.

## When to Use

- Before writing or reviewing any DTO in `services/`
- When the `PreToolUse` hook blocks a write with "ANTI-CORRUPTION LAYER VIOLATION"
- When writing ACL contract tests (`tests/acl.test.ts`)
- When adding a new field to a service's API response

## The Hard Rules (enforced by `.claude/hooks/acl_guard.py`)

The hook fires before every Write/Edit in `services/` and blocks writes containing:

| Violation | Pattern | Reason |
|-----------|---------|--------|
| Dead field | `albumId` as field/property | Always null in monolith, never meaningful |
| Wrong type | `releaseYear: string` or `releaseYear?: string` | Monolith stored year as string — that was a bug |

If the hook blocks you, the fix is to change the field name or type in your code — **not to disable the hook**.

## DTO Shape Requirements

For any new service extracting from the monolith:

```typescript
// ✅ Correct DTO shape
interface AlbumResponse {
  id: string;           // UUID, always populated
  title: string;
  artist: string;
  releaseYear: number;  // INTEGER — year is not a string
  genre: string;
  trackCount: number;
}
// albumId: absent entirely — it was a dead field
```

Never derive a DTO by copy-pasting the monolith's entity. Always review each field:
- Is this field actively used, or is it dead?
- Does this field have the correct type?
- Does this field belong in the public API, or is it an internal implementation detail?

## Writing ACL Contract Tests

Every new service must have `tests/acl.test.ts`. Minimum required tests:

```typescript
// 1. Forbidden field must not appear
it('response must not contain albumId', async () => {
  const res = await request(app).get('/albums');
  res.body.forEach(album => {
    expect(album).not.toHaveProperty('albumId');
  });
});

// 2. Type must be correct
it('releaseYear must be typeof number', async () => {
  const res = await request(app).get('/albums');
  res.body.forEach(album => {
    expect(typeof album.releaseYear).toBe('number');
  });
});

// 3. Fix the 200+null bug
it('GET missing resource returns 404, not 200', async () => {
  const res = await request(app).get('/albums/not-real');
  expect(res.status).toBe(404);
});
```

Run with: `cd services/{service-name} && npm test`

## Adding a New Forbidden Field

When a new dead/wrong field is discovered in the monolith:

1. Add the regex pattern to `.claude/hooks/acl_guard.py` in the `ACL_VIOLATIONS` list
2. Add a new test case to `tests/acl.test.ts`
3. Update `adr/002-acl-boundary.md` to document the new boundary rule

## Interpreting Hook Errors

When `acl_guard.py` blocks a write:

```
🚫 ANTI-CORRUPTION LAYER VIOLATION

  ✗ ACL VIOLATION: 'albumId' is a dead field from the monolith...
```

Do NOT:
- Disable the hook
- Comment out the pattern
- Work around it by renaming to `album_id`

DO:
- Remove the field from the DTO (if it's dead)
- Give the field a semantically correct name that isn't the monolith's name

See `adr/002-acl-boundary.md` and `adr/003-hooks-vs-prompts.md` for the full rationale.

## Anti-Patterns to Avoid

- **Copy-pasting the monolith entity** as a DTO — always review each field
- **Disabling or weakening the ACL hook** — it's a hard invariant, not a suggestion
- **Skipping `tests/acl.test.ts`** — the hook catches writes, the test catches runtime leakage
- **Treating `albumId` as a migration target** — it was never used, don't carry it forward
