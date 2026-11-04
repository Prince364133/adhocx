# 15 — API INVENTORY, EVENT CONTRACTS & STATE MACHINES

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
**Document:** REST API Inventory, WebSocket Contracts & Finite State Machines  
**Status:** Source of Truth Baseline  
**Version:** 2.0 (Hyderabad Enterprise ETS Pilot)  
**Company:** Estemporaneo Technologies Private Limited  

---

> ## ⚠️ As-built status (verified against `staging` on 2026-11-04)
> The `/v1/...` paths below are a target design. **The real corporate API has no `/v1` prefix and lives under `/corporate/...`.**
> The authoritative list is the generated table in **§ As-built endpoint inventory** at the end of this document. Re-generate it from Nest route metadata whenever controllers change.


> ### ⚠️ MANDATORY DESIGN & IMPLEMENTATION DIRECTIVE FOR ALL AI AGENTS & ENGINEERS
> Every AI agent, prompt, developer, and automated assistant modifying or contributing to this codebase **MUST STRICTLY ADHERE** to the project's foundational guidelines:
> 1. **Visual Foundation:** [`docs/04_DESIGN_SYSTEM.md and apps/marketing/DESIGN_AND_UI.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/04_DESIGN_SYSTEM.md) (Colors, Typography, Spacing, Tokens, Radius, Component Styling)
> 2. **Interaction & User Journey Rules:** [`docs/05_UI_UX_GUIDELINES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/05_UI_UX_GUIDELINES.md) (Information Architecture, Screen States, Error Handling, Navigation)
> 3. **Engineering Authority & Constraints:** [`docs/20_AI_AGENT_RULES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/20_AI_AGENT_RULES.md) (Correctness > Architecture > Security > Speed. Zero hallucinated business rules. Preserved integrity).

---

# 1. Exhaustive REST API Inventory (v1)

All endpoints conform to JSON API standards, enforce tenant token verification, and return structured error codes:

### 1.1 Corporate Client Portal Endpoints
- `GET /v1/corporate/dashboard` — High-level KPI metrics, scheduled vs active trips, and on-time percentages.
- `POST /v1/employees/imports` — Multipart upload of corporate employee master or daily roster Excel files.
- `GET /v1/employees/imports/{job_id}/results` — Dry-run validation error breakdown and error spreadsheet link.
- `GET /v1/employees` — Searchable employee directory filtered by department, cost center, and office.
- `POST /v1/rosters/imports` — Ingest shift rosters and generate provisional transport requests.
- `POST /v1/rosters/{id}/approve` — Authorize published roster and trigger the autonomous route solver.
- `GET /v1/transport-requests` — List passenger requests with status (`APPROVED`, `CANCELLED`, `NO_SHOW`).
- `GET /v1/corporate/routes` — Active and upcoming route plans with vehicle plates and driver names.
- `GET /v1/corporate/routes/{id}/live` — Live map tracking for an active corporate route (scoped to tenant).
- `GET /v1/corporate/invoices` — Corporate billing history and itemized invoice line items.
- `POST /v1/corporate/invoices/{id}/dispute` — Raise an auditable billing dispute with evidence notes.

### 1.2 Employee Mobile App Endpoints
- `POST /v1/auth/otp/send` — Request 6-digit mobile verification code.
- `POST /v1/auth/otp/verify` — Validate OTP and issue employee scoped JWT.
- `GET /v1/me/schedule` — Retrieve upcoming shift rosters and assigned commute rides.
- `GET /v1/me/trips/active` — Real-time status of next active pickup or drop trip.
- `GET /v1/trips/{id}/tracking` — Live coordinates, driver ETA, and GPS freshness state.
- `POST /v1/trips/{id}/cancel` — Self-service ride cancellation (enforces 9-hour cutoff rule).
- `POST /v1/trips/{id}/reschedule` — Request shift time modification.
- `POST /v1/trips/{id}/sos` — Emergency SOS distress trigger with device GPS coordinates.

### 1.3 Driver Mobile App Endpoints
- `POST /v1/drivers/onboard` — Direct onboarding registration for independent cab owners.
- `POST /v1/drivers/documents` — Multipart camera upload for DL, Aadhaar, PAN, and commercial cab RC.
- `POST /v1/drivers/vehicles` — Register commercial vehicle details (plate, category, seating).
- `PATCH /v1/drivers/availability` — Toggle Online/Offline duty status and confirm operating zone.
- `GET /v1/driver-offers` — Poll active incoming route offers with remaining acceptance countdown.
- `POST /v1/driver-offers/{id}/accept` — Atomically commit to an offered route (Redis Redlock).
- `POST /v1/driver-offers/{id}/reject` — Explicitly decline a route offer.
- `POST /v1/driver/trips/{id}/arrived` — Signal arrival at stop (triggers 5-minute wait countdown).
- `POST /v1/driver/trips/{id}/boarding` — Verify passenger boarding via 4-digit OTP or QR token.
- `POST /v1/driver/trips/{id}/no-show` — Mark passenger absent after 5-minute dwell timer expires.
- `POST /v1/driver/trips/{id}/complete` — Conclude route at corporate office hub.
- `GET /v1/driver/earnings` — Transparent ledger of completed route payouts and bank settlements.

### 1.4 AdhocX Super Admin & Command Centre Endpoints
- `GET /v1/admin/tenants` — Platform-wide list of all corporate client accounts.
- `POST /v1/admin/tenants` — Provision new corporate tenant with contract terms and SLAs.
- `GET /v1/admin/drivers/pending` — Compliance queue of pending driver documents.
- `POST /v1/admin/drivers/{id}/approve` — Approve verified driver for dispatch eligibility.
- `PATCH /v1/admin/vehicles/{id}/status` — Activate, suspend, or reject commercial cab.
- `GET /v1/admin/operations/trips` — Central live feed for the **Trips and Ride Management Panel**.
- `POST /v1/admin/routes/{id}/dispatch` — **Manual dispatch override ("Start" action) to force-allocate route.**
- `POST /v1/admin/payout-batches` — Create and approve bank payout batches for independent drivers.
- `POST /v1/admin/invoices/generate` — Generate monthly corporate billing statements from completed trips.

---

# 2. WebSocket Realtime Event Contracts

Connected over WSS (`/v1/realtime`):

```typescript
// 1. Driver Location Ping (Driver -> Server)
interface DriverLocationPingEvent {
  event: 'location:ping';
  data: {
    trip_id: string;
    driver_id: string;
    latitude: number;
    longitude: number;
    speed_kmh: number;
    bearing: number;
    accuracy_meters: number;
    timestamp: string; // ISO 8601 UTC
  };
}

// 2. Cab Arrived Notification (Server -> Employee & Corporate Portal)
interface CabArrivedEvent {
  event: 'cab:arrived';
  data: {
    trip_id: string;
    route_id: string;
    stop_sequence: number;
    passenger_employee_id: string;
    vehicle_plate: string;
    driver_name: string;
    dwell_buffer_seconds: 300; // 5.0 minutes
    arrived_at: string;
  };
}

// 3. Boarding Verified Event (Server -> Clients)
interface BoardingVerifiedEvent {
  event: 'boarding:verified';
  data: {
    trip_id: string;
    passenger_employee_id: string;
    stop_sequence: number;
    boarded_at: string;
    status: 'BOARDED';
  };
}

// 4. Passenger No-Show Event (Server -> Corporate Dashboard & Employee)
interface PassengerNoShowEvent {
  event: 'stop:no_show';
  data: {
    trip_id: string;
    passenger_employee_id: string;
    stop_sequence: number;
    reason: 'PASSENGER_UNAVAILABLE_AFTER_5_MIN_BUFFER';
    dwell_duration_seconds: number; // >= 300
    departed_at: string;
  };
}

// 5. Emergency SOS Event (Server -> Command Centre)
interface EmergencySOSEvent {
  event: 'sos:triggered';
  data: {
    trip_id: string;
    actor_id: string;
    actor_role: 'EMPLOYEE' | 'DRIVER';
    latitude: number;
    longitude: number;
    device_battery: number;
    severity: 'P0_CRITICAL';
    timestamp: string;
  };
}
```

---

# 3. Finite State Machines (FSM)

### 3.1 Transport Request Lifecycle
$$\text{DRAFT} \longrightarrow \text{APPROVED} \longrightarrow \text{PLANNED} \longrightarrow \text{ASSIGNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{COMPLETED}$$
- *Alternative Terminal States:* `CANCELLED` (self-service before 9h cutoff), `RESCHEDULED`, `UNSERVED` (infeasible location).

### 3.2 Driver Offer Lifecycle
$$\text{CREATED} \longrightarrow \text{SENT} \longrightarrow \begin{cases} \text{ACCEPTED} & \text{(atomic commit)} \\ \text{REJECTED} & \text{(fallback to next driver)} \\ \text{EXPIRED} & \text{(60s timer runs out)} \\ \text{WITHDRAWN} & \text{(route cancelled)} \end{cases}$$

### 3.3 Trip Execution State Machine
$$\text{SCHEDULED} \longrightarrow \text{DRIVER\_ASSIGNED} \longrightarrow \text{EN\_ROUTE\_TO\_PICKUP} \longrightarrow \text{ARRIVED} \longrightarrow \text{BOARDING} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{COMPLETED}$$
- *Exceptional Branches:* `DELAYED` (traffic advancer triggered), `INTERRUPTED` (vehicle breakdown), `REASSIGNED` (replacement driver dispatched).

### 3.4 Passenger Stop Lifecycle
$$\text{PENDING} \longrightarrow \text{ARRIVED} \longrightarrow \begin{cases} \text{BOARDED} & \text{(valid OTP entered)} \\ \text{NO\_SHOW} & \text{(5-minute dwell timer expired)} \end{cases}$$

---
*All 15 authoritative specification documents are now established in `docs/corporate-ets/` as the single source of truth for the AdhocX Enterprise Commute System.*



## As-built endpoint inventory (generated 2026-11-04 from Nest route metadata, staging @ 154e67d)

Scope: `resource:<kind>` = the guard loads the record and checks the tenant, driver or employee owns it; `tenant` = forced to the caller's tenant; `driver-self` = the caller's own Driver row; `-` = ADMIN-only or public.

| Method | Path | Roles | Scope | Controller |
|---|---|---|---|---|
| GET | `/corporate/analytics/metric-definitions` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateAnalyticsController |
| GET | `/corporate/analytics/dashboard` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateAnalyticsController |
| GET | `/corporate/analytics/attendance` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateAnalyticsController |
| GET | `/corporate/analytics/reports/:type` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateAnalyticsController |
| POST | `/corporate/billing/invoices/generate-batch` | ADMIN | - | CorporateBillingController |
| GET | `/corporate/billing/invoices` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateBillingController |
| GET | `/corporate/billing/invoices/:id` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:invoice | CorporateBillingController |
| GET | `/corporate/billing/invoices/:id/pdf` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:invoice | CorporateBillingController |
| POST | `/corporate/billing/payouts/prepare-batch` | ADMIN | - | CorporateBillingController |
| GET | `/corporate/billing/drivers/:driverId/earnings` | ADMIN, DRIVER | resource:driver | CorporateBillingController |
| POST | `/corporate/billing/invoices/:id/disputes` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:invoice | CorporateBillingController |
| GET | `/corporate/billing/disputes` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateBillingController |
| POST | `/corporate/billing/disputes/:id/accept` | ADMIN | - | CorporateBillingController |
| POST | `/corporate/billing/disputes/:id/reject` | ADMIN | - | CorporateBillingController |
| GET | `/corporate/billing/credit-notes` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateBillingController |
| POST | `/corporate/billing/payouts/batches` | ADMIN | - | CorporateBillingController |
| GET | `/corporate/billing/payouts/batches` | ADMIN | - | CorporateBillingController |
| GET | `/corporate/billing/payouts/batches/:id` | ADMIN | - | CorporateBillingController |
| POST | `/corporate/billing/payouts/batches/:id/approve` | ADMIN | - | CorporateBillingController |
| POST | `/corporate/billing/payouts/batches/:id/submit` | ADMIN | - | CorporateBillingController |
| GET | `/corporate/billing/reconciliations` | ADMIN | - | CorporateBillingController |
| POST | `/corporate/billing/payouts/provider-callback` | none (signed webhook) | - | CorporatePayoutWebhookController |
| POST | `/corporate/billing/rate-cards/corporate` | ADMIN | - | CorporateRateCardController |
| GET | `/corporate/billing/rate-cards/corporate` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateRateCardController |
| POST | `/corporate/billing/rate-cards/corporate/:id/retire` | ADMIN | - | CorporateRateCardController |
| POST | `/corporate/billing/rate-cards/driver` | ADMIN | - | CorporateRateCardController |
| GET | `/corporate/billing/rate-cards/driver` | ADMIN | - | CorporateRateCardController |
| POST | `/corporate/billing/rate-cards/driver/:id/retire` | ADMIN | - | CorporateRateCardController |
| POST | `/corporate/dispatch/routes/:id/start-now` | ADMIN | resource:route | CorporateDispatchController |
| POST | `/corporate/dispatch/routes/:id/offers/accept` | ADMIN, DRIVER | resource:route | CorporateDispatchController |
| POST | `/corporate/dispatch/routes/:id/offers/reject` | ADMIN, DRIVER | resource:route | CorporateDispatchController |
| GET | `/corporate/dispatch/routes/:id/traffic-assessment` | ADMIN | resource:route | CorporateDispatchController |
| GET | `/corporate/dispatch/routes/:id/status` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:route | CorporateDispatchController |
| GET | `/corporate/dispatch/my-offer` | ADMIN, DRIVER | driver-self | CorporateDispatchController |
| GET | `/corporate/dispatch/driver-offers` | ADMIN, DRIVER | driver-self | CorporateDispatchController |
| GET | `/corporate/dispatch/driver-duties` | ADMIN, DRIVER | driver-self | CorporateDispatchController |
| POST | `/corporate/trips/routes/:id/start` | ADMIN, DRIVER | resource:route | CorporateTripExecutionController |
| POST | `/corporate/trips/routes/:id/stops/:stopId/arrive` | ADMIN, DRIVER | resource:stop | CorporateTripExecutionController |
| POST | `/corporate/trips/routes/:id/stops/:stopId/verify-otp` | ADMIN, DRIVER | resource:stop | CorporateTripExecutionController |
| POST | `/corporate/trips/routes/:id/stops/:stopId/no-show` | ADMIN, DRIVER | resource:stop | CorporateTripExecutionController |
| POST | `/corporate/trips/routes/:id/complete` | ADMIN, DRIVER | resource:route | CorporateTripExecutionController |
| GET | `/corporate/trips/routes/:id/stops/:stopId/boarding-qr` | ADMIN, EMPLOYEE | resource:stop | CorporateTripExecutionController |
| POST | `/corporate/trips/routes/:id/stops/:stopId/verify-qr` | ADMIN, DRIVER | resource:stop | CorporateTripExecutionController |
| POST | `/corporate/trips/routes/:id/telemetry` | ADMIN, DRIVER | resource:route | CorporateTripExecutionController |
| GET | `/corporate/trips/routes/:id/waypoints` | ADMIN, DRIVER | resource:route | CorporateTripExecutionController |
| POST | `/corporate/trips/requests/:id/reschedule` | ADMIN, CORPORATE_ADMIN, EMPLOYEE | resource:request | CorporateTripExecutionController |
| POST | `/corporate/trips/requests/:id/admin-reschedule` | ADMIN | resource:request | CorporateTripExecutionController |
| GET | `/corporate/trips/me/schedule` | ADMIN, EMPLOYEE | tenant | CorporateTripExecutionController |
| GET | `/corporate/trips/me/next-trip` | ADMIN, EMPLOYEE | tenant | CorporateTripExecutionController |
| GET | `/corporate/trips/me/trips` | ADMIN, EMPLOYEE | tenant | CorporateTripExecutionController |
| GET | `/corporate/trips/driver/active-route` | ADMIN, DRIVER | driver-self | CorporateTripExecutionController |
| GET | `/corporate/trips/driver/routes` | ADMIN, DRIVER | driver-self | CorporateTripExecutionController |
| GET | `/corporate/ops/board` | ADMIN | - | CorporateOperationsController |
| GET | `/corporate/ops/routes/:id/detail` | ADMIN | resource:route | CorporateOperationsController |
| POST | `/corporate/ops/routes/:id/reassign` | ADMIN | resource:route | CorporateOperationsController |
| GET | `/corporate/me` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| GET | `/corporate/me/schedule` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| GET | `/corporate/me/trips` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| GET | `/corporate/me/trips/next` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| GET | `/corporate/me/trips/:id/tracking` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| POST | `/corporate/me/trips/:id/safe-reach` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| POST | `/corporate/me/trips/:id/feedback` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| POST | `/corporate/me/tickets` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| GET | `/corporate/me/tickets` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| GET | `/corporate/me/notifications` | EMPLOYEE, CORPORATE_ADMIN, CORPORATE_MANAGER, ADMIN | - | CorporateRiderController |
| GET | `/corporate/rosters/template` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | - | CorporateRosterController |
| POST | `/corporate/rosters/validate` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateRosterController |
| POST | `/corporate/rosters/upload` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateRosterController |
| GET | `/corporate/rosters` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateRosterController |
| GET | `/corporate/rosters/:id` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:roster | CorporateRosterController |
| POST | `/corporate/rosters/:id/approve` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:roster | CorporateRosterController |
| POST | `/corporate/rosters/:id/publish` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:roster | CorporateRosterController |
| GET | `/corporate/rosters/:id/requests` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:roster | CorporateRosterController |
| POST | `/corporate/routes/optimize` | ADMIN, CORPORATE_ADMIN | tenant | CorporateRoutingController |
| GET | `/corporate/routes` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateRoutingController |
| GET | `/corporate/routes/:id` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER, DRIVER | resource:route | CorporateRoutingController |
| POST | `/corporate/safety/sos` | ADMIN, EMPLOYEE, DRIVER | resource:route | CorporateSafetyController |
| GET | `/corporate/safety/alerts` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateSafetyController |
| POST | `/corporate/safety/alerts/:id/acknowledge` | ADMIN | resource:sos | CorporateSafetyController |
| POST | `/corporate/safety/alerts/:id/investigate` | ADMIN | resource:sos | CorporateSafetyController |
| POST | `/corporate/safety/alerts/:id/escalate` | ADMIN | resource:sos | CorporateSafetyController |
| POST | `/corporate/safety/alerts/:id/close` | ADMIN | resource:sos | CorporateSafetyController |
| POST | `/corporate/safety/alerts/:id/resolve` | ADMIN | resource:sos | CorporateSafetyController |
| POST | `/corporate/safety/routes/:id/check-deviation` | ADMIN, DRIVER | resource:route | CorporateSafetyController |
| POST | `/corporate/safety/routes/:id/stops/:stopId/confirm-safe-drop` | ADMIN, DRIVER | resource:stop | CorporateSafetyController |
| POST | `/corporate/support/tickets` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateSupportTicketController |
| GET | `/corporate/support/tickets` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateSupportTicketController |
| GET | `/corporate/support/tickets/:id` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER, EMPLOYEE | resource:ticket | CorporateSupportTicketController |
| PATCH | `/corporate/support/tickets/:id/status` | ADMIN | resource:ticket | CorporateSupportTicketController |
| GET | `/corporate/scheduling/shift-templates` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateSchedulingController |
| POST | `/corporate/scheduling/shift-templates` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateSchedulingController |
| GET | `/corporate/scheduling/holidays` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateSchedulingController |
| POST | `/corporate/scheduling/holidays` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | tenant | CorporateSchedulingController |
| POST | `/corporate/scheduling/auto-plan/run` | ADMIN | - | CorporateSchedulingController |
| POST | `/corporate/tenants` | ADMIN | - | CorporateTenantController |
| GET | `/corporate/tenants` | ADMIN | - | CorporateTenantController |
| GET | `/corporate/tenants/:id` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| PATCH | `/corporate/tenants/:id` | ADMIN | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/users` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| POST | `/corporate/tenants/:id/users` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| PATCH | `/corporate/tenants/:id/users/:userId` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/departments` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| POST | `/corporate/tenants/:id/departments` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/cost-centers` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| POST | `/corporate/tenants/:id/cost-centers` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/policy` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/policy/versions` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| POST | `/corporate/tenants/:id/policy` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| POST | `/corporate/tenants/:id/offices` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/offices` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/offices/:officeId` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| POST | `/corporate/tenants/:id/employees` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/employees` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/tenants/:id/employees/:employeeId` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| PATCH | `/corporate/tenants/:id/employees/:employeeId` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| POST | `/corporate/tenants/:id/employees/:employeeId/locations` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:tenant | CorporateTenantController |
| GET | `/corporate/trips/routes/:id/tracking` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER, DRIVER, EMPLOYEE | resource:route | CorporateTrackingController |
| GET | `/corporate/trips/routes/:id/timeline` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:route | CorporateTrackingController |
| GET | `/corporate/trips/routes/:id/playback` | ADMIN, CORPORATE_ADMIN, CORPORATE_MANAGER | resource:route | CorporateTrackingController |
