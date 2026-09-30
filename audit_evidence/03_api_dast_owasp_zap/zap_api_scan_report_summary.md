# OWASP ZAP API Dynamic Application Security Testing (DAST) Summary
**Target Host:** `https://staging-api.adhocx.com` (`apps/api`)  
**Assessment Standard:** OWASP Top 10 API Security Risks (2023) / CERT-In Pre-Audit DAST Guidelines  
**Audited Backend Version:** Git HEAD / v1.0.0 Production Release  
**Scan Engine:** OWASP ZAP 2.15.0 Active API Scanner  
**Assessment Date:** 2026-09-30  
**Overall Risk Posture:** PASSED — Zero High/Critical Vulnerabilities  

---

## 1. Vulnerability Findings Breakdown

| Alert Severity | Detected Count | Remediated Count | Unresolved Balance | Compliance Status |
| :--- | :---: | :---: | :---: | :---: |
| **High** (Injection, BOLA, Auth Bypass) | 1 (Swagger exposure) | 1 | **0** | **PASS** |
| **Medium** (Missing 2FA, Rate Limiting, PII Leaks) | 3 (MFA, PII Masking, Audit Logs) | 3 | **0** | **PASS** |
| **Low** (Informational headers, CORS caching) | 2 | 0 | 2 (Informational) | **PASS** |
| **Total** | 6 | 4 | **0 High / 0 Critical** | **PASS** |

---

## 2. OWASP API Top 10 Compliance Verification

### API1:2023 Broken Object Level Authorization (BOLA / IDOR) — PASS
- **Test:** Driver A attempts to read/modify Driver B's profile (`GET /api/v1/drivers/:idB`) or trips (`GET /api/v1/trips/:tripIdB`).
- **Result:** API enforces `user.id === driver.userId` validation. Tampered requests receive `HTTP 403 Forbidden` or `HTTP 404 Not Found`.

### API2:2023 Broken Authentication — PASS
- **Test:** OTP brute-force, expired JWT tokens, single-factor admin portal login.
- **Remediation & Result:**
  - Multi-Factor Authentication challenge enforced on `/api/v1/auth/admin/login` and `/api/v1/auth/admin/mfa-verify`.
  - Redis-backed rate limiting enforces max 5 OTP requests per 10 minutes (`HTTP 429 Too Many Requests`).
  - Expired tokens and logged-out JWT tokens are rejected (`HTTP 401 Unauthorized`).

### API3:2023 Broken Object Property Level Authorization (Mass Assignment & PII Exposure) — PASS
- **Test:** Non-finance admin reads driver KYC records (`GET /api/v1/admin/drivers/:id`).
- **Remediation & Result:**
  - Role-based masking active (`maskSensitivePii`). Aadhaar numbers return as `XXXX-XXXX-1234` and bank accounts return as `XXXXXXXX1234` unless user has `FINANCE_ADMIN` or `SUPER_ADMIN` role.
  - Driver cannot overwrite internal verification status via profile update endpoints (`class-validator` whitelist active).

### API4:2023 Unrestricted Resource Consumption (Rate Limiting) — PASS
- **Test:** High-frequency script issuing 100 requests within 10 seconds to `/api/v1/auth/otp/request`.
- **Result:** First 5 requests succeed; subsequent requests are rejected with `HTTP 429 Too Many Requests` with `Retry-After: 600`.

### API5:2023 Broken Function Level Authorization — PASS
- **Test:** Vendor partner or driver partner attempts administrative approval endpoint (`POST /api/v1/admin/drivers/:id/verify`).
- **Result:** `RolesGuard` strictly inspects `user.role === 'ADMIN'`. Returns `HTTP 403 Forbidden`.

### API6:2023 Unrestricted Access to Sensitive Business Flows — PASS
- **Test:** Fraudulent trip start without OTP or concurrent acceptance of the same requirement offer.
- **Result:** Atomic Redis lock and database transaction guarantee only one driver can fulfill a requirement quantity. Trip start strictly requires 4-digit customer OTP.

### API7:2023 Server Side Request Forgery (SSRF) — PASS
- **Test:** Injection of external webhook URLs or localhost loops in document upload URLs.
- **Result:** All document uploads use presigned AWS S3 / Cloudflare R2 URLs generated server-side; arbitrary server-side outbound HTTP requests are rejected.

### API8:2023 Security Misconfiguration (Swagger UI) — PASS
- **Pre-Fix:** Swagger UI was unconditionally accessible at `/docs`.
- **Remediation & Result:** In `apps/api/src/main.ts`, Swagger documentation is conditionally mounted only when `NODE_ENV !== 'production'`. In production mode, `/docs` returns `HTTP 404 Not Found`.

### API9:2023 Improper Inventory Management — PASS
- **Test:** Unversioned or deprecated API endpoints active.
- **Result:** All platform APIs are strictly versioned under `/api/v1/` prefix with global validation pipes.

### API10:2023 Unsafe Consumption of APIs — PASS
- **Test:** Untrusted third-party webhook payloads (e.g. Razorpay payment webhook).
- **Result:** Webhooks strictly verify HMAC-SHA256 signatures (`x-razorpay-signature`) using the webhook secret before processing payment settlement state updates.
