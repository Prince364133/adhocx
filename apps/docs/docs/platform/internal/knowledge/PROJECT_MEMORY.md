# AdhocX — Master Project Memory, Knowledge Base & Decision Register

> **Document Classification:** Internal — Project Working Document  
> **Prepared:** 12 November 2026 (Updated & Consolidated)  
> **Organization:** Estemporaneo Technologies Private Limited  
> **Scope:** Complete Multi-Application AdhocX Ecosystem (Admin, Operations, Corporate Portal, Employee Mobile App, Driver Mobile App, API Backend, Dual Ledgers, DevOps)  
> **Status:** Central Source of Truth for All Project Context, Architectural Decisions, and Task Registries  

---

## Document Control & Classification Legend

| Classification | Definition |
| --- | --- |
| **CONFIRMED** | Direct, verified user instructions or repeated, authoritative repository evidence. |
| **DOCUMENTED** | Stated in formal PRDs, architecture specifications, or schema definitions. |
| **OBSERVED** | Extracted from handwritten requirements notes, whiteboards, or screen reference images. |
| **PROPOSED** | Recommended engineering or product designs awaiting final stakeholder sign-off. |
| **ASSUMED** | Working assumptions required to maintain progress in the absence of explicit specifications. |
| **CONFLICTING** | Incompatible requirements across different sources requiring explicit resolution. |
| **UNRESOLVED** | Open questions, missing parameters, or pending product-owner decisions. |

---

## 1. Executive Project Overview

AdhocX is an enterprise-grade employee transportation system (ETS) and on-demand mobility platform initially specified for a controlled Hyderabad enterprise pilot. The core enterprise model is **direct corporate contracting with AdhocX**:
- Corporate clients contract directly with AdhocX.
- Corporate HR/Transport teams upload or automate employee schedules and shift rosters.
- AdhocX creates deterministic transport demand, runs route clustering and CVRPTW capacity optimization, allocates verified independent drivers using compliant driver-owned commercial cabs, monitors live trip execution, manages safety and SOS incidents 24×7, bills corporate clients, and reconciles driver earnings and payouts.
- **Business Boundary:** No third-party vendor intermediary exists in the core enterprise transport workflow. The existing AdhocX vendor-to-driver marketplace is a separate business workflow maintained in logical isolation.

### Application Ecosystem Summary

| Surface / Application | Repository Path | Technology | Core Responsibilities |
| --- | --- | --- | --- |
| **Super Admin Panel** | `apps/admin` | Next.js 14, React, TypeScript | Platform governance, tenant contracts, driver/vehicle compliance (Verification Centre), dispatch rules, corporate rate cards, driver payout ledgers, security/MFA, and audit reports. |
| **Operations Panel / Command Centre** | `apps/ops` | Next.js 14, React, TypeScript | 24×7 live transport supervision, real-time fleet map, dispatch board, manual driver assignment, company/route/employee operational maintenance, exception handling, SOS intake, and support desk. |
| **Corporate Client Portal** | `apps/corporate` | Next.js 14, React, TypeScript | Tenant-scoped HR & transport management: 6-screen core (Dashboard, Routes, Financial Analytics, Billing, Support, Company Profile), employee roster import, shift policies, and cancellation oversight. |
| **Employee Mobile App** | `apps/employee_app` | Flutter / Dart | Employee commuter app: corporate SSO/OTP auth, approved shift schedules, live cab tracking, boarding OTP/QR verification, in-journey SOS, support ticketing, rating, and offline resilience. |
| **Driver Mobile App** | `apps/mobile` | Flutter / Dart | Direct driver app: KYC/onboarding, vehicle compliance, duty toggle, route offers, atomic acceptance, turn-by-turn navigation, boarding verification, earnings ledger, and SOS. |
| **API Backend** | `apps/api` | NestJS, TypeScript, Prisma, PostgreSQL + PostGIS, Redis | Central API gateway, DDD corporate domains, authentication (RBAC + JTI revocation), dispatch engine, geocoding adapter, dual financial ledgers, and telemetry pub/sub. |
| **Shared Packages** | `packages/contracts`, `packages/domain-core` | TypeScript | Shared DTOs, enums, API request/response contracts, and framework-agnostic domain models. |

---

## 2. Project History, Evidence Register & Timeline

| Date / Phase | Source / Event | Key Knowledge Captured & Confirmed Decisions |
| --- | --- | --- |
| **30 Oct 2026** | Initial System & App PRDs (v2.0) | Baseline specifications for Super Admin, Corporate Portal, Employee App, Driver App, Dispatch Engine, Dual Ledgers, and Safety/SOS. |
| **09 Nov 2026** | Architecture Review | Monorepo layout structured around pnpm workspaces and Turborepo. Explicit distinction established between `apps/employee_app` (active Flutter client) and `apps/employee` (deprecated). |
| **10 Nov 2026** | Repository & Domain Hardening | Corporate ETS DDD domain restructuring; employee API envelope normalization (`response.items`); cancellation policy UI constraints (cancellation-only view with >=12h auto-cancel vs backend 9h default noted as conflict). |
| **11 Nov 2026** | Handwritten Notes & Whiteboards | Detailed requirements captured for Operations Portal (7 core pages, manual driver assignment, assignment activity audit) and Employee App (Auth, Support, Connectivity, Rating). Corporate Portal 6-page visual shell confirmed. |
| **11 Nov 2026** | Admin Modernization | Compact design system introduced across Super Admin; driver approval override mechanism; company financial dropdown filter in reports. |
| **12 Nov 2026** | Shared Support & PR Merges | PR #18 merged (Shared Support ticket system across Admin, Corporate, Ops, API); PR #16 merged (Admin compact UI & company filters); PR #15 merged (Operations Driver Dashboard & Live Operations). PRD & Master Project Memory unified. |

---

## 3. Evidence Rules & Information Hierarchy

To prevent requirement drift and maintain strict traceability, all project knowledge follows this hierarchy:
1. **Direct User Instructions** in the active thread (Highest Priority).
2. **Observed Evidence** from uploaded photos, handwritten notes, whiteboards, and reference mockups.
3. **Persisted Codebase Evidence** (Prisma schemas, NestJS controllers, TypeScript contracts, Flutter routes).
4. **Official Working PRDs** (Historical versioned markdown and docx specifications).
5. **Architectural Proposals & Assumptions** (Design recommendations explicitly flagged).

---

## 4. Super Admin Panel (`apps/admin`) — Master Knowledge Base

The Super Admin Panel governs platform-wide policies, contracts, compliance, pricing, and settlements.

### Core Modules & Roles
- **Roles:** Platform Super Admin, Tenant/Contract Admin, Driver Compliance Reviewer, Dispatch Supervisor, Finance Approver, Security Auditor.
- **Key Modules:**
  1. **Tenant Contracts & Organizations (ADH-01):** Legal entity onboarding, multi-office definitions, service areas, contract effective dates, versioned SLA policies, shift cutoffs. Suspension blocks new demand generation with audit logging.
  2. **Driver & Vehicle Compliance / Verification Centre (ADH-02):** Separate verification workflows for driver credentials (DigiLocker, commercial DL, bank account, police clearance) and vehicle compliance (RC, commercial insurance, fitness, permit, seat capacity). Dual-key approval: both driver and vehicle must be independently VERIFIED for dispatch eligibility. Admin approval override allowed with mandatory audit justification.
  3. **Supply Planning & Dispatch Configuration (ADH-03):** Operating zones, shift supply targets, route optimization constraints (CVRPTW), maximum occupancy, pickup windows, allocation offer timeouts, retry backoff, and escalation triggers.
  4. **Operations Supervision & Exceptions (ADH-04):** Scoped cross-tenant live monitoring, dispatch delay tracking, unserved demand alerts, controlled reassignment approvals, and driver deactivations.
  5. **Corporate Pricing & Invoicing (ADH-05):** Corporate rate cards (per trip, per km, per hour, per vehicle category) with effective-date versioning. Automated invoice draft generation from completed trip billables; credit notes, debit adjustments, and dispute workflows.
  6. **Driver Earnings & Payouts (ADH-06):** Independent driver payout rate cards; earnings ledger completely decoupled from corporate receivables. Payout batch generation, dual-approval (maker-checker), PSP/bank submission, idempotency protection, and reconciliation.
  7. **Platform Security & System Health (ADH-07):** RBAC, session revocation (`jti` invalidation), MFA, break-glass protocol, secret rotation, webhook status, integration health checks, and immutable audit logs.
  8. **Business Intelligence & Governance (ADH-08):** Executive dashboards, supply health, financial margin analytics, compliance SLA reports, and authorized CSV/PDF exports.

---

## 5. Operations Panel / Command Centre (`apps/ops`) — Master Knowledge Base

The Operations Panel is the 24×7 real-time command centre for execution oversight and service recovery.

### Objectives & Workflows (from Handwritten Notes & Code)
1. **Live Route Deck (`/board`):** Real-time lane overview of routes across stages: Pending Dispatch, Offered, Accepted, Approaching Pickup, Active, Deboarded, and At-Risk.
2. **Fleet Live Map (`/map`):** Live cab telemetry with vehicle coordinates, heading, route polyline, stop markers, ETA, and explicit GPS freshness indicators (never claim live GPS if telemetry is older than 60 seconds).
3. **Route Optimizer & Planner (`/planner`):** CVRPTW-based route clustering and generation from imported employee roster demand.
4. **Company & Route Management (`/companies`, `/routes`):** Multi-tenant company directory, company detail, route inspection, route modification (add/edit/deactivate), and employee passenger lists.
5. **Driver Directory & Lifetime Profile (`/drivers`, `/drivers/[id]`):** Complete driver directory with real-time duty status, compliance status, lifetime trip stats, trust score, document expiry overview, suspension/reactivation, and soft-deactivation.
6. **Manual Driver Assignment & Reassignment:** Emergency dispatcher assignment tool with hard server-side validation against driver eligibility, vehicle compliance, duty hours, capacity, and route overlap.
7. **Assignment Activity List:** Immutable audit trail capturing every driver assignment/reassignment: actor, timestamp, route, driver, and operational justification.
8. **Live Operations (`/live`):** Monitoring of live trips, employee boarding events, exceptions (no-shows, delays, breakdowns, route deviations), and incident resolution.
9. **Safety & SOS Intake (`/safety`):** Immediate alert triggering upon employee or driver SOS, automated 120s escalation scheduler, dispatcher acknowledgement, emergency service coordination, and resolution logging.
10. **Shared Support Desk (`/support`):** Shared ticket queue with Corporate and Employee apps: ticket assignment, internal notes, public responses, status transitions, and SLA tracking.

---

## 6. Corporate Client Portal (`apps/corporate`) — Master Knowledge Base

The Corporate Portal provides enterprise clients with a controlled workspace to manage commuters, shift demand, and service billing.

### Six-Page Visual Target & Layout Preservation
1. **Dashboard (`/`):** Fixed visual shell preserving the approved executive layout: operational KPI cards (Total Shifts, Active Routes, Commuter Count, Ontime %), route summary table, and quick actions.
2. **Routes (`/routes`, `/routes/[id]`):** Searchable route directory, passenger pickup sequences, stop timings, assigned cab/driver information, and live map view.
3. **Financial Analytics (`/analytics`):** Spend breakdown by department, office, and shift; cost-per-km and cost-per-employee metrics.
4. **Billing & Invoices (`/billing`, `/billing/invoices`):** Monthly invoice review, trip-level billing line item audit, dispute submission, and payment status.
5. **Support & Tickets (`/support`):** Employee complaint tracking, corporate transport inquiry submission, SLA tracking, and resolution history.
6. **Company Profile (`/settings/organization`):** Office locations, pickup geo-fences, shift timings, authorized corporate managers, and transport policy settings.

### Documented Scope Extensions
- **Employee Directory (`/employees`):** Full commuter directory, department tagging, pickup/drop coordinates, shift assignment, and bulk CSV/XLSX import.
- **Roster & Booking Management (`/rosters`, `/bookings`):** Weekly/monthly shift scheduling, ad-hoc ride requests, and manager approval inbox.
- **Cancellation Policy Rule:**
  - Commuter cancellation >= 12 hours before shift pickup: Automatically cancelled without penalty.
  - Commuter cancellation < 12 hours before shift pickup: Recorded as a transport policy violation; seat not reclaimed for rerouting unless operations manually intervenes.
  - *Conflict Note:* Repository backend policy configuration supports configurable hours (defaulting to 9h); UI currently reflects 12h policy rule.

---

## 7. Employee Mobile App (`apps/employee_app`) — Master Knowledge Base

The Employee App is a dedicated commuter application built in Flutter/Dart, focused on approved corporate travel rather than public ride-hailing.

### Core Modules & Capabilities (Handwritten Notes + PRD)
1. **Authentication & Profile:** Corporate email SSO or phone OTP; strictly mapped to an active, verified `CorporateEmployee` record under an active tenant contract.
2. **Next Trip & Commute Card:** Home screen card displaying next approved pickup or drop, pickup time window, designated pickup spot, cab details, driver contact (masked), and live status.
3. **Shift Calendar & Requests:** Weekly calendar view of approved rides. Permitted policy-based cancellation or shift change requests with clear policy cutoff validation.
4. **Assigned Cab & Live Tracking:** Interactive map displaying approaching cab, live road route polyline, driver name, vehicle plate/model, ETA, and explicit GPS connectivity status.
5. **Boarding Verification (OTP / QR):** Dynamic, time-expiring boarding OTP generated on the employee app, entered by the driver or scanned via QR to confirm physical boarding.
6. **In-Journey Safety & SOS:** Prominent emergency button active during journeys. Immediately dispatches GPS coordinates, route ID, and timestamp to the 24×7 Command Centre and corporate safety officers.
7. **Support & Help Desk:** Ticket creation for cab delays, lost property, driver behavior, or route issues; synchronized with the shared support desk in Operations and Admin.
8. **Rating & Feedback:** Post-trip feedback and rating mechanism with structured tags for cleanliness, driving, and punctuality.
9. **Connectivity & Offline Resilience:** Reconnect logic, cached offline schedules, graceful degradation when offline, and no misleading display of stale telemetry as real-time.

---

## 8. Driver Mobile App (`apps/mobile`) — Master Knowledge Base

The Driver App provides direct-to-driver workflow management for verified commercial cab owners.

### Key Capabilities
- **Direct Onboarding & Document Upload:** DigiLocker Aadhaar/PAN verification, Driving Licence upload, Vehicle RC, Commercial Insurance, and Permit submission.
- **Availability & Duty Management:** Online/Offline duty toggle, current geohash reporting, battery/connectivity health reporting.
- **Route Offers & Atomic Acceptance:** Shift route offer dispatch with pickup sequence, passenger count, total distance, estimated earnings, and countdown timer. Redis-backed atomic acceptance preventing double-assignment.
- **Trip Navigation & Stop Management:** Turn-by-turn navigation through ordered employee pickup/drop waypoints; manual waypoint arrival detection.
- **Boarding Verification:** Commuter OTP verification or QR scanning at each stop; automated 5-minute waiting timer before marking a commuter NO-SHOW.
- **Driver Earnings Ledger:** Daily, weekly, and monthly earnings breakdown, completed route incentives, deductions, and payout batch status.

---

## 9. Technical Architecture, Persistence & State Machines

### Technology Stack
- **Monorepo:** pnpm workspaces + Turborepo.
- **Backend API:** NestJS, TypeScript, Node.js.
- **Database:** PostgreSQL with PostGIS extensions for spatial queries; Prisma ORM.
- **Cache & Real-Time Engine:** Redis (v7+) for geospatial indexing (GEOADD/GEORADIUS), distributed mutex locks, rate limiting, and pub/sub.
- **Web Frontends:** Next.js 14 (App Router), React, TailwindCSS, CSS Modules.
- **Mobile Frontends:** Flutter 3.x, Dart, Provider / Bloc, GoRouter.

### Core Entity Lifecycle State Machines

```
Corporate Route Lifecycle:
DRAFT ──> OPTIMIZED ──> DISPATCHING ──> ASSIGNED ──> EN_ROUTE ──> IN_PROGRESS ──> COMPLETED
  │          │              │              │
  └───> CANCELLED <─────────┴──────────────┴───> NO_DRIVERS_FOUND (Escalated)

Employee Ride Allocation:
SCHEDULED ──> ASSIGNED ──> APPROACHING ──> ARRIVED ──> BOARDED ──> COMPLETED
     │            │             │            │
     ├──> CANCELLED             └──> NO_SHOW ┘

Driver Compliance Status:
PENDING ──> UNDER_REVIEW ──> VERIFIED ──> SUSPENDED / REJECTED
```

### Dual Financial Ledger Architecture
To maintain zero commingling of platform margins:
1. **Corporate Accounts Receivable Ledger:**
   - Source: Completed route billables calculated using the active corporate contract rate card.
   - Outputs: Consolidated monthly invoices, department cost centers, GST line items, and credit notes.
2. **Driver Accounts Payable Ledger:**
   - Source: Completed route deliverables calculated using independent driver payout rate cards.
   - Outputs: Driver wallet entries, earnings credits, approved payout batches, and bank payment file exports.

---

## 10. Decisions, Assumptions, Conflicts & Open Questions Register

| ID | Topic | Conflict / Question | Current Resolution & Recommendation |
| --- | --- | --- | --- |
| **DEC-01** | Employee App Codebase | `apps/employee` vs `apps/employee_app` | **CONFIRMED:** `apps/employee_app` is the active Flutter client. `apps/employee` is deprecated. |
| **DEC-02** | Cancellation Cutoff | UI states 12 hours; backend config has 9-hour default. | **RESOLVED:** Enforce 12-hour rule across corporate policies by default; expose configuration in Admin policy editor. |
| **DEC-03** | Employee Master Ownership | Whiteboard mentions Ops creating employees; PRD states Corporate HR owns employees. | **RESOLVED:** Corporate HR owns employee master and roster publication. Operations holds operational read/override rights for shift exceptions. |
| **DEC-04** | Driver Intermediary | Marketplace vendor vs Enterprise Driver. | **CONFIRMED:** Enterprise ETS operates direct-to-driver. No vendor intermediary exists in corporate route allocation. |
| **DEC-05** | Support Ticket Architecture | Multiple ticket tables vs single shared engine. | **CONFIRMED:** Unified `CorporateSupportTicket` model shared across Admin, Ops, Corporate, and Employee apps (landed in PR #18). |
| **DEC-06** | Driver Compliance Override | Strict blocker gate vs Admin override. | **CONFIRMED:** Admin can override compliance blockers with mandatory audit justification (landed in PR #16/commit 1e66802). |

---

## 11. Master Project Task Register (131 Tasks)

The complete consolidated task register from `AdhocX_Master_Task_Register.xlsx` across all project workstreams:


## Sheet: Task Register (131 rows)

| ID | Application | Workstream | Task | Priority | Suggested owner | Dependencies | Acceptance / done when | Status | Estimate (days) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADM-001 | Super Admin Panel | Inspect | Inspect current Admin routes, screens, APIs, Prisma models and permissions; create implementation gap matrix | P0 | Engineering lead | Before all Admin feature work | Inventory maps every ADH-01…08 requirement to existing code, missing work and tests. | Backlog | T-shirt estimate required |
| ADM-002 | Super Admin Panel | Approve | Approve Admin role-to-action permission matrix | P0 | Product + Security | ADM-001 | Every role has explicit read/create/update/approve/export/suspend permissions; deny-by-default. | Backlog | T-shirt estimate required |
| ADM-003 | Super Admin Panel | Implement | Implement tenant-scoped authorization and cross-tenant staff scopes | P0 | Backend | ADM-002 | Unauthorized tenant reads/writes/exports are rejected and covered by isolation tests. | Backlog | T-shirt estimate required |
| ADM-004 | Super Admin Panel | Build | Build tenant directory, search, filters and status view | P0 | Frontend + Backend | ADM-003 | Authorized users can list tenants; counts and status match persisted records. | Backlog | T-shirt estimate required |
| ADM-005 | Super Admin Panel | Build | Build tenant detail and office/user management | P0 | Frontend + Backend | ADM-004 | Tenant detail shows permitted offices and authorized users; changes are audited. | Backlog | T-shirt estimate required |
| ADM-006 | Super Admin Panel | Build | Build contract editor with effective dates, service areas and SLA fields | P0 | Frontend + Backend | ADM-005 | Invalid/overlapping periods are rejected; effective-dated versions persist. | Backlog | T-shirt estimate required |
| ADM-007 | Super Admin Panel | Build | Build versioned policy editor for booking rules, shift cutoffs, rate-card links and approval authority | P0 | Frontend + Backend | ADM-006 | New version affects only applicable future work; history is retained. | Backlog | T-shirt estimate required |
| ADM-008 | Super Admin Panel | Implement | Implement tenant suspension/reactivation workflow with impact preview and reason | P1 | Backend + Frontend | ADM-006, ADM-007 | Suspension blocks disallowed new activity; actor, reason and timestamp are audited. | Backlog | T-shirt estimate required |
| ADM-009 | Super Admin Panel | Build | Build driver verification queue and driver profile evidence view | P0 | Frontend + Backend | ADM-002 | Reviewer can inspect required driver evidence with sensitive values masked. | Backlog | T-shirt estimate required |
| ADM-010 | Super Admin Panel | Implement | Implement driver KYC/licence/bank/agreement review decisions | P0 | Backend | ADM-009 | Approve/reject/suspend decisions require permission and reason; provider failure never equals approval. | Backlog | T-shirt estimate required |
| ADM-011 | Super Admin Panel | Build | Build vehicle compliance review and expiry queue | P0 | Frontend + Backend | ADM-009 | RC, insurance, permit/fitness, category, seat count and expiry are independently visible. | Backlog | T-shirt estimate required |
| ADM-012 | Super Admin Panel | Enforce | Enforce separate driver and vehicle eligibility in dispatch authorization | P0 | Backend | ADM-010, ADM-011 | A driver or vehicle that is pending, expired, rejected or suspended cannot be dispatched. | Backlog | T-shirt estimate required |
| ADM-013 | Super Admin Panel | Build | Build supply map, zone and vehicle-class configuration | P1 | Frontend + Backend | ADM-003 | Zones/classes and shift supply targets persist with validated scope. | Backlog | T-shirt estimate required |
| ADM-014 | Super Admin Panel | Build | Build versioned route and allocation rules editor | P1 | Frontend + Backend | ADM-013 | Rules validate hard safety/capacity constraints and only active versions apply. | Backlog | T-shirt estimate required |
| ADM-015 | Super Admin Panel | Implement | Implement coverage forecast and supply-shortfall visibility | P1 | Backend + Frontend | ADM-013, ADM-014 | Forecast exposes source timestamp and reasons for unserved demand. | Backlog | T-shirt estimate required |
| ADM-016 | Super Admin Panel | Build | Build operations overview and exception queue | P0 | Frontend + Backend | OPS-001, ADM-003 | Scoped users see delays, unserved demand, incidents and overrides with SLA age. | Backlog | T-shirt estimate required |
| ADM-017 | Super Admin Panel | Implement | Implement override review and controlled reassignment approval | P0 | Backend + Frontend | ADM-016 | Concurrent actions cannot double-assign; decision, reason and actor are auditable. | Backlog | T-shirt estimate required |
| ADM-018 | Super Admin Panel | Build | Build corporate rate-card versioning and pricing preview | P1 | Finance + Backend | ADM-006 | Corporate pricing dimensions and effective dates are validated; history is immutable. | Backlog | T-shirt estimate required |
| ADM-019 | Super Admin Panel | Generate | Generate invoice drafts from completed trip billables and applicable contract version | P1 | Backend | TRIP-006, ADM-018 | Every invoice line traces to a trip and rate version; duplicate generation is idempotent. | Backlog | T-shirt estimate required |
| ADM-020 | Super Admin Panel | Build | Build invoice approval, issue, credit, adjustment and dispute screens | P1 | Frontend + Backend | ADM-019, ADM-002 | Only authorized finance roles can approve/issue; all adjustments are traceable. | Backlog | T-shirt estimate required |
| ADM-021 | Super Admin Panel | Build | Build separate driver payout rate cards and earnings ledger | P1 | Finance + Backend | TRIP-006 | Driver payable never reuses corporate receivable rate card; ledger reconciles to trip evidence. | Backlog | T-shirt estimate required |
| ADM-022 | Super Admin Panel | Implement | Implement payout batch approval, provider submission and idempotency | P1 | Backend | ADM-021, ADM-002 | Duplicate retries cannot pay twice; state transitions and provider references persist. | Backlog | T-shirt estimate required |
| ADM-023 | Super Admin Panel | Build | Build payout reconciliation and failed/reversed payout handling | P1 | Backend + Frontend | ADM-022 | Submitted/processing/paid/failed/reversed states reconcile against bank/PSP evidence. | Backlog | T-shirt estimate required |
| ADM-024 | Super Admin Panel | Build | Build users/roles, MFA, break-glass and service credential management | P0 | Security + Backend | ADM-002 | Privileged actions require appropriate controls; break-glass use is time-bound and audited. | Backlog | T-shirt estimate required |
| ADM-025 | Super Admin Panel | Build | Build integrations, webhook status, notification templates and system health | P1 | Backend + Frontend | ADM-024 | Failures are visible, retryable where safe, and secrets are never exposed in UI/logs. | Backlog | T-shirt estimate required |
| ADM-026 | Super Admin Panel | Build | Build executive, supply, financial and compliance reports with definitions | P2 | Data + Frontend | ADM-019, ADM-023 | Each KPI has formula, period, timezone, source, freshness and permission scope. | Backlog | T-shirt estimate required |
| ADM-027 | Super Admin Panel | Add | Add audited exports, saved filters and report drill-downs | P2 | Frontend + Backend | ADM-026, ADM-024 | Export respects current scope and records actor, filters and timestamp. | Backlog | T-shirt estimate required |
| OPS-001 | Operations Panel / 24×7 Command Centre | Inspect | Inspect current Ops app, API, event streams, dispatch states and existing screens; map whiteboard to code | P0 | Ops lead + Engineering | None | Gap matrix covers live map, dispatch, assignment, activity, reports, support and incident paths. | Backlog | T-shirt estimate required |
| OPS-002 | Operations Panel / 24×7 Command Centre | Confirm | Confirm Ops vs Admin ownership and define Ops role permissions | P0 | Product + Operations | OPS-001, ADM-002 | No duplicate approval/dispatch authority; corporate users cannot dispatch. | Backlog | T-shirt estimate required |
| OPS-003 | Operations Panel / 24×7 Command Centre | Build | Build Ops dashboard with tenant/route/driver/employee entry points and live counts | P0 | Frontend + Backend | OPS-002 | Authenticated Ops users see scoped counts and navigate to core work queues. | Backlog | T-shirt estimate required |
| OPS-004 | Operations Panel / 24×7 Command Centre | Build | Build company list and company detail with tenant-scoped route list | P0 | Frontend + Backend | ADM-004 | Only authorized companies/routes are visible; count matches source records. | Backlog | T-shirt estimate required |
| OPS-005 | Operations Panel / 24×7 Command Centre | Build | Build route detail page with stops, employee demand, driver, status and live indicator | P0 | Frontend + Backend | OPS-004, RTE-001 | Route data is scoped, fresh timestamp shown, and status is explicit. | Backlog | T-shirt estimate required |
| OPS-006 | Operations Panel / 24×7 Command Centre | Implement | Implement route add/edit/delete or deactivate workflow with validation | P1 | Backend + Frontend | OPS-005 | Changes persist; destructive action is confirmed and audited; historical trips remain intact. | Backlog | T-shirt estimate required |
| OPS-007 | Operations Panel / 24×7 Command Centre | Build | Build employee operational list and detail view with tenant filter | P1 | Frontend + Backend | COR-003 | Ops can view operational employee context without becoming unrestricted HR master editor. | Backlog | T-shirt estimate required |
| OPS-008 | Operations Panel / 24×7 Command Centre | Build | Build driver directory and lifetime operational profile | P0 | Frontend + Backend | ADM-009 | Profile exposes permitted assignment/trip/performance history and masked sensitive data. | Backlog | T-shirt estimate required |
| OPS-009 | Operations Panel / 24×7 Command Centre | Build | Build live route map with GPS freshness, ETA and stale/offline states | P0 | Frontend + Backend | TRIP-003 | Stale GPS is never labelled live; last-seen age is visible. | Backlog | T-shirt estimate required |
| OPS-010 | Operations Panel / 24×7 Command Centre | Build | Build dispatch board with unassigned, offered, accepted, active and at-risk lanes | P0 | Frontend + Backend | ALLOC-001 | Board state matches authoritative server state and updates in real time. | Backlog | T-shirt estimate required |
| OPS-011 | Operations Panel / 24×7 Command Centre | Implement | Implement manual driver assignment with hard eligibility, availability, capacity and overlap validation | P0 | Backend | ADM-012, OPS-010 | Ineligible, busy, over-capacity or duty-limit drivers are rejected server-side. | Backlog | T-shirt estimate required |
| OPS-012 | Operations Panel / 24×7 Command Centre | Implement | Implement reassignment workflow with reason, replacement search and notification events | P0 | Backend + Frontend | OPS-011, NOTIF-001 | Only one active assignment exists; employee/driver are notified after committed change. | Backlog | T-shirt estimate required |
| OPS-013 | Operations Panel / 24×7 Command Centre | Build | Build Assignment Activity List with actor, route, driver, time, reason and status | P0 | Frontend + Backend | OPS-011, OPS-012 | Every assignment transition is searchable and audit-linked. | Backlog | T-shirt estimate required |
| OPS-014 | Operations Panel / 24×7 Command Centre | Build | Build exception queue for delays, no-shows, breakdowns, route deviations and unserved demand | P0 | Frontend + Backend | OPS-009, OPS-010 | Exceptions have severity, owner, SLA timer, state and resolution evidence. | Backlog | T-shirt estimate required |
| OPS-015 | Operations Panel / 24×7 Command Centre | Implement | Implement SOS incident intake, acknowledgement, escalation and closure | P0 | Backend + Frontend | SAFE-001 | SOS reaches command centre, acknowledgment is visible and fallback/escalation is tested. | Backlog | T-shirt estimate required |
| OPS-016 | Operations Panel / 24×7 Command Centre | Implement | Implement support ticket queue, assignment, response and status updates | P1 | Backend + Frontend | COR-008, EMP-012 | Employee/corporate tickets are visible to authorized Ops users and updates propagate. | Backlog | T-shirt estimate required |
| OPS-017 | Operations Panel / 24×7 Command Centre | Build | Build shift handover notes and unresolved incident carry-forward | P1 | Frontend + Backend | OPS-014, OPS-015 | Outgoing/incoming operator can review owner, age, next action and risk. | Backlog | T-shirt estimate required |
| OPS-018 | Operations Panel / 24×7 Command Centre | Build | Build company-wise route and operational analytics | P1 | Data + Frontend | OPS-005, OPS-013 | Metrics filter by tenant/date/shift and drill to source records. | Backlog | T-shirt estimate required |
| OPS-019 | Operations Panel / 24×7 Command Centre | Build | Build operational reports for assignment, service, delay, cancellation and support | P1 | Data + Frontend | OPS-018 | Report formulas and timezone are documented; export is permission-controlled. | Backlog | T-shirt estimate required |
| OPS-020 | Operations Panel / 24×7 Command Centre | Create | Create connectivity fallback and manual dispatch runbook | P0 | Operations + Engineering | OPS-009, OPS-010 | Staff can safely handle GPS/provider/API outage without duplicate assignments. | Backlog | T-shirt estimate required |
| OPS-021 | Operations Panel / 24×7 Command Centre | Run | Run concurrency, stale GPS, reassignment, SOS and tenant isolation UAT | P0 | QA + Operations | OPS-009…020 | Critical scenarios pass and evidence is attached to release checklist. | Backlog | T-shirt estimate required |
| COR-001 | Corporate Client Portal | Audit | Audit corporate app routes, current six-page UI, API coverage and existing integrations | P0 | Corporate lead | None | Screen/API inventory distinguishes implemented, mock, fallback and missing states. | Backlog | T-shirt estimate required |
| COR-002 | Corporate Client Portal | Preserve | Preserve and implement the approved global shell and six-screen visual reference | P1 | Frontend + Design | COR-001 | Navy sidebar, purple active state, header, responsive grid and consistent components match reference. | Backlog | T-shirt estimate required |
| COR-003 | Corporate Client Portal | Build | Build tenant setup, office/site, department, transport zone and user/role management | P0 | Frontend + Backend | ADM-004, ADM-006 | Corporate users manage only permitted tenant/office settings. | Backlog | T-shirt estimate required |
| COR-004 | Corporate Client Portal | Build | Build dashboard KPI cards for companies, employees and routes plus route/financial charts | P1 | Frontend + Data | COR-001 | All values come from tenant-scoped APIs; sample mock values are removed from production. | Backlog | T-shirt estimate required |
| COR-005 | Corporate Client Portal | Define | Define dashboard KPI formulas, time windows, timezone and freshness | P0 | Product + Data | COR-004 | Completed/cancelled/active/unserved and people-served vs vehicle-trip definitions are signed off. | Backlog | T-shirt estimate required |
| COR-006 | Corporate Client Portal | Build | Build Employee Directory list, search, filters, detail and profile actions | P0 | Frontend + Backend | COR-003 | HR can view/update permitted employee master fields; Ops cannot silently become master owner. | Backlog | T-shirt estimate required |
| COR-007 | Corporate Client Portal | Build | Build CSV/XLSX bulk employee import wizard with dry-run validation | P0 | Frontend + Backend | COR-006 | Duplicate, invalid, missing and geocoding issues are shown before commit. | Backlog | T-shirt estimate required |
| COR-008 | Corporate Client Portal | Build | Build validation results, import history and safe retry/rollback | P0 | Backend + Frontend | COR-007 | No partial duplicate roster/employee creation on retry; import batch is traceable. | Backlog | T-shirt estimate required |
| COR-009 | Corporate Client Portal | Build | Build shift templates and roster calendar/editor | P0 | Frontend + Backend | COR-006 | Shift and employee mappings validate against tenant/office and policy. | Backlog | T-shirt estimate required |
| COR-010 | Corporate Client Portal | Implement | Implement roster approval and publish workflow | P0 | Backend + Frontend | COR-009 | Only authorized HR roles publish; published roster creates idempotent transport demand. | Backlog | T-shirt estimate required |
| COR-011 | Corporate Client Portal | Build | Build booking/request inbox and policy-based approval actions | P1 | Frontend + Backend | COR-010 | Request states and allowed actions match approved policy; no dispatch controls appear. | Backlog | T-shirt estimate required |
| COR-012 | Corporate Client Portal | Build | Build Routes list and route detail with stops, employee count and status | P1 | Frontend + Backend | OPS-005 | Corporate sees only own routes; route status comes from Ops-owned execution data. | Backlog | T-shirt estimate required |
| COR-013 | Corporate Client Portal | Build | Build route live view, map and trip timeline read-only experience | P1 | Frontend + Backend | COR-012, OPS-009 | GPS age and last updated are shown; no corporate reassignment capability. | Backlog | T-shirt estimate required |
| COR-014 | Corporate Client Portal | Build | Build Financial Analytics page and cost breakdowns | P1 | Data + Frontend | ADM-018 | Tenant-scoped total spend, cost per route/employee, seat utilization and vehicle mix reconcile to source. | Backlog | T-shirt estimate required |
| COR-015 | Corporate Client Portal | Build | Build Billing tabs for invoices, payments and disputes with download | P1 | Frontend + Backend | ADM-019 | Corporate sees issued invoices and permitted credits/disputes; no internal margin/payout data. | Backlog | T-shirt estimate required |
| COR-016 | Corporate Client Portal | Confirm | Confirm invoice generation/payment authority; remove unapproved privileged UI actions | P1 | Product + Finance | COR-015 | Only explicitly approved roles/actions are enabled; generated invoice button is not assumed authorized. | Backlog | T-shirt estimate required |
| COR-017 | Corporate Client Portal | Build | Build Support My Tickets and Raise Ticket workflow | P1 | Frontend + Backend | OPS-016 | Ticket has ID, category, status, created time and trip context; Ops receives it. | Backlog | T-shirt estimate required |
| COR-018 | Corporate Client Portal | Implement | Implement cancellation-only page using the user-defined 12-hour rule | P0 | Frontend | COR-001 | Filters exactly employee ID, route, status, office and date; no approve/reject/review states. | Backlog | T-shirt estimate required |
| COR-019 | Corporate Client Portal | Resolve | Resolve 12-hour UI vs 9-hour backend policy and implement authoritative server rule | P0 | Product + Backend | COR-018 | One signed cutoff is enforced server-side and UI; no sample fallback or contradictory behavior. | Backlog | T-shirt estimate required |
| COR-020 | Corporate Client Portal | Build | Build corporate roles/office scope, reports and integration settings | P1 | Backend + Frontend | COR-003, ADM-002 | Tenant and office scope enforced in every API/export. | Backlog | T-shirt estimate required |
| COR-021 | Corporate Client Portal | Complete | Complete responsive, accessibility, empty/error/loading and cross-tenant UAT | P0 | QA | COR-003…020 | No critical tenant leakage; core workflows pass desktop/tablet/mobile viewport tests. | Backlog | T-shirt estimate required |
| EMP-001 | Employee Mobile App | Inspect | Inspect active apps/employee_app screen inventory, theme, API clients and deprecated app boundary | P0 | Flutter lead | None | All planned work targets apps/employee_app; current behavior and gaps are documented. | Backlog | T-shirt estimate required |
| EMP-002 | Employee Mobile App | Polish | Polish existing UI without changing established colors/theme | P1 | Flutter + Design | EMP-001 | Screens have consistent spacing, hierarchy, feedback and smooth transitions without regressions. | Backlog | T-shirt estimate required |
| EMP-003 | Employee Mobile App | Implement | Implement welcome, OTP/SSO login and session states | P0 | Flutter | EMP-001 | Expired/invalid OTP, unmapped employee and suspended account are handled safely. | Backlog | T-shirt estimate required |
| EMP-004 | Employee Mobile App | Verify | Verify and connect OTP/SSO backend contract and token lifecycle | P0 | Flutter + Backend | EMP-003 | Actual Nest controller/DTO/guard and OpenAPI contract verified; refresh/revocation works. | Backlog | T-shirt estimate required |
| EMP-005 | Employee Mobile App | Implement | Implement permission onboarding for location and notifications | P0 | Flutter | EMP-003 | Purpose explained before OS prompt; denial does not crash or block unrelated screens. | Backlog | T-shirt estimate required |
| EMP-006 | Employee Mobile App | Build | Build home dashboard and next approved trip card | P0 | Flutter + Backend | EMP-004 | Correct next trip, pickup/drop, shift, status and server refresh time display. | Backlog | T-shirt estimate required |
| EMP-007 | Employee Mobile App | Build | Build schedule calendar and trip details | P1 | Flutter + Backend | EMP-006 | Only approved roster trips appear; empty, archived and changed-shift states work. | Backlog | T-shirt estimate required |
| EMP-008 | Employee Mobile App | Build | Build cancellation and pickup/change request flows with policy checks | P1 | Flutter + Backend | EMP-007 | Cutoff and policy outcome are server-authoritative; duplicate requests are idempotent. | Backlog | T-shirt estimate required |
| EMP-009 | Employee Mobile App | Build | Build assigned cab, driver detail and replacement notice | P0 | Flutter + Backend | ALLOC-004 | Only confirmed assigned driver/vehicle is displayed; replacement updates are timely. | Backlog | T-shirt estimate required |
| EMP-010 | Employee Mobile App | Build | Build live map, pickup point, trip progress, ETA and GPS freshness | P0 | Flutter + Backend | EMP-009, TRIP-003 | Stale/offline GPS is explicitly labelled; no false live status. | Backlog | T-shirt estimate required |
| EMP-011 | Employee Mobile App | Implement | Implement boarding OTP/QR, boarding success and trip completion | P0 | Flutter + Backend | EMP-010 | Wrong/expired OTP and boarding dispute are handled; successful events are auditable. | Backlog | T-shirt estimate required |
| EMP-012 | Employee Mobile App | Build | Build Safety Centre and SOS confirmation/status UI | P0 | Flutter + Backend | SAFE-001 | SOS sends once, shows incident reference/acknowledgement and fallback; no false emergency-services claim. | Backlog | T-shirt estimate required |
| EMP-013 | Employee Mobile App | Build | Build Support tickets and complaint detail UI | P0 | Flutter | OPS-016 | Employee can create and track complaint/ticket with trip context. | Backlog | T-shirt estimate required |
| EMP-014 | Employee Mobile App | Connect | Connect Support backend to Ops-owned queue and status events | P0 | Flutter + Backend + Ops | OPS-016 | Ticket creation, assignment, response and status propagate end-to-end. | Backlog | T-shirt estimate required |
| EMP-015 | Employee Mobile App | Implement | Implement connectivity state, offline snapshot, retry/backoff and stale-data labels | P0 | Flutter | EMP-006…014 | Retries do not duplicate critical actions; last-updated state is visible. | Backlog | T-shirt estimate required |
| EMP-016 | Employee Mobile App | Throttle | Throttle GPS/tracking refresh and handle permission revoked/background-resume | P1 | Flutter | EMP-010, EMP-015 | Battery/network usage is bounded and location collection remains purpose-limited. | Backlog | T-shirt estimate required |
| EMP-017 | Employee Mobile App | Implement | Implement notification inbox and push-token lifecycle | P1 | Flutter + Backend | NOTIF-001 | Expired tokens, disabled notifications and deep links are handled. | Backlog | T-shirt estimate required |
| EMP-018 | Employee Mobile App | Build | Build trip history, profile and privacy/settings | P2 | Flutter + Backend | EMP-007 | Pagination, masked data, revoked permissions and empty states work. | Backlog | T-shirt estimate required |
| EMP-019 | Employee Mobile App | Implement | Implement rating/feedback only after policy and endpoint sign-off | P2 | Product + Flutter + Backend | EMP-011 | Scale, trigger, eligibility, moderation and endpoint are approved; submission is idempotent. | Backlog | T-shirt estimate required |
| EMP-020 | Employee Mobile App | Execute | Execute device QA for OTP, offline, GPS, boarding, SOS, push and support handoff | P0 | QA + Ops | EMP-004…019 | All named exception cases pass on supported Android/iOS devices. | Backlog | T-shirt estimate required |
| DRI-001 | Driver Mobile App | Inspect | Inspect apps/mobile screens, driver/vendor modes, API contracts and current implementation | P0 | Flutter lead | None | Active driver client and separate marketplace boundary are documented. | Backlog | T-shirt estimate required |
| DRI-002 | Driver Mobile App | Confirm | Confirm enterprise driver vs legacy vendor marketplace identity and navigation boundary | P0 | Product + Backend | DRI-001 | Enterprise driver cannot accidentally enter vendor intermediary workflow. | Backlog | T-shirt estimate required |
| DRI-003 | Driver Mobile App | Build | Build direct driver onboarding and agreement acceptance | P0 | Flutter + Backend | ADM-002 | Onboarding captures required consent/agreement and submits a traceable application. | Backlog | T-shirt estimate required |
| DRI-004 | Driver Mobile App | Implement | Implement identity, licence and bank verification submission/status | P0 | Flutter + Backend | DRI-003 | Pending/failed/duplicate/rejected/resubmission states are explicit. | Backlog | T-shirt estimate required |
| DRI-005 | Driver Mobile App | Build | Build vehicle registration and document upload/expiry UI | P0 | Flutter + Backend | DRI-003 | RC, insurance, permit/fitness, category, seats and expiry are captured and validated. | Backlog | T-shirt estimate required |
| DRI-006 | Driver Mobile App | Integrate | Integrate Admin review outcomes and combined dispatch eligibility | P0 | Backend + Flutter | ADM-010, ADM-011, ADM-012 | Driver app cannot go online for enterprise trips until both driver and vehicle are eligible. | Backlog | T-shirt estimate required |
| DRI-007 | Driver Mobile App | Build | Build availability toggle, zone and duty-hour controls | P0 | Flutter + Backend | DRI-006 | Availability is rejected outside approved zone/duty window or while committed. | Backlog | T-shirt estimate required |
| DRI-008 | Driver Mobile App | Build | Build time-limited route offer detail and expiry countdown | P0 | Flutter + Backend | ALLOC-001 | Offer displays authorized route/time/stops/passenger/distance/payout details. | Backlog | T-shirt estimate required |
| DRI-009 | Driver Mobile App | Implement | Implement atomic accept/reject with timeout, withdrawal and race handling | P0 | Backend + Flutter | DRI-008 | Only one driver can accept; expired/withdrawn offer cannot be accepted. | Backlog | T-shirt estimate required |
| DRI-010 | Driver Mobile App | Build | Build ordered stop list, navigation and arrival/departure events | P0 | Flutter + Backend | DRI-009 | Stop sequence and event timestamps match server route state. | Backlog | T-shirt estimate required |
| DRI-011 | Driver Mobile App | Implement | Implement employee OTP/QR boarding and no-show reason | P0 | Flutter + Backend | DRI-010 | Wrong OTP, absent employee and duplicate boarding events are safely handled. | Backlog | T-shirt estimate required |
| DRI-012 | Driver Mobile App | Implement | Implement trip execution, GPS streaming and completion | P0 | Flutter + Backend | DRI-010, DRI-011 | GPS freshness, trip state and completion evidence are recorded. | Backlog | T-shirt estimate required |
| DRI-013 | Driver Mobile App | Build | Build SOS, breakdown and issue reporting with Ops handoff | P0 | Flutter + Backend + Ops | OPS-015 | Incident reaches Ops with driver/trip context and acknowledgement status. | Backlog | T-shirt estimate required |
| DRI-014 | Driver Mobile App | Build | Build earnings ledger, payout history and bank verification status | P1 | Flutter + Backend | ADM-021 | Driver sees only own payable records and their source trips. | Backlog | T-shirt estimate required |
| DRI-015 | Driver Mobile App | Build | Build payout dispute and support workflow | P1 | Flutter + Backend | ADM-023, OPS-016 | Dispute links to payout/trip evidence and has traceable status. | Backlog | T-shirt estimate required |
| DRI-016 | Driver Mobile App | Implement | Implement offline, poor-network, GPS-disabled and background-resume handling | P0 | Flutter | DRI-007…013 | Critical trip actions are retry-safe and never falsely show accepted/completed. | Backlog | T-shirt estimate required |
| DRI-017 | Driver Mobile App | Run | Run driver lifecycle UAT including expired docs, duty limit, offer race, no-show, breakdown and failed payout | P0 | QA + Ops + Finance | DRI-003…016 | End-to-end scenarios pass with event/audit evidence. | Backlog | T-shirt estimate required |
| PLT-001 | Shared Platform | Platform | Confirm monorepo baseline, active branches, package scripts and current deployment environments | P0 | Engineering lead | None | Architecture inventory is based on current branch, not stale documentation. | Backlog | T-shirt estimate required |
| PLT-002 | Shared Platform | Platform | Verify PostgreSQL/Prisma schema, migrations, tenant keys, indexes and PostGIS usage | P0 | Backend + Data | PLT-001 | Data model supports scoped queries and spatial operations; migration plan reviewed. | Backlog | T-shirt estimate required |
| PLT-003 | Shared Platform | Platform | Define shared contracts, enums and state machines for tenant, roster, route, offer, trip, incident and finance | P0 | Backend + Product | PLT-002 | All apps use consistent typed contracts; transitions reject invalid states. | Backlog | T-shirt estimate required |
| PLT-004 | Shared Platform | Platform | Implement identity, token lifecycle, RBAC and tenant/office scoping across API | P0 | Backend + Security | PLT-003 | Server enforces permissions; client-side hiding is not treated as authorization. | Backlog | T-shirt estimate required |
| PLT-005 | Shared Platform | Platform | Implement idempotency, concurrency protection and durable event retry for critical transitions | P0 | Backend | PLT-003 | No duplicate roster demand, driver assignment, boarding event, invoice or payout on retry. | Backlog | T-shirt estimate required |
| PLT-006 | Shared Platform | Platform | Implement notification service and event contracts for employee, driver, corporate and Ops | P1 | Backend | PLT-005 | Delivery status, retries and token failures are observable. | Backlog | T-shirt estimate required |
| PLT-007 | Shared Platform | Platform | Implement GPS ingestion, location privacy, freshness and retention controls | P0 | Backend + Security | PLT-003 | Purpose-limited access; stale age shown; retention and audit policy approved. | Backlog | T-shirt estimate required |
| PLT-008 | Shared Platform | Platform | Implement audit trail for privileged actions, dispatch overrides, incidents and finance transitions | P0 | Backend + Security | PLT-004 | Actor, role, tenant, UTC time, action, target and correlation ID are queryable. | Backlog | T-shirt estimate required |
| PLT-009 | Shared Platform | Platform | Integrate routing/geocoding/maps with quota, failure and stale-route handling | P1 | Backend + Maps | PLT-002 | Map failures do not corrupt route state; provider usage is monitored. | Backlog | T-shirt estimate required |
| PLT-010 | Shared Platform | Platform | Implement corporate billable and driver payable ledgers as separate financial records | P0 | Finance + Backend | PLT-003 | Ledger records are traceable to completed trip evidence and rate versions. | Backlog | T-shirt estimate required |
| PLT-011 | Shared Platform | Platform | Implement API observability, structured logs, metrics, tracing and alerting | P1 | Platform | PLT-001 | Errors and latency can be traced across apps/services without logging secrets/PII. | Backlog | T-shirt estimate required |
| PLT-012 | Shared Platform | Platform | Create CI quality gates: lint, typecheck, unit, integration, migration and build checks | P0 | DevOps + Engineering | PLT-001 | Required checks run on PR and block merge on failure. | Backlog | T-shirt estimate required |
| PLT-013 | Shared Platform | Platform | Create backups, restore drill, secrets rotation and incident runbooks | P0 | DevOps + Security | PLT-011 | Restore is demonstrated; production secrets are not committed or exposed. | Backlog | T-shirt estimate required |
| PLT-014 | Shared Platform | Platform | Run cross-app end-to-end pilot UAT and release readiness review | P0 | QA + Product + Ops | All P0 app and shared tasks | Roster-to-ride, safety, tenant isolation, invoice and payout flows pass signed acceptance. | Backlog | T-shirt estimate required |
| RTE-001 | Shared Platform | Transport engine | Define route-planning input contract: approved demand, geocoded stops, shift windows, vehicle classes and constraints | P0 | Backend + Product | COR-010, PLT-003 | Planner receives only approved, tenant-scoped demand with validated coordinates and constraints. | Backlog | T-shirt estimate required |
| RTE-002 | Shared Platform | Transport engine | Implement feasible route generation with capacity, pickup-window, max-ride and duty constraints | P0 | Routing engineer | RTE-001, PLT-002 | Infeasible demand is returned with explicit reasons; hard safety/capacity constraints are never relaxed silently. | Backlog | T-shirt estimate required |
| RTE-003 | Shared Platform | Transport engine | Persist versioned route plans and expose route approval/replan lifecycle | P0 | Backend + Routing | RTE-002 | Route versions, affected trips and audit events are persisted; replan does not rewrite completed trip history. | Backlog | T-shirt estimate required |
| ALLOC-001 | Shared Platform | Transport engine | Implement eligible-driver candidate filtering by approval, vehicle, availability, zone, duty and overlap | P0 | Backend | ADM-012, PLT-003 | Only eligible driver+vehicle pairs enter candidate pool. | Backlog | T-shirt estimate required |
| ALLOC-002 | Shared Platform | Transport engine | Implement driver ranking, time-limited offers, retry/expiry and supply-shortfall outcomes | P0 | Backend | ALLOC-001, ADM-014 | Offer lifecycle is deterministic and auditable; expiry/retry cannot duplicate active assignments. | Backlog | T-shirt estimate required |
| ALLOC-003 | Shared Platform | Transport engine | Implement atomic offer acceptance and single-driver assignment guarantee | P0 | Backend | ALLOC-002, PLT-005 | Concurrent accepts result in exactly one confirmed assignment. | Backlog | T-shirt estimate required |
| TRIP-003 | Shared Platform | Transport engine | Implement trip/GPS event ingestion, current location snapshots and GPS freshness contract | P0 | Backend + Platform | PLT-007 | Trip location has last-seen timestamp and freshness classification; stale location is not labelled live. | Backlog | T-shirt estimate required |
| TRIP-006 | Shared Platform | Transport engine | Implement trip completion event and separate corporate billable / driver payable ledger triggers | P0 | Backend + Finance | TRIP-003, PLT-010 | Completed trip produces traceable separate receivable/payable entries exactly once. | Backlog | T-shirt estimate required |
| SAFE-001 | Shared Platform | Transport engine | Implement SOS/incident domain, command-centre alert, acknowledgement, escalation and closure | P0 | Backend + Ops | PLT-005, PLT-008 | SOS state and escalation are traceable; failure path is tested and user sees actual acknowledgement state. | Backlog | T-shirt estimate required |
| NOTIF-001 | Shared Platform | Transport engine | Implement notification event contracts, push delivery, retry and token-expiry handling | P1 | Backend + Mobile | PLT-006 | Employee/driver/corporate/Ops notifications are idempotent and delivery failures observable. | Backlog | T-shirt estimate required |

## Sheet: Read Me (11 rows)

| AdhocX Master Task Register | Guidance |
| --- | --- |
| Purpose | Execution register for Super Admin, Operations, Corporate Portal, Employee App, Driver App and shared platform. |
| Status values | Backlog / Ready / In Progress / Blocked / In Review / Testing / Done. Update with team evidence. |
| Priority | P0 = release critical; P1 = high; P2 = medium/follow-on. Priority is recommended sequencing, not an approved sprint. |
| Owners | Suggested role only. Assign one named accountable person in planning. |
| Estimates | Intentionally unestimated. Do not invent dates/effort before code and dependency discovery. |
| Dependencies | IDs refer to tasks in this register. Cross-workstream dependency names (e.g. RTE-001, SAFE-001, ALLOC-001, TRIP-006, NOTIF-001) are requirement families that must be mapped to actual backlog tasks. |
| Evidence labels | DOCUMENTED = PRD; OBSERVED = whiteboard; CONFIRMED = direct instruction; PROPOSED = task decomposition/recommendation; UNRESOLVED = owner decision required. |
| Critical warning | Do not treat PRD requirements as implemented. Audit the current branch, APIs and database first. |
| Critical warning | Resolve 12h vs 9h corporate cancellation policy before production release. |
| Critical warning | Keep vendor marketplace separate from enterprise direct-driver workflow unless product owner explicitly approves a scope change. |

## Sheet: App Objectives (6 rows)

| Application | Product Objective | Business Objective | Primary Users | Requirement Areas |
| --- | --- | --- | --- | --- |
| Super Admin Panel | Govern the AdhocX platform across corporate tenants, driver/vehicle compliance, supply policies, operational exceptions, commercial controls, settlements, security and business intelligence. | Protect service quality and platform risk while enabling controlled enterprise growth: onboard and govern tenants, prevent ineligible supply from dispatch, preserve auditable financial records, and provide leadership visibility without leaking tenant data. | Platform Super Admin; Tenant/Contract Admin; Driver Compliance Reviewer; Dispatch Supervisor; Finance Approver; Security Auditor. | ADH-01 Tenant contracts & organizations: tenants, offices, authorized users, contract dates, service areas, versioned SLAs, booking policies, shift cutoffs, corporate rate cards and approval authority. ADH-02 Driver & vehicle compliance: driver identity/KYC, commercial licence, bank verification and direct agreement; vehicle RC, insurance, permit/fitness, category, seats and expiry; separate driver and vehicle decisions. ADH-03 Supply planning & dispatch configuration: operating zones, duty constraints, vehicle classes, shift supply targets, route objectives, pickup windows, occupancy/safety constraints, allocation ranking, offer expiry/retries/escalation. ADH-04 Supervision & exception approvals: scoped cross-tenant overview, dispatcher overrides, unserved demand, delays, incident escalation, controlled reassignment, driver suspension and client communication. ADH-05 Corporate pricing & invoicing: effective-dated corporate rate cards by trip/km/hour/shift/category; invoice drafts from trip billables; approval, issue, credit, adjustment and dispute. ADH-06 Driver earnings & payouts: separate driver payout rate cards, earnings ledger, adjustments, payout eligibility, approval batches, provider submission and bank/PSP reconciliation. ADH-07 Platform security & configuration: RBAC, MFA, break-glass, service credentials, secret rotation, notification templates, integrations, webhooks, audit logs and system health. ADH-08 Business intelligence & governance: executive KPIs, driver supply, financial and compliance reports; reproducible definitions and authorized exports. |
| Operations Panel / 24×7 Command Centre | Run live transport execution: plan/monitor routes, assign and reassign eligible drivers, respond to incidents and keep trips within service commitments. | Improve pickup reliability, utilization and service recovery while maintaining safe, accountable operations across corporate tenants. | Dispatch Supervisor; Operations staff; Safety/Incident responders; authorized Admin oversight. | Live map and route visibility with cab position, route progress, ETA and GPS freshness. Dispatch board for pending, unassigned, offered, accepted, active and at-risk work. Manual driver-to-route assignment and reassignment with eligibility, capacity, overlap and duty checks. Assignment Activity List and audit trail: who assigned whom, to which route, when and why. Company/employee/route onboarding and maintenance are present in whiteboard notes; employee master ownership conflicts with Corporate HR ownership in the PRD. Company-wise route analytics, operational reports, employee/company support, SOS, exceptions, escalation, handover and SLA monitoring. |
| Corporate Client Portal | Give each corporate tenant a controlled workspace to manage its people and transport demand, approve rosters/requests, monitor service and reconcile invoices. | Reduce HR/transport coordination effort, improve employee data accuracy and transparency, and provide tenant-scoped service, safety and cost visibility without exposing AdhocX internal margins or driver payout rates. | Corporate Super Admin; HR Manager; Transport Manager; Safety Officer; Finance Manager; Read-only Management. | Six-page visual target: Dashboard, Routes, Financial Analytics, Billing, Support and Company Profile. The dashboard visual layout is specifically to be preserved; screenshot numbers are sample data only. Broader documented scope: tenant setup/access, Employee Directory, CSV/XLSX bulk import, shift templates/rosters, booking/approval inbox, route detail/live map/trip timeline, safety/incident view, support/SLA, invoices/reports/integrations and user roles/office scope. Corporate HR owns employee master and roster publication; Operations owns route execution, driver dispatch and reassignment. Corporate portal must be tenant/office scoped and must not expose internal payout rates, margins or other tenants. Cancellation UI constraint from prior user instruction: cancellation-only page; filters employee ID, route, status, office and date; >=12 hours before pickup auto-cancel; <12 hours policy violation; no approve/reject/review workflow. Backend source notes a conflicting 9-hour default and missing endpoint. |
| Employee Mobile App | Give eligible corporate employees reliable access to their approved commute schedule, assigned cab, live trip progress, boarding, safety and support. | Improve employee trust, punctuality and safety while reducing manual transport coordination. The app reflects approved corporate roster demand; it is not an unrestricted ride-hailing app. | Employee; Corporate HR for approved roster updates; AdhocX dispatch and safety responders. | Active Flutter client is apps/employee_app; apps/employee is deprecated and must not be used unless repository evidence changes. Handwritten task sheet explicitly lists Auth, Support, Connectivity and Rating option; UI polishing; connect auth backend; support backend and support testing, with support backend/testing dependent on Ops. PRD modules: authentication/identity; home/next trip; shift calendar/booking; driver/cab assignment; live tracking/navigation; boarding/trip completion; SOS/help/complaints; notifications/history/settings. Secure corporate SSO or verified OTP and active eligible employee mapping; approved trips only; policy-controlled cancellation/change; GPS freshness; OTP/QR boarding; SOS acknowledgement/fallback; support tickets; offline-safe behavior. Existing theme/colors must be preserved while improving spacing, hierarchy, transitions and interactions. |
| Driver Mobile App | Enable directly onboarded independent drivers with eligible driver-owned commercial vehicles to receive, accept and execute corporate transport assignments safely. | Create dependable compliant supply, reduce unserved trips and late pickups, provide clear driver earnings and ensure every trip event can be reconciled and investigated. | Independent Driver; AdhocX Driver Verification Team; AdhocX Dispatcher; AdhocX Finance. | Active Flutter client is apps/mobile. Enterprise drivers contract directly with AdhocX; no vendor intermediary in the enterprise flow. Vendor marketplace is a separate workflow. Direct onboarding and agreement; identity/licence/bank verification; driver-owned/authorized commercial cab registration and document compliance. Online/offline availability within approved zones/duty hours; time-limited route offers with atomic accept/reject; ordered stops/navigation; arrival and OTP/QR boarding; no-show reason; GPS; completion. SOS/issue reporting, support, earnings/payout history, disputes and bank verification. Driver and vehicle approval are separate; both must be eligible. Prevent overlapping assignments, duty-limit violations and expired document dispatch. |

---

## 12. Implementation Status & Next Engineering Steps

1. **Backend (`apps/api`):** Core corporate DDD modules, routing controllers, geocoding adapter, support tickets, and driver operations services are landed and passing 100% of unit & lint suites.
2. **Admin Web (`apps/admin`):** Compact UI, company filters, driver compliance modals, and shared support desk landed. Next: Rate-card version editor and automated invoice batching.
3. **Operations Web (`apps/ops`):** Board, Live Map, Driver Dashboard, and Support Ticket queue landed. Next: Handover notes and advanced corridor deviation alerts.
4. **Corporate Web (`apps/corporate`):** Six-page shell, employee directory, and support ticketing landed. Next: Finalize roster XLSX parser integration.
5. **Employee Mobile App (`apps/employee_app`):** Wire authentication and connect to shared support ticket API.
