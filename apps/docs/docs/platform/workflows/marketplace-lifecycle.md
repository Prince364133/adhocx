---
title: Marketplace Requirement to Trip
description: Verified on-demand vendor, offer, assignment and trip workflow.
---

# Marketplace Requirement to Trip

**Evidence status:** Verified against requirement, dispatch, offer, trip and
shared state-machine source.

## Happy Path

```mermaid
sequenceDiagram
  participant Vendor
  participant API
  participant DB
  participant Dispatch
  participant Driver

  Vendor->>API: Create requirement
  API->>DB: Verify vendor and wallet
  API->>DB: Lock server price snapshot
  API->>DB: Create requirement
  API->>Dispatch: Start dispatch
  Dispatch->>DB: Find eligible driver candidates
  Dispatch->>DB: Create sent offers
  Dispatch->>Driver: Notify candidates
  Driver->>API: Accept offer
  API->>Dispatch: Resolve acceptance
  Dispatch->>DB: Create assignment/trip
  Driver->>API: Arrive
  Driver->>API: Start with OTP
  Driver->>API: Complete trip
  API->>DB: Update trip and financial state
```

## Guards

Before requirement creation, the API:

- verifies the vendor profile
- verifies vendor verification status
- checks pending review
- resolves the server-authoritative quote/snapshot
- validates wallet sufficiency
- creates a priced requirement

Before dispatch, the API searches eligible drivers and creates offer waves.

Before offer acceptance, the offer must:

- belong to the authenticated driver
- remain in `SENT`
- remain unexpired
- satisfy requirement capacity
- satisfy current driver/vehicle eligibility

Before trip start, the server verifies:

- assigned driver ownership
- OTP
- current trip state
- required operational preconditions

## State Flow

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> POSTED
  POSTED --> DISPATCHING
  DISPATCHING --> PARTIALLY_FULFILLED
  DISPATCHING --> FULFILLED
  DISPATCHING --> NO_DRIVER_AVAILABLE
  PARTIALLY_FULFILLED --> FULFILLED
  FULFILLED --> IN_PROGRESS
  IN_PROGRESS --> COMPLETED
  NO_DRIVER_AVAILABLE --> DISPATCHING
  DRAFT --> CANCELLED
  POSTED --> CANCELLED
  DISPATCHING --> CANCELLED
  PARTIALLY_FULFILLED --> CANCELLED
  FULFILLED --> CANCELLED
  IN_PROGRESS --> CANCELLED
```

Cancellation and no-progress states are terminal only where the shared
state validator declares them terminal.
