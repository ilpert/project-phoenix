# The Scouts — Extraction Risk Report

**Generated:** 2026-04-28 09:14:33 UTC  
**Model:** claude-haiku-4-5-20251001  
**Seams analysed:** 6

---

## Ranked Seams (lowest risk first)

| Rank | Seam | Risk | Coupling | Tests | Data Tangle | Criticality | Recommendation |
|------|------|------|----------|-------|-------------|-------------|----------------|
| 1 | `error-testing` | GREEN LOW | 1/10 | 0/10 | 1/10 | 1/10 | Extract now |
| 2 | `frontend-ui` | GREEN LOW | 3/10 | 0/10 | 2/10 | 4/10 | Extract now |
| 3 | `auth-session` | AMBER MEDIUM | 4/10 | 0/10 | 1/10 | 6/10 | Extract next |
| 4 | `health-info` | AMBER MEDIUM | 5/10 | 1/10 | 2/10 | 3/10 | Extract next |
| 5 | `database-profile-switch` | AMBER MEDIUM | 7/10 | 0/10 | 5/10 | 7/10 | Defer |
| 6 | `album-crud` | RED HIGH | 8/10 | 1/10 | 7/10 | 9/10 | Defer |

---

## Detailed Findings

### `error-testing` — GREEN LOW

**Recommendation:** Extract now  
**Scout elapsed:** 3.12s

| Dimension | Score |
|-----------|-------|
| Coupling | 1/10 |
| Test coverage | 0/10 |
| Data model tangle | 1/10 |
| Business criticality | 1/10 |

> The ErrorController has zero coupling to business logic — it is a standalone set of destructive test utilities with no shared data model and no production value. While the absence of tests is noted, the low criticality and negligible coupling make it the safest seam to extract (or simply delete). Its primary concern is security: these endpoints should be removed from the monolith before any production hardening work begins.

---

### `frontend-ui` — GREEN LOW

**Recommendation:** Extract now  
**Scout elapsed:** 4.07s

| Dimension | Score |
|-----------|-------|
| Coupling | 3/10 |
| Test coverage | 0/10 |
| Data model tangle | 2/10 |
| Business criticality | 4/10 |

> The AngularJS SPA is already decoupled by the REST API boundary — it calls /albums over HTTP and has no shared Java classes or Spring beans. Its only coupling is the API contract, which is stable post-album-catalog extraction. The planned migration to React 19 makes this a natural and well-scoped extraction: deploy a new static asset host alongside the monolith and cut over behind a feature flag.

---

### `auth-session` — AMBER MEDIUM

**Recommendation:** Extract next  
**Scout elapsed:** 3.88s

| Dimension | Score |
|-----------|-------|
| Coupling | 4/10 |
| Test coverage | 0/10 |
| Data model tangle | 1/10 |
| Business criticality | 6/10 |

> There is currently no auth implementation, which is simultaneously the lowest-tangle situation and a high-criticality gap — any future Spring Security addition will cross-cut every controller. Medium risk because the work is greenfield but architecturally load-bearing: the decision of where auth lives (gateway vs. each service) must be made before new microservices are built. Recommend defining the auth boundary now rather than retrofitting it across extracted seams later.

---

### `health-info` — AMBER MEDIUM

**Recommendation:** Extract next  
**Scout elapsed:** 2.95s

| Dimension | Score |
|-----------|-------|
| Coupling | 5/10 |
| Test coverage | 1/10 |
| Data model tangle | 2/10 |
| Business criticality | 3/10 |

> InfoController's tight coupling to the CfEnv CloudFoundry SDK is the primary risk factor — if the deployment platform changes (e.g. migration to Kubernetes), the extraction assumptions break. The data model is simple (ApplicationInfo DTO with two string arrays) and business criticality is low (observability, not core function). Extracting as a lightweight sidecar or absorbing into an API gateway health-check layer would reduce platform lock-in.

---

### `database-profile-switch` — AMBER MEDIUM

**Recommendation:** Defer  
**Scout elapsed:** 4.44s

| Dimension | Score |
|-----------|-------|
| Coupling | 7/10 |
| Test coverage | 0/10 |
| Data model tangle | 5/10 |
| Business criticality | 7/10 |

> SpringApplicationContextInitializer is a cross-cutting concern that determines which persistence backend every other seam uses. Its coupling score is high because changing it breaks profile resolution for album-crud, database connections, and potentially health-info. Zero tests make refactoring dangerous. This should be deferred until the persistence strategy for extracted microservices is locked down — at that point it can be replaced by environment-variable-driven configuration in each service rather than a monolith-level initializer.

---

### `album-crud` — RED HIGH

**Recommendation:** Defer  
**Scout elapsed:** 5.21s

| Dimension | Score |
|-----------|-------|
| Coupling | 8/10 |
| Test coverage | 1/10 |
| Data model tangle | 7/10 |
| Business criticality | 9/10 |

> Although album-crud has already been identified as the primary extraction seam (and a catalog service extracted), the remaining monolith controller still directly injects repository beans with no service layer abstraction — meaning any schema change propagates immediately to the API surface. The three competing repository implementations (JPA/MongoDB/Redis) share one Album entity with a dead field (albumId), increasing data model tangle. High business criticality and near-zero test coverage make this the highest-risk remaining work; complete the strangler fig facade and add contract tests before removing the monolith controller.

---

*Generated by The Scouts — parallel subagent extraction-risk analyzer*
