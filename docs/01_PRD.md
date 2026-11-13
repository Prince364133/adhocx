# AdhocX — Comprehensive Product Requirements Document (PRD)

> **Document Version:** 2.5 (Consolidated Master PRD)  
> **Prepared:** 12 November 2026  
> **Organization:** Estemporaneo Technologies Private Limited  
> **Status:** Production Product Requirements Document & Implementation Specification  
> **Scope:** Complete Multi-Application Ecosystem — Direct Corporate ETS & On-Demand Marketplace  

---

## 1. Document Purpose, Scope & Product Framing

This Product Requirements Document (PRD) serves as the definitive functional, architectural, and operational specification for **AdhocX**. It consolidates all requirements from the core marketplace foundation, the Hyderabad enterprise Employee Transportation System (ETS) pilot specifications, and all five application surfaces.

### 1.1 Dual Business Model

AdhocX operates two complementary, logically decoupled mobility models on a unified technological core:

1. **Direct Corporate Managed Transportation (B2B Enterprise ETS):**
   - Direct enterprise contracts between corporate clients and AdhocX.
   - Scheduled employee commute operations: shift roster ingestion, route clustering, vehicle capacity solver (CVRPTW), autonomous driver allocation, live trip execution with boarding verification, 24×7 command centre supervision, and dual financial settlement.
   - **Zero Vendor Intermediary:** In enterprise ETS, AdhocX contracts directly with independent commercial cab drivers.
2. **On-Demand Vendor-to-Driver Marketplace:**
   - Ad-hoc commercial requirement fulfillment where transport vendors post bulk or ad-hoc vehicle requirements, and verified drivers accept and fulfill trips with digital escrow payment.

### 1.2 Pilot Scope & 90-Day MVP Objectives
- **Pilot Location:** Hyderabad Metropolitan Region.
- **Initial Target:** 90-day production pilot with select corporate enterprise clients and verified commercial fleet supply.
- **Core Product Outcomes:**
  - 100% automated roster-to-route generation with manual dispatcher override capability.
  - Zero-touch boarding verification using expiring OTP / dynamic QR.
  - Sub-60-second real-time GPS telemetry and corridor deviation alerts.
  - Independent, tamper-evident dual financial ledgers (Corporate Invoicing vs Driver Earnings).
  - Multi-tenant data isolation and role-based security.

---

## 2. Application Ecosystem & Responsibility Boundaries

The AdhocX platform consists of five primary user surfaces, backed by a unified NestJS API, PostgreSQL/PostGIS database, and Redis cache:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN PANEL                               │
│              Platform Governance, Compliance & Finance                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐           ┌─────────────────┐          ┌─────────────────┐
│  OPERATIONS  │           │ CORPORATE PORTAL│          │  EMPLOYEE APP   │
│COMMAND CENTRE│           │  HR & Transport │          │ Commuter Portal │
│  (apps/ops)  │           │(apps/corporate) │          │(apps/employee)  │
└──────┬───────┘           └────────┬────────┘          └────────┬────────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          DRIVER MOBILE APP                             │
│                  Direct Onboarding & Route Execution                   │
│                            (apps/mobile)                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         CORE API & PLATFORM                            │
│           NestJS · PostgreSQL + PostGIS · Redis · H3 Solver            │
│                            (apps/api)                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. User Roles, Personas & RBAC Matrix

| Role Code | Role Name | Primary Interface | Scope & Permissions |
| --- | --- | --- | --- |
| `PLATFORM_SUPER_ADMIN` | Platform Super Admin | Admin Panel | Unrestricted platform access, system configuration, role assignment, break-glass protocol. |
| `TENANT_ADMIN` | Tenant / Contract Admin | Admin Panel | Corporate tenant lifecycle, contract dates, offices, policy versioning, and rate cards. |
| `COMPLIANCE_REVIEWER` | Compliance Reviewer | Admin Panel | Driver KYC, licence, background check, vehicle RC, insurance, and permit verification. |
| `FINANCE_APPROVER` | Finance Manager | Admin Panel | Corporate invoice approval, credit note issuance, driver payout batch approval, reconciliation. |
| `OPS_SUPERVISOR` | Operations Supervisor | Ops Command Centre | Live map, dispatch board, manual driver assignment, route modifications, exception resolution. |
| `SAFETY_OFFICER` | Safety / SOS Responder | Ops / Corporate | SOS intake, emergency coordination, incident escalation, and safety auditing. |
| `CORP_SUPER_ADMIN` | Corporate Super Admin | Corporate Portal | Tenant-wide settings, user management, policy rules, and corporate dashboard. |
| `CORP_TRANSPORT_MGR` | Corporate Transport Mgr | Corporate Portal | Shift roster upload, route visibility, commuter approvals, transport dispute tracking. |
| `CORP_HR_MGR` | Corporate HR Manager | Corporate Portal | Employee master directory management, department assignments, shift allocation. |
| `EMPLOYEE` | Corporate Commuter | Employee Mobile App | View assigned rides, track cab, OTP/QR boarding, SOS, support tickets, rating. |
| `DRIVER` | Independent Cab Driver | Driver Mobile App | KYC onboarding, duty toggle, route offers, navigation, boarding verification, earnings. |
| `VENDOR` | Marketplace Vendor | Mobile (User Mode) | Create ad-hoc requirements, inspect matching drivers, fund escrow, review trip completion. |

---

## 4. Super Admin Panel (`apps/admin`) — Functional Specification

### ADH-01: Tenant Contracts & Organizations
- **Requirements:**
  - Create, view, edit, and suspend corporate tenants with legal name, tenant code, billing address, tax ID (GSTIN), and designated primary administrators.
  - Multi-office management: specify office addresses, entry geofences, and permitted operational zones.
  - Contract lifecycle: start/end effective dates, SLA parameters (pickup window, maximum travel time, buffer times), and shift cutoff timings.
  - Policy versioning: all policy updates are effective-dated and immutable; historical trips maintain their creation-time contract terms.

### ADH-02: Driver & Vehicle Compliance (Verification Centre)
- **Requirements:**
  - Independent dual verification: drivers and vehicles are verified, approved, or suspended as separate entities.
  - Driver credential checks: DigiLocker integration for Aadhaar/PAN, commercial driving licence verification, bank account penny-drop, and police clearance certificate.
  - Vehicle compliance checks: Parivahan RC lookup, commercial passenger permit, vehicle fitness certificate, commercial comprehensive insurance, emission certificate, and seating capacity.
  - Compliance Blocker Handling: automated detection of expired or missing documents. Admin approval override permitted only with mandatory, audit-logged justification (minimum character length enforced).

### ADH-03: Supply Planning & Dispatch Configuration
- **Requirements:**
  - Define operating city polygons, sub-zones, and vehicle class categories (Hatchback, Sedan, SUV, TT/Van).
  - Configure route optimization weights: maximum travel time, maximum route distance, detour factor limit, and gender safety constraints (e.g., female first pickup / last drop safety policies).
  - Allocation rules: driver offer timeout (e.g., 45 seconds), maximum retry attempts, offer broadcast vs sequential waterfall, and escalation thresholds.

### ADH-04: Supervision & Exception Approvals
- **Requirements:**
  - Real-time cross-tenant operations health overview: active routes, delay metrics, unassigned route alerts, and driver shortfall forecasts.
  - Controlled dispatcher override approvals: audit-logged manual assignments bypassing algorithmic allocation.

### ADH-05: Corporate Pricing & Invoicing
- **Requirements:**
  - Versioned corporate rate cards: pricing rules by base fare, per-km charge, per-minute charge, vehicle class multiplier, shift timing premium (night shifts), and toll/parking handling.
  - Invoice generation: automated monthly/bi-weekly invoice draft creation from completed route billables.
  - Invoicing workflows: finance approval, invoice PDF rendering with GST compliance, dispute adjustments, debit/credit notes, and settlement reconciliation.

### ADH-06: Driver Earnings & Payouts
- **Requirements:**
  - Independent driver payout rate cards completely decoupled from corporate customer billing.
  - Automated driver wallet credit upon verified trip completion.
  - Maker-checker payout batch approval: automated payout batch creation, finance officer approval, automated payout processing via banking partner APIs, idempotency protection, and reversal reconciliation.

### ADH-07: Platform Security & Governance
- **Requirements:**
  - Role-Based Access Control (RBAC) enforced on all API routes.
  - Session revocation: instantaneous token invalidation via Redis-backed `jti` blocklists upon user suspension or credential change.
  - Immutable audit logs capturing actor, action, IP, timestamp, previous state, and new state.

### ADH-08: Business Intelligence & Reports
- **Requirements:**
  - Executive KPI dashboards: on-time arrival rate, vehicle seat utilization, cost-per-commuter-km, driver acceptance rate, and safety incident frequency.
  - Export engine: audited CSV/XLSX/PDF generation with filter preservation and access logging.

---

## 5. Operations Panel / Command Centre (`apps/ops`) — Functional Specification

### 5.1 Real-Time Operations Deck & Dispatch Board
- **Live Route Deck (`/board`):** Real-time lane view displaying routes partitioned by state:
  1. *Pending Dispatch* (Awaiting solver / driver offer)
  2. *Offered* (Active countdown timer for driver acceptance)
  3. *Assigned* (Driver confirmed, approaching first stop)
  4. *Active / In-Transit* (Commuters onboard, executing route)
  5. *At-Risk / Delayed* (Telemetry shows ETA breach > 10 minutes)
- **Fleet Live Map (`/map`):** Interactive map displaying cab markers, vehicle heading, live polyline, pickup sequence pins, and telemetry latency badges (Green <30s, Amber 30-60s, Red >60s / Stale).

### 5.2 Manual Driver Assignment & Reassignment
- Emergency assignment tool for dispatchers to manually allocate a driver to an unassigned or broken-down route.
- Hard server-side validation: instantly blocks drivers who are non-compliant, off-duty, booked on overlapping shifts, or exceeding statutory driving hours.
- Reassignment workflow: automated notification dispatched to reassigned driver and affected commuters; full audit entry created in the **Assignment Activity List**.

### 5.3 Driver Management & Lifetime Operational Profile (`/drivers`)
- Directory of all drivers operating across tenants.
- Detailed driver drawer: lifetime trip counts, acceptance rate, cancellation rate, safety rating, vehicle details, document expiry calendar, and duty history.
- Operations actions: soft-deactivate driver, suspend with reason, or reactivate.

### 5.4 Safety, SOS & Incident Response (`/safety`)
- Instant notification and audio-visual alert upon SOS trigger from any commuter or driver.
- Automated 120-second escalation timer: if unacknowledged by a dispatcher within 120s, alert escalates to senior management and emergency SMS/call cascades are triggered.
- Incident lifecycle: `NEW` ──> `ACKNOWLEDGED` ──> `INVESTIGATING` ──> `ESCALATED` ──> `RESOLVED` / `FALSE_ALARM`.

### 5.5 Shared Support Desk (`/support`)
- Shared support ticket inbox unified across Corporate, Employee, and Operations applications.
- Ticket management: team assignment (Ops, Billing, Tech, Transport), assignee user, status transitions (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_CORPORATE`, `RESOLVED`, `CLOSED`), public responses (visible to employee/corporate), and internal notes (restricted to staff).

---

## 6. Corporate Client Portal (`apps/corporate`) — Functional Specification

### 6.1 Preserved Six-Page Visual Shell
1. **Executive Dashboard (`/`):** Faithful reproduction of the approved corporate layout:
   - Summary Metric Cards: Daily Shifts, Live Commutes, On-Time Arrival %, Total Spend to Date.
   - Active Routes Table: Route number, shift, vehicle type, driver name, passenger count, live status.
   - Quick Links: Import Roster, Download Invoice, Raise Ticket.
2. **Routes & Commutes (`/routes`, `/routes/[id]`):** Searchable route directory, stop sequences, employee manifest, driver details, live map tracking, and trip completion history.
3. **Financial Analytics (`/analytics`):** Monthly and shift-wise spend analytics, cost per employee, department budget utilization.
4. **Billing & Invoices (`/billing`):** Invoices list, PDF download, line-item trip audit trail, dispute submission.
5. **Support & Service Desk (`/support`):** Corporate support ticket submission, SLA compliance tracker, and inquiry history.
6. **Company Profile & Configuration (`/settings`):** Office locations, pickup zones, department rosters, shift cutoff configurations.

### 6.2 Commuter Management & Roster Ingestion
- **Employee Directory (`/employees`):** Commuter master data management: employee ID, name, email, phone, home coordinates, shift schedule, department, and transport eligibility.
- **Roster Ingestion Engine:** Bulk CSV/XLSX import supporting flexible column mapping, coordinate geocoding verification, and duplicate shift validation.
- **Cancellation Policy Enforcement:**
  - Commuter cancellation >= 12 hours before shift pickup: Automatically processed and confirmed without penalty.
  - Commuter cancellation < 12 hours before shift pickup: Flagged as a corporate policy violation; documented in commuter attendance reports.

---

## 7. Employee Mobile App (`apps/employee_app`) — Functional Specification

*Implementation Target: `apps/employee_app` (Flutter / Dart).*

### 7.1 Authentication & Profile (EMP-AUTH)
- Corporate SSO (SAML / OAuth2) or mobile OTP verification.
- Enforces mapping to an active, verified `CorporateEmployee` record under an active tenant contract.
- Profile overview: organization name, employee ID, assigned office, and contact details.

### 7.2 Commute Schedule & Home Deck (EMP-HOME / EMP-SCHED)
- Next Trip Card: shift date, pickup point, scheduled pickup time, cab plate number, driver name, and live trip status.
- Daily / Weekly shift calendar showing upcoming logins and logouts.
- Permitted cancellation and change requests subject to corporate policy cutoffs.

### 7.3 Live Tracking & Boarding (EMP-TRACK / EMP-BOARD)
- Real-time map displaying cab position, approaching ETA, pickup point marker, and route polyline.
- Connection quality indicator: displays last-seen timestamp when telemetry is delayed.
- Boarding verification: dynamic, expiring 4-digit boarding OTP and QR code displayed on screen; confirmed once upon driver entry.

### 7.4 In-Journey Safety & SOS (EMP-SAFE)
- Prominent one-tap SOS button visible throughout the journey.
- On activation: transmits live GPS coordinates, vehicle ID, route ID, and timestamp to the 24×7 Operations Command Centre.
- Fallback display: immediate access to police emergency numbers and local corporate transport helpdesk contacts if network connectivity is compromised.

### 7.5 Support Ticketing & Rating (EMP-SUPPORT / EMP-FEEDBACK)
- Ticket submission categories: Cab Delay, Rash Driving, AC / Vehicle Cleanliness, Driver Behavior, Lost Item.
- Real-time ticket status tracking and bidirectional conversation with the operations desk.
- Post-trip feedback: 5-star rating with optional structured tags.

---

## 8. Driver Mobile App (`apps/mobile`) — Functional Specification

*Implementation Target: `apps/mobile` (Flutter / Dart).*

### 8.1 Onboarding & Digital Verification
- KYC document submission: Aadhaar, PAN, Commercial Driving Licence.
- Vehicle registration: RC, Commercial Insurance, Permit, Fitness Certificate.
- Direct-to-driver agreement acceptance and bank account payout verification.

### 8.2 Shift Duty & Route Allocation
- Duty status toggle: Online / Offline with GPS geohash reporting.
- Route Offer Card: displays shift timing, route number, total passenger count, total distance, guaranteed earnings, and interactive acceptance countdown timer (45 seconds).
- Atomic acceptance: Redis-guaranteed single winner for route allocation.

### 8.3 Route Execution & Stop Verification
- Ordered pickup stop navigation with turn-by-turn routing.
- Waypoint arrival detection: automated proximity geofencing.
- Boarding verification: input commuter OTP or scan QR code.
- Automated 5-minute waiting countdown timer before allowing a passenger NO-SHOW mark.

### 8.4 Driver Earnings & Payout Ledger
- Daily and weekly earnings summary with trip-by-trip audit breakdown.
- Payout transaction history showing processing, paid, and bank reference numbers.
- Emergency SOS button triggering high-priority command centre alerts.

---

## 9. Marketplace Vendor Module (`apps/mobile` — User Mode)

- Requirement Posting: vendors post vehicle requirements specifying vehicle class, pickup location, drop location, passenger/cargo count, and offer price.
- Digital Escrow: automated fare calculation with upfront escrow hold.
- Driver Matching: nearby compliant drivers receive marketplace offers.
- Fulfillment & Settlement: OTP verification on completion credits the agreed driver payout from the booking's rate-card snapshot to the driver wallet.

---

## 10. Cross-Application Workflows & State Machines

### 10.1 End-to-End Enterprise Commute Lifecycle

```
[Corporate HR] ──> Uploads / Syncs Shift Roster (CSV / API)
       │
       ▼
[Backend API]  ──> Validates coordinates, shift cutoffs, and policies
       │
       ▼
[CVRPTW Engine] ──> Clusters pickups by proximity and vehicle capacity into routes
       │
       ▼
[Dispatch Engine] ──> Dispatches route offers to nearby compliant drivers via Redis
       │
       ▼
[Driver App]   ──> Driver accepts offer atomically (Route state: ASSIGNED)
       │
       ▼
[Employee App] ──> Commuter receives cab & driver notification with live ETA
       │
       ▼
[Driver App]   ──> Navigates to stops, validates boarding OTP / QR at each pickup
       │
       ▼
[Ops Centre]   ──> Monitors real-time GPS progress, exceptions, and delays
       │
       ▼
[Destination]  ──> Final drop completed (Route state: COMPLETED)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
[Corporate Billing Ledger]      [Driver Earnings Ledger]
Calculates billable route fare  Credits driver earnings
Generates invoice draft         Prepares payout batch
```

---

## 11. Dual Financial Ledgers & Settlement Engine

1. **Corporate Accounts Receivable (AR) Ledger:**
   - Contract-driven pricing: Base fare + distance fare + duration fare + night shift surcharges.
   - GST compliance: SAC code 996412 (passenger transport), CGST/SGST/IGST computation.
   - Monthly consolidated invoicing with immutable billing line items.
2. **Driver Accounts Payable (AP) Ledger:**
   - Independent driver payout rate card (per route or per km/hour).
   - Instant wallet ledger entry created upon route completion.
   - Bank payout batch generation with maker-checker authorization and idempotency keys to prevent duplicate bank transfers.

---

## 12. Non-Functional Requirements (NFRs)

- **Performance & Latency:**
  - API response time: P95 < 200ms for read requests, P99 < 500ms for write requests.
  - Telemetry ingestion: Sub-1-second processing of driver GPS pings.
  - Dispatch offer delivery: < 3 seconds from trigger to mobile device push.
- **Availability & Scalability:**
  - 99.9% uptime for core API and database infrastructure.
  - Capacity to handle 5,000 concurrent active vehicles and 50,000 daily commuters.
- **Security & Data Privacy:**
  - TLS 1.3 for all data in transit; AES-256 for sensitive data at rest.
  - Phone number masking between drivers and commuters.
  - Strict multi-tenant row-level data isolation: corporate clients can never view data of other tenants.
- **Auditability:**
  - Append-only audit logs for all administrative actions, overrides, and financial transitions.

---

## 13. Quality Gates, Testing & Acceptance Criteria

- **Automated Test Matrix:**
  - Unit Tests: 100% pass on all service-level business logic.
  - Integration Tests: Real PostgreSQL + Redis end-to-end integration tests in CI.
  - Dispatch Simulations: 50-ride and 100-ride concurrency simulations verifying zero double-assignment.
- **Code Quality:**
  - 0 ESLint errors across all packages (`turbo run lint`).
  - 0 TypeScript type errors across all packages (`turbo run typecheck`).
  - All database schema updates managed via Prisma migrations.

---

## 14. Implementation Roadmap & Release Phases

- **Phase 1: Foundation & Compliance (Completed)**
  - Monorepo setup, Prisma schemas, multi-tenant authentication, driver KYC verification.
- **Phase 2: Dispatch & Core Operations (Completed)**
  - CVRPTW route planning, Redis-backed dispatch, live operations map, driver assignment deck, and shared support ticket system.
- **Phase 3: Client Experience & Commuter Services (Current)**
  - Corporate Portal 6-page visual shell, Employee App Flutter client (`apps/employee_app`) integration with auth and support.
- **Phase 4: Financial Automation & Pilot Launch (Next)**
  - Automated payout batch submission, corporate invoice dispute workflows, and Hyderabad pilot deployment.
