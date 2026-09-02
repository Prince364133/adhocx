# 14_REALTIME_AND_NOTIFICATIONS.md

# AdhocX Realtime & Notifications Specification

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Flutter Engineers, Next.js Engineers, QA Engineers, DevOps, AI Coding Agents

---

# 1. Purpose

This document defines how AdhocX communicates important operational changes from the backend to connected clients.

It covers:

* WebSocket architecture
* realtime events
* push notifications
* in-app notifications
* event delivery
* subscriptions
* authentication
* authorization
* event ordering
* duplicate events
* missed events
* reconnect behavior
* offline behavior
* notification priority
* dispatch notifications
* trip notifications
* payment notifications
* admin realtime operations
* observability
* failure handling

The central principle is:

> **Realtime communication informs the client about changes; the backend remains the source of truth.**

---

# 2. Why Realtime Matters

AdhocX is an operational marketplace.

Several important events may happen without the user actively refreshing a screen.

Examples:

```text
Driver receives new trip offer
Driver accepts offer
Another driver consumes final requirement capacity
Vendor receives assignment
Driver cancels
Requirement becomes fully fulfilled
Trip starts
Trip completes
Payment changes
Admin changes operational state
```

A polling-only architecture would create unnecessary latency and infrastructure load.

Realtime communication is therefore a core V1 capability.

---

# 3. Communication Model

AdhocX uses three related communication mechanisms:

```text
                    Backend
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
      WebSocket       Push       In-App
      Realtime      Notification  Notification
          │            │            │
          └────────────┼────────────┘
                       ↓
                     Client
```

Each mechanism has a different purpose.

---

# 4. WebSocket

WebSockets are used for active realtime synchronization.

Primary use cases:

* requirement updates
* offer updates
* assignment updates
* trip state changes
* operational driver location
* payment status where useful
* admin dashboard changes

WebSockets are appropriate when the application is active and connected.

---

# 5. Push Notifications

Push notifications are used primarily to wake/inform mobile users when the application is:

* backgrounded
* minimized
* inactive
* temporarily disconnected from the realtime channel

V1 mobile push infrastructure should support:

* Android via FCM
* iOS via APNs, typically through the chosen push infrastructure

---

# 6. In-App Notifications

In-app notifications are persistent application records.

Examples:

```text
New trip offer
Trip assigned
Trip cancelled
KYC approved
Payment completed
Withdrawal completed
```

An in-app notification remains available even if:

```text
push failed
WebSocket was disconnected
user did not see the notification immediately
```

---

# 7. Notification vs Domain Event

These concepts are different.

### Domain event

Represents something that happened in the business system.

Example:

```text
OfferAccepted
TripCompleted
PaymentCompleted
```

### Realtime event

Communicates a relevant state change to connected clients.

Example:

```text
TRIP_STATUS_CHANGED
```

### Notification

Communicates something the user should notice.

Example:

```text
"You have a new trip offer."
```

One domain event may produce:

```text
Realtime event
+
Push notification
+
In-app notification
```

or only one of them.

---

# 8. Source of Truth

The authoritative hierarchy is:

```text
PostgreSQL/domain state
        ↓
Domain/application event
        ↓
Realtime / notification delivery
        ↓
Client UI
```

Never:

```text
Push notification
        ↓
assume database state
```

A push message may be delayed, duplicated, or lost.

---

# 9. Realtime Architecture

Recommended architecture:

```text
Application Service
       ↓
Domain State Change
       ↓
Transaction Commit
       ↓
Outbox / Reliable Event
       ↓
Realtime Event Publisher
       ↓
WebSocket Gateway
       ↓
Authorized Clients
```

Notifications may use:

```text
Outbox
 ↓
Notification Worker
 ├── Push
 └── In-App Notification
```

---

# 10. Event Persistence

Important events should be reliably published after state persistence.

Preferred:

```text
BEGIN TRANSACTION

Update business state

Create outbox event

COMMIT

Outbox worker publishes event
```

This prevents:

```text
Database updated
+
event lost
```

or:

```text
event published
+
database transaction rolled back
```

---

# 11. WebSocket Authentication

A WebSocket connection must be authenticated.

The server identifies:

```text
userId
role
session
account status
permissions
```

before granting access to protected channels.

---

# 12. WebSocket Authorization

Authentication does not automatically authorize every subscription.

The server must determine whether the user may receive an event.

Example:

```text
Vendor A
```

may subscribe to its own:

```text
requirements
assignments
trips
payments
```

but not:

```text
Vendor B
```

---

# 13. Driver Realtime Scope

A driver may receive events concerning:

```text
own offers
own assignments
own trips
own earnings where applicable
own notifications
account/KYC changes
```

The driver must not receive unrelated driver data.

---

# 14. Vendor Realtime Scope

A vendor may receive:

```text
own requirements
own assignments
own trips
own payment status
own notifications
```

The vendor must not receive unrelated vendor operational data.

---

# 15. Admin Realtime Scope

Admin realtime access is broader but still permission-controlled.

Possible events:

```text
new requirements
fulfillment changes
active trips
driver availability
KYC changes
payment failures
settlement events
operational alerts
```

Admin access must follow explicit permissions.

---

# 16. Channel Model

The exact Socket.IO implementation may vary, but the conceptual channel model should be resource-scoped.

Examples:

```text
user:{userId}
vendor:{vendorId}
driver:{driverId}
requirement:{requirementId}
trip:{tripId}
admin:operations
```

Clients must not be able to subscribe to arbitrary resource IDs without authorization.

---

# 17. Subscription Validation

For resource subscriptions:

```text
Client requests:
subscribe requirement:123
```

Backend verifies:

```text
authenticated
+
has access to requirement 123
```

Only then is subscription allowed.

---

# 18. Forbidden Subscription Model

Never allow:

```text
subscribe("*")
```

for ordinary clients.

Never expose unrestricted event streams containing all:

```text
drivers
vendors
trips
locations
payments
```

---

# 19. Event Envelope

All public realtime events should follow a predictable envelope.

Example:

```json
{
  "eventId": "uuid",
  "eventType": "TRIP_STATUS_CHANGED",
  "occurredAt": "2026-09-05T08:15:00Z",
  "resource": {
    "type": "trip",
    "id": "uuid"
  },
  "data": {
    "status": "IN_PROGRESS"
  }
}
```

---

# 20. Event ID

Every event must have a unique:

```text
eventId
```

Clients can use this to detect duplicates.

---

# 21. Event Timestamp

Events must include:

```text
occurredAt
```

generated by the backend.

Client-generated timestamps must not define event chronology.

---

# 22. Event Type

Event names must be stable and documented.

Examples:

```text
REQUIREMENT_CREATED
REQUIREMENT_UPDATED
REQUIREMENT_FULFILLMENT_CHANGED

OFFER_CREATED
OFFER_UPDATED
OFFER_EXPIRED
OFFER_CANCELLED

ASSIGNMENT_CREATED
ASSIGNMENT_UPDATED
ASSIGNMENT_CANCELLED

TRIP_STATUS_CHANGED
TRIP_LOCATION_UPDATED

PAYMENT_STATUS_CHANGED
SETTLEMENT_STATUS_CHANGED

KYC_STATUS_CHANGED

NOTIFICATION_CREATED
```

---

# 23. Resource Identification

Every resource event should identify:

```text
resource.type
resource.id
```

Example:

```json
{
  "resource": {
    "type": "trip",
    "id": "trip-uuid"
  }
}
```

This allows clients to determine which local state needs reconciliation.

---

# 24. Event Payload Design

Events should contain enough information to update lightweight UI state.

However, events should not become uncontrolled copies of database entities.

Avoid sending:

```text
all columns
all relationships
all KYC information
all financial metadata
```

---

# 25. Minimal Event Principle

Prefer:

```json
{
  "eventType": "TRIP_STATUS_CHANGED",
  "resource": {
    "type": "trip",
    "id": "uuid"
  },
  "data": {
    "status": "COMPLETED"
  }
}
```

over returning an enormous trip object.

The client can fetch the authoritative resource when additional information is required.

---

# 26. State-Reconciliation Principle

The client should treat realtime events as:

```text
signals that something changed
```

not:

```text
complete authoritative state
```

Example:

```text
WebSocket:
TRIP_STATUS_CHANGED

↓
Client fetches:
GET /driver/trips/{id}

↓
UI updates from authoritative response
```

For high-frequency updates, direct event application may be appropriate where the event contract is explicitly authoritative for that field.

---

# 27. Event Ordering

Network delivery does not guarantee perfect ordering.

The system should therefore avoid assumptions such as:

```text
event A must always arrive before event B
```

without an explicit ordering mechanism.

For important resource streams, events may include:

```text
sequence
version
revision
```

where necessary.

---

# 28. Resource Versioning

Important resources may expose a version/revision.

Example:

```json
{
  "id": "uuid",
  "version": 14
}
```

If the client receives:

```text
version 15
```

after:

```text
version 14
```

it can update safely.

If it receives:

```text
version 13
```

after:

```text
version 15
```

it should not blindly overwrite newer state.

---

# 29. Duplicate Events

Realtime systems may deliver duplicates.

Example:

```text
TRIP_STATUS_CHANGED
TRIP_STATUS_CHANGED
```

The client must tolerate duplicate delivery.

Using:

```text
eventId
resource version
current backend state
```

can provide deduplication/reconciliation.

---

# 30. No Exactly-Once Assumption

The system should assume:

```text
delivery = at least once / best effort
```

rather than relying on exactly-once network delivery.

Business correctness must come from backend state and idempotent processing.

---

# 31. WebSocket Reconnection

Mobile networks are unreliable.

A client may disconnect because of:

* poor signal
* switching Wi-Fi/mobile data
* background suspension
* application termination
* server restart
* network timeout

The client must automatically attempt reconnection according to a controlled strategy.

---

# 32. Reconnection Strategy

Recommended:

```text
disconnect
   ↓
short retry
   ↓
backoff
   ↓
reconnect
   ↓
authenticate
   ↓
resubscribe
   ↓
reconcile state
```

Retries must not become an aggressive infinite reconnect loop.

---

# 33. Reconnect Authentication

After reconnecting, the client must re-establish authenticated WebSocket state.

The server must not assume that a previous connection remains authorized indefinitely.

---

# 34. Resubscription

After reconnect:

```text
previous subscriptions
        ↓
validate again
        ↓
resubscribe
```

The client should not assume every previous subscription remains valid.

---

# 35. Reconciliation After Reconnect

After reconnecting, the client should refresh important active state.

Driver:

```text
active offers
active assignment
active trip
availability
```

Vendor:

```text
active requirements
active assignments
active trips
```

Admin:

```text
operational dashboard
active requirements
active trips
alerts
```

This prevents missed events from leaving stale UI state.

---

# 36. Offline Mode

When disconnected:

The UI should clearly communicate:

```text
Offline
Connecting
Reconnecting
Synced
```

Critical operations must not be considered successful merely because they were queued locally.

---

# 37. Critical Mutation Rule

For operations such as:

```text
accept offer
start trip
complete trip
cancel assignment
withdraw money
```

the client must receive backend confirmation.

Local optimistic state may be used only when the operation is safe to reconcile.

---

# 38. Push Notification Architecture

Mobile push flow:

```text
Domain Event
    ↓
Notification Decision
    ↓
Create In-App Notification
    ↓
Push Job
    ↓
FCM/APNs
    ↓
Device
```

Push delivery failure must not invalidate the underlying business event.

---

# 39. Device Token Registration

Authenticated mobile clients should register device tokens.

Conceptual endpoint:

```http
POST /notifications/devices
```

Request:

```json
{
  "token": "device-token",
  "platform": "ANDROID"
}
```

The server associates the token with the authenticated user/device.

---

# 40. Device Token Security

Device tokens must be treated as sensitive identifiers.

They must not be exposed across users.

A driver can register only the authenticated driver's own device.

---

# 41. Device Token Lifecycle

Tokens can become invalid.

The system should support:

```text
register
update
invalidate
remove
```

Invalid push tokens should be cleaned up based on provider feedback.

---

# 42. Multiple Devices

A user may have multiple devices.

The notification system should support:

```text
User
 ├── Device A
 ├── Device B
 └── Device C
```

The same notification may need to be delivered to multiple valid devices.

---

# 43. Push Payload Principle

Push payloads should be minimal.

Preferred:

```json
{
  "type": "NEW_TRIP_OFFER",
  "resourceId": "uuid"
}
```

The application can fetch current details.

Avoid putting sensitive information directly into push payloads.

---

# 44. Notification Priority

Notifications should have priority levels.

Conceptual levels:

```text
CRITICAL
HIGH
NORMAL
LOW
```

---

# 45. Critical Notifications

Examples:

```text
new time-sensitive driver offer
trip operational interruption
urgent assignment cancellation
important payment failure
```

Critical notification policy must be used carefully.

Do not mark every event critical.

---

# 46. High-Priority Notifications

Examples:

```text
new assignment
trip approaching
KYC result
withdrawal result
payment result
```

---

# 47. Normal Notifications

Examples:

```text
requirement fulfilled
historical trip completed
general account updates
```

---

# 48. Low-Priority Notifications

Examples:

```text
non-urgent informational updates
product announcements
future marketing communications
```

Marketing notifications are outside the core operational V1 flow.

---

# 49. Driver Notification Rules

Important driver events:

```text
NEW_OFFER
OFFER_EXPIRING
OFFER_CANCELLED
ASSIGNMENT_CONFIRMED
ASSIGNMENT_CANCELLED
TRIP_REMINDER
TRIP_STATUS_CHANGED
KYC_STATUS_CHANGED
EARNINGS_UPDATED
WITHDRAWAL_STATUS_CHANGED
```

Not every event requires both push and WebSocket delivery.

---

# 50. Vendor Notification Rules

Important vendor events:

```text
REQUIREMENT_CREATED
DISPATCH_STARTED
ASSIGNMENT_CREATED
ASSIGNMENT_CANCELLED
FULFILLMENT_CHANGED
NO_DRIVER_AVAILABLE
TRIP_STARTED
TRIP_COMPLETED
PAYMENT_STATUS_CHANGED
```

---

# 51. Admin Notification Rules

Admin operational alerts may include:

```text
NO_DRIVER_AVAILABLE
HIGH_CANCELLATION
PAYMENT_FAILURE
SETTLEMENT_FAILURE
KYC_BACKLOG
SYSTEM_FAILURE
```

Exact alert thresholds are **TBD**.

---

# 52. Notification Preferences

Users may eventually control non-critical notification preferences.

However, operationally essential notifications must not be silently disabled if required for the service.

Preference categories should distinguish:

```text
Operational
Financial
Account
Marketing
```

---

# 53. Notification Read State

Notifications can have:

```text
UNREAD
READ
```

The read state is separate from delivery state.

Example:

```text
Push delivered
+
Notification unread
```

is valid.

---

# 54. Notification Delivery State

Delivery state may include:

```text
CREATED
QUEUED
SENT
DELIVERED
FAILED
```

Push providers may not always provide reliable delivery confirmation.

Therefore `SENT` and `DELIVERED` must not be treated as identical.

---

# 55. Notification Persistence

An in-app notification should be persisted when the business event requires a durable user-visible record.

Example:

```text
Offer created
    ↓
Notification created
```

If push later fails:

```text
Notification remains available in-app.
```

---

# 56. Notification Deduplication

The notification system must prevent accidental duplicate notifications.

Example:

```text
same domain event
+
same recipient
+
same notification type
```

should not create uncontrolled duplicates.

Use stable event/resource identifiers where appropriate.

---

# 57. Notification Idempotency

Notification workers may retry.

Therefore:

```text
retry notification job
```

must not create unlimited duplicate records or uncontrolled push spam.

---

# 58. Offer Notification Timing

For a new offer:

```text
Offer persisted
    ↓
Offer event
    ↓
Push/realtime notification
```

The offer must exist before the notification references it.

---

# 59. Expiring Offer Notification

A warning notification may be sent before offer expiration if configured.

Example:

```text
Offer expires soon.
```

Exact timing is **TBD**.

The warning must not change the offer's business state.

---

# 60. Offer Expiration

When the backend marks:

```text
OFFER → EXPIRED
```

the driver should receive a relevant realtime update and/or notification where appropriate.

The mobile client must remove or disable the offer regardless of whether the push was received.

---

# 61. Assignment Notification

When an assignment is created:

```text
Assignment persisted
    ↓
Assignment event
    ↓
Driver notification
    +
Vendor realtime update
```

The exact notification channels depend on the actor and current app state.

---

# 62. Trip Start Notification

When a trip starts:

```text
Trip → IN_PROGRESS
```

the vendor should receive the appropriate realtime update.

The driver UI is already active and generally does not require a redundant push notification.

---

# 63. Trip Completion Notification

When a trip completes:

```text
Trip → COMPLETED
```

the vendor should receive the updated trip state.

Driver may receive an earnings-related notification if the financial workflow produces a relevant user-facing event.

---

# 64. Payment Notifications

Payment state changes may generate:

```text
PAYMENT_STATUS_CHANGED
```

The notification must reflect the actual persisted payment state.

Never notify:

```text
"Payment successful"
```

before the backend has authoritative confirmation.

---

# 65. Settlement Notifications

Settlement status changes may generate:

```text
SETTLEMENT_STATUS_CHANGED
```

Relevant users receive only the information they are authorized to see.

---

# 66. KYC Notifications

Driver KYC changes may generate:

```text
KYC_STATUS_CHANGED
```

Examples:

```text
KYC approved
KYC rejected
Additional information required
```

Do not expose sensitive reviewer information unnecessarily.

---

# 67. Admin Realtime Dashboard

The admin dashboard should avoid aggressive full-page polling.

Realtime updates can refresh:

```text
active requirement count
assignment count
trip state
driver availability
payment failures
operational alerts
```

The UI should reconcile with authoritative APIs periodically or after reconnect.

---

# 68. High-Frequency Location Events

Driver location is a special realtime category.

Location updates can occur frequently and should not be handled like ordinary persistent notifications.

Architecture:

```text
Driver
 ↓
Location API / realtime stream
 ↓
Location service
 ↓
Authorized consumers
```

Do not create an in-app notification for every location update.

---

# 69. Location Update Throttling

Location update frequency must be controlled.

The system should avoid:

```text
10 updates/second
×
10,000 drivers
```

unless infrastructure has explicitly been designed for that scale.

Exact update intervals are **TBD**.

---

# 70. Location Authorization

Current driver location may be exposed only to authorized operational consumers.

Examples:

```text
Vendor with relevant active assignment
Admin with operational permission
```

Unrelated vendors/drivers must not receive it.

---

# 71. Location Freshness

Consumers should understand that a location event is not necessarily current.

Include:

```text
recordedAt
```

and where useful:

```text
accuracyMeters
```

---

# 72. Event Backpressure

If clients cannot consume events fast enough, the system must protect itself.

Possible controls:

```text
bounded queues
event coalescing
rate limiting
dropping redundant high-frequency updates
reconciliation
```

High-frequency location events are especially suitable for coalescing.

---

# 73. Realtime Failure

If WebSocket infrastructure fails:

```text
business state must continue functioning
```

API operations remain authoritative.

The system should fall back to:

```text
push notifications
API refresh
reconnect
```

where appropriate.

---

# 74. Notification Provider Failure

If FCM/APNs fails:

```text
business operation must continue
```

The notification worker retries according to policy.

The failure should be observable.

---

# 75. Push Failure Does Not Equal Business Failure

Example:

```text
Driver accepts offer
    ↓
Assignment committed
    ↓
Push notification fails
```

Assignment remains valid.

The vendor can still receive the state through:

```text
WebSocket
API refresh
```

---

# 76. WebSocket Failure Does Not Equal Business Failure

Example:

```text
Vendor disconnected
    ↓
Driver accepts
    ↓
Assignment created
```

The assignment still exists.

When the vendor reconnects:

```text
reconcile API state
```

and sees the assignment.

---

# 77. Client Reconciliation Strategy

After important reconnection events, clients should refresh active resources.

### Driver

```text
active offer list
active assignment
active trip
availability
```

### Vendor

```text
active requirements
assignments
active trips
payments if relevant
```

### Admin

```text
dashboard
active requirements
active trips
operational alerts
```

---

# 78. Background Mobile Behavior

Mobile operating systems may suspend applications.

Therefore:

```text
WebSocket alone
```

is insufficient for time-sensitive driver offers.

Push notifications are required for background notification delivery.

---

# 79. Foreground vs Background

When app is foreground:

```text
WebSocket
+
in-app UI
```

should generally provide the primary experience.

When background:

```text
Push notification
```

becomes important.

When offline:

```text
API reconciliation after reconnect
```

restores authoritative state.

---

# 80. Notification Navigation

Push notifications may deep-link to relevant screens.

Example:

```text
NEW_TRIP_OFFER
    ↓
Open Offer Details
```

But opening a screen does not authorize an action.

The user still needs a valid authenticated API operation to accept.

---

# 81. Notification Security

Push payloads must not contain:

```text
access tokens
refresh tokens
OTP values
KYC document contents
payment credentials
unnecessary personal information
```

---

# 82. Notification Localization

The notification architecture should be designed for future localization.

Store:

```text
notification type
template key
parameters
```

rather than hard-coding every message into backend logic.

Example:

```text
NEW_OFFER
template = "new_trip_offer"
params = { pickup: ... }
```

Exact localization scope is **TBD**.

---

# 83. Notification Content

Notifications should be:

* concise
* actionable
* understandable
* role-specific

Driver example:

```text
New trip offer available.
```

Vendor example:

```text
3 vehicles have been assigned to your requirement.
```

Do not expose internal technical language.

---

# 84. Event Naming

Use consistent event naming.

Recommended:

```text
RESOURCE_ACTION
```

or:

```text
RESOURCE_STATUS_CHANGED
```

Examples:

```text
TRIP_STATUS_CHANGED
OFFER_CREATED
ASSIGNMENT_CREATED
```

Avoid inconsistent patterns such as:

```text
tripUpdate
trip_changed_now
TripStatus
```

---

# 85. Event Schema Versioning

If event payloads evolve, versioning may be required.

Possible:

```text
eventType
schemaVersion
```

Example:

```json
{
  "eventType": "TRIP_STATUS_CHANGED",
  "schemaVersion": 1
}
```

Breaking event changes must not silently break older mobile clients.

---

# 86. Backward Compatibility

Mobile applications may remain on older versions.

Therefore backend realtime events should avoid breaking old clients.

For breaking changes:

```text
new event schema/version
```

or another controlled compatibility strategy should be used.

---

# 87. Event Replay

V1 does not require arbitrary historical WebSocket replay.

Instead, missed events are recovered through authoritative API reconciliation.

Future versions may introduce event replay if operational scale requires it.

---

# 88. Notification History

The in-app notification list can provide historical notifications.

Example:

```http
GET /notifications
```

Supported operations:

```http
POST /notifications/{id}/read
POST /notifications/read-all
```

---

# 89. Notification Retention

Notification retention should be configurable.

Exact retention period is **TBD**.

Old notifications may be archived or deleted according to product and operational requirements.

---

# 90. Realtime Observability

Track:

```text
websocket_connections
websocket_connection_failures
websocket_reconnections
events_published
events_delivered
events_failed
notification_jobs
push_success_rate
push_failure_rate
notification_latency
event_latency
```

---

# 91. Business Realtime Metrics

Important metrics:

```text
offer_notification_latency
assignment_notification_latency
trip_status_propagation_latency
payment_notification_latency
reconnect_reconciliation_rate
```

The most important operational measurement is:

```text
business event occurred
        →
user became aware
```

---

# 92. Delivery Monitoring

For important notifications, monitor:

```text
created
queued
sent
provider accepted
provider rejected
failed
```

Do not claim `DELIVERED` merely because the provider API accepted a request unless provider semantics explicitly support that distinction.

---

# 93. Dead-Letter Handling

Repeatedly failing notification jobs should move to a controlled dead-letter/review mechanism.

Example:

```text
Notification Job
    ↓
Retry
    ↓
Retry
    ↓
Retry
    ↓
Dead Letter
```

The exact retry count is **TBD**.

---

# 94. Realtime Testing

Tests must cover:

### Connection

```text
connect
authenticate
disconnect
reconnect
```

### Authorization

```text
authorized subscription → allowed
unauthorized subscription → rejected
```

### Delivery

```text
event emitted → correct client receives it
```

### Deduplication

```text
same event twice → safe client behavior
```

### Ordering

```text
out-of-order event → no stale overwrite
```

---

# 95. Offline Testing

Test:

```text
Wi-Fi off
mobile data switch
app background
app killed
server restart
WebSocket disconnect
push unavailable
```

The application must recover without corrupting business state.

---

# 96. Critical End-to-End Test

Example:

```text
Vendor posts requirement
        ↓
Dispatch creates offer
        ↓
Driver receives realtime/push notification
        ↓
Driver accepts
        ↓
Assignment created
        ↓
Vendor receives update
        ↓
Driver starts trip
        ↓
Vendor sees IN_PROGRESS
        ↓
Driver completes
        ↓
Vendor sees COMPLETED
        ↓
Financial event occurs
        ↓
Relevant notification delivered
```

This flow must work even when one delivery mechanism temporarily fails.

---

# 97. AI Agent Rules

Any AI coding agent working on AdhocX must:

1. Read this document before implementing realtime behavior.
2. Treat backend state as authoritative.
3. Never make push notification delivery equivalent to business success.
4. Never trust client event ordering blindly.
5. Handle duplicate events safely.
6. Handle reconnects.
7. Reconcile active state after reconnect.
8. Never expose unauthorized channels.
9. Never expose another user's private events.
10. Never place secrets in push payloads.
11. Never place OTPs in push payloads.
12. Never create notifications before the underlying business event is committed.
13. Never put FCM/APNs logic inside dispatch domain logic.
14. Keep notification infrastructure separate from business state.
15. Use documented event names.
16. Preserve backward compatibility.
17. Test offline and reconnect behavior.
18. Avoid high-frequency notification spam.
19. Treat location streams separately from ordinary notifications.
20. Never assume exactly-once event delivery.

---

# 98. Realtime Definition of Done

Realtime functionality is complete only when:

```text
[ ] WebSocket authentication implemented
[ ] WebSocket authorization implemented
[ ] Resource-scoped subscriptions implemented
[ ] Event envelope standardized
[ ] Event IDs implemented
[ ] Event schemas documented
[ ] Reliable event publication implemented
[ ] Outbox pattern implemented where required
[ ] Duplicate handling implemented
[ ] Reconnect implemented
[ ] Resubscription implemented
[ ] State reconciliation implemented
[ ] Push registration implemented
[ ] FCM/APNs integration implemented
[ ] Notification persistence implemented
[ ] Notification deduplication implemented
[ ] Notification retry implemented
[ ] Device-token lifecycle implemented
[ ] Notification security implemented
[ ] Location streaming controlled
[ ] Admin realtime dashboard supported
[ ] Observability implemented
[ ] Offline tests implemented
[ ] Reconnect tests implemented
[ ] Delivery tests implemented
```

---

# 99. Final Realtime Principle

AdhocX realtime communication follows one rule:

> **Events accelerate awareness; APIs and persisted backend state determine truth.**

The architecture is:

```text
Business State
      ↓
Committed Event
      ↓
 ┌────┴─────────────┐
 ↓                  ↓
WebSocket          Push
 ↓                  ↓
Active UI         Mobile Alert
 └───────┬──────────┘
         ↓
     User Awareness
         ↓
   API Reconciliation
         ↓
Authoritative State
```

WebSockets may disconnect.

Push notifications may fail.

Events may arrive twice.

Events may arrive late.

Mobile applications may be offline.

None of those conditions are allowed to corrupt the business state.

**The backend remains authoritative.**