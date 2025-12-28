# 4. Adopt Dedicated API Subdomain

Date: 2025-12-23
Status: Accepted

## Context
Static site is hosted at `shadowquake.top`. Dynamic APIs need to run on PHP (Aliyun) and be addressable without cross-origin or mixed-content pitfalls. Previous relative `/api` calls on the static host returned 404.

## Decision
Use a dedicated API subdomain `https://api.shadowquake.top/api` for all frontend requests. Frontend auto-detects `shadowquake.top` and routes to the API subdomain. Backend PHP includes use `__DIR__` to avoid path resolution errors.

## Implementation
- Frontend: `js/api.js` sets `API_CONFIG.baseUrl = https://api.shadowquake.top/api` when hostname matches `shadowquake.top`.
- Frontend: `js/main.js` composes URLs via `API_CONFIG.baseUrl` and includes fallback to `stats.php`.
- Backend: `api/visit.php` and `api/stats.php` use `require_once __DIR__ . '/cors.php'` and `db_helper.php`.
- SW: `sw.js` version bumped to `v5` and skips `/api` requests.

## Consequences
Pros:
- Eliminates 404 on the static host.
- Simplifies CORS: allow `https://shadowquake.top` in `api/cors.php`.
- Clear separation of concerns: static vs dynamic.

Cons:
- Requires TLS and DNS management for the API subdomain.
- Security gateway must disable challenges for `/api/` paths to preserve JSON.

## Links
- `js/api.js:13–24`
- `js/main.js:114–176`
- `api/visit.php:9–10`
- `api/stats.php:8–9`
- `sw.js:9`
