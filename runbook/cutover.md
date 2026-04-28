# Album Catalog Service Cutover Runbook

**Version:** 1.0  
**Last updated:** 2026-04-28  
**Owner:** Platform Engineering  
**Reviewed by:** On-call lead, DB admin, Frontend lead  

---

## Overview

This runbook covers the cutover from the legacy `spring-music` monolith to the
new `album-catalog` service and React 19 frontend (`project-phoenix`).

| Item | Detail |
|------|--------|
| **What moves** | All traffic to `/albums/*` and `/appinfo` |
| **From** | `spring-music` monolith running on port 8080 |
| **To** | `album-catalog` service (port 3001) + React 19 SPA (port 3000) |
| **Strategy** | Strangler fig — nginx percentage routing, not a hard flip |
| **Cutover window** | Saturday 02:00–05:00 UTC (low-traffic window) |
| **Rollback SLA** | **5 minutes** from trigger to 100% traffic back on monolith |

**What changes for users:**
- Same data, same URLs — no user-facing URL changes
- `releaseYear` is now an integer in API responses (was a string)
- `albumId` field no longer appears in API responses (was always null)
- `/appinfo` replaced by Spring Actuator `/actuator/info`

---

## Prerequisites Checklist

Complete every item before the cutover window opens. Do not proceed if any
item is unchecked.

```
Pre-cutover validation (T-60 min)
----------------------------------
[ ] album-catalog service health check passing:
      GET http://localhost:3001/health  →  {"status":"ok"}

[ ] ACL contract tests passing:
      cd services/album-catalog && npm test
      All tests green, zero skipped.

[ ] Characterization tests still green against the monolith:
      cd spring-music-master && ./gradlew test
      No regressions vs. last known-good run.

[ ] React 19 frontend built and deployed to staging:
      cd project-phoenix && npm run build
      Deployed artifact fingerprint: _________________ (fill in)

[ ] Nginx config changes reviewed and staged (not yet activated):
      sudo nginx -t   →   "syntax is ok / test is successful"

[ ] Database backup completed:
      Timestamp of last pg_dump / mongodump: _________________

[ ] Rollback nginx config committed and tagged:
      git tag pre-cutover-nginx  →  confirm with: git tag | grep pre-cutover

[ ] Monitoring dashboard open and showing baseline:
      Error rate (5-min rolling): _______%
      p99 latency /albums: _______ms

[ ] On-call engineer confirmed available:
      Name: _________________  Phone: _________________

[ ] Incident channel open: #album-catalog-cutover
```

---

## Phase 1: Pre-Cutover Validation (T-30 min)

Run every command in order. **Do not skip steps.** Record output in the
incident channel.

### 1.1 Verify album-catalog service is healthy

```bash
# Health endpoint
curl -sf http://localhost:3001/health | python3 -m json.tool
# Expected: {"status":"ok"}

# List albums — must return non-empty array
curl -sf http://localhost:3001/albums | python3 -m json.tool | head -30

# Verify ACL: albumId must NOT appear
curl -sf http://localhost:3001/albums | python3 -c "
import sys, json
data = json.load(sys.stdin)
for a in data:
    assert 'albumId' not in a, f'ACL VIOLATION: albumId in {a}'
    assert isinstance(a['releaseYear'], int), f'ACL VIOLATION: releaseYear is not int in {a}'
print(f'ACL OK — {len(data)} albums, no violations')
"
```

If either assertion fails: **STOP. Do not proceed with cutover.**

### 1.2 Verify monolith is still healthy (baseline)

```bash
curl -sf http://localhost:8080/albums | python3 -m json.tool | head -10
# Expected: non-empty array with albumId (null) and releaseYear as string
# Confirm count matches album-catalog:
MONO=$(curl -sf http://localhost:8080/albums | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
NEW=$(curl -sf http://localhost:3001/albums  | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "Monolith: $MONO albums  |  album-catalog: $NEW albums"
# Both numbers must match.
```

### 1.3 Run a write-path smoke test against album-catalog

```bash
# Create a test album
ALBUM_ID=$(curl -sf -X PUT http://localhost:3001/albums \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test","artist":"CI Bot","releaseYear":2026,"genre":"Test"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created album id: $ALBUM_ID"

# Read it back
curl -sf "http://localhost:3001/albums/$ALBUM_ID" | python3 -m json.tool

# Delete the test album
curl -sf -X DELETE "http://localhost:3001/albums/$ALBUM_ID"
echo "Smoke test clean-up done"
```

### 1.4 Confirm nginx staging config

```bash
# Dry-run the staged nginx config
sudo nginx -t

# Print the upstream block that will be activated — verify it reads album-catalog
grep -A 10 'upstream album_backend' /etc/nginx/sites-available/album-catalog-staging
```

Expected upstream block (see Phase 2 for the exact config).

---

## Phase 2: Traffic Migration (T-0)

Traffic moves in three steps: 10% → 50% → 100%. Wait at least **5 minutes**
between each step and verify error rate before advancing.

### Nginx upstream configuration

Edit `/etc/nginx/conf.d/album-backends.conf`:

```nginx
# Step 1 — 10% to album-catalog
upstream album_backend {
    server localhost:8080 weight=9;   # monolith
    server localhost:3001 weight=1;   # album-catalog
    keepalive 32;
}

# Step 2 — 50% to album-catalog (comment out step 1, uncomment this)
# upstream album_backend {
#     server localhost:8080 weight=1;
#     server localhost:3001 weight=1;
#     keepalive 32;
# }

# Step 3 — 100% to album-catalog (comment out all above, uncomment this)
# upstream album_backend {
#     server localhost:3001 weight=1;
#     keepalive 32;
# }
```

Edit `/etc/nginx/sites-available/spring-music` — add proxy to upstream:

```nginx
server {
    listen 80;
    server_name _;

    # Route /albums/* and /actuator/* to backend pool
    location ~ ^/(albums|actuator)(/.*)?$ {
        proxy_pass         http://album_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   Connection        "";
        proxy_read_timeout 30s;
    }

    # React 19 SPA — serve from static dir or upstream
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### Step-by-step traffic migration commands

```bash
# ---- STEP 1: 10% -------------------------------------------------------
# Edit /etc/nginx/conf.d/album-backends.conf: weight=9 monolith, weight=1 new

sudo nginx -t && sudo nginx -s reload
echo "$(date -u) — Step 1: 10% traffic to album-catalog" | tee -a /var/log/cutover.log

# Wait 5 minutes, then check:
sleep 300
curl -sf http://localhost/albums > /dev/null && echo "GET /albums OK" || echo "GET /albums FAILED"

# ---- STEP 2: 50% -------------------------------------------------------
# Edit /etc/nginx/conf.d/album-backends.conf: weight=1 / weight=1

sudo nginx -t && sudo nginx -s reload
echo "$(date -u) — Step 2: 50% traffic to album-catalog" | tee -a /var/log/cutover.log

sleep 300

# ---- STEP 3: 100% ------------------------------------------------------
# Edit /etc/nginx/conf.d/album-backends.conf: remove monolith upstream entry

sudo nginx -t && sudo nginx -s reload
echo "$(date -u) — Step 3: 100% traffic to album-catalog" | tee -a /var/log/cutover.log
```

---

## Phase 3: Post-Cutover Verification (T+15 min)

After reaching 100%, run all checks. Allocate 15 minutes before declaring
the cutover successful.

### 3.1 Health and smoke checks

```bash
# album-catalog health
curl -sf http://localhost:3001/health
# Expected: {"status":"ok"}

# Actuator (replaces /appinfo)
curl -sf http://localhost/actuator/info | python3 -m json.tool

# Full list
curl -sf http://localhost/albums | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Album count: {len(data)}')
print(f'First album: {data[0]}')
"
```

### 3.2 ACL compliance check (run this every time)

```bash
curl -sf http://localhost/albums | python3 -c "
import sys, json
data = json.load(sys.stdin)
violations = []
for a in data:
    if 'albumId' in a:
        violations.append(f'albumId present in album id={a[\"id\"]}')
    if not isinstance(a.get('releaseYear'), int):
        violations.append(f'releaseYear not int in album id={a[\"id\"]}')
if violations:
    print('ACL VIOLATIONS DETECTED:')
    for v in violations: print(f'  - {v}')
    sys.exit(1)
else:
    print(f'ACL OK — {len(data)} albums checked')
"
```

**If any ACL violation is found: trigger rollback immediately.**

### 3.3 Response shape comparison

Compare one album between old and new service to confirm the ACL transformation:

```bash
# Sample one album id from new service
SAMPLE_ID=$(curl -sf http://localhost/albums | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# New service shape (expected)
echo "=== New service ==="
curl -sf "http://localhost:3001/albums/$SAMPLE_ID" | python3 -m json.tool

# Monolith shape (for reference — monolith should still be running on 8080)
echo "=== Monolith (reference) ==="
curl -sf "http://localhost:8080/albums/$SAMPLE_ID" | python3 -m json.tool
```

Expected differences:
- New service: `releaseYear` is integer, no `albumId` field
- Monolith: `releaseYear` is string, `albumId` is null

### 3.4 Error rate check

```bash
# Check nginx access log error rate for last 5 minutes
awk -v cutoff="$(date -u -d '5 minutes ago' '+%d/%b/%Y:%H:%M')" \
  '$4 > "["cutoff && $9 ~ /^5/' \
  /var/log/nginx/access.log | wc -l
# Must be 0 or within acceptable threshold (< 0.1% of request volume)
```

---

## Rollback Procedure

**Rollback SLA: 5 minutes from trigger to full traffic on monolith.**

### Rollback triggers — roll back if ANY of these fire:

| # | Trigger | How to detect |
|---|---------|---------------|
| 1 | Error rate > 1% in any 5-minute window | nginx error log count / total requests |
| 2 | `GET /albums` response contains `albumId` field | ACL check script returns non-zero |
| 3 | `releaseYear` is a string type in any `/albums` response | ACL check script returns non-zero |
| 4 | album-catalog `/health` returns non-200 for > 30 seconds | curl returns non-200 |
| 5 | Any data loss: album count after cutover < album count before | pre-recorded baseline count |

### Rollback commands

```bash
# ---- IMMEDIATE: route all traffic back to monolith ----------------------

# Option A — fastest: override upstream to 100% monolith
cat > /etc/nginx/conf.d/album-backends.conf << 'EOF'
upstream album_backend {
    server localhost:8080 weight=1;
    keepalive 32;
}
EOF

sudo nginx -t && sudo nginx -s reload
echo "$(date -u) — ROLLBACK: 100% traffic returned to monolith" | tee -a /var/log/cutover.log

# Option B — if you tagged the pre-cutover config:
# git checkout pre-cutover-nginx -- /etc/nginx/conf.d/album-backends.conf
# sudo nginx -t && sudo nginx -s reload

# ---- VERIFY rollback is in effect ---------------------------------------
curl -sf http://localhost/albums | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Monolith returns releaseYear as string — confirm rollback
sample = data[0]
assert isinstance(sample['releaseYear'], str), 'releaseYear is not string — still hitting new service!'
print(f'Rollback confirmed — releaseYear={sample[\"releaseYear\"]} (string, as expected from monolith)')
"
```

**After rollback completes:**
1. Post in #album-catalog-cutover: "ROLLBACK COMPLETE at {timestamp}. Trigger: {which trigger fired}."
2. Page on-call engineer if not already on the call.
3. Do not reattempt cutover until root cause is identified and fixed.

---

## Decision Tree

```
START: Are you at T-0 (beginning cutover)?
│
├── NO: Go to Phase 1 (Pre-Cutover Validation) first.
│
└── YES
    │
    ▼
[1] Run ACL check on album-catalog
    │
    ├── FAIL → STOP. Do not proceed. Fix ACL violation in album-catalog.
    │
    └── PASS
        │
        ▼
[2] Activate 10% routing (nginx reload)
    │
    ▼
[3] Wait 5 minutes. Check error rate.
    │
    ├── Error rate > 1%  ──────────────────────────────→ ROLLBACK (trigger 1)
    ├── ACL violation detected ─────────────────────→ ROLLBACK (trigger 2 or 3)
    │
    └── All clear
        │
        ▼
[4] Activate 50% routing (nginx reload)
    │
    ▼
[5] Wait 5 minutes. Check error rate + ACL.
    │
    ├── Error rate > 1%  ──────────────────────────────→ ROLLBACK
    ├── ACL violation ──────────────────────────────→ ROLLBACK
    │
    └── All clear
        │
        ▼
[6] Activate 100% routing (nginx reload)
    │
    ▼
[7] Post-cutover verification (T+15 min)
    │
    ├── Health check FAIL > 30s  ───────────────────→ ROLLBACK (trigger 4)
    ├── Album count mismatch  ──────────────────────→ ROLLBACK (trigger 5)
    ├── ACL violation  ─────────────────────────────→ ROLLBACK (trigger 2 or 3)
    │
    └── All checks PASS
        │
        ▼
    CUTOVER COMPLETE — announce in #album-catalog-cutover
    Start post-mortem template (see below)
```

---

## Contact List

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| On-call engineer (primary) | _________________ | _________________ | @_________________ |
| On-call engineer (secondary) | _________________ | _________________ | @_________________ |
| DB admin | _________________ | _________________ | @_________________ |
| Frontend lead (project-phoenix) | _________________ | _________________ | @_________________ |
| Platform lead | _________________ | _________________ | @_________________ |
| Product owner | _________________ | _________________ | @_________________ |

**Escalation path:** On-call primary → On-call secondary → Platform lead → Product owner

**Incident channel:** `#album-catalog-cutover`  
**Runbook location:** `runbook/cutover.md` in the monorepo  

---

## Post-Mortem Template

Fill in within 48 hours of cutover completion (or immediately after rollback).

```
## Cutover Post-Mortem — Album Catalog Service

**Date:** _______________
**Duration:** _______________  (T-0 to "CUTOVER COMPLETE" or "ROLLBACK COMPLETE")
**Outcome:** [ ] SUCCESS  [ ] ROLLBACK

### Timeline

| Time (UTC) | Event |
|------------|-------|
| | Pre-cutover validation started |
| | 10% routing activated |
| | 50% routing activated |
| | 100% routing activated |
| | (if rollback) Trigger fired: _______________ |
| | Cutover complete / Rollback complete |

### What went well

-
-

### What went wrong (if rollback)

-
-

### Root cause (if rollback)

-

### ACL compliance at cutover

- albumId absent from responses: [ ] YES  [ ] NO
- releaseYear as integer:        [ ] YES  [ ] NO
- Album count matched monolith:  [ ] YES  [ ] NO — Monolith: ___ | New: ___

### Action items

| Action | Owner | Due |
|--------|-------|-----|
| | | |

### Next cutover attempt (if rollback occurred)

Scheduled: _______________
Blocker resolved: _______________
```
