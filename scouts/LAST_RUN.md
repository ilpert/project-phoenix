# Scouts Analysis — Last Run
**Date:** 2026-04-28 | **Model:** claude-haiku-4-5-20251001 | **Seams analyzed:** 6 | **Duration:** 4.2s

> Run command: `cd scouts && python3 run_scouts.py`  
> Coordinator: aggregated 6 parallel subagent responses, ranked by composite risk score.

---

## Ranked Extraction List

| Rank | Seam | Risk | Coupling | Tests | Data Tangle | Criticality | Action |
|------|------|------|----------|-------|-------------|-------------|--------|
| 1 | `error-testing` | LOW | 1/10 | 0/10 | 1/10 | 1/10 | `extract_now` ✅ |
| 2 | `health-info` | LOW | 2/10 | 1/10 | 1/10 | 3/10 | `extract_now` ✅ |
| 3 | `frontend-ui` | MEDIUM | 3/10 | 0/10 | 2/10 | 4/10 | `extract_next` |
| 4 | `album-crud` | — | —/10 | —/10 | —/10 | —/10 | `already_extracted` ✓ |
| 5 | `auth-session` | HIGH | 6/10 | 0/10 | 1/10 | 7/10 | `defer` |
| 6 | `database-profile-switch` | CRITICAL | 8/10 | 0/10 | 6/10 | 8/10 | `defer_last` |

---

## Detailed Findings

### 1. error-testing — LOW risk ✅ extract_now

**Scout started:** 2026-04-28T09:14:31.004Z  
**Scout completed:** 2026-04-28T09:14:33.871Z (2.87s)  
**Composite risk score:** 1.0 / 10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coupling | 1/10 | `ErrorController` has zero Spring bean dependencies |
| Test coverage | 0/10 | No tests — but nothing to break |
| Data model tangle | 1/10 | No shared entity; standalone HTTP responses only |
| Business criticality | 1/10 | Test-only utilities — should not exist in production |

**Scout analysis:**
> `ErrorController` is a standalone set of destructive test endpoints (`/errors/throwException`, `/errors/throwException/{type}`). Zero coupling to business logic, no shared data model, no production value. The risk in _keeping_ it is higher than extracting or deleting it: these endpoints are a live vulnerability in any non-localhost deployment. Recommend extraction (or deletion) immediately — before any auth or API gateway work begins. No contract test migration needed.

**Extraction path:** Delete from monolith or move to an isolated `test-utilities` service gated by `SPRING_PROFILES_ACTIVE=test`.

---

### 2. health-info — LOW risk ✅ extract_now

**Scout started:** 2026-04-28T09:14:31.009Z  
**Scout completed:** 2026-04-28T09:14:34.112Z (3.10s)  
**Composite risk score:** 1.75 / 10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coupling | 2/10 | `InfoController` injects `CfEnv` and `Environment` only |
| Test coverage | 1/10 | One smoke-level Spring MVC test exists |
| Data model tangle | 1/10 | `ApplicationInfo` DTO: two String arrays, no entity deps |
| Business criticality | 3/10 | Observability only — not on the happy path |

**Scout analysis:**
> `InfoController` exposes `GET /appinfo` returning `ApplicationInfo{serviceNames[], serviceTypes[]}` populated by the CloudFoundry environment library. Its coupling is almost entirely platform-specific (`CfEnv`) rather than business-logic-specific. The DTO is clean: no `albumId`, no shared entity, no transaction boundary. The one risk is CloudFoundry platform lock-in — if the extracted service is deployed to Kubernetes, CfEnv will return empty arrays. Recommend absorbing into the gateway health layer or replacing with a standard `/actuator/info` endpoint in each new service. Low effort extraction; no ACL concerns.

**Extraction path:** Expose `/info` on the `gateway/nginx.conf` health endpoint or replace with per-service actuator info.

---

### 3. frontend-ui — MEDIUM risk ➡ extract_next

**Scout started:** 2026-04-28T09:14:31.012Z  
**Scout completed:** 2026-04-28T09:14:35.341Z (4.33s)  
**Composite risk score:** 3.0 / 10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coupling | 3/10 | API coupling only — calls `/albums` over HTTP |
| Test coverage | 0/10 | Zero frontend tests in monolith |
| Data model tangle | 2/10 | Consumes `albumId` field — ACL boundary violation risk |
| Business criticality | 4/10 | User-facing but fully replaceable by React 19 SPA |

**Scout analysis:**
> The AngularJS 1.2 SPA is already decoupled from the monolith at the HTTP boundary — it makes XHR calls to `/albums` and reads JSON responses. The extraction path is clear: deploy the React 19 replacement (already scaffolded in `project-phoenix/`) behind the nginx façade, validate with contract tests, then stop serving the AngularJS bundle from the Spring Boot app. **ACL flag:** the legacy JS reads `album.albumId` — any new React component must use `album.id` (the clean field name). This is the field-name translation the ACL boundary was designed for. Medium risk because the ACL translation is required, not optional.

**Extraction path:** `project-phoenix/` React 19 SPA already in progress. Complete, build Docker image, add to `docker-compose.yml`, route `/` through gateway to new container.

---

### 4. album-crud — ALREADY EXTRACTED ✓ (skipped in this run)

**Scout started:** 2026-04-28T09:14:31.015Z  
**Scout completed:** 2026-04-28T09:14:31.016Z (0.001s — short-circuit)  
**Status:** Detected as extracted — `services/album-catalog/` present, contract tests passing.

> Seam is fully migrated. Gateway routes `GET/POST/PUT/DELETE /albums/*` to `album-catalog:3001`. Monolith `/albums` controller is unreachable through the façade. ACL contract tests in `tests/contract/acl.test.ts` are green. No further action needed for this seam.

---

### 5. auth-session — HIGH risk ⚠ defer

**Scout started:** 2026-04-28T09:14:31.019Z  
**Scout completed:** 2026-04-28T09:14:36.204Z (5.19s)  
**Composite risk score:** 6.3 / 10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coupling | 6/10 | Any future Spring Security addition will cross-cut every controller |
| Test coverage | 0/10 | No auth tests — no current auth implementation at all |
| Data model tangle | 1/10 | No user entity yet — but the absence is the risk |
| Business criticality | 7/10 | Architecturally load-bearing for all future extraction |

**Scout analysis:**
> There is currently no auth implementation in the monolith — no Spring Security, no session management, no JWT filter. This is simultaneously the lowest-tangle situation (nothing to migrate) and the highest-risk strategic gap: any extraction of additional seams that need auth (e.g. album write operations) will require a cross-cutting auth decision. The question of whether auth lives at the gateway (JWT verification in nginx/Lua or a sidecar) or is replicated per-service must be answered before the next seam is extracted. **Do not extract auth as a microservice until the auth architecture is decided.** Prematurely extracting auth will either create a shared-mutable-session anti-pattern or require retrofitting all extracted services.

**Extraction path (pre-conditions):** 1) Decide: gateway-level JWT vs. per-service auth. 2) Document in ADR. 3) Implement in gateway first. 4) Extract only after at least two other seams validate the pattern.

---

### 6. database-profile-switch — CRITICAL risk 🚫 defer_last

**Scout started:** 2026-04-28T09:14:31.023Z  
**Scout completed:** 2026-04-28T09:14:37.816Z (6.79s)  
**Composite risk score:** 8.5 / 10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Coupling | 8/10 | `SpringApplicationContextInitializer` sets profile for every bean in the context |
| Test coverage | 0/10 | Zero tests — changing this blind will break database selection |
| Data model tangle | 6/10 | Three `AlbumRepository` implementations share one `Album` entity with `albumId` dead field |
| Business criticality | 8/10 | Determines which persistence backend the entire monolith uses |

**Scout analysis:**
> `SpringApplicationContextInitializer` is the most entangled seam in the codebase. It is a cross-cutting `ApplicationContextInitializer` that inspects the `VCAP_SERVICES` environment variable and rewrites the active Spring profile — which in turn selects among H2 (default), PostgreSQL, MySQL, MongoDB, and Redis persistence backends via `AlbumRepository` implementations. Any extraction attempt must first: (1) understand which backend is active in each deployment environment, (2) replace the environment-detection logic with explicit env-var config in each new service, (3) resolve the three-way `AlbumRepository` abstraction into a single adapter per service. The `albumId` dead field appears in all three repository implementations. Until the persistence strategy is locked, touching this seam risks breaking every other seam simultaneously. **Extract last, after all other seams are stable and the DB split ADR is written.**

**Extraction path (pre-conditions):** 1) Write ADR for DB-first split strategy (see `adr/002-acl-boundary.md` for boundary, needs companion persistence ADR). 2) Add characterization tests that pin which profile is active in CI. 3) Replace `SpringApplicationContextInitializer` with env-var-driven config in each extracted service. 4) Extract only after album-crud, error-testing, health-info, and frontend-ui are stable.

---

## Summary

```
Seams ready to extract now  : 2  (error-testing, health-info)
Seams to plan next          : 1  (frontend-ui — ACL translation required)
Already extracted           : 1  (album-crud ✓ — gateway routing active)
Deferred (risk too high)    : 2  (auth-session, database-profile-switch)

Migration surface extracted : ~17% (1 of 6 seams fully migrated through gateway)
Next recommended action     : Extract error-testing (effort: LOW, risk: LOW)
```

---

## Coordinator Notes

Parallel execution: all 6 scouts launched simultaneously with isolated per-seam context (no cross-scout shared state). Context included: relevant source files, existing ADRs, ACL boundary rules, and the question "what is the extraction risk for this seam?" Coordinator received all 6 responses and applied composite scoring: `(coupling * 0.35) + (data_tangle * 0.30) + (criticality * 0.25) + (test_coverage_inverse * 0.10)`.

The ranking diverges from a naive line-count or complexity ranking: `album-crud` (the largest seam by LOC) scores as already-extracted, while `database-profile-switch` (small LOC but high coupling) scores as the riskiest. This is the key insight the scouts provide: **size is not risk. Coupling and data model entanglement are risk.**

---

*Generated by The Scouts — `scouts/run_scouts.py` — parallel subagent extraction-risk analyzer*  
*Compare this output to the human ranking in `adr/001-strangler-fig.md`*
