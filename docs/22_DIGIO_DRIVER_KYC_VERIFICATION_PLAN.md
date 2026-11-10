# 22 — Digio Driver KYC: Production Readiness, Test & Simulation Plan

**Status:** Plan of record · **Date:** 2026-11-10 · **Scope:** driver identity, driving licence, vehicle RC and payout verification only (corporate KYB is out of scope)
**Code:** `apps/api/src/modules/digio/*`, `apps/api/src/modules/admin/admin.service.ts`, `apps/admin/src/components/verifications/*`, `apps/mobile/lib/**` (onboarding + KYC screens)
**Builds on:** commits `f71edde` and `efc965c` (Digio integration and the first driver-scope completion pass)

---

## 0. TL;DR

The integration is broad, and its endpoint paths and request fields match Digio's published Swagger specs. It is **not production-ready yet**, for reasons the existing tests can't catch:

| # | Severity | Gap | Why it matters |
|---|---|---|---|
| G1 | **High (security)** | `DIGIO_WEBHOOK_SECRET` is empty in this environment, and the webhook handler then accepts any caller (unknown IPs are only logged) | Anyone can trigger outbound Digio calls for known request ids |
| G2 | **High (availability)** | The webhook syncs inline (Digio `/response`, 30 s client timeout) before answering | Digio needs a 200 within **10 s**; after 24 h of failures it **disables webhooks for the whole account** |
| G3 | **High (cost)** | No rate limit on any Digio route, and no reuse of an earlier successful result | Every call is billed; a retry loop or a malicious driver runs up the bill without limit |
| G4 | **High (compliance)** | Aadhaar masking and OCR send `consent: "yes"` to Digio without ever capturing the driver's consent | UIDAI and DPDP Act require explicit, recorded consent before Aadhaar processing |
| G5 | **High (trust & safety)** | An admin can approve a driver whose DL is expired, whose RC is blacklisted or expired, or whose liveness/face match failed. The server only writes a summary to the audit log | Unsafe drivers can go live with no recorded justification |
| G6 | Medium (correctness) | Face match lets the score override Digio's verdict, and reads `result` but not `match_result` | A `not_matched` response with a high score is recorded as VERIFIED |
| G7 | Medium (data integrity) | The mobile vehicle step submits a fabricated licence number (`DL-<plate>` / `DL-PENDING`) when the driver did not verify a DL | A fake DL number is stored and later sent to Digio (billed, always fails) |
| G8 | Medium (test validity) | The workflow simulations mock `DigioClient` methods with **invented response shapes** (e.g. liveness `score: 0.98`, face match `result: "MATCHED"`) | Tests pass while production parsing could break; the HTTP layer (URL, auth, multipart) is never exercised |

Phases 1–3 below fix G1–G8 and replace the invented mocks with **contract fixtures taken verbatim from Digio's own Swagger examples**.

**Progress (2026-11-10):** Phase 1 and Phase 2 are **done and tested** (§8). Building the contract tests exposed a ninth, safety-critical bug:

| # | Severity | Gap | Status |
|---|---|---|---|
| G9 | **Critical (trust & safety)** | Liveness treated `score >= 0.5` as live, but Digio's score is 0–100. Digio's own spoof example `{score: 12, result: "FAIL", errors: ["Photo of photo detected"]}` was recorded as a **live selfie**. The old simulation used an invented `score: 0.98` and could not catch it | **Fixed**: Digio's verdict wins; the score fallback uses the 0–100 scale |

Also fixed: PAN was marked verified whenever a name came back, even when the status was `INVALID`. A DL/RC that **failed** verification raised no admin alert at all; only a verified-but-expired one did.

Phase 3 (live production probe) needs the owner's approval and the dashboard webhook setup (§5).

---

## 1. What Digio's documentation specifies (source of truth)

Docs: <https://documentation.digio.in/> (DigiKYC, DigiStudio, Webhooks). The API references are Swagger files under `/swagger/*.json`. The paths, field names and example responses below come from those files, fetched 2026-11-10.

### 1.1 Environments and auth

| | Sandbox | Production |
|---|---|---|
| API base | `https://ext.digio.in:444` | `https://api.digio.in` |
| Gateway (front end) | `https://ext.digio.in` | `https://app.digio.in` |
| Webhook source IPs | 35.154.20.28 | 13.126.198.236, 52.66.66.81 |

Auth is HTTP Basic `client_id:client_secret`. Sandbox and production credentials are separate. **Production credentials must live only in the secret store / env (`DIGIO_CLIENT_ID`, `DIGIO_CLIENT_SECRET`), never in the repo or docs.** The production pair was shared in chat on 2026-11-10: rotate it once the integration is live.

### 1.2 Endpoints used for driver KYC

| Purpose | Method + path | Request (required*) | Response notes |
|---|---|---|---|
| PAN / DL lookup | `POST /v3/client/kyc/fetch_id_data/{PAN\|DRIVING_LICENSE\|…}` | `id_no*`, `name`, `dob`, `unique_request_id` | DL keys are **human-readable with spaces**: `"Holder's Name"`, `"Transport"`, `"Non-Transport"`, `"Current Status"`, `"Date of Issue"`, `"Old / New DL No."`, `"Hazardous Valid Till"` |
| Vehicle RC (Vahan) | `POST /client/v4/apis/verify/vehicle_rc` | `id*` (RC number), `unique_request_id` | `vehicle_details.fit_up_to`, `finance_details.insurance_upto`, `permit_details.{permit_valid_upto, national_permit_upto, pucc_upto, blacklist_status}`; several fields can be empty strings |
| ID OCR + verify + mask | `POST /v4/client/kyc/analyze/file/idcard` (multipart) | `front_part*`, `back_part*`, `additional_request` (JSON) | `detections[].{id_type, id_attributes, output_images (base64), *_image_checks_result, verification_result}` |
| Aadhaar masking | `POST /v4/client/kyc/aadhaar/file/mask` (multipart) | `file*`, `consent*` (`yes`/`no`) | masked file |
| Liveness | `POST /v3/client/kyc/analyze/file/liveness` (multipart) | `image*` | `{score: 90, result: "PASS"}` / `{score: 12, result: "FAIL", errors: [...]}` (integer score 0–100) |
| Face match | `POST /v3/client/kyc/facematch` (multipart) | `file1`, `file2`, `minimum_match` | **Inconsistent keys:** matched → `{confidence: 90, match_result: "matched"}`; not matched → `{confidence: 40, result: "not_matched"}`; failed → `{confidence: 0, result: "failed"}` |
| Fuzzy name match | `POST /v3/client/kyc/fuzzy_match` | `source.text`, `target.text`, `context*` (`name`\|`address`), `confidence` | `{matched: bool, match_score: int}` |
| IFSC | `POST /v3/client/kyc/verify/IFSC` | `identifier*` | bank/branch |
| Bank account | `POST /v4/client/verify/bank_account` | `beneficiary_account_no*`, `beneficiary_ifsc*`, `beneficiary_name`, `validation_mode` (`PENNY_LESS`\|`PENNY_DROP`\|`AUTO`) | holder name + status |
| UPI VPA | `POST /v3/client/public/upi/check_vpa` | `virtual_address`, `name` | holder name |
| DigiLocker (DigiStudio) | `POST /client/kyc/v2/request/with_template` | `customer_identifier*`, `template_name*` (`DIGILOCKER_AADHAAR_PAN`), `generate_access_token` | request id + access token → gateway URL |
| Request status | `POST /client/kyc/v2/{id}/response?detail_response=true` | — | authoritative state |
| Media | `GET /client/kyc/v2/media/{id}?doc_type=&xml=&base64=` | — | file |
| Approve/reject | `POST /client/kyc/v2/request/{id}/manage_approval` | `status` | — |
| Purge | `POST /client/kyc/purge/{id}` | — | deletes KYC data at Digio |

### 1.3 Webhooks (Digio contract)

* `POST` with JSON `{id, created_at, event, entities, payload}`. Delivery is **at least once**, so handlers must be idempotent on `id`.
* Authenticity: `X-Digio-Checksum` = **HMAC-SHA256 hex of the raw body**, keyed with the account-level secret set in the Enterprise dashboard (separate secrets for sandbox and production).
* Must return **200 within 10 s**. Retries: 5 in the first hour, then hourly for 24 h. **After 24 h of failures, webhooks are disabled for the whole account.** Digio's guidance: do no business logic in the receiver, and always return 200 (log unknown entities).
* Production latency is about 5 s on average.

---

## 2. Status by area (driver scope)

Legend: ✅ done · 🟡 partial · ⛔ missing · 🚫 out of scope

| Area | API | Admin | Mobile | Notes |
|---|---|---|---|---|
| PAN verify | ✅ | ✅ | ✅ | |
| DL verify (Transport COV, expiry) | ✅ | ✅ | ✅ | G7 fixed: no fabricated DL number or expiry |
| Vehicle RC (fitness, insurance, permit, PUCC, blacklist) | ✅ | ✅ | ✅ | |
| ID OCR (per-document keys `ID_OCR_{AADHAAR,PAN,DL,RC}`) | ✅ | — | ✅ | |
| Aadhaar masking | ✅ | ✅ | ✅ | G4 fixed: consent captured and enforced |
| Liveness | ✅ | ✅ | ✅ | G9 fixed (score scale) |
| Face match | ✅ | ✅ | ✅ | G6 fixed (verdict wins) |
| Fuzzy name cross-check | ✅ | ✅ | — | |
| DigiLocker + media pull | ✅ | ✅ | ✅ | needs the `DIGILOCKER_AADHAAR_PAN` template enabled on the account (check with the live probe, §5) |
| Bank / IFSC / UPI | ✅ | ✅ | ✅ | |
| Webhooks | ✅ | — | — | G1/G2 fixed; **needs `DIGIO_WEBHOOK_SECRET` + dashboard setup** |
| Cost controls (rate limit, reuse) | ✅ | — | ✅ (429 message) | G3 fixed |
| Approval guard | ✅ | ✅ (override reason) | — | G5 fixed; quick-approve on cards cannot take a reason, so it sends the admin to the detail view |
| Data retention (Digio purge, DPDP) | ⛔ | — | — | Phase 4 |
| Offline Aadhaar XML (OKYC) | ⛔ | — | — | optional fallback, Phase 4 |
| Corporate KYB (GST/CIN/DIN/Udyam/FSSAI) | 🚫 | 🚫 (hidden) | 🚫 (removed) | |

---

## 3. Phase 1: Production blockers (API + one mobile fix)

| Item | Change | Acceptance test |
|---|---|---|
| **1.1 Webhook auth** (G1) | In production, a missing `DIGIO_WEBHOOK_SECRET` means webhooks are **acknowledged and ignored** (200, logged as an error, no Digio calls). Polling and explicit sync still work. With a secret, an invalid checksum → 401 | no-secret + production → no outbound call; bad checksum → 401; good checksum → accepted |
| **1.2 Fast ack + idempotency** (G2) | The receiver verifies the signature, records the webhook `id` (Redis `SET NX`, 24 h), responds 200 at once, and syncs in the background; duplicate ids are acknowledged without work | handler returns before a 30 s sync resolves; duplicate id → one sync |
| **1.3 Rate limits** (G3) | Per user, per Digio action (Redis fixed window): default 10/hour and 30/day; admins exempt; 429 with `Retry-After`. Env-tunable (`DIGIO_RATE_LIMIT_PER_HOUR`, `DIGIO_RATE_LIMIT_PER_DAY`) | 11th call in an hour → 429, no Digio call |
| **1.4 Result reuse** (G3) | Identifier-based checks (PAN, DL, RC, IFSC, bank, VPA): a VERIFIED result for the same driver + type + identifier within `DIGIO_REUSE_DAYS` (default 30) is returned without calling Digio; admin `force: true` bypasses it | second identical PAN check → no Digio call, `reused: true` |
| **1.5 Aadhaar consent** (G4) | Aadhaar masking, Aadhaar OCR and DigiLocker require `consent: true` from the caller; consent time, text version and IP are stored in the verification record; requests without consent → 400 | missing consent → 400 and no Digio call |
| **1.6 Approval guard** (G5) | `verifyDriver` computes blocking issues from the latest Digio records (DL expired/invalid, no transport class, RC blacklisted/expired fitness/insurance, liveness FAIL, face match failed). If any exist, approval needs `overrideReason` (≥ 10 chars), which is audited with the issues | blocking issue without reason → 400; with reason → approved + audit |
| **1.7 Face-match verdict** (G6) | An explicit Digio verdict (`match_result` or `result`) wins; the score decides only when no verdict is present | doc fixtures: matched / not_matched (score 40) / failed |
| **1.8 No fabricated DL** (G7) | Mobile sends the verified or OCR'd DL number, or nothing; the API treats a missing DL as pending | widget/unit test: no `DL-` prefix fabricated |

## 4. Phase 2: Tests that can actually fail (contract + workflow)

1. **Contract fixtures** (`apps/api/test/fixtures/digio/*.json`): the example responses from Digio's Swagger files, verbatim (liveness pass/fail, face match matched/not_matched/failed, fuzzy matched/not, RC success, OCR success, bank, IFSC, error 400 shapes).
2. **HTTP-level contract tests** (`apps/api/test/digio-contract.spec.ts`): stub `global.fetch` (not `DigioClient`), so the real client builds each request. Assert method, URL, `Authorization: Basic …`, JSON body and multipart field names against §1.2, then feed back the fixture and assert the parsed verification record.
3. **Workflow simulations** (`digio-driver-kyc-workflow.sim.spec.ts`): switch the existing 8 scenarios to the contract fixtures, and add scenarios for the Phase 1 behaviour (rate limit, reuse, consent, webhook fast-ack/idempotency, approval guard).
4. **Mobile**: `flutter test test/digio_workflow_test.dart` + `flutter analyze` on the touched screens.

## 5. Phase 3: Live verification (production account, explicit approval needed)

`apps/api/scripts/verify-digio-live.ts` reads credentials from env only.

| Mode | Calls | Side effects | Run when |
|---|---|---|---|
| default | IFSC lookup (`SBIN0000300`) + local HMAC self-test | one IFSC lookup (may be billed at the IFSC rate) | after credentials are set; **ask before running** |
| `--probe-gateway` | **creates a real DigiLocker KYC request** | billable and visible in the Digio dashboard | only with explicit owner approval |

Also configure in the Digio Enterprise dashboard: webhook URL `https://<api>/api/v1/kyc/digio/webhooks`, the webhook secret (then set `DIGIO_WEBHOOK_SECRET`), and the KYC events. Allow-list the production webhook IPs at the load balancer if possible.

## 6. Phase 4: Operations and compliance (follow-up)

* **Retention:** call Digio purge (`POST /client/kyc/purge/{id}`) once a request is final and documents are stored masked; set a DPDP retention period for local KYC images.
* **Observability:** a counter per verification type and outcome (cost tracking), the 429 count, webhook signature failures, and the age of PENDING DigiLocker requests.
* **OKYC fallback** (offline Aadhaar XML) if DigiLocker availability becomes a problem.
* **Fuzzy name threshold** tuning on real data (current default 80).

## 7. Rollout checklist

1. Set `DIGIO_CLIENT_ID`, `DIGIO_CLIENT_SECRET`, `DIGIO_WEBHOOK_SECRET` (same value as the Digio dashboard) and `DIGIO_ENV=production` in the production secret store.
2. Register the webhook URL and secret in the Digio dashboard and enable the KYC events.
3. Run the live probe (default mode) once, with approval.
4. Ship the API and mobile together (consent field, no fabricated DL).
5. Watch the 429 rate, webhook failures and Digio spend for the first week.

---

## 8. Execution log (2026-11-10)

### Delivered

| Item | Where |
|---|---|
| 1.1 Webhook auth (prod without secret → acknowledged and ignored) | `digio.service.ts` `handleWebhook` |
| 1.2 Fast ack + background reconcile + idempotency (`SET NX digio:webhook:{id}`, 24 h) | `handleWebhook`, `claimWebhook`, `reconcileWebhookRequest` |
| 1.3 Rate limits (10/h, 30/day per user per route; admins and GETs exempt; 429 `DIGIO_RATE_LIMITED` + `Retry-After`) | `digio-rate-limit.interceptor.ts` (interceptor, so it runs after `JwtAuthGuard`) |
| 1.4 Result reuse (PAN, DL incl. DOB, RC, UPI; `VERIFIED` only; `DIGIO_REUSE_DAYS`, default 30; admins always fresh) | `findReusableResult` |
| 1.5 Aadhaar consent: `GET/POST /kyc/digio/consent` (`AADHAAR_CONSENT_V1`, IP, user agent, 365-day validity); enforced on masking, Aadhaar OCR and DigiLocker, including admin-initiated calls | `recordAadhaarConsent`, `assertAadhaarConsent`; mobile `aadhaar_consent_sheet.dart` |
| 1.6 Approval guard: BLOCKERs = DL/RC not verified (when Digio is configured), invalid or non-compliant DL/RC, face-match or liveness failure; override ≥ 10 chars, audited as `complianceOverride` | `admin.service.ts` `verifyDriver`; admin `VerificationDetailModal.tsx` |
| 1.7 Face match / liveness / PAN verdict parsing (G6, G9) | `digio.service.ts` |
| 1.8 No fabricated DL number or expiry | mobile `onboarding_vehicle_screen.dart`, `onboarding_review_screen.dart`, `driver_service.dart` |
| 2.1 Contract fixtures (Digio Swagger examples, verbatim) | `apps/api/test/fixtures/digio/*.json` |
| 2.2 HTTP-level contract tests (real client, stubbed `fetch`) | `apps/api/test/digio-contract.spec.ts` |
| 2.3 Workflow simulations: consent step, refusal without consent, re-verify-then-approve | `digio-driver-kyc-workflow.sim.spec.ts` |

### Test results

| Suite | Result |
|---|---|
| `digio-contract.spec.ts` (new) | 22/22 |
| `digio.service.spec.ts` | 13/13 |
| `digio-driver-kyc-workflow.sim.spec.ts` | 4/4 (8 scenarios) |
| `admin.service.spec.ts`, `corporate-wire-billing.spec.ts` (regression) | 8/8, 25/25 |
| API `tsc --noEmit`, eslint (digio, admin) | clean |
| Mobile `flutter analyze` (changed files) | no issues |
| Mobile `digio_phase1_test.dart` (new) / `digio_workflow_test.dart` / `digio_service_test.dart` | 11/11, 4/4, 2/2 |
| Admin `tsc --noEmit`, eslint (changed files) | clean |

### Still open

* **Phase 3:** the live probe against the production account (needs approval), plus the webhook URL and secret in the Digio dashboard and `DIGIO_WEBHOOK_SECRET` in env.
* The UI has not been exercised against a running API. The mobile consent sheet and the admin blocker/override flow were verified by unit/widget tests, typecheck and lint only.
* Phase 4 items (purge/retention, metrics, OKYC fallback).
* Rate-limit `Retry-After` reports the full window, not the exact remaining time.
