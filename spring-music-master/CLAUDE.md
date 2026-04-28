# The Legacy Patient — spring-music-master

**Read it. Understand it. Don't fix it yet.**

This is the monolith being modernized. Business logic lives here and must not be changed without updating the characterization tests first.

## What This Is

Spring Boot 2.4.0 (EOL since May 2021) app that stores album data across multiple backends (H2/MySQL/PostgreSQL/MongoDB/Redis) via Spring profiles. Originally built for Cloud Foundry demo purposes.

## Architecture Smells (Document, Don't Fix)

| Smell | Location | Notes |
|-------|----------|-------|
| No service layer | `web/AlbumController.java:17` | Controller injects `CrudRepository<Album,String>` directly |
| Entity as API contract | `domain/Album.java` | Album entity is serialized directly to JSON — no DTO |
| Dead field | `domain/Album.java:24` | `albumId` field is always null, never set, appears in JSON |
| Wrong type | `domain/Album.java:21` | `releaseYear` stored as `String` not integer |
| Crash endpoints in prod | `web/ErrorController.java` | `/errors/kill`, `/errors/fill-heap`, `/errors/throw` — intentional, do not remove |
| Zero tests | `ApplicationTests.java` | One `contextLoads()` test, nothing else |
| EOL stack | `build.gradle` | Spring Boot 2.4.0, AngularJS 1.2.16, jQuery 2.1.0 |
| CF coupling | `config/SpringApplicationContextInitializer.java` | Tightly coupled to Cloud Foundry runtime via CfEnv |

## The Bug to Know

`GET /albums/{id}` with a nonexistent ID returns **HTTP 200 with a null body** — not 404.
This is pinned in `tests/characterization/AlbumControllerCharacterizationTest.java` with a `PINNED BUG` comment.
The new service fixes this correctly.

## Rules for Working in This Directory

- **Do not add a service layer here.** That belongs in `services/album-catalog/`.
- **Do not add DTOs here.** The new service has the clean contract.
- **Do not remove `ErrorController`.** It's intentional. Document it in comments if needed.
- **If you change any behavior**, the characterization tests in `tests/characterization/` will fail. That is correct — update them intentionally, not silently.

## Running

```bash
# Default (H2 in-memory)
./gradlew bootRun

# With specific database profile
./gradlew bootRun --args='--spring.profiles.active=mysql'

# Tests
./gradlew test
```

## Profile System

Only ONE profile can be active: `mysql`, `postgres`, `mongodb`, `redis`, or none (H2).
`SpringApplicationContextInitializer` throws `IllegalStateException` if multiple are set.
This logic is intentionally NOT replicated in the new service.
