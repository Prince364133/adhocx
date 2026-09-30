# 03 — API & DAST (OWASP ZAP) Security Evidence Drop-Zone

**Target Component:** AdhocX REST APIs (`apps/api`) & Web Interfaces (`apps/admin`, `apps/marketing`)  
**Standard:** OWASP Top 10 API Security Risks (BOLA, Broken Auth, Injection, Rate Limiting)  

---

## 1. Required Files in this Folder

The backend & QA engineering team must deposit:

1. `zap_api_scan_report.html` (or `.json`): The OWASP ZAP full automated scan report executed against the **Staging API** (`https://staging-api.adhocx.com`).
2. `postman_bola_idor_run_results.json`: Newman CLI test execution output testing Broken Object-Level Authorization (Driver A vs Driver B, Vendor A vs Vendor B).
3. `swagger_staging_sanitized.json`: OpenAPI/Swagger definition of all endpoints used for the active API fuzzer scan.
4. `rate_limiting_test_output.log`: Automated cURL / Python script output demonstrating HTTP 429 Too Many Requests enforcement.

---

## 2. Strict Rules of Engagement

> [!CAUTION]
> **NO AUTOMATED SCANNING OR INTRUSIVE FUZZING AGAINST PRODUCTION.**
> - All scans must target `https://staging-api.adhocx.com`.
> - Use dedicated test phone numbers and sandboxed Razorpay keys (`rzp_test_*`).
> - Production testing is limited to passive inspections (TLS ciphers, SSL Labs, SecurityHeaders.com).

---

## 3. Running OWASP ZAP API Scan via Docker

```bash
# 1. Run OWASP ZAP OpenAPI Scan against Staging
docker run -v $(pwd)/audit_evidence/03_api_dast_owasp_zap:/zap/wrk/:rw \
  -t ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t /zap/wrk/swagger_staging_sanitized.json \
  -f openapi \
  -r zap_api_scan_report.html \
  -J zap_api_scan_report.json

# 2. Run Postman BOLA/IDOR Newman test collection
npx newman run tests/security/adhocx_bola_security_collection.json \
  -e tests/security/staging.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export audit_evidence/03_api_dast_owasp_zap/postman_bola_idor_run_results.json
```

---

## 4. Mandatory Acceptance Criteria for API Sign-Off

- **Zero Critical / Zero High Vulnerabilities** remaining in ZAP report.
- Every private endpoint rejects unauthenticated requests with HTTP 401.
- Role-based access control (Admin, Vendor, Driver) rejects cross-role access with HTTP 403.
- Parameter tampering on entity IDs (`:id`) returns 403/404 without data leakage.
- Stack traces, database SQL snippets, and internal IPs are completely absent from all error responses.
