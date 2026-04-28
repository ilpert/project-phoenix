# API Façade Gateway

This directory contains the nginx configuration that acts as the **API Façade** for the Strangler Fig migration of `spring-music-master`.

## What is the API Façade Pattern?

The API Façade is a single, stable entry point that sits in front of both the legacy monolith and the new extracted services. Clients never talk directly to either backend — they always go through the gateway. This gives us:

- **One URL** for the entire system regardless of migration state
- **Zero-downtime cutover** — routing changes happen in nginx, not in client code
- **CORS centralized** — individual services don't need their own CORS headers
- **Traffic split control** — a single `location` block is the on/off switch for each seam

## How Routing Works

```
Client
  │
  ▼
nginx :80  (this gateway)
  │
  ├── /albums/*  ──────────────────────► album-catalog:3001  (NEW service)
  │                                      Node.js/TypeScript
  │                                      Fully extracted seam
  │
  └── /*  (everything else)  ──────────► spring-music:8080   (LEGACY monolith)
                                         Spring Boot 2.4
                                         Unextracted seams
```

The routing table is the **strangler fig control point**: as each seam is extracted, we add a `location` block and that slice of traffic moves to the new service permanently.

## Migrating a New Seam

1. Extract the service following `.agents/skills/extract-seam`
2. Add the service to `docker-compose.yml` and wait for it to be healthy
3. Add a `location` block in `nginx.conf` above the fallback `location /`:

```nginx
location ~ ^/my-new-seam(/.*)?$ {
    proxy_pass http://my_new_service;
    proxy_set_header X-Served-By "my-new-service";
}
```

4. Reload nginx: `docker-compose exec gateway nginx -s reload`
5. Smoke-test the migrated endpoint through port 80
6. Update `scouts/LAST_RUN.md` and `CLAUDE.md` with the new migration status

## Endpoints

| Path | Routes To | Status |
|------|-----------|--------|
| `GET/POST/PUT/DELETE /albums/*` | album-catalog:3001 | Migrated |
| `GET /gateway-health` | nginx (no upstream check) | Gateway only |
| Everything else | spring-music:8080 | Legacy fallback |

## Running the Gateway

```bash
# Start full stack including gateway
docker-compose up --build

# Gateway is now the single entry point:
#   http://localhost:80          → gateway (new entry point)
#   http://localhost:80/albums   → album-catalog (migrated)
#   http://localhost:80/...      → spring-music monolith (legacy)

# Check gateway health
curl http://localhost/gateway-health

# Test CORS (should return 204 with Access-Control headers)
curl -X OPTIONS http://localhost/albums -v
```

## Design Decisions

**No fallback on upstream failure.** If `album-catalog` goes down, `/albums` returns 502. We want the failure to be visible, not silently routed back to the monolith. A silent fallback would mask outages and allow the new service to be quietly bypassed.

**CORS at the gateway, not services.** Individual services return data only. The façade adds headers. This keeps services clean and avoids duplicate/conflicting CORS configurations.

**Strangler, not strangled.** The monolith is not modified. The gateway adds the facade pattern on top of it without touching any Spring Boot code.
