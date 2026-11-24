# AdhocX — Feature Specification & Scope

**Document:** `02_FEATURES.md`
**Product:** AdhocX
**Version:** 1.0
**Status:** Product Source of Truth
**Related Document:** `01_PRD.md`

---

# 1. Purpose

This document defines the complete feature scope for AdhocX V1.

The PRD defines **what the product is**.

This document defines:

> **Exactly what features the product contains, who can use them, what they do, their business rules, their states, their edge cases and their acceptance criteria.**

This document must be used by:

* Product
* Design
* Engineering
* QA
* Backend developers
* Mobile developers
* Admin developers
* AI coding agents

No feature should be implemented outside the scope defined here without an explicit product decision.

---

# 2. Feature Classification

Every feature is classified as:

### P0 — Critical

Required for the core marketplace to function.

### P1 — Required V1

Required for a usable production V1 but not necessarily part of the minimum technical proof.

### P2 — Operational Enhancement

Useful for launch/operations but can be deferred if necessary.

### Future

Explicitly outside V1.

---

# 3. V1 Feature Map

```text
ADHOCX
│
├── Authentication
│
├── User Management
│
├── User
│   ├── Onboarding
│   ├── Dashboard
│   ├── Requirements
│   ├── Bulk Posting
│   ├── Assignment Tracking
│   ├── Live Status
│   ├── Payments
│   ├── History
│   └── Profile
│
├── Driver
│   ├── Onboarding
│   ├── KYC
│   ├── Vehicle
│   ├── Availability
│   ├── Nearby Trips
│   ├── Trip Offers
│   ├── Trip Execution
│   ├── Navigation
│   ├── Earnings
│   ├── Withdrawals
│   └── Profile
│
├── Dispatch
│   ├── Eligibility
│   ├── Geographic Matching
│   ├── Ranking
│   ├── Offer Creation
│   ├── Acceptance
│   ├── Reservation
│   ├── Radius Expansion
│   └── Failure Handling
│
├── Trip Lifecycle
│
├── Payments
│
├── Settlement
│
├── Notifications
│
├── Realtime
│
└── Admin
    ├── Dashboard
    ├── Drivers
    ├── Users
    ├── Trips
    ├── Pricing
    ├── Payments
    ├── Settlements
    ├── Reports
    ├── Support
    └── Audit Logs
```

---

# 4. Feature Specification Format

Every feature in this document follows the following structure:

```text
Feature
Priority
Actor
Purpose
Preconditions
User Flow
Business Rules
System Behavior
Success State
Failure States
Permissions
Dependencies
Acceptance Criteria
```

---

# 5. Authentication

## Feature: OTP Authentication

**Priority:** P0

**Actors:**

* User
* Driver
* Admin

**Purpose:**

Allow users to securely authenticate into their appropriate AdhocX application.

The source PRD explicitly specifies OTP authentication.

---

## Preconditions

* User has a valid registered identifier.
* OTP service is operational.

---

## User Flow

```text
Open Application
      ↓
Enter Phone/Identifier
      ↓
Request OTP
      ↓
Receive OTP
      ↓
Enter OTP
      ↓
Verify
      ↓
Authenticated
```

---

## Business Rules

* OTP must expire.
* OTP attempts must be limited.
* Repeated OTP requests must be rate-limited.
* Invalid OTP must not authenticate the user.
* Authentication must be verified server-side.
* Client applications must not determine authentication validity.

---

## Success

User receives a valid authenticated session.

---

## Failure States

* Invalid OTP
* Expired OTP
* Too many attempts
* OTP delivery failure
* Rate limit exceeded
* Network failure

---

## Acceptance Criteria

* User can request OTP.
* User can verify valid OTP.
* Invalid OTP is rejected.
* Expired OTP is rejected.
* Excessive attempts are blocked.
* Successful authentication creates a valid session.
* User is redirected to the correct role experience.

---

# 6. Role Detection

## Priority

P0

## Purpose

Determine whether the authenticated account is:

```text
USER
DRIVER
ADMIN
```

---

## Business Rules

Role must be determined by backend-authoritative user data.

The client must not be able to claim:

```text
role = ADMIN
```

through client-side state manipulation.

---

## Acceptance Criteria

* User receives User experience.
* Driver receives Driver experience.
* Admin accesses Admin application.
* Unauthorized role access is rejected.

---

# 7. User Onboarding

## Priority

P0

## Actor

User

## Purpose

Create and verify a user account.

---

## User Flow

```text
OTP Login
   ↓
User Information
   ↓
Required Documentation
   ↓
Submit
   ↓
Pending Verification
   ↓
Admin Review
   ↓
Approved / Rejected
```

---

## Business Rules

A user must not access restricted marketplace functionality until required approval conditions are satisfied.

---

## States

```text
DRAFT
PENDING_VERIFICATION
APPROVED
REJECTED
SUSPENDED
```

Exact transitions are defined in `12_STATE_MACHINES.md`.

---

## Acceptance Criteria

* User can submit onboarding information.
* User can upload required documents.
* User can see verification status.
* Admin can review user.
* Admin can approve/reject user.
* Rejected users cannot operate as approved users.

---

# 8. Driver Onboarding

## Priority

P0

## Actor

Driver

## Purpose

Create a verified driver supply account.

The source PRD requires driver OTP login and KYC.

---

## User Flow

```text
OTP Login
   ↓
Personal Information
   ↓
KYC
   ↓
Documents
   ↓
Vehicle Information
   ↓
Submit
   ↓
Pending Verification
   ↓
Admin Review
   ↓
Approved
```

---

## Business Rules

A driver cannot receive production trip offers until required verification requirements are satisfied.

---

## Acceptance Criteria

* Driver can register.
* Driver can submit KYC.
* Driver can submit vehicle information.
* Driver can see verification status.
* Admin can review.
* Admin can approve/reject.
* Unverified driver cannot participate in dispatch.

---

# 9. Driver KYC

## Priority

P0

## Purpose

Verify driver identity and eligibility.

---

## Requirements

The exact KYC documents are:

**TBD — Business/legal decision.**

The system must nevertheless support:

* Document upload
* Document status
* Verification status
* Rejection reason
* Resubmission

---

## States

```text
NOT_SUBMITTED
PENDING
UNDER_REVIEW
APPROVED
REJECTED
EXPIRED
```

---

## Acceptance Criteria

* Driver can submit required documents.
* Admin can view documents.
* Admin can approve/reject.
* Rejected documents can be resubmitted.
* Expired documents prevent eligibility where applicable.

---

# 10. Vehicle Registration

## Priority

P0

## Actor

Driver

## Purpose

Associate a commercial vehicle with a driver.

---

## Required Information

At minimum:

* Vehicle type
* Registration information
* Vehicle documentation
* Relevant vehicle identity information

Exact field requirements are TBD.

---

## Business Rules

Vehicle must be eligible and valid before being used for dispatch.

---

# 11. Driver Availability

## Priority

P0

## Actor

Driver

## Purpose

Allow the driver to indicate whether they are available for adhoc work.

---

## States

```text
OFFLINE
ONLINE_AVAILABLE
OFFERED
RESERVED
ASSIGNED
ON_TRIP
SUSPENDED
```

---

## Business Rules

A driver marked online is eligible for dispatch only if all other eligibility requirements are satisfied.

The backend must remain authoritative.

---

## Acceptance Criteria

* Driver can go online.
* Driver can go offline.
* Backend updates availability.
* Eligible drivers can enter dispatch candidate pools.
* Drivers with active incompatible assignments cannot receive conflicting offers.

---

# 12. User Dashboard

## Priority

P1

## Actor

User

## Purpose

Provide an operational overview.

---

## Information

Dashboard should show:

* Active requirements
* Searching requirements
* Partially fulfilled requirements
* Fulfilled requirements
* Active trips
* Relevant payment information
* Important operational alerts

---

## Acceptance Criteria

User can understand current fulfillment state without manually inspecting every requirement.

---

# 13. Create Requirement

## Priority

P0

## Actor

User

## Purpose

Create an adhoc vehicle requirement.

This is one of the core marketplace features.

---

## Input

Minimum conceptual information:

```text
Vehicle Type
Quantity
Pickup Location
Date
Pickup Time
Trip Requirements
```

Additional fields may be defined by commercial rules.

---

## User Flow

```text
Create Requirement
      ↓
Enter Details
      ↓
Validate
      ↓
Review
      ↓
Submit
      ↓
Requirement Created
      ↓
Dispatch Initiated
```

---

## Business Rules

* Quantity must be valid.
* Vehicle type must be supported.
* Pickup location must be valid.
* Date/time must be valid.
* User must be authorized.
* User must be approved.
* Requirement must satisfy applicable pricing/payment rules.

---

## Success

Requirement enters the appropriate dispatch state.

---

## Failure

* Invalid input
* User unauthorized
* User suspended
* Payment failure
* Invalid location
* Invalid timing
* System failure

---

## Acceptance Criteria

User can:

1. Enter requirement information.
2. Submit.
3. Receive confirmation.
4. See requirement status.
5. Observe dispatch progress.

---

# 14. Bulk Requirement Posting

## Priority

P1

## Actor

User

## Purpose

Allow users to create multiple requirements efficiently.

The source PRD explicitly includes bulk posting.

---

## Requirements

Bulk posting must:

* Validate input.
* Identify invalid records.
* Prevent duplicate unintended requirements.
* Provide processing status.
* Provide success/failure results.

---

## Important Rule

Bulk posting must not depend on the browser firing hundreds of independent uncontrolled requests.

The backend should process bulk operations safely.

---

# 15. Requirement Details

## Priority

P0

## Actor

User

## Purpose

Display complete requirement status.

---

## Required Information

```text
Requirement ID
Vehicle Type
Requested Quantity
Assigned Quantity
Remaining Quantity
Pickup Location
Pickup Date
Pickup Time
Current Status
Drivers
```

---

## Fulfillment Display

Example:

```text
20 Vehicles Required

Assigned       14
Searching       6
```

The user must be able to distinguish:

* Requested
* Assigned
* Remaining
* Cancelled
* Completed

---

# 16. Requirement Cancellation

## Priority

P1

## Actor

User

## Purpose

Allow a user to cancel a requirement where business rules permit it.

---

## Business Rules

Cancellation may depend on:

* Current requirement state
* Time before pickup
* Assignment state
* Commercial cancellation policy

Exact cancellation policy is TBD.

---

## Acceptance Criteria

* User can cancel when permitted.
* User cannot cancel when prohibited.
* System records cancellation.
* Affected drivers are notified.
* Financial effects are recorded where applicable.

---

# 17. Driver Nearby Opportunities

## Priority

P0

## Actor

Driver

## Purpose

Allow eligible drivers to receive/view relevant trip opportunities.

The PRD identifies nearby trips as a core driver capability.

---

## Eligibility

Driver must satisfy dispatch eligibility requirements.

---

## Information

```text
Vehicle Type
Pickup Location
Distance
Pickup Time
Estimated Earnings
Offer Expiry
```

---

# 18. Trip Offer

## Priority

P0

## Actor

Driver

## Purpose

Present a temporary opportunity to an eligible driver.

---

## Offer States

```text
CREATED
SENT
VIEWED
ACCEPTED
DECLINED
EXPIRED
CANCELLED
```

---

## Acceptance Criteria

* Driver receives offer.
* Driver can accept.
* Driver can decline.
* Offer expires after configured duration.
* Expired offer cannot be accepted.
* Backend validates offer before acceptance.

---

# 19. Driver Accept

## Priority

P0

## Actor

Driver

## Purpose

Allow a driver to claim an available assignment.

---

## Critical Business Rule

Acceptance must be transactional.

If only one slot remains and multiple drivers accept simultaneously:

```text
Only one driver receives the assignment.
```

---

## Acceptance Criteria

* Valid acceptance succeeds.
* Expired offer fails.
* Filled requirement fails.
* Ineligible driver fails.
* Duplicate request does not create duplicate assignment.
* Driver receives confirmation.
* User receives assignment update.

---

# 20. Driver Decline

## Priority

P0

Driver can decline an offer.

The decline must:

* Update offer state.
* Free the driver from that offer.
* Trigger further dispatch if necessary.
* Record the event.

---

# 21. Offer Expiration

## Priority

P0

Offers must expire automatically after the configured offer window.

Expired offers cannot be accepted.

---

# 22. Matching Engine

## Priority

P0

The matching engine is the core marketplace capability.

The supplied PRD requires filtering by:

* Vehicle type
* Verification
* Online status
* Distance

and automatic radius expansion if required drivers cannot be found.

---

## Matching Pipeline

```text
Requirement
     ↓
Eligibility Filter
     ↓
Geospatial Filter
     ↓
Candidate Ranking
     ↓
Dispatch Wave
     ↓
Driver Responses
     ↓
Assignment
     ↓
Remaining Demand?
     ↓
Next Wave / Radius Expansion
```

---

## Important Rule

The frontend must never perform the authoritative matching calculation.

Matching is a backend/domain responsibility.

---

# 23. Geographic Matching

## Priority

P0

The system must identify eligible drivers near the pickup location.

---

## Initial Radius

**TBD.**

## Maximum Radius

**TBD.**

## Expansion Strategy

**TBD.**

These values must be configurable rather than hard-coded into application logic.

---

# 24. Candidate Ranking

## Priority

P0

The system should rank eligible candidates.

Initial factors:

* Distance
* Vehicle compatibility
* Verification
* Availability
* Reliability, when sufficient data exists

The exact scoring formula belongs in `11_DISPATCH_ENGINE.md`.

V1 should use deterministic rules rather than an AI/ML ranking system.

---

# 25. Dispatch Waves

## Priority

P0

The system should dispatch offers in controlled waves rather than blindly notifying an unlimited number of drivers.

---

## Example

```text
Requirement:
20 vehicles

Eligible:
100 drivers

Wave 1:
30 offers

Accepted:
16

Remaining:
4

Wave 2:
Additional candidates
```

Exact wave size is TBD.

---

# 26. Assignment

## Priority

P0

Assignment connects:

```text
Requirement
+
Driver
+
Vehicle
```

---

## Assignment Requirements

The system must record:

* Driver
* Vehicle
* Requirement
* Assignment status
* Assignment time
* Relevant trip information

---

## Critical Rule

Assignment capacity must be enforced server-side.

---

# 27. Partial Fulfillment

## Priority

P0

If only some vehicles are assigned:

```text
Requested = 20
Assigned = 13
Remaining = 7
```

The requirement must remain active and continue dispatching where appropriate.

---

# 28. No Driver Available

## Priority

P0

If the system cannot fulfill the requirement:

1. Continue permitted dispatch attempts.
2. Expand radius according to rules.
3. Notify user when applicable.
4. Mark requirement appropriately if fulfillment remains impossible.
5. Record the reason.

The PRD explicitly requires handling the no-driver-available scenario.

---

# 29. Driver Cancellation

## Priority

P0

A driver may cancel an assignment according to applicable business rules.

System must:

* Record cancellation.
* Update assignment.
* Update driver availability.
* Notify user.
* Trigger replacement dispatch if required.
* Apply financial consequences if defined.

---

# 30. User Cancellation

## Priority

P0

User may cancel according to cancellation policy.

System must:

* Validate whether cancellation is allowed.
* Cancel applicable assignments.
* Notify drivers.
* Calculate financial consequences.
* Record audit/event information.

---

# 31. Driver Navigation

## Priority

P0

Driver must be able to navigate to pickup.

The application should provide:

* Pickup location
* Map
* Navigation action
* Relevant trip information

External navigation integration details are defined in architecture.

---

# 32. Driver Arrival

## Priority

P1

Driver can indicate/reach pickup.

The system should update relevant trip status.

---

# 33. OTP Trip Start

## Priority

P0

Driver must verify the trip using OTP where configured.

---

## Flow

```text
Driver Arrives
     ↓
Passenger/Authorized Party Provides OTP
     ↓
Driver Enters OTP
     ↓
Backend Verification
     ↓
Trip Started
```

---

## Failure Cases

* Wrong OTP
* Expired OTP
* Too many attempts
* Network failure
* Assignment no longer valid

---

# 34. Trip Execution

## Priority

P0

After successful OTP verification, the driver can execute the trip.

---

## Trip States

The complete state machine will be defined separately.

Conceptually:

```text
ASSIGNED
 ↓
EN_ROUTE
 ↓
ARRIVED
 ↓
OTP_VERIFIED
 ↓
IN_PROGRESS
 ↓
COMPLETED
```

---

# 35. Trip Completion

## Priority

P0

Driver completes the trip after satisfying completion conditions.

---

## System Actions

Trip completion should:

1. Update trip state.
2. Update assignment.
3. Calculate/create driver earning.
4. Notify user.
5. Update relevant requirement status.
6. Initiate settlement/accounting workflow.
7. Record audit/event information.

---

# 36. Passenger No-Show

## Priority

P1

The PRD explicitly requires passenger no-show handling.

Exact policy is TBD.

System must support:

* Driver reporting no-show.
* Evidence/status capture where required.
* Admin visibility.
* Appropriate trip state.
* Applicable financial handling.

---

# 37. User Live Status

## Priority

P0

User should receive real-time updates for active requirements/trips.

Examples:

```text
20 requested
↓
14 assigned
↓
18 assigned
↓
20 assigned
```

The PRD requires real-time updates throughout the trip lifecycle.

---

# 38. Driver Live Status

## Priority

P0

Driver should receive relevant real-time information about:

* Offers
* Assignments
* Cancellations
* Trip state
* Important operational events

---

# 39. Driver Earnings

## Priority

P0

Driver must be able to view earnings generated from completed work.

---

## Information

```text
Trip
Amount
Status
Date
```

and:

```text
Total Earnings
Available Balance
Withdrawal History
```

---

# 40. Withdrawal

## Priority

P1

Driver can request withdrawal of eligible earnings.

---

## Business Rules

The following are TBD:

* Minimum withdrawal amount
* Withdrawal frequency
* Fees
* Settlement delay
* Eligibility requirements

---

# 41. User Payments

## Priority

P0

User payment records must be visible and traceable.

The exact commercial model is TBD.

Potential models include:

```text
Payment before dispatch
Payment authorization before dispatch
Payment after completion
Prepaid balance
Invoice/credit model
```

No implementation agent may select one without an approved business decision.

---

# 42. Settlement

## Priority

P0

Settlement connects completed work with financial obligations.

Settlement must support:

* Amount
* Source trip/assignment
* Status
* Date
* Relevant parties
* Reconciliation state

---

# 43. Payment Failure

## Priority

P0

The system must handle payment failures.

Possible states:

```text
INITIATED
PENDING
SUCCESS
FAILED
REFUNDED
```

Exact states will be finalized in `15_PAYMENTS_AND_LEDGER.md`.

---

# 44. Notifications

## Priority

P0

The system must notify users about important operational events.

---

## Driver Notifications

Examples:

* New trip offer
* Offer expiring
* Assignment confirmed
* Assignment cancelled
* Trip update
* Payment/earning update

---

## User Notifications

Examples:

* Requirement created
* Driver assigned
* Requirement partially fulfilled
* Requirement fully fulfilled
* Driver cancellation
* Trip update
* Payment status

---

# 45. Notification Reliability

Notifications must be treated as delivery mechanisms, not authoritative state.

If a notification is missed, the application must retrieve current state from the backend.

---

# 46. Admin Dashboard

## Priority

P1

The admin dashboard provides operational visibility.

---

## Information

Potential metrics:

```text
Active Requirements
Searching
Partially Assigned
Fulfilled
Active Trips
Unfulfilled
Drivers Online
Operational Exceptions
```

Exact KPI list may evolve.

---

# 47. Driver Management

## Priority

P0

Admin can:

* View drivers
* Review KYC
* Approve/reject
* Suspend
* Reactivate where permitted
* View vehicle information
* View driver status

---

# 48. User Management

## Priority

P0

Admin can:

* View users
* Review applications
* Approve
* Reject
* Suspend
* Reactivate where permitted

---

# 49. Trip Management

## Priority

P0

Admin can:

* View active trips
* Search trips
* View assignment details
* View status
* Investigate failures
* View relevant driver/user information

---

# 50. Pricing Management

## Priority

P1

Admin can manage applicable pricing configuration.

Exact pricing model is TBD.

The PRD explicitly identifies pricing as an Admin responsibility.

---

# 51. Settlement Management

## Priority

P0

Admin can:

* View settlements
* Review status
* Investigate discrepancies
* Manage operational settlement workflows

---

# 52. Reports

## Priority

P1

Admin should have access to operational reports.

Initial reporting areas:

* Trips
* Fulfillment
* Cancellations
* Drivers
* Users
* Payments
* Settlements

---

# 53. Support

## Priority

P1

Admin/support personnel should be able to investigate operational issues.

Potential support capabilities:

* Search user
* Search trip
* Search requirement
* View timeline
* View assignment
* View payment status
* Record support resolution

---

# 54. Audit Logs

## Priority

P0

Important actions must be auditable.

Examples:

```text
User approved
Driver approved
Driver suspended
Requirement created
Requirement cancelled
Assignment created
Assignment cancelled
Payment updated
Settlement modified
Admin action
```

The PRD explicitly requires audit logs.

---

# 55. Profile

## User

User can manage permitted account information.

## Driver

Driver can manage permitted profile information.

## Admin

Admin profile and security settings.

---

# 56. Search

## Priority

P1

Admin should be able to search relevant entities.

Search targets:

* Requirement ID
* Trip ID
* Driver
* User
* Vehicle
* Payment/settlement reference

---

# 57. Filtering

## Priority

P1

Admin operational lists should support filtering.

Examples:

```text
Status
Date
User
Driver
Vehicle Type
Location
```

---

# 58. Empty States

Every major collection screen must define an empty state.

Example:

```text
No active requirements

Create your first requirement to start sourcing vehicles.
```

The exact copy belongs to UX specifications.

---

# 59. Loading States

Every asynchronous operation must have an explicit loading state.

Examples:

* Login
* Requirement creation
* Driver acceptance
* Payment
* KYC submission
* Admin approval

---

# 60. Error States

Every major workflow must have a defined failure state.

The application must explain:

1. What happened.
2. Whether the action succeeded.
3. What the user can do next.

---

# 61. Offline State

Mobile applications must support explicit offline/reconnecting states.

The client must never falsely claim that a server-side action succeeded before receiving backend confirmation.

---

# 62. Permissions

Every feature must respect role and resource permissions.

At minimum:

```text
ADMIN
USER
DRIVER
```

Detailed authorization belongs in:

`03_USER_ROLES_AND_PERMISSIONS.md`

---

# 63. Feature Dependency Map

```text
Authentication
      ↓
Role
      ↓
Onboarding
      ↓
Verification
      ↓
Vehicle
      ↓
Availability
      ↓
Requirement
      ↓
Matching
      ↓
Offer
      ↓
Assignment
      ↓
Trip
      ↓
Completion
      ↓
Earnings
      ↓
Settlement
```

Admin verification sits across onboarding and marketplace eligibility.

---

# 64. P0 Feature Set

The following are considered mandatory for the core V1:

```text
OTP Authentication

User Onboarding
User Approval

Driver Onboarding
Driver KYC
Vehicle Registration
Driver Verification

Driver Availability

User Requirement Creation

Geographic Matching

Driver Eligibility

Dispatch

Driver Offers
Accept / Decline

Assignment

Requirement Fulfillment

Trip Lifecycle

Navigation

OTP Trip Start

Trip Completion

Driver Earnings

Payment

Settlement

Notifications

Realtime Status

Admin Driver Management
Admin User Management
Admin Trip Management
Audit Logging
```

---

# 65. P1 Feature Set

```text
Bulk Posting

Advanced User Dashboard

Withdrawal Management

Admin Reports

Admin Pricing Management

Support Tools

Advanced Search

Advanced Filters

Operational Analytics
```

---

# 66. P2 Features

Potential operational enhancements:

```text
Advanced reporting
Advanced analytics
Driver reliability scoring
User performance scoring
Advanced pricing controls
More sophisticated dispatch controls
```

These should only be implemented when justified by operational requirements.

---

# 67. Explicitly Excluded From V1

The following must not be implemented as part of the V1 scope:

```text
Employee transportation planning

AI route optimization

Consumer ride-hailing

Public consumer marketplace

Advanced AI/ML dispatch

Corporate direct booking

Complex HR integrations

Advanced employee management

Multi-country financial infrastructure

Multi-currency settlement

Advanced predictive analytics
```

Employee transportation planning and AI route optimization are explicitly excluded from the supplied MVP PRD.

The other exclusions are product scope decisions for this V1.

---

# 68. Feature Quality Rules

Every implemented feature must satisfy:

```text
Functional requirement exists
Business rule exists
Permission exists
Success state exists
Failure state exists
Loading state exists
Empty state exists where applicable
Offline behavior considered where applicable
API contract exists
Database impact understood
Tests exist
Acceptance criteria pass
```

---

# 69. Critical End-to-End Acceptance Flow

The following is the minimum end-to-end feature chain that must work:

```text
User
 ↓
Authenticate
 ↓
Approved
 ↓
Create Requirement
 ↓
Requirement Posted
 ↓
Dispatch Engine
 ↓
Eligible Drivers Found
 ↓
Driver Receives Offer
 ↓
Driver Accepts
 ↓
Assignment Created
 ↓
User Sees Assignment
 ↓
Driver Navigates
 ↓
Driver Arrives
 ↓
OTP Verification
 ↓
Trip Starts
 ↓
Trip Completes
 ↓
Earning Created
 ↓
Settlement Processed
 ↓
Admin Can Audit
```

---

# 70. Critical Failure Acceptance Flow

The following scenarios must be testable:

```text
Invalid OTP

Expired OTP

Driver Offline

Driver Unverified

Vehicle Mismatch

No Eligible Driver

No Driver Accepts

Offer Expired

Requirement Becomes Full

Simultaneous Driver Acceptance

Driver Cancels

User Cancels

Passenger No-Show

Network Failure

Duplicate Request

Payment Failure

Settlement Failure
```

---

# 71. Feature Ownership

Product ownership:

```text
PRD
Features
Business rules
```

Architecture ownership:

```text
Architecture
Database
API
Dispatch
Realtime
Payments
Security
```

UX ownership:

```text
Design System
UI/UX Guidelines
Screen Specifications
```

Engineering ownership:

```text
Implementation
Tests
Deployment
Observability
```

No document should silently redefine another document's responsibility.

---

# 72. Feature Implementation Rule

A feature must not be considered complete simply because the happy path works.

For example:

```text
Driver Accept Trip
```

is incomplete until the system handles:

```text
Happy path
Expired offer
Full requirement
Driver no longer eligible
Duplicate request
Concurrent acceptance
Network failure
Backend failure
Notification failure
```

---

# 73. Product Scope Rule

When development discovers a feature that appears useful but is not defined here:

```text
DO NOT IMPLEMENT AUTOMATICALLY.
```

Instead:

```text
Identify feature
 ↓
Explain value
 ↓
Determine scope
 ↓
Assign priority
 ↓
Update FEATURES.md
 ↓
Then implement
```

---

# 74. AI Agent Rule

AI development agents must treat this document as a strict feature boundary.

The agent must not:

* Invent new features
* Expand feature scope
* Remove required behavior
* Invent business rules
* Invent pricing rules
* Invent cancellation policies
* Invent financial behavior
* Change role permissions
* Change workflow states

without an explicit documented decision.

---

# 75. Feature-to-Document Dependencies

```text
FEATURES.md
    │
    ├── USER_ROLES_AND_PERMISSIONS.md
    │
    ├── DESIGN_SYSTEM.md
    │
    ├── UI_UX_GUIDELINES.md
    │
    ├── SCREEN_SPECIFICATIONS.md
    │
    ├── ARCHITECTURE.md
    │
    ├── DATABASE.md
    │
    ├── API_SPECIFICATION.md
    │
    ├── DISPATCH_ENGINE.md
    │
    ├── STATE_MACHINES.md
    │
    ├── SECURITY.md
    │
    ├── REALTIME_AND_NOTIFICATIONS.md
    │
    └── PAYMENTS_AND_LEDGER.md
```

---

# 76. V1 Feature Boundary

AdhocX V1 is fundamentally:

```text
        DEMAND
           │
           ▼
     REQUIREMENT
           │
           ▼
       MATCHING
           │
           ▼
       DISPATCH
           │
           ▼
      ASSIGNMENT
           │
           ▼
          TRIP
           │
           ▼
       COMPLETION
           │
           ▼
        EARNING
           │
           ▼
       SETTLEMENT
```

Everything else exists to support this core loop.

---

# 77. Final Feature Principle

The team must optimize for:

> **Reliable fulfillment, not maximum feature count.**

A feature that does not improve:

* fulfillment
* speed
* reliability
* transparency
* operational control
* financial accuracy

should be questioned before entering V1.

The purpose of V1 is to prove that AdhocX can replace the user's fragmented manual vehicle-sourcing process with a reliable digital marketplace.