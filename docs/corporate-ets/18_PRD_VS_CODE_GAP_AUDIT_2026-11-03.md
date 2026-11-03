# 18 — PRD vs Code Gap Audit (Backend), 2026-11-03

> **For every agent:** read this before claiming any ETS module is "done". Follow `docs/04_DESIGN_SYSTEM.md and apps/marketing/DESIGN_AND_UI.md`,
> `docs/05_UI_UX_GUIDELINES.md` and `docs/20_AI_AGENT_RULES.md` for any UI work. The work plan that closes these gaps is
> `19_BACKEND_COMPLETION_IMPLEMENTATION_PLAN.md`.

**Sources checked:** the five PRDs (Complete ETS System v1.0, Employee App v2.0, Corporate Portal v2.0, Super Admin v2.0,
Driver App v2.0, all 30 Oct 2026), the founder's operating model (shifts, back-calculated pickup, 1 h dispatch lead,
5→10 km H3 search, 5 min stop dwell, 9 h cutoff, 15 min logout staging, traffic-advanced dispatch), and `staging` @ `f2021a6`.

**Verdict: NOT production-ready.** The core autonomous loop (roster → routes → timed dispatch → offer → OTP boarding →
no-show → completion → invoice/earning) exists and has tests. But about half of the PRD backend surface is missing.
Several things the earlier docs describe as built (OR-Tools, PostGIS, RLS, partitioned GPS tables) **do not exist in the code**.

Legend: ✅ done · 🟡 partial · ❌ missing

---

## 1. What really exists (code, not docs)

| Area | Code | State |
|---|---|---|
| Tenants, offices, employees, locations | `domains/corporate/tenants/*` | 🟡 CRUD only. No departments/cost-center tables, no effective dating, no corporate-user invite/roles, no contracts/SLA |
| Excel roster template + validate + upload | `rosters/roster-template.service.ts`, `roster-ingestion.service.ts` | 🟡 Template, dry-run validation and idempotent demand (`idempotencyHash`) exist. No approve/publish versioning, no shift templates, holidays or rotating/overnight model, no error-file export, no HRMS sync |
| Route solver | `routing/corporate-route-planner.ts` | 🟡 Sweep + nearest-neighbour + 2-opt + inter-route swap. Capacity and max-ride (default 7200 s) are respected. **Not OR-Tools** (doc 03 says it is). No plan versioning, no async optimisation job, no unserved-with-reason output persisted |
| Travel-time matrix | `google-travel-time-matrix.adapter.ts`, `haversine-…` fallback | ✅ Google Distance Matrix with fallback |
| Traffic-advanced dispatch | `dispatch/traffic/google-traffic-estimator.adapter.ts` | ✅ Real Google traffic ETA moves pickup and dispatch earlier, with a re-time notification |
| Timed dispatch scheduler | `corporate-dispatch-scheduler.service.ts` | ✅ Multi-instance Redis queue (`corporate:dispatch:queue`), 1 h lead, logout −15 min, recovery sweep |
| H3 search 5 km → 10 km, 60 s offer, cascade | `corporate-dispatch.service.ts` | 🟡 Works. **Offers live only in Redis**, so there is no `driver_offers` history (ALLOC/acceptance-rate/audit impossible). Ranking is proximity only (ALLOC-02) |
| Driver eligibility filter | `findEligibleDrivers()` | 🟡 **Bug-level gaps:** a driver with `vehicleType = null` passes for *any* category; vehicle `insuranceExpiry`, vehicle `verificationStatus` and seat count are not checked; there are no duty-hour limits (ALLOC-06, ADM-07) |
| Escalation of unfilled routes | scheduler recovery | ❌ It only retries every 300 s. No "at-risk" state, no command-centre alert N min before pickup (ALLOC-05) |
| Trip execution | `execution/*` | ✅ Start, geofenced arrive (150 m), 5 min dwell, OTP + QR, no-show only after 300 s, complete |
| GPS telemetry | `ingestTelemetry()` | 🟡 **Redis only, 120 s TTL.** Nothing is persisted, so trip playback (OPS-06), deviation history and billing distance from real GPS are impossible |
| Rider notifications | `corporate-rider-notifier.service.ts` | ✅ Driver assigned, started, arriving, arrived, no-show, re-time, over WebSocket + push |
| Cancel / reschedule with 9 h cutoff + replanning | `replanning/*` | ✅ Including admin override (audited) and night-safety rules |
| SOS | `safety/*` | 🟡 Create, list and resolve. Lifecycle new→ack→investigating→escalated→closed is not implemented (enum exists, no endpoints). No escalation timers, no support tickets/complaints/lost property |
| Billing | `billing/*` | 🟡 Invoice batch, PDF, list. **Hard-coded ₹20/km** in dispatch. No versioned corporate rate cards, no disputes/credit notes, no payment status |
| Driver payouts | `prepare-batch`, earnings | 🟡 Earnings rows exist. No payout batch state machine (drafted→approved→submitted→processing→paid/failed/reversed), no idempotent PSP submit, no reconciliation |
| Tenant isolation / RBAC | `common/guards/corporate-access.guard.ts` | 🟡 Server-side tenant scoping works. Only 2 corporate roles (`CORPORATE_ADMIN/MANAGER`) vs the 6 in the PRD (HR, Transport, Finance, Safety, Read-only). No office scope, no MFA, no RLS |
| Employee self-service API | — | ❌ No `GET /me`, `/me/schedule`, `/me/trips`, `/trips/{id}/tracking` for employees |
| Corporate dashboard / reports API | — | ❌ No KPI endpoints (attendance, late, no-show, OTP %, utilisation) |
| Command centre API | — | ❌ No live board, at-risk queue, alert queue, manual reassign endpoint, trip timeline |
| Driver ETS app endpoints | — | 🟡 Accept/reject/execute exist. No `GET /driver-offers` (pending offer on reconnect), no upcoming-duties list |
| Frontends | — | ❌ No corporate portal app, no employee app; the driver app has no ETS screens; admin has 1 route panel (`admin/src/app/trips/CorporateRouteManagementSection.tsx`) |

## 2. Requirement-by-requirement status (backend)

### Complete ETS PRD
| ID | Status | Note |
|---|---|---|
| CP-DASH-01..04 | ❌ | no dashboard endpoints, no freshness stamp |
| CP-EMP-01 | ✅ | |
| CP-EMP-02 | 🟡 | roster upload validates; separate employee-master import with error export missing |
| CP-EMP-03 | 🟡 | locations yes; eligibility flag, department FK no |
| CP-EMP-04 | ❌ | effective dates, address encryption |
| CP-ROS-01 | ❌ | shift templates, rotating, holidays, overnight |
| CP-ROS-02 | 🟡 | upload yes; preview diff/approve/publish/version no |
| CP-ROS-03 | 🟡 | demand + cancel cutoff yes; booking cutoff configurable per tenant no (9 h is a constant) |
| CP-ROS-04 | 🟡 | missing locations flagged; replanning impact preview no |
| CP-BOOK-01..04 | 🟡 | list via roster requests; ad-hoc requests, escalation to AdhocX, amendment history missing |
| CP-ROUTE-01 | ✅ | |
| CP-ROUTE-02 | 🟡 | live via WS; GPS freshness field and deviation history missing |
| CP-ROUTE-03 | ❌ | reassignment history (no table) |
| CP-ROUTE-04 | ❌ | change-request flow |
| CP-SAFE-01..04 | 🟡/❌ | SOS list only |
| CP-RPT-01/02 | ❌ | |
| CP-BILL-01 | 🟡 | invoices yes; rate cards, credits, disputes no |
| CP-BILL-02 | 🟡 | payouts hidden from corporate (verify test exists); payment status no |
| CP-ADM-01..03 | ❌ | 6 roles, office scope, SSO, policy config |
| CP-INT-01 | ❌ | HRMS |
| EMPAPP-01 | 🟡 | OTP login + employee link exists; eligibility check on login unverified |
| EMPAPP-02..10 | ❌ | no employee read APIs (notifications are pushed but cannot be fetched/replayed) |
| EMPAPP-11 | 🟡 | SOS create |
| EMPAPP-12 | 🟡 | safe-drop confirm by driver; employee safe-reach no |
| EMPAPP-13/14 | ❌ | history, feedback, tickets |
| DRV-01..04 | 🟡 | marketplace onboarding reused; no document expiry model, no EXPIRED/SUSPENDED states per document |
| DRV-05 | 🟡 | online/offline; zones/duty windows no |
| DRV-06/07 | 🟡 | offer push + atomic accept; pending-offer fetch no |
| DRV-08..12 | 🟡 | execution yes; breakdown/interruption report no |
| DRV-13/14 | 🟡 | earnings read; deductions, settlement history, disputes no |
| ADM-01..03 | 🟡/❌ | tenant CRUD; contracts, SLAs, versioned rate cards no |
| ADM-04..07 | 🟡 | verification exists; ETS-grade expiry enforcement no |
| ADM-08..11 | ❌ | allocation rules config, cross-client ops, approvals, flags |
| OPS-01..08 | ❌ | except manual "start-now" |
| RTE-01..03 | ✅/🟡 | heuristic, not OR-Tools; objectives not configurable |
| RTE-04 | 🟡 | unserved computed, reasons not persisted |
| RTE-05 | ❌ | plan versions / manual edit log |
| RTE-06 | 🟡 | deterministic, yes; OR-Tools no |
| ALLOC-01 | 🟡 | see eligibility bugs |
| ALLOC-02 | 🟡 | proximity only |
| ALLOC-03/04 | ✅ | transactional accept, cascade |
| ALLOC-05 | ❌ | escalation |
| ALLOC-06 | ❌ | duty hours |
| SAFE-01 | ✅ | |
| SAFE-02..08 | 🟡/❌ | |
| Billing 12.1/12.2 | 🟡 | |
| Integrations §14 | 🟡 | Maps ✅, push ✅; SMS/WhatsApp fallback, HRMS, SSO, signed outbound webhooks ❌ |
| §18 security | 🟡 | tenant isolation ✅; MFA, PII encryption, break-glass, retention ❌ |
| §19 NFR | 🟡 | load test exists (`apps/api/load-test`); no GPS-ingest load test; no backup/restore drill |

### Founder operating model (memory: corporate-ets-business-model)
| Rule | Status |
|---|---|
| Excel upload → fully autonomous | 🟡 the planner must still be triggered (`POST /corporate/routes/optimize`); no nightly auto-plan job after cutoff |
| Pickup back-calculation (drive + 5 min × stops) | ✅ |
| Dispatch 1 h before pickup 1, 5 → 10 km | ✅ |
| Traffic pushes dispatch earlier (e.g. 04:00) | ✅ |
| Logout: cab at office −15 min, search 10 km of office | ✅ |
| OTP boarding, 5 min no-show with reason shown to employee | ✅ |
| Cancel/reschedule ≥ 9 h, auto re-plan | ✅ |
| Company dashboard: attendance, late days, no-shows | ❌ |
| Admin Trips & Ride Management panel, manual Start | 🟡 start-now exists; full panel API no |

## 3. Docs that overstate the code (fix or flag)
- `03_ROUTE_OPTIMIZATION…` says Google OR-Tools CVRPTW. The code is a custom heuristic.
- `14_DATABASE_SCHEMA…` describes PostGIS, RLS and partitioned tracking tables. The schema uses `Decimal(10,7)` lat/lng, has no RLS and has no GPS table.
- `15_API_INVENTORY…` lists `/v1/...` endpoints. The real routes are `/corporate/...` and `/v1/me` does not exist.

The plan (doc 19) either implements each of these or downgrades the doc.

## 4. Correctness issues found during this audit (fix first)
1. **Dispatch eligibility:** `vehicleType == null` matches every category; vehicle verification, insurance expiry and seat count are ignored → a non-compliant cab can be offered an ETS route. *(Safety/compliance)*
2. **Offer history is lost:** Redis-only offers break the PRD's "rejected/expired offers cannot be accepted later" audit trail and make acceptance-rate/fairness ranking impossible.
3. **No unfilled-route escalation:** a route can sit unserved until pickup, with retries only.
4. **Fare hard-coded** (`RATE_PER_KM_PAISE = 2000`, `BASE_FARE_PAISE`) inside dispatch. Driver payout and corporate billing must come from separate versioned rate cards.
5. **GPS not persisted:** there is no evidence for billing distance, disputes or incident investigation.
