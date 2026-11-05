# 07 — CORPORATE CLIENT PORTAL SPECIFICATION

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
**Document:** Corporate Client Portal Screen & UX Specification  
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

# 1. Product Scope & User Roles

The Corporate Client Portal is a secure, responsive web application (built with Next.js 14) dedicated to enterprise clients (Company X). It provides end-to-end visibility and administrative governance for employee commute operations while maintaining strict data isolation.

### Permitted User Roles:
1. **Corporate Super Admin:** Tenant-wide administration, office provisioning, user invitations, and contract SLA oversight.
2. **HR Manager:** Employee directory management, shift assignment, and real-time attendance / no-show tracking.
3. **Transport Manager:** Roster uploading, route review, booking exception approval, and live tracking of corporate cabs.
4. **Safety Officer:** Real-time SOS alerts, route deviation monitoring, and incident investigation.
5. **Finance Manager:** Corporate rate card viewing, invoice review, trip billable line audits, and dispute management.
6. **Read-Only Management:** Executive dashboards, punctuality KPIs, and aggregate commute reports.

*Security Boundary: Corporate users can NEVER see AdhocX internal driver payout rates, margins, or data from other corporate tenants.*

---

# 2. Comprehensive Screen Inventory (PRD v2.0 Baseline)

Every screen implements the 7 mandatory states defined in `docs/05_UI_UX_GUIDELINES.md`: `loading`, `empty`, `success`, `validation_error`, `network_error`, `unauthorized`, and `offline/stale`.

| UI Screen ID | Screen Name | Route Path | Primary Purpose & Key Features |
| :---: | :--- | :--- | :--- |
| **UI-01-01** | Organization Settings | `/settings/organization` | Corporate profile, primary offices, transport zones, and cost centers. |
| **UI-01-02** | Office Directory | `/settings/offices` | Office address geocodes, transport bays, security gates, and active shifts. |
| **UI-01-03** | Users & Roles | `/settings/users` | Invite HR, Transport, Safety, and Finance staff; configure office scopes. |
| **UI-02-01** | Overview Dashboard | `/dashboard` | Daily scheduled vs active trips, employees transported, on-time arrival %, real-time exceptions. |
| **UI-02-02** | KPI Drilldown | `/dashboard/kpis` | Deep-dive analytics: seat utilization, average delays, and cost per employee. |
| **UI-02-03** | Exceptions Summary | `/dashboard/exceptions` | Immediate view of delayed routes, no-shows, and pending exception approvals. |
| **UI-03-01** | Employee List | `/employees` | Searchable directory of eligible corporate employees, addresses, and status. |
| **UI-03-02** | Employee Detail | `/employees/[id]` | Profile, geocoded pickup point, assigned shift, and commute history. |
| **UI-03-03** | Import Wizard | `/employees/import` | Drag-and-drop Excel/CSV uploader with live streaming validation progress. |
| **UI-03-04** | Validation Results | `/employees/import/results` | Dry-run error report, invalid geocode flags, and error spreadsheet download. |
| **UI-04-01** | Shift Templates | `/rosters/shifts` | Configure 08:00 AM / 09:00 AM login and 05:00 PM / 06:00 PM logout schedules. |
| **UI-04-02** | Roster Calendar | `/rosters/calendar` | Monthly/weekly visual calendar of published corporate transport demand. |
| **UI-04-03** | Import Preview | `/rosters/import/preview` | Preview mapped shifts, passenger counts, and vehicle estimates before publishing. |
| **UI-04-04** | Roster Approval | `/rosters/approve` | One-click button to approve roster and trigger autonomous route solver. |
| **UI-05-01** | Booking Queue | `/bookings` | List of all automatic and adhoc transport bookings with status filters. |
| **UI-05-02** | Booking Detail | `/bookings/[id]` | Full audit trail of pickup location, assigned route, and passenger status. |
| **UI-05-03** | Approval Inbox | `/bookings/approvals` | Review late cancellation requests, shift overrides, and manager exceptions. |
| **UI-06-01** | Routes List | `/routes` | List of all generated routes (e.g. Route 1 to 50) with assigned vehicle and cab plates. |
| **UI-06-02** | Route Detail | `/routes/[id]` | Step-by-step passenger pickup sequence, planned vs actual arrival, and buffer timers. |
| **UI-06-03** | Live Map | `/routes/live` | Interactive map showing live GPS positions of corporate cabs, route lines, and ETA. |
| **UI-06-04** | Trip Timeline | `/routes/[id]/timeline` | Complete event timeline (driver assigned $\to$ arrived $\to$ boarded $\to$ completed). |
| **UI-07-01** | Safety Dashboard | `/safety` | Active SOS incidents, route deviations, overspeed alerts, and stale GPS warnings. |
| **UI-07-02** | Incident Detail | `/safety/incidents/[id]` | SOS timeline, passenger details, call logs, and security escalation notes. |
| **UI-07-03** | Support Tickets | `/support` | Helpdesk ticketing for missed pickups, vehicle cleanliness, and driver feedback. |
| **UI-07-04** | SLA Report | `/safety/sla` | Punctuality percentage, on-time arrival audit, and SOS resolution metrics. |
| **UI-08-01** | Invoice List | `/billing/invoices` | Monthly corporate invoices, billing periods, total amount, and payment status. |
| **UI-08-02** | Invoice Detail | `/billing/invoices/[id]` | Itemized trip billable lines, rate card formula, kilometers, and tax breakdown. |
| **UI-08-03** | Billing Dispute | `/billing/disputes` | Raise formal dispute on specific billable trip lines with operational evidence. |
| **UI-08-04** | Reports | `/reports` | Exportable CSV/PDF reports: employee attendance, no-shows, and department costs. |
| **UI-08-05** | Integrations | `/settings/integrations` | HRMS API connector, SFTP roster sync status, and API credentials. |

---

# 3. Real-Time Employee Commute & No-Show Monitoring Dashboard

A primary requirement for Corporate HR is instant operational transparency regarding employee commute attendance:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ AdhocX Corporate Commute Monitor  •  Shift: 08:00 AM Login  •  Updated: 10 seconds ago (Live) │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ Total Employees: 250   │  Boarded: 242 (96.8%)  │  No-Shows: 5 (2.0%)  │  Cancelled: 3 (1.2%) │
├────────────────────────┴────────────────────────┴──────────────────────┴─────────────────────┤
│ Filters: [ Department: All ▾ ]  [ Route: All ▾ ]  [ Status: No-Shows Only ▾ ]  [ Search: Q ] │
├───────────┬───────────────┬────────────┬──────────┬───────────┬────────────────┬────────────────┤
│ Emp ID    │ Employee Name │ Department │ Route ID │ Stop #    │ Scheduled Time │ Status         │
├───────────┼───────────────┼────────────┼──────────┼───────────┼────────────────┼────────────────┤
│ EMP-10492 │ Vikram Patel  │ Finance    │ Route 08 │ Stop 2    │ 06:25 AM       │ 🔴 NO-SHOW     │
│           │ Notes: Exceeded 5-min wait buffer. Driver departed Stop 2 at 06:31 AM.            │
├───────────┼───────────────┼────────────┼──────────┼───────────┼────────────────┼────────────────┤
│ EMP-10884 │ Priya Reddy   │ Ops        │ Route 14 │ Stop 1    │ 06:10 AM       │ 🔴 NO-SHOW     │
│           │ Notes: Passenger phone unreachable. 5-min timer expired. Driver moved to Stop 2.   │
├───────────┼───────────────┼────────────┼──────────┼───────────┼────────────────┼────────────────┤
│ EMP-10221 │ Sneha Roy     │ Tech       │ Route 22 │ Stop 4    │ 07:15 AM       │ 🟢 BOARDED     │
│           │ Verified at 07:16 AM via OTP.                                                   │
└───────────┴───────────────┴────────────┴──────────┴───────────┴────────────────┴────────────────┘
```

### Key UI Features:
1. **Audited No-Show Cards:** Each no-show row displays the exact driver arrival time, driver departure time, and verified GPS coordinates, proving the cab honored the full 5-minute wait buffer.
2. **One-Click Export:** HR managers can instantly download attendance discrepancy logs for payroll and shift adherence.
3. **Live GPS Stale Indicator:** If vehicle GPS has not updated within 45 seconds, the vehicle icon turns yellow with a `"GPS Stale (2m)"` tag, maintaining absolute truth in operational data.

---
*Refer to `08_EMPLOYEE_MOBILE_APP_SPECIFICATION.md` for the passenger mobile experience.*


---

## 4. Delivery Status & Batch Verification Matrix (All 12 Batches Completed)

| Batch | Module Title | Desktop Screens Included | Route URLs | Build Verification |
|---|---|---|---|---|
| **Batch 01** | Overview & Executive Dashboard | 1.1 Company Overview<br>1.2 Transport Analytics<br>1.3 Live Operations Summary<br>1.4 Exceptions Dashboard | `/dashboard`<br>`/dashboard/analytics`<br>`/dashboard/live-summary`<br>`/dashboard/exceptions` | `PASS` (Static prerender) |
| **Batch 02** | Live Operations & Employee Tracking | 2.1 Live Operations Map<br>2.2 Employee Live Tracking<br>2.3 Live Trip Details<br>2.4 Tracking Exceptions | `/live`<br>`/live/employees`<br>`/live/trips`<br>`/live/exceptions` | `PASS` (Static prerender) |
| **Batch 03** | Employee Directory & Management | 3.1 Employee Directory<br>3.2 Employee Profile<br>3.3 Employee Import Wizard<br>3.4 Import Validation Results | `/employees`<br>`/employees/profile`<br>`/employees/import`<br>`/employees/import/results` | `PASS` (Static prerender) |
| **Batch 04** | Offices, Buildings & Organization | 4.1 Offices Directory<br>4.2 Office Details & Security Gates<br>4.3 Geofences & Pickup Points<br>4.4 Organization Structure & Cost Centers | `/offices`<br>`/offices/details`<br>`/offices/geofences`<br>`/offices/cost-centers` | `PASS` (Static prerender) |
| **Batch 05** | Shifts & Employee Rosters | 5.1 Shift Management<br>5.2 Roster Calendar<br>5.3 Roster Import & Preview<br>5.4 Roster Approval & Publishing | `/rosters/shifts`<br>`/rosters/calendar`<br>`/rosters/import`<br>`/rosters/approve` | `PASS` (Static prerender) |
| **Batch 06** | Bookings & Transport Requests | 6.1 Booking Overview<br>6.2 Booking Queue<br>6.3 Booking Details<br>6.4 Approval Inbox | `/bookings/overview`<br>`/bookings`<br>`/bookings/details`<br>`/bookings/approvals` | `PASS` (Static prerender) |
| **Batch 07** | Routes & Trip Management | 7.1 Route Planning Master<br>7.2 Active Routes List<br>7.3 Route Details & Sequential Stops<br>7.4 Fleet & Driver Allocation | `/routes`<br>`/routes/active`<br>`/routes/details`<br>`/routes/allocation` | `PASS` (Static prerender) |
| **Batch 08** | Safety & Incident Management | 8.1 Safety Overview<br>8.2 Incident Details & SOS Dossier<br>8.3 Incident Resolution Timeline<br>8.4 Safety Reports | `/safety`<br>`/safety/incidents/details`<br>`/safety/incidents/resolve`<br>`/safety/reports` | `PASS` (Static prerender) |
| **Batch 09** | Support & SLA Management | 9.1 Support Overview<br>9.2 Support Ticket List<br>9.3 Ticket Details & Live Thread<br>9.4 SLA Performance Report | `/support`<br>`/support/tickets`<br>`/support/tickets/details`<br>`/support/sla` | `PASS` (Static prerender) |
| **Batch 10** | Billing & Invoice Management | 10.1 Billing Overview<br>10.2 Invoice List<br>10.3 Invoice Details<br>10.4 Billing Disputes | `/billing`<br>`/billing/invoices`<br>`/billing/details`<br>`/billing/disputes` | `PASS` (Static prerender) |
| **Batch 11** | Reports & Analytics | 11.1 Transport Performance Report<br>11.2 Employee Usage Report<br>11.3 Vehicle & Route Analytics<br>11.4 Cost & Department Reports | `/reports`<br>`/reports/usage`<br>`/reports/fleet`<br>`/reports/costs` | `PASS` (Static prerender) |
| **Batch 12** | Integrations, Settings & Access Control | 12.1 HRMS Integration<br>12.2 Import Mapping Engine<br>12.3 Integration Health & Webhooks<br>12.4 Organization Settings & Audit | `/settings`<br>`/settings/mapping`<br>`/settings/health`<br>`/settings/organization` | `PASS` (Static prerender) |

**Total Delivery**: 12 Batches, 48 Desktop Screens, 12 Sub-navigation Switchers, 54 Prerendered Static Pages.
**Build & Typecheck Status**: All 54 routes compiled cleanly via `next build` with zero TypeScript or JSX runtime errors.
