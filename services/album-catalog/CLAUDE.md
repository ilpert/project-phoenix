# album-catalog Service

The first extracted seam. Owns album CRUD. Replaces `/albums` in the monolith.

## API Contract

```
GET    /albums          200 AlbumResponse[]
GET    /albums/:id      200 AlbumResponse  |  404 { error: string }
POST   /albums          201 AlbumResponse  |  400 { error: string }
PUT    /albums/:id      200 AlbumResponse  |  404 | 400
DELETE /albums/:id      204 (no content)   |  404
GET    /health          200 { status: "ok" }
```

## AlbumResponse Shape

```typescript
{
  id: string;           // UUID — always populated
  title: string;
  artist: string;
  releaseYear: number;  // INTEGER — not string (fixes monolith bug)
  genre: string;
  trackCount: number;
}
```

`albumId` does **not** exist in this service. It was a dead field in the monolith's `Album` entity.

## Validation Rules

- `title`, `artist`, `genre`: required, non-empty string
- `releaseYear`: required integer, 1900 ≤ year ≤ 2025
- `trackCount`: required integer ≥ 0

## Running

```bash
npm run dev    # development server on port 3001
npm test       # vitest — includes ACL contract tests
npm run build  # TypeScript compile
```

## Test Files

- `tests/albums.test.ts` — full CRUD coverage
- `tests/acl.test.ts` — **ACL contract tests**: FAIL loudly if `albumId` appears in response or `releaseYear` is a string. These tests are "The Fence."

## Port

Default: `3001`. Override with `PORT` env var.
Frontend uses `VITE_API_URL=http://localhost:3001`.
