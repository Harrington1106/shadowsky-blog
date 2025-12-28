# ADR 0005: Bangumi API Integration & Security Enforcement

## Context
The project requires displaying the user's anime and manga collections from Bangumi.tv on the video interface. This involves:
1.  Fetching data from Bangumi API.
2.  Storing credentials securely.
3.  Synchronizing data to a local JSON file for frontend consumption.
4.  Exposing settings management via the Admin interface.

## Decision

### 1. Data Flow
- **Source**: Bangumi API (`api.bgm.tv`).
- **Sync Agent**: `api/sync_bangumi.php` (PHP script).
- **Storage**: `public/data/media.json` (Public read-only for frontend).
- **Frontend**: `js/media-data.js` reads `media.json` and renders via `MediaLoader`.

### 2. Configuration Management
- **Settings File**: `api/settings.json`.
- **Fields**: `bangumi_username`, `bangumi_token`.
- **Security**: The settings file contains sensitive tokens.
    - **Access Control**: Direct web access to `api/settings.json` SHOULD be blocked by web server config (Nginx/Apache).
    - **API Access**: `api/get_settings.php` and `api/save_settings.php` act as gateways.

### 3. Security Enforcement
- **Authentication**: All management APIs (`save_settings.php`, `get_settings.php`, `sync_bangumi.php`) MUST verify the `x-admin-token` header.
- **Implementation**:
    - Use `api/auth.php` shared module.
    - Server token stored in `.env` as `ADMIN_TOKEN`.
    - Client sends token via `safeFetch` in `admin.js`.
- **Rationale**: Prevents unauthorized modification of settings or triggering of sync tasks.

### 4. Frontend Integration
- **ACG Page**: `acg.html` uses `MediaLoader` to fetch and display data.
- **Limit**: Home/ACG page displays a limited number of items (e.g., 6) for performance.

## Status
Accepted and Implemented.

## Consequences
- **Positive**: Secure management of Bangumi settings; efficient static delivery of media data.
- **Negative**: Requires `ADMIN_TOKEN` setup in `.env`; `settings.json` needs web server rule protection (outside PHP scope).
