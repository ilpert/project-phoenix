# Contract / ACL Tests (The Fence)

These tests enforce the anti-corruption layer. They **fail loudly** if any monolith field leaks into the new service's API.

## Where the tests live

The ACL contract tests are co-located with the service they test:

```
services/album-catalog/tests/
├── acl.test.ts      ← THE FENCE: fails if albumId appears or releaseYear is string
└── albums.test.ts   ← full CRUD coverage
```

## How to run

```bash
cd ../../services/album-catalog
npm install
npm test
```

## What they guard

| Test | What it enforces |
|------|-----------------|
| `no albumId in list response` | `albumId` must never appear in GET /albums |
| `no albumId in single response` | `albumId` must never appear in GET /albums/:id |
| `no albumId in created response` | `albumId` must never appear in POST /albums |
| `releaseYear is number (list)` | `typeof releaseYear === 'number'`, not `'string'` |
| `releaseYear is number (single)` | Same check on GET /albums/:id |
| `404 on missing album` | Fixes monolith's 200+null bug |

## What triggers these tests

The `PreToolUse` hook at `/.claude/hooks/acl_guard.py` provides fast-fail during development.
These contract tests are the CI-time authoritative check.

See `adr/002-acl-boundary.md` for the full ACL design rationale.
