# ADR-001: Strangler Fig Pattern for Album Catalog Modernization

**Status:** Accepted  
**Date:** 2026-04-28  
**Deciders:** Architecture team  

---

## Context

`spring-music-master` is a Spring Boot 2.4.0 application (EOL since May 2021) with:
- No service layer — `AlbumController` injects `CrudRepository<Album,String>` directly
- Entity exposed as API contract — `Album` entity serialized to JSON with no DTO
- Dead field `albumId` always present in API responses (null, unused)
- `releaseYear` typed as `String` (not `int`) — wrong since initial commit
- A bug: `GET /albums/{id}` returns 200+null instead of 404
- One test (`contextLoads()`) — no behavioral coverage
- AngularJS 1.2.16 frontend — EOL in 2021, active CVEs
- Cloud Foundry coupling — `CfEnv` required even for local development
- 4 database backends via Spring profiles — unknown prod dependencies

The board approved "modernization." The team has no documentation of what prod behavior is expected beyond "it works, mostly."

---

## Decision

**Use the Strangler Fig pattern.** Extract capabilities one seam at a time. The monolith continues serving traffic until the new service is validated. Rollback is reversible at every step.

---

## Seam Ranking (by extraction risk, not size)

| Rank | Seam | Risk | Reasoning | Status |
|------|------|------|-----------|--------|
| 1 | Album CRUD | LOW | Clean HTTP boundary. No shared mutable state. `albumId` is demonstrably dead. `releaseYear` type correction is straightforward. Monolith keeps running during extraction. | ✅ EXTRACTED |
| 2 | Error/Health endpoints | LOW | Zero business logic. ErrorController intentional crash endpoints belong in a test profile, not prod. InfoController is pure infrastructure. | NEXT |
| 3 | Frontend (AngularJS SPA) | LOW | Clean HTTP boundary — SPA calls `/albums` REST API. React 19 replacement is drop-in for the browser layer. No shared state. | IN PROGRESS |
| 4 | Auth / Session | MEDIUM | No explicit auth currently — adding it is a greenfield problem. But session coupling must be designed carefully when introduced. | NEXT after security decision |
| 5 | Database profile switching | HIGH | `SpringApplicationContextInitializer` is coupled to Cloud Foundry runtime (`CfEnv`). Cross-cutting concern. Zero tests. Cannot extract safely until other seams stabilize and CF coupling is abstracted. | DEFERRED |

The Scouts tool (`scouts/run_scouts.py`) runs this same analysis using parallel Claude subagents. Compare the AI ranking to this human ranking — agreement confirms the model; disagreement surfaces assumptions worth examining.

---

## What We Chose NOT to Do

**Big-bang rewrite:** No characterization tests means any rewrite risks silent behavior change. We cannot know what we've broken without behavioral coverage.

**In-place Spring Boot upgrade to 3.x:** Upgrading to Spring Boot 3 requires Java 17+ and a namespace change (`javax.* → jakarta.*`). This is a high-risk change that touches every class. It could be done in parallel, but it is not the modernization bottleneck.

**Shared database between monolith and new service:** The monolith's schema has `albumId` as a column that is never populated. If we share the DB, the new service would need to either maintain this column or run migrations while the monolith is live. Both are worse than a clean separation.

**Gradual type migration in-place:** Changing `releaseYear` from `String` to `int` in the monolith breaks the existing JSON contract. The new service fixes the type in its own DTO without touching the monolith.

---

## Consequences

**Positive:**
- Rollback is always available: remove the strangler proxy route, traffic goes back to monolith
- Each extracted seam is independently deployable and independently testable
- The characterization tests catch unintended behavior changes in the monolith during transition
- The ACL contract tests catch type/field regressions in the new service

**Negative:**
- Two systems serve the same domain during the migration window — operational complexity
- The strangler proxy (nginx/gateway) is a new component to maintain
- Data synchronization is a concern if the monolith writes to its DB and the new service has its own — addressed by routing 100% of writes through the new service once validated

**Migration Window:**
Traffic routing: 0% → 10% → 50% → 100% to new service over 2 days.
See `runbook/cutover.md` for the exact procedure.
