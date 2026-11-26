---
title: ETS Roster to Route
description: Verified corporate roster, route planning, dispatch and execution workflow.
---

# ETS Roster to Route

**Evidence status:** Verified across roster, route, dispatch and trip execution
controllers/services.

## Happy Path

```mermaid
sequenceDiagram
  participant Corporate
  participant API
  participant Planner
  participant DB
  participant Dispatch
  participant Driver
  participant Employee

  Corporate->>API: Upload roster
  API->>DB: Validate and dry-run
  Corporate->>API: Approve/publish roster
  API->>DB: Generate transport requests
  Corporate->>API: Optimize routes
  API->>Planner: Solve route plan
  Planner-->>API: Ordered route plan
  Corporate->>API: Commit plan
  API->>DB: Persist routes/stops
  API->>Dispatch: Start route dispatch
  Dispatch->>Driver: Send route offer
  Driver->>API: Accept offer
  API->>DB: Assign route
  Driver->>API: Start route
  Driver->>Employee: Navigate pickup stops
  Employee->>API: Boarding OTP/QR
  Driver->>API: Verify stop
  Driver->>API: Complete route
```

## Roster Lifecycle

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> APPROVED
  APPROVED --> PUBLISHED
  PUBLISHED --> PROCESSED
  DRAFT --> CANCELLED
  APPROVED --> CANCELLED
  PUBLISHED --> CANCELLED
```

Upload mode determines whether a roster is created as draft or published
directly. Publishing uses idempotent transport-request generation.

## Route States

Verified route states include:

- `PLANNED`
- `DISPATCHING`
- `ASSIGNED`
- `IN_TRANSIT`
- `COMPLETED`
- `CANCELLED`

The route execution service requires:

- Driver verification
- Vehicle capacity vs passenger count
- Assigned route ownership
- Arrival coordinates
- Boarding OTP/QR validity
- Stop and route state

## Stop and Safety States

Corporate stops use lifecycle states including pending, arrived, boarded,
no-show and cancelled. A stop may have:

- 5-minute dwell buffer
- OTP attempt limits
- Dynamic QR token
- Arrival/drop geofence checks
- Safe-reach confirmation
