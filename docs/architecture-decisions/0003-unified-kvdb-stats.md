# 3. Unified KVDB Storage for Visitor Stats

Date: 2025-12-23
Status: Accepted

## Context
The visitor counting mechanism (`api/visit.php`) was failing due to inconsistent data storage and potential breaches of Retinbox KV Database limits (64KB per value). Additionally, the separation of frontend visit counting and backend statistics (`api/stats.php`) led to data synchronization issues.

## Decision
1. **Unified Storage**: Both `api/visit.php` and `api/stats.php` will share the same storage backend (`shadowsky_stats`).
2. **KVDB Abstraction**: A shared `KVDB` class (in `api/db_helper.php`) handles the interface with Retinbox's native `Database` class, providing a robust file-based fallback for local development or non-Retinbox environments.
3. **Data Sharding**: To comply with Retinbox's 64KB limit:
   - `visit_stats` (Aggregated counters): Stored as a single key. Pruned to 365 days and 200 top pages.
   - `visit_logs` (Raw entries): Stored as a separate key. Capped at the last 50 entries.
4. **Absolute Paths**: All file inclusions use strict absolute paths (e.g., `api/db_helper.php`) to align with Retinbox best practices.

## Consequences
- **Pros**: 
  - Resolves "Visitor Count Failure" and 64KB limit errors.
  - Ensures data consistency between Admin Dashboard and Frontend Counter.
  - Compliant with Retinbox hosting documentation (`AGENTS.md`).
- **Cons**: 
  - Limits raw log history to 50 entries (acceptable for this scale).
  - Requires `api/` directory to be deployed to Retinbox for Cloud Function support.

## Compliance
This decision strictly adheres to `AGENTS.md` regarding Database usage and pathing conventions.
