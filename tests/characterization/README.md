# Characterization Tests (The Pin)

These tests pin the monolith's **current behavior before any change**, including its bugs.

## Where the tests live

The characterization tests are co-located with the monolith (standard Maven/Gradle convention):

```
spring-music-master/src/test/java/org/cloudfoundry/samples/music/web/
├── AlbumControllerCharacterizationTest.java   ← main pin tests (7 tests)
└── ErrorControllerCharacterizationTest.java   ← crash endpoint pins
```

## How to run

```bash
cd ../../spring-music-master
./gradlew test
```

## What they pin

| Test | What's pinned |
|------|--------------|
| `testGetAllAlbums_returns29SeedAlbums` | Exact seed count |
| `testAlbumJsonShape_includesAlbumIdField` | **PINNED BUG**: dead field present in response |
| `testReleaseYear_serializedAsString` | **PINNED BUG**: year is String not int |
| `testGetAlbumById_notFound_returns200WithNull` | **PINNED BUG**: 200+null instead of 404 |
| `testCreateAlbum_put_returnsAlbumWithGeneratedId` | PUT = create (backwards REST) |
| `testUpdateAlbum_post_returnsUpdatedAlbum` | POST = update (backwards REST) |
| `testDeleteAlbum_returns200` | DELETE returns 200, not 204 |

## Philosophy

Do NOT change a characterization test to match new behavior without reading the `PINNED BUG:` comment first. If the behavior change is intentional (e.g., you're fixing the 404 bug in the monolith), update the test and document why in the commit message.

The new `album-catalog` service fixes all three pinned bugs. The monolith pins are not "todos" — they document what callers currently depend on.
