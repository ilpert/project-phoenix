---
name: scaffold-service
description: Use when creating a new Node.js/TypeScript microservice under services/. Provides the standard file structure, package.json scripts, Express setup, repository pattern, and test configuration matching the album-catalog template.
metadata:
  author: Northwind Logistics modernization team
  version: "1.0.0"
  waypoints: "The Cut (#5)"
---

# New Service Scaffold

Template and rules for creating new microservices in `services/`. All new services must follow the album-catalog pattern.

## When to Use

- Creating a new service under `services/{name}/`
- Setting up a new extracted seam
- Someone asks "how do I scaffold a new service here"

## Required File Structure

```
services/{name}/
├── CLAUDE.md               ← service-level context (API contract, run commands)
├── package.json            ← scripts: dev, build, test, typecheck
├── tsconfig.json
├── vitest.config.ts
├── Dockerfile
├── src/
│   ├── index.ts            ← server entry, reads PORT env var
│   ├── app.ts              ← Express app, mounts /health + routes
│   ├── types/
│   │   └── {entity}.ts     ← DTO interfaces (Request + Response shapes)
│   ├── repositories/
│   │   └── {entity}Repository.ts  ← in-memory Map, seeded data, CRUD methods
│   └── routes/
│       └── {entity}.ts     ← Express Router, validation, HTTP status codes
└── tests/
    ├── {entity}.test.ts    ← full CRUD integration tests
    └── acl.test.ts         ← ACL contract tests (see guard-acl skill)
```

## package.json Scripts (required)

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

## Standard Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^6.3.4",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.3.0"
  }
}
```

## HTTP Contract Rules

- `GET /` → 200 with entity array
- `GET /:id` → 200 with entity **or 404** (never 200+null)
- `POST /` → 201 with created entity on success, 400 on validation failure
- `PUT /:id` → 200 with updated entity, 404 if not found, 400 on validation failure
- `DELETE /:id` → 204 (no content), 404 if not found
- `GET /health` → 200 `{ "status": "ok" }` (required for Docker healthcheck)

Error response shape: `{ "error": "description" }` — always JSON, never plain text.

## Validation Pattern

Validate in a standalone `validate(body)` function that returns a string error message or null:

```typescript
function validate(body: Partial<EntityRequest>): string | null {
  if (!body.fieldName || typeof body.fieldName !== 'string' || !body.fieldName.trim()) {
    return 'fieldName is required';
  }
  // ...
  return null;
}
```

Apply in each write route before calling the repository.

## Repository Pattern

Use an in-memory `Map<string, Entity>` with a module-level constant. Seed with 3–5 realistic items.

```typescript
const store = new Map<string, Entity>();
// Seed on module load
for (const item of SEED) {
  const id = uuidv4();
  store.set(id, { id, ...item });
}
```

Export as a plain object with `findAll`, `findById`, `create`, `update`, `delete` methods.

## CLAUDE.md Required Content

Every service must have a `CLAUDE.md` with:
- What the service is and what monolith functionality it replaces
- The API contract (endpoints + response shapes)
- What fields from the monolith are explicitly **absent** and why
- How to run (`npm run dev`, `npm test`)
- Port and env vars

## Default Port

Services increment from 3001:
- album-catalog: 3001
- next service: 3002
- etc.

Set via `PORT` env var. Docker Compose maps appropriately.

## After Scaffolding

1. Register the service in `services/CLAUDE.md` services table
2. Add to `docker-compose.yml`
3. Add `ALBUM_API_URL` (or equivalent) to `project-phoenix/.env.example`
4. Run `npm install && npm test` — all tests must be green before proceeding

## Anti-Patterns to Avoid

- **Starting with entity fields from the monolith** — define the DTO independently
- **Skipping the `CLAUDE.md`** — future Claude instances (and humans) need the API contract documented
- **No seed data** — services must work out-of-the-box without external setup
- **Skipping `tests/acl.test.ts`** — ACL tests are mandatory, not optional
- **Hardcoding port 3001** — always read from `PORT` env var
