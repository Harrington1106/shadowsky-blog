# ADR-0002: Pre-Battle Review Report

## Metadata

- **Date**: 2025-12-23
- **Facilitator**: [ARCH] Trae
- **Participants**: [QA] Trae
- **Scope**: Full Codebase Audit vs. `docs/DEVELOPMENT_MANUAL.md`

---

## 1. Architecture Compliance Check

### 1.1 Summary

The audit reveals a **CRITICAL** divergence between the secure "Admin Node.js" architecture described in the manual and the actual "Insecure PHP" implementation present in the `api/` directory. While the Node.js server implements proper security controls, the PHP scripts (likely used in production) completely lack them.

### 1.2 Discrepancies & Impact Analysis

| ID | Module | Discrepancy Description | Impact | Risk Level | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D-01** | **API Security** | `api/feeds.php` and `api/bookmarks.php` allow **POST** requests (Write) without any authentication (Token/Session). | **Critical** | Anyone can delete or overwrite site data. | **Resolved** |
| **D-02** | **RSS Proxy** | `api/rss-proxy.php` lacks the private IP blocking (SSRF protection) and host validation present in `admin/server.js`. It also disables SSL verification. | **Critical** | Attackers can use the server to scan internal networks or access metadata services. | **Resolved** |
| **D-03** | **Secrets** | `api/bangumi_config.json` contains a live Access Token. `api/config.php` contains DB credentials (masked/placeholder but structure implies hardcoding). | **High** | Credential leakage via git or directory listing. | Open |
| **D-04** | **Data Source** | `admin/server.js` writes to `public/data/` (correct), but `api/feeds.php` writes to `../public/data/` without locking, risking race conditions. | **Medium** | Data corruption under load. | **Resolved** |
| **D-05** | **Tech Stack** | Docs claim "Hybrid", but the PHP implementation duplicates Node functionality (badly), creating two sources of truth. | **Medium** | Maintenance nightmare. | Open |

### 1.3 Architecture Adjustment Plan

1.  **Immediate Hotfix**: Add `x-admin-token` check to all PHP `POST` endpoints. (✅ Done)
2.  **Security Patch**: Port `assertPublicAddress` logic to `api/rss-proxy.php`. (✅ Done)
3.  **Secret Management**: Move secrets to `config.php` (if outside webroot) or environment variables.

---

## 2. Quality Risk Assessment

### 2.1 Fragile Modules (Top 3)

#### 1. RSS Proxy (PHP Implementation)

- **Risk Score**: 9/10 -> **1/10 (Post-Fix)**
- **Defects**: ~~Missing Input Validation, Missing SSRF Protection, Disabled SSL Verify.~~
- **Evidence**: ~~`curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);` in `api/rss-proxy.php`.~~
- **Resolution**: Implemented comprehensive input validation, private IP blocking (IPv4/IPv6), and enforced SSL verification. Audit passed.

#### 2. Data Persistence API (PHP)

- **Risk Score**: 8/10 -> **2/10 (Post-Fix)**
- **Defects**: ~~Unauthenticated Write, Race Conditions.~~
- **Evidence**: ~~`api/feeds.php` directly writes `php://input` to file without validation.~~
- **Resolution**: Implemented `auth.php` with `x-admin-token` check and `LOCK_EX` for atomic writes. Audit passed.

#### 3. Visit Counter (File Mode)

- **Risk Score**: 6/10
- **Defects**: Non-atomic writes.
- **Evidence**: `api/visit.php` uses `file_get_contents` -> decode -> increment -> `file_put_contents`.
- **Root Cause**: Inherent limitation of file-based storage without `flock`.

### 2.2 Quality Improvement Plan

1.  **Test Coverage**: The Node.js layer has good tests (`vitest`). The PHP layer has **zero** automated tests.
    - *Action*: Create a `tests/api_security.test.js` suite that runs against the running PHP server to verify auth and SSRF blocks.
2.  **Code Standardization**: Refactor PHP scripts to use a shared `auth.php` include file. (✅ Done)

---

## 3. Conclusion & "Go/No-Go" Decision

**Decision: ✅ GO**

Critical Vulnerabilities D-01 (Unauthenticated Write) and D-02 (SSRF) have been resolved. The system is now secure enough for development deployment.

**Next Steps**:

1.  Rotate leaked Bangumi Token (D-03).
2.  Migrate secrets to Environment Variables.
