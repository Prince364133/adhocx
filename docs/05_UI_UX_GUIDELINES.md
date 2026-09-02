# 05 — UI/UX GUIDELINES

**Product:** AdhocX
**Document:** UI/UX Guidelines
**Status:** Source of Truth
**Version:** V1
**Last Updated:** 2026-09-02

---

# 1. Purpose

This document defines how AdhocX should behave from the user's perspective.

It establishes:

* Information architecture principles.
* User-flow principles.
* Navigation behavior.
* Interaction patterns.
* Screen hierarchy.
* Feedback behavior.
* Loading/error/empty behavior.
* Mobile UX.
* Vendor UX.
* Driver UX.
* Admin UX.
* Operational workflow presentation.
* Form behavior.
* Confirmation patterns.
* Network/offline behavior.
* Accessibility expectations.

This document works together with:

* `01_PRD.md` — what the product does.
* `02_FEATURES.md` — what features exist.
* `03_USER_ROLES_AND_PERMISSIONS.md` — who can do what.
* `04_DESIGN_SYSTEM.md` — how the interface looks.
* `06_SCREEN_SPECIFICATIONS.md` — exact screen-by-screen requirements.

---

# 2. Core UX Objective

AdhocX exists to make transportation fulfillment faster and more reliable.

Therefore the interface should reduce the time between:

```text
Need
↓
Action
↓
System response
↓
Operational decision
```

The UX should not make users navigate through unnecessary screens to perform operational tasks.

---

# 3. Product UX Principles

## 3.1 Operational clarity

At any important moment, the user should be able to answer:

* What is happening?
* What is the current status?
* What needs my attention?
* What can I do next?

---

## 3.2 Action proximity

Important actions should appear close to the information they affect.

Example:

A requirement showing:

```text
20 vehicles required
14 assigned
6 pending
```

should provide an obvious path to:

```text
View fulfillment
```

rather than forcing the Vendor to navigate elsewhere.

---

## 3.3 Progressive disclosure

Do not expose every piece of information immediately.

Show:

```text
Primary information
↓
Important supporting information
↓
Detailed information when requested
```

This is especially important for Driver UX.

---

# 4. Role-Specific UX Philosophy

## Vendor

Vendor needs **control and visibility**.

The Vendor should quickly understand:

```text
What did I request?
How much has been fulfilled?
What remains?
Which drivers are assigned?
What is happening now?
```

---

## Driver

Driver needs **clarity and speed**.

The Driver should quickly understand:

```text
Do I have an offer?
Where is the pickup?
What is the vehicle/trip?
What action should I take?
What is the current trip state?
How much will I earn?
```

---

## Admin

Admin needs **situational awareness and intervention**.

Admin should quickly understand:

```text
What is happening across the marketplace?
What is failing?
What requires attention?
Which users are affected?
What action is available?
```

---

# 5. Navigation Philosophy

Navigation should represent the user's primary jobs.

Do not organize navigation around internal database entities merely because they exist.

Bad:

```text
Database
Tables
Drivers
TripRecords
RequirementRecords
PaymentRecords
```

Good:

```text
Operations
Trips
Drivers
Payments
Reports
```

Users think in terms of tasks, not database tables.

---

# 6. Mobile Navigation

The Flutter application contains two role experiences.

Navigation must adapt to the active role.

---

# 7. Vendor Navigation

Recommended primary structure:

```text
Home
Requirements
Trips
Payments
Profile
```

### Home

Operational overview.

### Requirements

Create and manage transportation requirements.

### Trips

View active and historical trip activity.

### Payments

View payment-related information.

### Profile

Account and organization information.

---

# 8. Driver Navigation

Recommended primary structure:

```text
Home
Trips
Earnings
Profile
```

The Driver's available opportunities should be highly visible from Home.

The navigation should not force Drivers to repeatedly search for new offers.

---

# 9. Admin Navigation

Admin uses a persistent desktop sidebar.

Conceptually:

```text
Dashboard

Operations
├── Requirements
├── Trips
└── Assignments

Marketplace
├── Drivers
└── Vendors

Finance
├── Payments
├── Settlements
└── Pricing

Analytics
└── Reports

Support

System
└── Audit Logs
```

Exact navigation and screen inventory are finalized in `06_SCREEN_SPECIFICATIONS.md`.

---

# 10. Home Screen Philosophy

A Home screen is not a dumping ground for every feature.

It should answer:

> "What do I need to know or do right now?"

---

# 11. Vendor Home

Priority order:

```text
1. Active fulfillment
2. Requirements needing attention
3. Current trips
4. Important financial/status information
5. Secondary shortcuts
```

Example:

```text
Good morning

Active Fulfillment

Requirement #AX-10291
20 vehicles required
14 assigned
6 pending

[View Requirement]
```

Then:

```text
Today's Trips
```

Then:

```text
Recent Activity
```

---

# 12. Driver Home

Priority order:

```text
1. Current trip
2. New offers
3. Availability state
4. Today's earnings
5. Secondary information
```

If a Driver has an active trip, that trip should dominate the Home screen.

If the Driver has a pending offer, the offer should be prominent.

If nothing is happening:

```text
You're available

We'll notify you when a matching trip is available.
```

---

# 13. Admin Dashboard

The Admin dashboard should be an operational command center.

It should surface:

* active requirements
* fulfillment problems
* active trips
* pending driver verification
* vendor approvals
* payment/settlement issues
* operational alerts

Avoid filling the dashboard with vanity metrics that do not support action.

---

# 14. Screen Hierarchy

Every screen should have:

```text
Page Context
↓
Primary Information
↓
Primary Action
↓
Supporting Information
↓
Secondary Actions
```

For example:

```text
Requirement #AX-10291

20 Vehicles Required
14 Assigned
6 Pending

[View Fulfillment]

Pickup
Location A

Date
...

Assignments
...
```

---

# 15. One Primary Action

Most screens should have one obvious primary action.

Examples:

```text
Create Requirement
Accept Trip
Start Trip
Complete Trip
Submit KYC
Request Withdrawal
```

Secondary actions should visually remain secondary.

Do not create five equally prominent buttons.

---

# 16. Critical Operational Actions

Critical actions must be:

* visible
* understandable
* deliberate
* confirmed by backend
* protected against duplicate execution

Examples:

```text
Accept
Start
Complete
Cancel
Withdraw
Approve
Suspend
```

---

# 17. User Journey Pattern

Operational flows should generally follow:

```text
Context
↓
Input/Decision
↓
Confirmation where necessary
↓
Processing
↓
Success/Failure
↓
Updated State
```

The user should see the system move to the new state.

---

# 18. Requirement Creation UX

Vendor flow:

```text
Create Requirement
        ↓
Trip Details
        ↓
Vehicle Requirements
        ↓
Pickup / Destination
        ↓
Date / Time
        ↓
Review
        ↓
Submit
        ↓
Requirement Created
        ↓
Dispatch Begins
```

The exact fields are defined by the feature and screen specification documents.

---

# 19. Requirement Creation Principle

Do not overwhelm the Vendor with every possible configuration at once.

Required information should be presented first.

Optional information can be progressively disclosed.

The form should clearly distinguish:

```text
Required
Optional
System-generated
```

---

# 20. Review Before Submission

Important requirement creation should provide a review step when the operation is consequential.

The review should summarize:

```text
Vehicle type
Quantity
Pickup
Destination
Date
Time
Other required details
```

Then:

```text
[Submit Requirement]
```

This reduces accidental operational requests.

---

# 21. Fulfillment UX

Fulfillment is the core AdhocX experience.

A Vendor should be able to understand quantity progress immediately.

Example:

```text
20 Required

██████████████░░░░░░
14 Assigned

6 Pending
```

The exact visual treatment follows the design system.

---

# 22. Partial Fulfillment

The UI must explicitly distinguish:

```text
Required: 20
Assigned: 14
Pending: 6
```

Never display:

```text
Status: Active
```

alone.

The quantity context is essential.

---

# 23. Fulfillment State Communication

A requirement may move through stages such as:

```text
Draft
Posted
Dispatching
Partially Fulfilled
Fulfilled
In Progress
Completed
Cancelled
```

The authoritative state machine will define exact states.

The UI must not invent alternative terminology.

---

# 24. Driver Offer UX

When a Driver receives an offer, the most important information should be immediately visible.

Example:

```text
New Trip Offer

Pickup
Location A

Time
10:30 AM

Vehicle
Sedan

Estimated Distance
...

Estimated Earnings
...

[Decline] [Accept]
```

The Driver should not need to open multiple screens to understand the decision.

---

# 25. Offer Expiry

If offers expire, the UI must communicate remaining validity.

Example:

```text
Offer expires soon
```

or:

```text
Expires in 00:18
```

The backend remains authoritative.

The countdown is informational.

The Driver must never be told an offer is accepted merely because the local countdown has not reached zero.

---

# 26. Race Condition UX

Multiple Drivers may attempt to accept the same available capacity.

Therefore:

### Success

```text
Trip accepted
```

### Capacity already taken

```text
This trip is no longer available.
Another driver accepted the available slot.
```

Do not show a generic:

```text
Something went wrong.
```

when the actual reason is known.

---

# 27. Driver Availability UX

Availability should be explicit.

Example:

```text
● Available
```

or:

```text
○ Offline
```

The interface should make it obvious whether the Driver is currently eligible to receive opportunities.

---

# 28. Availability Toggle

The Driver should be able to intentionally change availability.

The interaction should provide immediate visual feedback while the backend confirms the state.

Critical rule:

> The UI must not permanently display "Available" when the backend rejected the change.

---

# 29. Trip Execution UX

Trip execution should be a clear progression:

```text
Assigned
↓
Navigate to Pickup
↓
Arrived
↓
Start with OTP
↓
Trip Active
↓
Complete
```

The Driver should always know the current stage.

---

# 30. Trip Screen

The active trip screen should prioritize:

```text
Current state
Pickup/destination
Primary action
Navigation
Relevant trip details
```

Example:

```text
Trip #AX10291

EN ROUTE TO PICKUP

Pickup
Location A

[Open Navigation]

Passenger / trip information

[Arrived]
```

The exact operational states are defined in `12_STATE_MACHINES.md`.

---

# 31. OTP Start Flow

OTP entry should be extremely simple.

Example:

```text
Start Trip

Enter passenger OTP

[ _ _ _ _ ]

[Start Trip]
```

After successful verification:

```text
Trip Started
```

Do not make the Driver navigate through unrelated screens after successful OTP verification.

---

# 32. Trip Completion

Completion should communicate the consequence.

Example:

```text
Complete Trip?

Confirm that the trip has been completed.

[Go Back] [Complete Trip]
```

After backend confirmation:

```text
Trip Completed
```

The resulting state must update immediately in the application.

---

# 33. Cancellation UX

Cancellation is a high-impact action.

The user should understand:

* what is being cancelled
* whether cancellation has consequences
* whether cancellation is still allowed
* what happens afterward

Example:

```text
Cancel Requirement?

This will stop the current fulfillment process.

[Keep Requirement]
[Cancel Requirement]
```

---

# 34. No Driver Available

The system should never leave the Vendor staring at an unexplained spinner.

If no eligible Drivers are currently available:

```text
No drivers available yet

We're continuing to search for eligible drivers.

[View Requirement]
```

If dispatch is permanently exhausted according to the business rules:

```text
Unable to fulfill this requirement

No eligible drivers were found.

[Review Requirement]
```

Exact dispatch behavior is defined in `11_DISPATCH_ENGINE.md`.

---

# 35. Network Failure

Network failure must be distinguishable from business failure.

Example:

```text
Connection lost

Check your internet connection and try again.
```

Do not tell the user:

```text
Trip cancelled
```

if the request simply failed to reach the server.

---

# 36. Mutation Feedback

Every important mutation should provide a clear lifecycle:

```text
Idle
↓
Submitting
↓
Success / Failure
```

During submission:

* disable duplicate submission
* show progress
* preserve entered information where possible

---

# 37. Duplicate Submission Protection

Users may tap a button multiple times.

Critical actions must handle this safely.

UX should:

* disable the action during processing
* show loading
* prevent duplicate local actions

Backend must additionally enforce idempotency where required.

---

# 38. Search UX

Search should be used when the dataset becomes large enough to require it.

Search should:

* be clearly labeled
* provide useful feedback
* handle no results
* preserve filters where appropriate

Example:

```text
Search drivers
```

not:

```text
Search...
```

when context is ambiguous.

---

# 39. Filtering

Filters should represent useful operational dimensions.

Examples:

### Drivers

```text
Verification
Availability
Vehicle Type
Location
Status
```

### Trips

```text
Status
Vendor
Driver
Date
Vehicle Type
```

### Requirements

```text
Status
Vendor
Vehicle Type
Date
Fulfillment
```

---

# 40. Filter UX

Applied filters should remain visible.

Example:

```text
Status: Pending ×
Vehicle: Sedan ×
```

Users should be able to clear filters easily.

---

# 41. Pagination

Large Admin datasets should not load unlimited records.

Use:

* pagination
* cursor-based loading where appropriate
* server-side filtering
* server-side sorting

The UI must clearly communicate the current result set.

---

# 42. Tables vs Cards

Use:

### Cards

For:

* summaries
* primary metrics
* mobile objects
* focused information

### Tables

For:

* Admin operational datasets
* comparison
* bulk review
* filtering

### Timeline

For:

* trip events
* audit events
* lifecycle history

### Map

For:

* geographic relationships
* driver proximity
* live operational positioning

---

# 43. Detail Screens

Detail screens should present information in sections.

Example:

```text
Requirement #AX10291
Status

Overview
...

Fulfillment
20 Required
14 Assigned
6 Pending

Location
...

Assignments
...

Activity
...
```

Do not create one massive undifferentiated block.

---

# 44. Timeline UX

Lifecycle events should be displayed chronologically.

Example:

```text
09:10
Requirement created

09:12
Dispatch started

09:17
Driver assigned

09:32
Driver arrived

09:40
Trip started
```

Events should be factual.

Do not use vague statements like:

```text
Something happened.
```

---

# 45. Notifications

Notifications should be:

* relevant
* actionable where possible
* timely
* understandable

Examples:

```text
New trip offer
Trip accepted
Driver assigned
Trip started
Trip completed
Payment failed
KYC approved
KYC rejected
```

---

# 46. Push Notification Principle

A push notification should not contain information that contradicts the current backend state.

The application must refresh/validate the relevant state when opened.

Notifications are communication mechanisms, not the source of truth.

---

# 47. Realtime Updates

Realtime events should update relevant UI state.

Example:

```text
Vendor requirement
14 assigned
        ↓
Realtime event
        ↓
15 assigned
```

The Vendor should not need to manually refresh for every normal lifecycle update when realtime infrastructure is available.

---

# 48. Realtime Failure

If realtime connection fails:

```text
Realtime disconnected
```

The UI should degrade gracefully.

It must not pretend that live data is still live.

Fallback behavior may include:

* reconnection
* polling
* manual refresh

Exact infrastructure behavior is defined in `14_REALTIME_AND_NOTIFICATIONS.md`.

---

# 49. Stale Data

Where information can become stale, the interface should make that clear.

Example:

```text
Updated 30 seconds ago
```

For critical state, backend confirmation must be required before presenting a definitive result.

---

# 50. Offline UX for Driver

The Driver application should remain useful when connectivity is poor.

It may allow access to previously loaded information where safe.

However:

> Offline state must never fabricate successful operational actions.

For example:

```text
Trip completed
```

must only appear as confirmed after backend success unless an explicitly designed offline workflow exists.

---

# 51. Error Message Principles

Errors should answer:

1. What happened?
2. Why?
3. What can I do?

Bad:

```text
Error 400
```

Better:

```text
This trip is no longer available.

Another driver has already accepted the available slot.
```

Best when recovery is possible:

```text
This trip is no longer available.

Another driver has already accepted the slot.

[View Other Trips]
```

---

# 52. Validation

Validation should occur:

* during input when useful
* before submission
* on the backend always

Client validation improves UX.

Backend validation protects correctness.

---

# 53. Preserve User Input

If a submission fails due to:

* network issue
* temporary server failure
* validation issue

do not unnecessarily erase the user's entered information.

---

# 54. Destructive Action UX

Destructive actions require stronger visual differentiation.

Examples:

```text
Cancel
Reject
Suspend
Delete
```

The UI should not make destructive actions easier to hit accidentally than safe actions.

---

# 55. Admin Operational Intervention

Admin intervention should be contextual.

Instead of:

```text
Admin Tools
Force State
```

the interface should provide meaningful operations:

```text
Review Driver
Approve
Reject
Suspend
```

or:

```text
Trip Issue
Investigate
Contact Driver
Contact Vendor
```

Administrative power must map to business operations.

---

# 56. Driver KYC UX

KYC should communicate a clear lifecycle:

```text
Not Started
↓
In Progress
↓
Submitted
↓
Under Review
↓
Approved / Rejected
```

If rejected, the user should understand:

* what was rejected
* what needs correction
* how to resubmit

Do not simply display:

```text
KYC Failed
```

without explanation.

---

# 57. Vendor Onboarding UX

Vendor onboarding should similarly communicate:

```text
Registration
↓
Information Submitted
↓
Review
↓
Approved / Rejected
```

A Vendor awaiting approval should understand why certain marketplace functions are unavailable.

---

# 58. Earnings UX

Driver earnings should be understandable.

At minimum, users should be able to distinguish:

```text
Trip Earnings
Pending
Available
Withdrawn
```

The exact financial model is defined in:

`15_PAYMENTS_AND_LEDGER.md`

The UI must not imply that a pending amount is immediately withdrawable.

---

# 59. Payment UX

Payment state must be explicit.

Examples:

```text
Pending
Processing
Paid
Failed
Refunded
```

Exact financial states must follow the payment/ledger specification.

---

# 60. Empty-State Design

Empty states should be contextual.

### No requirements

```text
No requirements yet

Create your first transportation requirement.

[Create Requirement]
```

### No trips

```text
No trips yet

Assigned trips will appear here.
```

### No driver opportunities

```text
No matching trips right now

We'll notify you when a suitable trip becomes available.
```

---

# 61. First-Time User UX

First-time users should receive enough context to understand the product without being forced through a long tutorial.

Use:

* concise onboarding
* clear first action
* contextual explanations

Avoid lengthy walkthroughs unless required by the workflow.

---

# 62. Confirmation vs Immediate Action

Not every action requires confirmation.

### Confirm

* cancel requirement
* cancel trip where applicable
* reject KYC
* suspend account
* financial/high-impact operations

### Usually immediate

* open detail
* navigate
* view history
* filter
* expand section

Do not add confirmation dialogs to harmless actions.

---

# 63. Navigation Safety

If a user has unsaved changes, the application should warn them before losing those changes where appropriate.

Example:

```text
Discard changes?

Your entered information will be lost.

[Keep Editing] [Discard]
```

---

# 64. Deep Links

Important operational notifications may deep-link to the relevant object.

Example:

```text
New trip offer
↓
Tap notification
↓
Trip Offer Details
```

Deep-linked screens must still perform authorization and current-state validation.

---

# 65. Back Navigation

Back navigation must preserve context.

Example:

```text
Requirements
→ Requirement Details
→ Assignment Details
```

Returning should not unexpectedly reset the entire workflow.

---

# 66. Mobile Gesture Rules

Do not depend on gestures as the only way to perform critical actions.

Swipe gestures may supplement actions but should not replace clear controls.

Critical operations require visible controls.

---

# 67. Keyboard Behavior

Forms should:

* move focus logically
* show the correct keyboard type
* avoid obscuring the active field
* allow easy dismissal
* preserve input

Examples:

Phone:

```text
numeric keyboard
```

OTP:

```text
numeric keyboard
```

Text:

```text
standard keyboard
```

---

# 68. Location Input UX

Location fields should clearly distinguish:

```text
Pickup
Destination
```

Where map/location selection is used, the user should be able to verify the selected location before submission.

Do not rely solely on coordinates that the user cannot understand.

---

# 69. Date and Time UX

Date/time selection must:

* use appropriate platform controls
* clearly show timezone/context where relevant
* prevent obviously invalid selections
* display selected values clearly

Backend remains authoritative for validity.

---

# 70. Driver Safety

The application should minimize interaction while the Driver is actively operating a vehicle.

Important principles:

* do not encourage complex interaction while driving
* use large controls
* keep active-trip screens simple
* favor navigation handoff
* use clear status communication
* minimize unnecessary prompts

The app should not require a Driver to perform complicated workflows during active driving.

---

# 71. Vendor Operational Speed

A Vendor posting a requirement may be under time pressure.

Therefore:

* minimize unnecessary steps
* remember safe reusable information where appropriate
* support bulk requirements
* make vehicle quantity explicit
* make submission status obvious

---

# 72. Admin Efficiency

Admin workflows should minimize repetitive navigation.

Where useful:

* filters should persist
* table state should persist
* search should be fast
* drawers can preserve list context
* keyboard interaction should be supported
* common actions should be close to relevant records

---

# 73. Bulk Operations

Bulk actions should be used only where they genuinely improve Admin efficiency.

Examples:

```text
Select drivers
→ Approve selected
```

But bulk destructive operations require stronger confirmation.

Every bulk operation must communicate exactly how many records will be affected.

Example:

```text
Approve 18 drivers?
```

not:

```text
Are you sure?
```

---

# 74. Operational Priority

The UI should prioritize exceptions.

Examples:

```text
No driver available
Payment failed
KYC rejected
Requirement under-fulfilled
Trip delayed
```

Normal successful activity should not overwhelm the user with alerts.

---

# 75. Notification Priority

Suggested priority levels:

### Critical

Requires immediate attention.

### Important

Operationally meaningful.

### Informational

Useful but non-urgent.

Not every event deserves a push notification.

---

# 76. Consistency Rules

The same action must look and behave similarly across the product.

For example:

```text
Cancel
```

should not be:

* red trash icon on one screen
* orange text on another
* blue button somewhere else

unless the context genuinely requires a different presentation.

---

# 77. Terminology Consistency

Use one term for one concept.

For example, if the product calls the entity:

```text
Requirement
```

do not alternate between:

```text
Request
Job
Order
Booking
```

unless those are actually different domain concepts.

The domain vocabulary in `01_PRD.md`, `02_FEATURES.md`, and `12_STATE_MACHINES.md` is authoritative.

---

# 78. No Fake Functionality

If a feature does not exist, the UI must not imply that it works.

Do not create:

```text
Coming soon
```

buttons throughout the production workflow unless intentionally part of the UX.

Do not create fake charts, fake locations, fake driver availability, or fake payments simply to make a screen look complete.

---

# 79. Data Integrity in UI

The UI must represent backend state faithfully.

Never:

* invent values
* assume an operation succeeded
* infer assignment from a local click
* display fake payment status
* display fake driver availability

---

# 80. UX and Domain State

The UI is a representation of the domain state.

Conceptually:

```text
Backend State
      ↓
State Mapping
      ↓
UI State
      ↓
Available Actions
```

The UI must not invent domain state independently.

---

# 81. Action Availability

An action should only appear or be enabled when appropriate.

Example:

```text
Trip = Assigned
→ Start Trip may be available

Trip = Completed
→ Start Trip must not be available
```

The backend must still enforce this.

---

# 82. State Transition Feedback

After a successful action:

```text
Action
↓
Backend confirmation
↓
State transition
↓
Updated UI
```

Example:

```text
Accept
↓
Server confirms
↓
Offer → Accepted
↓
Trip → Assigned
↓
Driver sees assigned trip
```

The user should see the resulting state rather than merely a toast saying "Success."

---

# 83. Reusable UX Patterns

The following patterns should be standardized:

```text
Create Flow
Edit Flow
Detail Flow
Confirmation Flow
Approval Flow
Cancellation Flow
Assignment Flow
Trip Execution Flow
Payment Flow
Error Recovery Flow
```

When a new feature resembles an existing workflow, reuse the pattern.

---

# 84. Design Review Checklist

Before implementing a screen, answer:

### User

* Who is using this screen?
* What is their goal?
* What decision are they making?

### Context

* What state is the underlying entity in?
* What information is essential?

### Action

* What is the primary action?
* What secondary actions exist?
* Which actions are forbidden?

### Feedback

* What happens while loading?
* What happens on success?
* What happens on failure?
* What happens offline?

### Safety

* Can the action cause financial/operational damage?
* Does it require confirmation?
* Can duplicate requests happen?

---

# 85. AI Agent Workflow for UI Implementation

Before generating a screen, the AI agent must follow:

```text
Read PRD
↓
Read Features
↓
Read Roles & Permissions
↓
Read Design System
↓
Read this UX Guidelines document
↓
Identify user journey
↓
Identify domain state
↓
Identify allowed actions
↓
Reuse existing components
↓
Implement screen
↓
Validate states
↓
Validate accessibility
↓
Validate responsive behavior
```

The agent must not jump directly from a vague feature request to JSX/Flutter widgets.

---

# 86. AI Agent Forbidden UX Patterns

The AI agent must NOT:

1. Build screens independently without reading the design system.
2. Invent navigation structures.
3. Invent domain terminology.
4. Invent business states.
5. Invent fake data for production workflows.
6. Assume successful mutations.
7. Hide important errors behind toasts.
8. Use loading spinners indefinitely.
9. Make every action a primary button.
10. Use confirmation dialogs for every interaction.
11. Create unnecessary onboarding flows.
12. Build desktop UI and merely shrink it for mobile.
13. Treat the Driver app like a consumer social app.
14. Treat the Admin app like a marketing dashboard.
15. Put critical actions behind unnecessary navigation.
16. Use color alone to communicate state.
17. Trust client-side state as the source of truth.
18. Create a new UX pattern when an existing one works.
19. Introduce fake realtime behavior.
20. Claim an operation succeeded without backend confirmation.

---

# 87. UX Quality Standard

A screen is not complete because:

```text
It renders.
```

It is complete when:

```text
Correct user
+
Correct context
+
Correct state
+
Correct information
+
Correct action
+
Correct feedback
+
Correct failure handling
+
Correct accessibility
```

are all satisfied.

---

# 88. Final UX Principle

AdhocX should feel fast because the **workflow is fast**, not because the interface is full of animations.

A successful AdhocX experience should feel like:

```text
Vendor:
"I posted the requirement and immediately know
how many vehicles are fulfilled."

Driver:
"I received an offer and immediately know
whether I should accept it."

Admin:
"I can immediately see what is failing
and where I need to intervene."
```

That is the UX standard for V1.