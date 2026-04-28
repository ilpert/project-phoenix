---
name: extract-seam
description: Use when extracting a new service seam from the monolith using the Strangler Fig pattern. Covers seam identification, characterization tests, DTO contract, service scaffold, ACL contract test, and ADR update.
metadata:
  author: Northwind Logistics modernization team
  version: "1.0.0"
  waypoints: "The Cut (#5), The Map (#3)"
---

# Seam Extraction Playbook

Step-by-step guide for extracting a capability from `spring-music-master` into a new standalone service. Follow these steps in order — each step gates the next.

## When to Use

- You are extracting a new capability from `spring-music-master`
- You are starting a new microservice in `services/`
- A user asks "how do I extract X from the monolith"

## Step 1 — Identify the Seam Boundary

A seam is an **HTTP or data boundary**, not a code boundary. Good seams have:
- A clean REST interface (no shared in-process state)
- A single entity or aggregate as the domain object
- No circular data dependencies with other monolith components

Score the candidate using the risk rubric from `adr/001-strangler-fig.md`:
- coupling (0–10): how many other classes depend on this?
- test_coverage (0–10): how well tested is it today? (0 = no tests = riskiest)
- data_model_tangle (0–10): how intertwined is the data model?
- business_criticality (0–10): what breaks if this is wrong?

Run `scouts/run_scouts.py` to get a Claude-assisted risk score before proceeding.

**Do not extract HIGH risk seams first.** Start with LOW or MEDIUM.

## Step 2 — Write Characterization Tests (before any change)

Use the `pin-behavior` skill. Run the existing tests to confirm they pass. Do not proceed until green.

```bash
cd spring-music-master && ./gradlew test
```

## Step 3 — Define the DTO Contract

The new service's API shape must be defined **before writing any service code**.

Rules (enforced by `guard-acl` skill and `.claude/hooks/acl_guard.py`):
- Create a `AlbumResponse`-style DTO — never expose storage entities directly
- `albumId` must not appear (dead field)
- `releaseYear` must be `number` not `string`
- Every field must have the correct type — fix bugs at the boundary
- 404 for missing resources (not 200+null)

Document the contract in the new service's `CLAUDE.md` before writing code.

## Step 4 — Scaffold the New Service

Use the `scaffold-service` skill to create the directory structure under `services/{service-name}/`.

The service must have:
- `src/types/{entity}.ts` — DTO interfaces (no entity leakage)
- `src/repositories/{entity}Repository.ts` — in-memory storage with seeded data
- `src/routes/{entity}.ts` — Express router with full CRUD + validation
- `src/app.ts` — Express app with `GET /health`
- `src/index.ts` — server entry point on `PORT` env var
- `tests/{entity}.test.ts` — full CRUD tests
- `tests/acl.test.ts` — ACL contract tests (see `guard-acl` skill)

## Step 5 — Write the ACL Contract Test

See `guard-acl` skill. The test must be in `tests/acl.test.ts` and must fail if:
1. The forbidden field appears in any response
2. A field has the wrong type (string where number expected)

This test is "The Fence" and must be green before the service can route production traffic.

## Step 6 — Verify Both Systems Green on Same Commit

Before claiming the extraction is complete, both must pass:

```bash
# Monolith still works
cd spring-music-master && ./gradlew test

# New service works including ACL tests
cd services/{service-name} && npm test
```

Both green on the same git commit = extraction complete.

## Step 7 — Update the Seam Map

- Update `adr/001-strangler-fig.md` seam ranking table — change status to ✅ EXTRACTED
- Add the service to `services/CLAUDE.md` services table
- Update `README.md` waypoint table if applicable

## Anti-Patterns to Avoid

- **Extracting without characterization tests first** — you have no safety net
- **Sharing the database** — the new service must have its own storage
- **Copying entity fields verbatim** — always check for bugs and dead fields at the boundary
- **Skipping the DTO** — never expose storage types as API shapes
- **Extracting a HIGH risk seam first** — start with LOW risk to build confidence
