# project-phoenix — React 19 Frontend

Northwind Logistics album catalog UI. Replaces AngularJS 1.2.16 SPA from `spring-music-master/src/main/resources/static/`.

## Stack

React 19 · Rsbuild · Tailwind CSS 4 · TypeScript 6 · rstest

## What's Here

- `src/types/album.ts` — Album types (no `albumId`, `releaseYear` is `number`)
- `src/api/albums.ts` — HTTP client for the album-catalog service
- `src/components/AlbumList.tsx` — Main album list with search and delete
- `src/App.tsx` — App shell

## Rules

- **Never import types from the monolith** — all types in `src/types/`
- **Never talk to the monolith directly** — all calls go through `src/api/albums.ts`
- `albumId` does not exist in this codebase
- `releaseYear` is always a number

## Environment

```
ALBUM_API_URL=http://localhost:3001  # album-catalog service (default)
```

## Running

```bash
npm install
npm run dev       # Rsbuild dev server
npm test          # rstest
npm run build     # production bundle
```
