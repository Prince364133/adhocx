# 10 — SUPER ADMIN & TRIPS/RIDE MANAGEMENT PANEL

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
**Document:** Super Admin Portal & Command Console Specification  
**Status:** Source of Truth Baseline  
**Version:** 2.0 (Hyderabad Enterprise ETS Pilot)  
**Company:** Estemporaneo Technologies Private Limited  

---

> ### ⚠️ MANDATORY DESIGN & IMPLEMENTATION DIRECTIVE FOR ALL AI AGENTS & ENGINEERS
> Every AI agent, prompt, developer, and automated assistant modifying or contributing to this codebase **MUST STRICTLY ADHERE** to the project's foundational guidelines:
> 1. **Visual Foundation:** [`docs/04_DESIGN_SYSTEM.md and apps/marketing/DESIGN_AND_UI.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/04_DESIGN_SYSTEM.md) (Colors, Typography, Spacing, Tokens, Radius, Component Styling)
> 2. **Interaction & User Journey Rules:** [`docs/05_UI_UX_GUIDELINES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/05_UI_UX_GUIDELINES.md) (Information Architecture, Screen States, Error Handling, Navigation)
> 3. **Engineering Authority & Constraints:** [`docs/20_AI_AGENT_RULES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/20_AI_AGENT_RULES.md) (Correctness > Architecture > Security > Speed. Zero hallucinated business rules. Preserved integrity).

---

# 1. Product Scope & Operational Authority

The AdhocX Super Admin Web Portal (built with Next.js 14) is the central governing interface for AdhocX operations, compliance, dispatch supervisors, and financial controllers. It provides platform-wide oversight across multiple corporate client tenants (Company X, Company Y), governs independent driver supply, manages dual-ledger pricing contracts, and houses the **Trips and Ride Management Panel** for 24x7 route fulfillment and manual dispatch overrides.

---

# 2. Comprehensive Screen Inventory (PRD v2.0 Baseline)

| UI Screen ID | Screen Name | Route Path | Core Functionality & Features |
| :---: | :--- | :--- | :--- |
| **UI-01-01** | Tenant Directory | `/admin/tenants` | Master list of all corporate enterprise clients, active contracts, and status. |
| **UI-01-02** | Tenant Detail | `/admin/tenants/[id]` | Profile, registered offices, cost centers, authorized corporate admins, and SLAs. |
| **UI-01-03** | Contract Editor | `/admin/tenants/[id]/contract` | Configure rate cards, billing cycles, cancellation cutoffs (e.g. 9h), and penalties. |
| **UI-01-04** | Policy Versions | `/admin/tenants/[id]/policies` | Version history and audit trail of contract modifications and SLA amendments. |
| **UI-02-01** | Driver Approvals | `/admin/drivers/approvals` | Verification desk for KYC, commercial driving licenses, Aadhaar, PAN, and selfies. |
| **UI-02-02** | Driver Profile | `/admin/drivers/[id]` | Direct driver agreement status, ratings, total completed corporate routes, and bank details. |
| **UI-02-03** | Vehicle Compliance | `/admin/vehicles` | Inspection desk for commercial cab RC, commercial insurance, fitness, and permits. |
| **UI-02-04** | Expiry Queue | `/admin/compliance/expiry` | Proactive tracker for vehicles/drivers with documents expiring within 30 days. |
| **UI-03-01** | Supply Map | `/admin/supply/map` | Real-time map of online, available, and busy driver supply across Hyderabad zones. |
| **UI-03-02** | Route Rules | `/admin/dispatch/rules` | Configure max passenger capacity (Sedan: 4, SUV: 6), dwell time (5 min), and MERT (120 min). |
| **UI-03-03** | Allocation Rules | `/admin/dispatch/allocation` | Configure H3 search radius (5 km $\to$ 10 km), offer expiry (60s), and DDA lead times. |
| **UI-03-04** | Coverage Forecast | `/admin/supply/forecast` | Supply-demand matching forecast comparing upcoming rosters against driver availability. |
| **UI-04-01** | Operations Overview | `/admin/operations` | Real-time command dashboard of cross-tenant trip execution and system health. |
| **UI-04-02** | **Trips & Ride Management** | `/admin/operations/trips` | **Dedicated panel for monitoring all active corporate routes with manual dispatch "Start".** |
| **UI-04-03** | Exception Queue | `/admin/operations/exceptions` | Triage desk for delayed routes, unassigned routes, no-shows, and breakdown incidents. |
| **UI-04-04** | Override Review | `/admin/operations/overrides` | Audited log of all manual reassignments, force-starts, and driver swaps. |
| **UI-05-01** | Corporate Rate Cards | `/admin/finance/corporate-rates`| Master versioned rate cards: base route fare, per-km rates, extra wait fees. |
| **UI-05-02** | Invoice Runs | `/admin/finance/invoices` | Automated generation, review, and approval of monthly corporate client invoices. |
| **UI-05-03** | Billing Adjustments | `/admin/finance/adjustments` | Issue credit notes, SLA penalty deductions, and manual invoice corrections. |
| **UI-05-04** | Dispute Management | `/admin/finance/disputes` | Review client-raised disputes with GPS timestamps and telemetry evidence. |
| **UI-06-01** | Driver Rate Cards | `/admin/finance/driver-rates` | Master driver payout rate cards (strictly confidential from corporate clients). |
| **UI-06-02** | Earnings Ledger | `/admin/finance/driver-earnings`| Immutable record of driver trip payables, deductions, and wallet balances. |
| **UI-06-03** | Payout Approval | `/admin/finance/payouts` | Maker-checker desk for approving weekly/daily driver bank payout batches. |
| **UI-06-04** | Bank Reconciliation | `/admin/finance/reconciliation` | Automated match of bank UTR numbers against payout batches; failure retries. |
| **UI-07-01** | Users & Roles (Admin) | `/admin/settings/users` | Platform staff RBAC (Super Admin, Dispatch Supervisor, Compliance Officer, Finance). |
| **UI-07-02** | Integrations & Keys | `/admin/settings/integrations` | Configure Google Maps API keys, RazorpayX credentials, and DigiLocker APIs. |
| **UI-07-03** | Audit Logs | `/admin/settings/audit` | Comprehensive, tamper-evident log of all privileged system actions and mutations. |
| **UI-07-04** | System Health | `/admin/settings/health` | Live monitoring of API response times, BullMQ worker queues, and GPS ingestion rate. |
| **UI-08-01** | Executive KPIs | `/admin/bi/kpis` | Cross-client executive metrics: gross margin, platform fulfillment %, driver churn. |
| **UI-08-02** | Driver Supply Reports| `/admin/bi/supply` | Driver hours online, acceptance rates, cancellation frequency, and utilization. |
| **UI-08-03** | Financial Reports | `/admin/bi/financials` | Corporate receivables vs driver payables, gross contribution, and GST ledgers. |
| **UI-08-04** | Compliance Reports | `/admin/bi/compliance` | Fleet compliance audit, background check logs, and commercial license status. |

---

# 3. The Trips & Ride Management Panel (UI-04-02)

The **Trips and Ride Management Panel** is the primary operational workspace for AdhocX dispatch supervisors:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ AdhocX Command Center  •  TRIPS & RIDE MANAGEMENT PANEL  •  Filter: [ Shift: 08:00 AM Login ▾ ] [ Tenant: Company X ▾ ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Active Routes: 50   │  Assigned: 46 (92%)  │  Unassigned: 4 (8%)  │  In-Transit: 38  │  At-Risk / Delayed: 2            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Search Route / Cab: [ Q Search... ]      Sort By: [ Earliest Pickup ▾ ]       Auto-Refresh: [ 🟢 Live (5s) ]             │
├──────────┬───────────┬───────────────┬────────────┬─────────────┬───────────┬───────────────┬───────────────────────────┤
│ Route ID │ Client    │ Vehicle Type  │ Passengers │ Stop 1 Time │ Cab Plate │ Driver Name   │ Status & Quick Actions    │
├──────────┼───────────┼───────────────┼────────────┼─────────────┼───────────┼───────────────┼───────────────────────────┤
│ RT-8801  │ Company X │ Sedan (Dzire) │ 4 / 4      │ 06:00 AM    │ TS09UB4410│ Ramesh Kumar  │ 🟢 EN ROUTE TO STOP 2     │
│          │ Progress: Stop 1 Boarded (06:03 AM). ETA Stop 2: 06:14 AM.                                                   │
├──────────┼───────────┼───────────────┼────────────┼─────────────┼───────────┼───────────────┼───────────────────────────┤
│ RT-8812  │ Company X │ Sedan (Etios) │ 4 / 4      │ 06:15 AM    │ ⚠️ None   │ ⚠️ Unassigned │ 🟡 UNASSIGNED (OFFER SENT)│
│          │ Offer sent to 2 drivers in 5km H3 grid. Expiring in 18s.           │ [ ▶️ START / FORCE DISPATCH ] │
├──────────┼───────────┼───────────────┼────────────┼─────────────┼───────────┼───────────────┼───────────────────────────┤
│ RT-8824  │ Company X │ SUV (Ertiga)  │ 6 / 6      │ 06:10 AM    │ ⚠️ None   │ ⚠️ Unassigned │ 🔴 ESCALATED (NO DRIVER)  │
│          │ Search expanded to 10km. No driver accepted within lead time.       │ [ ⚡ MANUAL ALLOCATE ] [ ▶️ START ]│
└──────────┴───────────┴───────────────┴────────────┴─────────────┴───────────┴───────────────┴───────────────────────────┘
```

### Manual Dispatch Override ("Start" Action):
1. **Selection:** A supervisor selects an unassigned or delayed route row.
2. **Action Trigger:** The supervisor clicks the **`[ ▶️ START / FORCE DISPATCH ]`** button.
3. **Execution Modes:**
   - **Mode A (Immediate Automated Wave):** Instantly triggers an accelerated H3 broadcast to all verified online drivers within the 10 km grid simultaneously (surge offer mode) bypassing standard 1-by-1 sequential queues.
   - **Mode B (Manual Driver Assignment):** The supervisor searches a specific driver by name or vehicle plate, reviews compliance, and directly assigns the route. The selected driver receives an immediate push with an audible commitment lock.
4. **Audit Immutability:** Every manual "Start" or reassignment records the supervisor's user ID, UTC timestamp, and a mandatory operational reason code (`DISPATCHER_OVERRIDE_DELAY_RISK`) in `audit_logs`.

---
*Refer to `11_SAFETY_SOS_AND_COMMAND_CENTRE_OPERATIONS.md` for safety escalations.*

