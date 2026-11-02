# 15 — API INVENTORY, EVENT CONTRACTS & STATE MACHINES

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
**Document:** REST API Inventory, WebSocket Contracts & Finite State Machines  
**Status:** Source of Truth Baseline  
**Version:** 2.0 (Hyderabad Enterprise ETS Pilot)  
**Company:** Estemporaneo Technologies Private Limited  

---

> ### ⚠️ MANDATORY DESIGN & IMPLEMENTATION DIRECTIVE FOR ALL AI AGENTS & ENGINEERS
> Every AI agent, prompt, developer, and automated assistant modifying or contributing to this codebase **MUST STRICTLY ADHERE** to the project's foundational guidelines:
> 1. **Visual Foundation:** [`docs/04_DESIGN_SYSTEM.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/04_DESIGN_SYSTEM.md) (Colors, Typography, Spacing, Tokens, Radius, Component Styling)
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

