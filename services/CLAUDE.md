# New Services — Anti-Corruption Zone

New microservices extracted from the monolith live here. They must not inherit the monolith's sins.

## Hard Rules (enforced by `.claude/hooks/acl_guard.py`)

1. **No `albumId` field in any API response shape.** It was a dead field in the monolith. It does not exist here.
2. **`releaseYear` must be `number`, not `string`.** The monolith typed it wrong. We fix it here.
3. **No Cloud Foundry dependencies** (`javacfenv`, `spring-cloud-connectors`, `CfEnv`). Use standard 12-factor env vars.
4. **No shared database with the monolith.** Services have their own storage.
5. **Always use DTOs** — never expose internal storage types as API response shapes.

The `PreToolUse` hook in `/.claude/settings.json` will **block writes** that violate rules 1 and 2 before the tool executes.

## Service Conventions

- Each service has its own `package.json` / build file and runs independently
- Services communicate via REST — no direct database sharing
- Health endpoint required: `GET /health` → `{ "status": "ok" }`
- Input validation with clear 400 error messages
- Proper 404 responses (not 200+null like the monolith)

## Services in This Directory

| Service | Status | Port | Replaces |
|---------|--------|------|----------|
| `album-catalog/` | ✅ Extracted | 3001 | `/albums` endpoints in monolith |

## Adding a New Service

1. Create `services/{service-name}/` with its own CLAUDE.md
2. Define the DTO contract first — no entity leakage
3. Add a contract test in `tests/contract/` before connecting to the frontend
4. Update `adr/001-strangler-fig.md` with the new seam status
