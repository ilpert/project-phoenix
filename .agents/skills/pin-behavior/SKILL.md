---
name: pin-behavior
description: Use when writing characterization (behavior-pinning) tests against the monolith. These are not correctness tests — they pin current behavior including bugs. Invoke before any change to spring-music-master.
metadata:
  author: Northwind Logistics modernization team
  version: "1.0.0"
  waypoints: "The Pin (#4)"
---

# Behavior Pinning

How to write characterization tests that act as a safety net before touching the legacy monolith.

## When to Use

- Before making any change to `spring-music-master/`
- When adding a new endpoint to test (even if you're not changing it)
- When a colleague asks "is it safe to change X in the monolith?"

## The Core Rule

**Pin current behavior, not correct behavior.** If the monolith returns 200 with a null body for a missing resource, the test asserts that. It does not assert 404. The bug is pinned, not fixed.

Fixing the bug happens in the new service. The monolith's pin documents what callers currently depend on.

## Test Location

```
spring-music-master/src/test/java/org/cloudfoundry/samples/music/web/
├── AlbumControllerCharacterizationTest.java   ← main characterization tests
└── ErrorControllerCharacterizationTest.java   ← secondary
```

Use `@SpringBootTest` + `@AutoConfigureMockMvc`. Run against H2 in-memory (no profile needed).

## Naming Convention

Test methods must be named to describe the **behavior being pinned**, not the implementation:

```java
// Good — describes behavior
void testGetAlbumById_notFound_returns200WithNull()

// Bad — describes implementation
void testFindByIdReturnsNull()
```

## Documenting Bugs

When pinning a bug, add a `PINNED BUG:` comment explaining what the bug is and why it exists:

```java
@Test
void testGetAlbumById_notFound_returns200WithNull() throws Exception {
    // PINNED BUG: GET /albums/{nonexistent-id} returns HTTP 200 with null body.
    // Caused by AlbumController.java:43 — repository.findById(id).orElse(null).
    // Correct behavior is 404. Fixed in services/album-catalog/.
    mockMvc.perform(get("/albums/this-id-does-not-exist"))
            .andExpect(status().isOk()); // BUG: should be 404
}
```

## What to Always Pin

For any new endpoint/behavior you're testing, capture at minimum:

1. **Happy path** — expected response shape and status code
2. **Missing resource** — what happens when the ID doesn't exist (even if it's a bug)
3. **JSON field presence** — which fields appear in the response (including dead/null fields)
4. **Type of fields** — especially if a field has a surprising type (String year, etc.)
5. **HTTP method conventions** — if PUT creates and POST updates (backwards from REST)

## Running Tests

```bash
cd spring-music-master
./gradlew test
```

Expected output: all tests green. If a characterization test fails, a behavior changed. Investigate before proceeding.

## Anti-Patterns to Avoid

- **Asserting correct behavior** — do not write `status().isNotFound()` for a bug that returns 200
- **Changing a failing characterization test to match new behavior silently** — always document why in the commit
- **Skipping the pin step** — "I know what it does" is not a safety net
- **Testing only the happy path** — edge cases (missing ID, empty body) are where bugs hide
