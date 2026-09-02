# 10_API_SPECIFICATION.md

# AdhocX API Specification

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Mobile Engineers, Admin Engineers, QA Engineers, DevOps, AI Coding Agents

---

# 1. Purpose

This document defines the canonical API contract for AdhocX V1.

It specifies:

* API conventions
* Authentication
* Authorization
* Request/response structure
* Error handling
* Resource naming
* Pagination
* Filtering
* Idempotency
* State transitions
* Vendor APIs
* Driver APIs
* Admin APIs
* Dispatch APIs
* Trip APIs
* Payment APIs
* Notification APIs
* Realtime contracts
* Webhook handling
* API security
* Versioning
* Observability requirements
* API implementation rules

The API must support the two product surfaces:

1. **AdhocX Mobile**

   * Vendor
   * Driver

2. **AdhocX Admin**

   * Admin

The backend is a **NestJS modular monolith**.

The API is the external boundary of the backend. Business rules must not be duplicated inside clients.

---

# 2. API Principles

The API must follow these principles:

1. Backend is authoritative.
2. Clients are untrusted.
3. Authentication is mandatory for protected operations.
4. Authorization is enforced server-side.
5. Resource ownership is enforced server-side.
6. State transitions are validated server-side.
7. Critical mutations are transactional.
8. Critical mutations must support idempotency where appropriate.
9. Money values must never use floating-point representation.
10. Dates/times are transmitted consistently.
11. API responses must be predictable.
12. Errors must be machine-readable and human-readable.
13. Internal database models must not automatically become public API models.
14. API contracts must not expose unnecessary internal fields.
15. Sensitive information must never be returned unnecessarily.
16. Realtime events must not replace authoritative API state.
17. External integrations must be isolated behind provider abstractions.
18. API versioning must allow controlled evolution.
19. Breaking changes require an explicit contract change.
20. No client should need to understand internal database implementation.

---

# 3. Base URL

Production API:

```text
https://api.adhocx.example.com/api/v1
```

The actual production domain is **TBD**.

Development:

```text
http://localhost:<port>/api/v1
```

The API version is part of the URL.

Example:

```text
GET /api/v1/requirements
```

---

# 4. API Versioning

V1 uses URL-based versioning:

```text
/api/v1/...
```

Breaking API changes require a new major version.

Example:

```text
/api/v2/requirements
```

Non-breaking additions may remain within V1.

Examples:

* adding an optional response field
* adding a new endpoint
* adding a new optional filter

Breaking changes include:

* changing field meaning
* removing fields
* changing field types
* changing state semantics
* changing authentication behavior
* changing required request fields

---

# 5. Authentication

AdhocX uses OTP-based authentication.

Typical flow:

```text
Request OTP
    ↓
Verify OTP
    ↓
Create authenticated session
    ↓
Return access token
    ↓
Client calls protected APIs
```

---

# 6. Authentication Endpoints

## 6.1 Request OTP

```http
POST /auth/otp/request
```

Request:

```json
{
  "phone": "+91XXXXXXXXXX"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "expiresAt": "2026-01-01T10:05:00Z",
    "retryAfterSeconds": 30
  }
}
```

The API must not reveal whether a phone number belongs to a valid account in a way that enables account enumeration.

Rate limiting is mandatory.

---

# 7. Verify OTP

```http
POST /auth/otp/verify
```

Request:

```json
{
  "requestId": "uuid",
  "phone": "+91XXXXXXXXXX",
  "otp": "123456"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "token",
    "refreshToken": "token",
    "expiresAt": "2026-01-01T12:00:00Z",
    "user": {
      "id": "uuid",
      "role": "VENDOR"
    }
  }
}
```

The exact token mechanism is an implementation decision, but the API must provide secure session authentication.

---

# 8. Authentication Header

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

The backend must validate:

* token authenticity
* token expiration
* user existence
* account status
* session validity where applicable

---

# 9. Role Model

Supported business roles:

```text
VENDOR
DRIVER
ADMIN
```

The client must not be allowed to arbitrarily choose its role through request payloads.

Role is determined by the authenticated account and backend authorization.

---

# 10. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this operation?

Every protected mutation must validate:

```text
Authentication
    ↓
Role / Permission
    ↓
Resource ownership
    ↓
Resource state
    ↓
Business rules
```

Example:

```http
POST /requirements/{id}/cancel
```

The backend must verify:

1. authenticated user
2. vendor permission
3. requirement belongs to vendor
4. requirement is cancellable
5. cancellation business rules permit it

---

# 11. Standard Response Envelope

Successful responses should use:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

`meta` is optional.

For simple mutation responses:

```json
{
  "success": true,
  "data": {
    "id": "uuid"
  }
}
```

---

# 12. Collection Response

Collection endpoints should use:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 120,
      "totalPages": 6
    }
  }
}
```

The pagination implementation may later evolve to cursor pagination for high-volume operational feeds.

The public contract must remain consistent.

---

# 13. Pagination

Supported parameters:

```text
?page=1&pageSize=20
```

Rules:

* default `pageSize` is controlled by backend
* maximum `pageSize` is enforced server-side
* clients cannot request unlimited records
* expensive unbounded queries are prohibited

For high-frequency feeds, cursor-based pagination may be used.

---

# 14. Filtering

Filters should be explicit.

Example:

```http
GET /requirements?status=OPEN&vehicleType=SEDAN
```

Do not expose arbitrary database query syntax.

Forbidden:

```text
?where=...
?sql=...
?query=raw(...)
```

---

# 15. Sorting

Sorting must use an allowlisted field set.

Example:

```http
GET /requirements?sortBy=createdAt&sortOrder=desc
```

Only backend-approved fields may be used.

---

# 16. Search

Search endpoints should use controlled fields.

Example:

```http
GET /drivers?search=rahul
```

Search implementation must not expose unrestricted database querying.

---

# 17. Standard Error Response

All expected API errors should follow a predictable structure.

Example:

```json
{
  "success": false,
  "error": {
    "code": "REQUIREMENT_NOT_CANCELLABLE",
    "message": "This requirement can no longer be cancelled.",
    "details": {}
  },
  "requestId": "uuid"
}
```

---

# 18. Error Code Principles

Error codes must be:

* stable
* machine-readable
* documented
* domain-specific where useful
* independent of human-readable wording

Example:

```text
AUTH_INVALID_OTP
AUTH_OTP_EXPIRED
FORBIDDEN
RESOURCE_NOT_FOUND
VALIDATION_ERROR
REQUIREMENT_NOT_CANCELLABLE
OFFER_EXPIRED
OFFER_ALREADY_ACCEPTED
ASSIGNMENT_UNAVAILABLE
TRIP_INVALID_STATE
PAYMENT_FAILED
```

Clients should branch on error codes, not message strings.

---

# 19. HTTP Status Codes

Use standard HTTP semantics.

| Status | Usage                                         |
| ------ | --------------------------------------------- |
| 200    | Successful request                            |
| 201    | Resource created                              |
| 202    | Accepted for asynchronous processing          |
| 204    | Successful operation with no response body    |
| 400    | Invalid request                               |
| 401    | Authentication required/invalid               |
| 403    | Permission denied                             |
| 404    | Resource not found                            |
| 409    | Conflict/state/concurrency conflict           |
| 422    | Validation/business validation failure        |
| 429    | Rate limit exceeded                           |
| 500    | Unexpected server error                       |
| 502    | External dependency failure where appropriate |
| 503    | Service temporarily unavailable               |

---

# 20. Request IDs

Every API request must have a request ID.

The backend should accept:

```http
X-Request-ID: <uuid>
```

If absent, the backend generates one.

Response:

```http
X-Request-ID: <uuid>
```

The request ID must appear in structured logs.

---

# 21. Idempotency

Critical mutations must support idempotency.

Header:

```http
Idempotency-Key: <unique-key>
```

Applicable operations include:

* requirement creation
* offer acceptance
* trip start
* trip completion
* withdrawal request
* payment initiation
* settlement operations

Example:

```http
POST /driver/offers/{offerId}/accept
Idempotency-Key: 6d3...
```

If the same key is retried, the server must return the same logical result rather than creating a duplicate operation.

---

# 22. Idempotency Rules

The backend must:

1. identify the operation
2. identify the authenticated actor
3. persist idempotency state
4. associate the key with the resulting operation
5. safely replay the result

Idempotency must not be implemented using an in-memory variable.

Redis may assist coordination, but durable idempotency for critical financial/business operations must be persisted appropriately.

---

# 23. Vendor API

Vendor endpoints:

```text
/vendor/profile
/vendor/dashboard
/vendor/requirements
/vendor/requirements/{id}
/vendor/trips
/vendor/payments
/vendor/notifications
```

---

# 24. Vendor Profile

```http
GET /vendor/profile
```

Returns the authenticated vendor's profile.

```http
PATCH /vendor/profile
```

Updates editable vendor information.

The backend determines which fields are editable.

---

# 25. Vendor Dashboard

```http
GET /vendor/dashboard
```

Response should provide operational summaries such as:

```json
{
  "activeRequirements": 4,
  "vehiclesRequired": 20,
  "vehiclesAssigned": 15,
  "vehiclesPending": 5,
  "activeTrips": 8,
  "pendingPayments": 2
}
```

Exact dashboard metrics may evolve without changing domain semantics.

---

# 26. Create Requirement

```http
POST /vendor/requirements
```

Example:

```json
{
  "pickupLocation": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "Example Address"
  },
  "pickupAt": "2026-09-05T08:00:00Z",
  "vehicleType": "SEDAN",
  "quantity": 20,
  "notes": "Corporate transport requirement"
}
```

The backend must validate:

* vendor authorization
* location
* time
* quantity
* vehicle type
* required business fields
* vendor account status

The backend creates the requirement in the appropriate initial state.

---

# 27. Requirement Details

```http
GET /vendor/requirements/{requirementId}
```

Response should contain:

* requirement identity
* requirement state
* requested quantity
* assigned quantity
* pending quantity
* pickup information
* vehicle requirements
* timestamps
* assignments
* relevant operational information

Sensitive driver information must be returned only when permitted by the business state and authorization rules.

---

# 28. Requirement List

```http
GET /vendor/requirements
```

Supported filters may include:

```text
status
dateFrom
dateTo
vehicleType
```

Example:

```http
GET /vendor/requirements?status=OPEN&page=1&pageSize=20
```

---

# 29. Cancel Requirement

```http
POST /vendor/requirements/{requirementId}/cancel
```

Optional request:

```json
{
  "reason": "Requirement no longer needed"
}
```

The backend determines whether cancellation is allowed.

The client must never directly set:

```json
{
  "status": "CANCELLED"
}
```

State transitions belong to the backend.

---

# 30. Vendor Trips

```http
GET /vendor/trips
GET /vendor/trips/{tripId}
```

Supported filters:

```text
status
dateFrom
dateTo
requirementId
```

---

# 31. Vendor Payments

```http
GET /vendor/payments
GET /vendor/payments/{paymentId}
```

Payment responses should include:

* payment ID
* related business object
* amount
* currency
* status
* timestamps
* provider reference where appropriate

Do not expose provider secrets.

---

# 32. Driver API

Driver endpoints:

```text
/driver/profile
/driver/onboarding
/driver/kyc
/driver/vehicle
/driver/availability
/driver/opportunities
/driver/offers
/driver/trips
/driver/earnings
/driver/withdrawals
/driver/notifications
```

---

# 33. Driver Profile

```http
GET /driver/profile
```

```http
PATCH /driver/profile
```

Only backend-approved fields may be updated.

---

# 34. Driver KYC

```http
GET /driver/kyc
POST /driver/kyc
PATCH /driver/kyc
```

Documents should be uploaded through a secure storage/upload mechanism.

The API should store document metadata rather than exposing raw storage credentials.

KYC state is backend-controlled.

Example:

```text
PENDING
UNDER_REVIEW
VERIFIED
REJECTED
SUSPENDED
```

---

# 35. Vehicle

```http
GET /driver/vehicle
POST /driver/vehicle
PATCH /driver/vehicle
```

The backend validates:

* vehicle type
* registration information
* ownership/association information
* verification requirements

Exact KYC/vehicle document requirements remain configurable/TBD.

---

# 36. Driver Availability

```http
GET /driver/availability
```

```http
POST /driver/availability/online
```

```http
POST /driver/availability/offline
```

The server determines the resulting availability state.

Being online does not automatically mean every driver is eligible for every trip.

Eligibility depends on:

* account status
* verification
* vehicle
* availability
* active assignment/trip state
* location
* business rules

---

# 37. Driver Location

```http
POST /driver/location
```

Example:

```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracyMeters": 8,
  "recordedAt": "2026-09-05T07:52:00Z"
}
```

The backend validates:

* coordinate ranges
* authenticated driver
* acceptable timestamp
* update frequency

Location updates must be rate controlled.

The system must not treat client-reported location as unquestionable truth.

---

# 38. Nearby Opportunities

```http
GET /driver/opportunities
```

The backend determines eligible opportunities.

The response may contain:

```json
{
  "id": "uuid",
  "vehicleType": "SEDAN",
  "pickupAt": "2026-09-05T08:00:00Z",
  "pickupLocation": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "estimatedDistanceMeters": 2400
}
```

The backend must never return opportunities for which the driver is ineligible.

---

# 39. Driver Offer

```http
GET /driver/offers
GET /driver/offers/{offerId}
```

An offer is a temporary dispatch invitation.

Offer data may contain:

* offer ID
* requirement ID
* pickup
* vehicle type
* estimated distance
* offered earnings where applicable
* expiration
* current state

---

# 40. Accept Offer

```http
POST /driver/offers/{offerId}/accept
```

Request:

```json
{}
```

The operation must be transactional.

The backend must verify:

1. driver is authenticated
2. driver is authorized
3. offer belongs to driver
4. offer is still valid
5. offer has not expired
6. requirement still needs capacity
7. driver remains eligible
8. driver does not have a conflicting assignment
9. capacity is atomically reserved

Possible response:

```json
{
  "success": true,
  "data": {
    "assignmentId": "uuid",
    "status": "ASSIGNED"
  }
}
```

---

# 41. Accept Offer Conflict

If another driver consumed the final available slot:

```http
409 Conflict
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "OFFER_NO_LONGER_AVAILABLE",
    "message": "This trip is no longer available."
  }
}
```

The client should refresh relevant state.

---

# 42. Decline Offer

```http
POST /driver/offers/{offerId}/decline
```

Request:

```json
{
  "reasonCode": "NOT_AVAILABLE"
}
```

Reason codes must come from an allowlist.

---

# 43. Offer Expiration

Offers are controlled by backend time.

The client timer is informational only.

The backend must reject acceptance after expiration even if the mobile application displays the offer as active.

---

# 44. Driver Trips

```http
GET /driver/trips
GET /driver/trips/{tripId}
```

Filters:

```text
status
dateFrom
dateTo
```

---

# 45. Trip Navigation

The backend may expose navigation-relevant information:

```http
GET /driver/trips/{tripId}/navigation
```

However, actual navigation may be delegated to the selected maps provider.

The backend remains responsible for the trip state.

---

# 46. Driver Arrival

```http
POST /driver/trips/{tripId}/arrived
```

The backend validates that the trip is in a valid pre-start state.

Arrival should not automatically imply trip start.

---

# 47. Start Trip With OTP

```http
POST /driver/trips/{tripId}/start
```

Request:

```json
{
  "otp": "1234"
}
```

The backend validates:

* driver assignment
* trip state
* OTP
* OTP expiration/validity
* trip start rules

If valid:

```text
ASSIGNED
    ↓
ARRIVED
    ↓
IN_PROGRESS
```

Exact state names must remain consistent with `12_STATE_MACHINES.md`.

---

# 48. Complete Trip

```http
POST /driver/trips/{tripId}/complete
```

Request:

```json
{
  "completionData": {}
}
```

The backend validates the current state and completion requirements.

Successful completion may trigger:

* trip completion event
* earnings calculation
* payment workflow
* settlement workflow
* notifications

Financial side effects must be transactional or handled through reliable event processing.

---

# 49. Earnings

```http
GET /driver/earnings
GET /driver/earnings/summary
```

Responses must clearly distinguish:

* earned
* pending
* settled
* withdrawn

Do not represent financial state using a single ambiguous `balance` field.

---

# 50. Withdrawals

```http
GET /driver/withdrawals
POST /driver/withdrawals
GET /driver/withdrawals/{withdrawalId}
```

Example:

```json
{
  "amount": "1250.00",
  "currency": "INR"
}
```

Money must be represented as decimal strings or minor units.

Never:

```json
{
  "amount": 1250.35
}
```

if the backend uses floating-point arithmetic.

---

# 51. Admin API

Admin endpoints:

```text
/admin/dashboard
/admin/requirements
/admin/trips
/admin/assignments
/admin/drivers
/admin/vendors
/admin/pricing
/admin/payments
/admin/settlements
/admin/reports
/admin/support
/admin/audit
```

All admin endpoints require explicit administrative authorization.

---

# 52. Admin Dashboard

```http
GET /admin/dashboard
```

Should provide operational metrics such as:

* active requirements
* fulfillment
* unassigned quantity
* active trips
* driver availability
* pending KYC
* payment failures
* settlement backlog
* operational alerts

Exact dashboard metrics may evolve.

---

# 53. Admin Requirements

```http
GET /admin/requirements
GET /admin/requirements/{requirementId}
```

Admin may filter across vendors and states.

Possible filters:

```text
status
vendorId
vehicleType
dateFrom
dateTo
fulfillmentState
```

---

# 54. Admin Trips

```http
GET /admin/trips
GET /admin/trips/{tripId}
```

Admin can inspect operational lifecycle.

Admin visibility does not automatically imply unrestricted mutation.

---

# 55. Admin Assignments

```http
GET /admin/assignments
GET /admin/assignments/{assignmentId}
```

Administrative reassignment/cancellation operations must have dedicated endpoints and audit trails.

Do not expose generic:

```http
PATCH /assignments/{id}
```

for arbitrary state manipulation.

---

# 56. Driver Management

```http
GET /admin/drivers
GET /admin/drivers/{driverId}
```

Verification:

```http
POST /admin/drivers/{driverId}/verify
POST /admin/drivers/{driverId}/reject
POST /admin/drivers/{driverId}/suspend
POST /admin/drivers/{driverId}/reactivate
```

Every administrative state-changing operation must generate an audit event.

---

# 57. Vendor Management

```http
GET /admin/vendors
GET /admin/vendors/{vendorId}
```

Approval:

```http
POST /admin/vendors/{vendorId}/approve
POST /admin/vendors/{vendorId}/reject
POST /admin/vendors/{vendorId}/suspend
POST /admin/vendors/{vendorId}/reactivate
```

---

# 58. Pricing API

Pricing configuration is administrative.

```http
GET /admin/pricing
POST /admin/pricing
PATCH /admin/pricing/{pricingId}
```

Exact pricing formula is **TBD**.

The API must not hard-code assumptions about:

* commission
* markup
* minimum fare
* surge
* cancellation fee

until the commercial rules are finalized.

---

# 59. Payments

Vendor payment operations:

```http
GET /vendor/payments
GET /vendor/payments/{paymentId}
POST /vendor/payments/{paymentId}/initiate
```

The exact payment lifecycle depends on the selected provider.

---

# 60. Payment Provider Webhooks

External payment providers may call:

```http
POST /webhooks/payments/{provider}
```

Webhook processing must:

* authenticate/verify provider signature
* validate payload
* identify event
* enforce idempotency
* persist event receipt
* process state transition
* avoid duplicate financial effects
* return appropriate response

Webhook endpoints must not use normal user authentication.

They use provider-specific verification.

---

# 61. Settlement API

```http
GET /admin/settlements
GET /admin/settlements/{settlementId}
POST /admin/settlements/{settlementId}/process
POST /admin/settlements/{settlementId}/retry
```

Settlement actions must be audited.

Financial operations must be traceable back to:

```text
Trip
    ↓
Earning
    ↓
Ledger Entry
    ↓
Settlement
```

---

# 62. Notification API

```http
GET /notifications
POST /notifications/{notificationId}/read
POST /notifications/read-all
```

Notifications are user-facing records.

Push delivery status is separate from notification business state.

---

# 63. Realtime API

Realtime communication should use WebSockets/Socket.IO.

Realtime is used for:

* requirement updates
* offer updates
* assignment changes
* trip state changes
* driver location where required
* payment/settlement status where useful
* operational admin events

---

# 64. WebSocket Authentication

Clients must authenticate their WebSocket connection.

The backend determines:

* user
* role
* allowed channels
* resource scope

A client cannot subscribe to another vendor's or driver's private channel.

---

# 65. Realtime Event Format

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

Events should contain enough information for the client to identify what changed.

The client should fetch authoritative state when necessary.

---

# 66. Core Realtime Events

Examples:

```text
REQUIREMENT_CREATED
REQUIREMENT_UPDATED
REQUIREMENT_FULFILLMENT_CHANGED

OFFER_CREATED
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

The exact event catalog must remain synchronized with the domain event model.

---

# 67. Dispatch API Boundary

The dispatch engine is an internal backend domain.

Clients should not directly invoke arbitrary dispatch algorithms.

For example, do not expose:

```http
POST /dispatch/run-algorithm
```

Vendor action:

```http
POST /vendor/requirements
```

may trigger dispatch internally.

Admin may have controlled operational actions such as:

```http
POST /admin/requirements/{id}/redispatch
```

if required.

---

# 68. Dispatch Request Lifecycle

Typical flow:

```text
Vendor creates requirement
        ↓
Requirement persisted
        ↓
Dispatch process triggered
        ↓
Eligible drivers calculated
        ↓
Drivers ranked
        ↓
Offers created
        ↓
Drivers notified
        ↓
Offers accepted/declined/expired
        ↓
Assignments created
        ↓
Requirement fulfillment updated
```

Dispatch remains backend-owned.

---

# 69. Requirement Quantity Integrity

For a requirement:

```text
requestedQuantity
=
assignedQuantity
+
remainingQuantity
```

The backend must guarantee the invariant.

Example:

```text
Requested = 20
Assigned = 15
Remaining = 5
```

Two concurrent driver acceptances must never cause:

```text
Assigned = 21
```

for a 20-slot requirement.

---

# 70. Concurrency

Critical endpoints must be designed for concurrent execution.

Especially:

```text
offer acceptance
assignment creation
requirement cancellation
trip start
trip completion
payment processing
withdrawal
settlement
```

Application-level checks alone are insufficient.

Database transactions, row locking, unique constraints, or other appropriate concurrency controls must be used.

---

# 71. State Transition API Rules

Clients must request actions.

Clients must not directly mutate state.

Bad:

```http
PATCH /trip/123
```

```json
{
  "status": "COMPLETED"
}
```

Good:

```http
POST /driver/trips/123/complete
```

The backend determines whether the transition is valid.

---

# 72. Resource Actions vs Generic PATCH

Use explicit action endpoints for important business transitions.

Preferred:

```text
POST /offers/{id}/accept
POST /offers/{id}/decline
POST /trips/{id}/start
POST /trips/{id}/complete
POST /requirements/{id}/cancel
POST /drivers/{id}/verify
```

Generic CRUD operations must not bypass domain rules.

---

# 73. Validation

All incoming payloads must be validated server-side.

Validate:

* required fields
* field types
* string lengths
* enum values
* numeric ranges
* coordinate ranges
* dates
* timestamps
* ownership
* state
* business constraints

NestJS DTO validation should be used at the API boundary.

Domain validation must remain in the appropriate domain/application layer.

---

# 74. Date and Time

All API timestamps must use ISO 8601.

Example:

```text
2026-09-05T08:00:00Z
```

Backend persistence uses UTC.

Clients may display local timezone representations.

The API must never silently reinterpret a timestamp based on server timezone.

---

# 75. Location

Coordinates use:

```json
{
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

Latitude:

```text
-90 to +90
```

Longitude:

```text
-180 to +180
```

Spatial matching is backend-owned.

Clients should not independently decide driver eligibility using approximate distance logic.

---

# 76. Money

Money must be represented safely.

Preferred API format:

```json
{
  "amount": "1250.00",
  "currency": "INR"
}
```

or:

```json
{
  "amountMinor": 125000,
  "currency": "INR"
}
```

The selected convention must be applied consistently.

Floating-point financial values are prohibited.

---

# 77. File Uploads

Sensitive documents should not be uploaded directly through arbitrary application payloads.

Preferred architecture:

```text
Client
 ↓
Request secure upload
 ↓
Backend generates controlled upload permission
 ↓
Object storage
 ↓
Backend stores document metadata
```

The API must never expose permanent storage credentials.

---

# 78. Sensitive Data

Do not return:

* OTP values
* passwords/secrets
* private storage credentials
* payment provider secrets
* internal tokens
* unnecessary KYC documents
* unrelated users' personal information
* internal database fields

Sensitive fields should be explicitly allowlisted for API serialization.

---

# 79. Rate Limiting

Rate limiting is required for:

* OTP request
* OTP verification
* authentication
* location updates
* search
* public endpoints
* webhook endpoints where appropriate
* expensive admin queries

Rate limits should be defined by endpoint and actor type.

Exact numeric limits are **TBD** and should be configurable.

---

# 80. Retry Semantics

Clients may retry transient failures.

The API must distinguish:

```text
safe retry
```

from:

```text
unsafe duplicate mutation
```

Idempotency keys should be used for critical mutations.

The backend must not instruct clients to blindly retry all `5xx` responses for financial operations.

---

# 81. API Security

The API must implement:

* HTTPS in production
* secure authentication
* server-side authorization
* rate limiting
* request validation
* secure headers
* input sanitization where appropriate
* structured audit logging
* secret management
* least-privilege access
* sensitive-field filtering
* secure file access
* webhook signature verification

---

# 82. CORS

CORS must be explicitly configured.

Do not use:

```text
Access-Control-Allow-Origin: *
```

for authenticated production APIs unless there is a deliberate security-approved reason.

Allowed origins should be environment-specific.

---

# 83. Auditability

Critical mutations must create audit records.

Examples:

```text
Driver verified
Driver rejected
Driver suspended
Vendor approved
Requirement cancelled
Assignment manually changed
Pricing changed
Settlement processed
Withdrawal processed
```

Audit records should include:

```text
actor
action
resource
resourceId
timestamp
requestId
metadata
```

---

# 84. API Observability

Every request should be traceable through:

```text
requestId
userId
role
endpoint
HTTP method
status code
latency
```

Sensitive values must be redacted.

Never log:

```text
OTP
access token
refresh token
payment secrets
KYC document contents
```

---

# 85. Health Endpoints

The backend should expose:

```http
GET /health
```

For infrastructure readiness:

```http
GET /health/ready
```

Liveness:

```http
GET /health/live
```

Readiness may verify critical dependencies such as database connectivity.

Health endpoints must not expose sensitive infrastructure details.

---

# 86. API Documentation

The API should generate OpenAPI documentation from the backend contract.

Recommended development endpoint:

```text
/api/docs
```

The production exposure policy is **TBD**.

OpenAPI documentation must remain synchronized with:

* DTOs
* validation
* response schemas
* authentication
* error codes

---

# 87. API Contract Ownership

Backend owns:

* API behavior
* validation
* authorization
* state transitions
* response semantics

Mobile owns:

* presentation
* local UI state
* local caching
* interaction behavior

Admin owns:

* operational presentation
* filtering
* tables
* workflows

Neither client may become the source of truth for backend business state.

---

# 88. API and Database Separation

The API must not expose database entities directly.

Bad:

```text
Controller
 ↓
ORM Entity
 ↓
JSON
```

Preferred:

```text
Controller
 ↓
DTO
 ↓
Application Service
 ↓
Domain
 ↓
Repository
 ↓
Database
```

Responses should use dedicated response DTOs/read models.

---

# 89. API and Domain Events

Important domain operations may publish internal events.

Example:

```text
RequirementCreated
OfferCreated
OfferAccepted
AssignmentCreated
TripStarted
TripCompleted
PaymentCompleted
SettlementCreated
```

Internal events must not automatically become public API events.

Public realtime events should have a deliberate contract.

---

# 90. Offline Behavior

The mobile application may temporarily operate without network connectivity.

However, critical operations cannot be considered successful until the server confirms them.

Examples:

```text
Accept offer
Start trip
Complete trip
Withdraw money
```

must not be permanently marked successful from local state alone.

The client may show:

```text
Pending
Syncing
Retrying
```

until authoritative confirmation is received.

---

# 91. Duplicate Submission Protection

The backend must tolerate:

* double taps
* repeated HTTP requests
* mobile retries
* timeout followed by retry
* reconnect after network loss

Critical operations must remain safe under these conditions.

---

# 92. Client Cache

Clients may cache:

* profile
* lists
* historical data
* non-critical reference data

Clients must not treat cached state as authoritative for:

* offer availability
* assignment capacity
* trip state
* payment state
* withdrawal state

Critical actions must revalidate against the backend.

---

# 93. API Performance

API performance targets should be established during implementation.

The backend should optimize:

* database queries
* indexes
* pagination
* spatial queries
* serialization
* external API calls
* N+1 queries

Do not prematurely introduce distributed infrastructure.

---

# 94. Transaction Boundaries

Transaction boundaries must be defined around critical business operations.

Example:

```text
Accept Offer Transaction
    ↓
Lock Requirement Capacity
    ↓
Validate Offer
    ↓
Validate Driver
    ↓
Create Assignment
    ↓
Update Requirement Fulfillment
    ↓
Update Offer State
    ↓
Commit
```

External notifications should generally occur after successful state persistence using reliable event/outbox patterns where required.

---

# 95. Cancellation APIs

Cancellation must be action-specific.

Vendor:

```http
POST /vendor/requirements/{id}/cancel
```

Driver:

```http
POST /driver/assignments/{id}/cancel
```

Admin:

```http
POST /admin/assignments/{id}/cancel
```

Each operation has different permissions and business rules.

Do not create a universal cancellation endpoint without domain authorization.

---

# 96. No-Driver-Available

No-driver conditions are represented by requirement/dispatch state rather than by fake driver records.

Possible system behavior:

```text
Dispatch Wave
    ↓
No accepted offers
    ↓
Expand matching scope if configured
    ↓
Retry dispatch
    ↓
Still unavailable
    ↓
Requirement enters no-availability state
    ↓
Vendor notified
```

Exact radius and retry parameters are **TBD**.

---

# 97. Partial Fulfillment

The API must support partial fulfillment.

Example:

```text
Required: 20
Assigned: 12
Remaining: 8
```

The requirement remains operationally active while fulfillment is incomplete, subject to business rules.

API responses should make these quantities explicit.

---

# 98. Assignment API

Vendor:

```http
GET /vendor/requirements/{id}/assignments
```

Driver:

```http
GET /driver/assignments/{id}
```

Admin:

```http
GET /admin/assignments
GET /admin/assignments/{id}
```

Assignment state must be backend-controlled.

---

# 99. Support APIs

Admin support tools may include:

```http
GET /admin/support/tickets
GET /admin/support/tickets/{id}
POST /admin/support/tickets
POST /admin/support/tickets/{id}/resolve
```

Exact support workflow may evolve.

All administrative actions must remain auditable.

---

# 100. Reports

Admin reporting endpoints:

```http
GET /admin/reports/trips
GET /admin/reports/fulfillment
GET /admin/reports/drivers
GET /admin/reports/vendors
GET /admin/reports/financial
```

Large reports should use asynchronous generation rather than blocking normal HTTP requests.

Possible pattern:

```http
POST /admin/reports
```

Response:

```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "status": "QUEUED"
  }
}
```

---

# 101. Export

Large exports should be asynchronous.

Example:

```text
POST /admin/reports/export
        ↓
QUEUED
        ↓
PROCESSING
        ↓
COMPLETED
        ↓
Secure download
```

Do not generate very large exports synchronously inside a normal API request.

---

# 102. API Contract Testing

Every critical endpoint must have automated tests covering:

* successful request
* authentication failure
* authorization failure
* validation failure
* resource ownership
* invalid state
* concurrency
* duplicate request
* not found
* external dependency failure where applicable

Critical state transitions require integration tests.

---

# 103. Contract Compatibility

When changing an API:

1. identify consumers
2. identify breaking changes
3. update OpenAPI
4. update DTOs
5. update clients
6. update contract tests
7. update documentation
8. deploy safely

Never silently break mobile clients that may remain on an older version.

---

# 104. Mobile Version Compatibility

The backend must support reasonable backward compatibility for mobile clients.

The backend should identify client version through controlled metadata such as:

```http
X-App-Version
X-Platform
```

Example:

```text
X-App-Version: 1.0.0
X-Platform: android
```

These headers must not be trusted for authorization.

---

# 105. Admin API Compatibility

Admin is controlled deployment infrastructure and may generally update alongside the backend.

Nevertheless, API contracts must remain explicit.

Admin-specific endpoints must not be reused as hidden mobile APIs.

---

# 106. Forbidden API Patterns

The following are prohibited:

### Arbitrary state mutation

```http
PATCH /trip/{id}
```

with arbitrary status changes.

### Client-authoritative pricing

```json
{
  "fare": 500
}
```

when the backend is responsible for pricing.

### Client-authoritative ownership

```json
{
  "vendorId": "another-vendor"
}
```

to access another vendor's resource.

### Client-authoritative role

```json
{
  "role": "ADMIN"
}
```

### Raw database queries

```text
?sql=...
```

### Unbounded collections

```http
GET /drivers
```

returning the entire database.

### Silent financial mutation

```text
PATCH /wallet
```

### Trusting local mobile state for critical operations

All are prohibited.

---

# 107. API Naming Convention

Use plural nouns for collections:

```text
/requirements
/drivers
/vendors
/trips
/offers
```

Use explicit actions for domain transitions:

```text
/accept
/decline
/start
/complete
/cancel
/verify
/suspend
```

Use lowercase kebab-case where multi-word path segments are needed.

---

# 108. Resource IDs

Public resource IDs should use UUIDs or another non-sequential identifier.

Do not expose predictable auto-incrementing internal IDs as public identifiers.

---

# 109. API Security Boundary

The API assumes:

```text
Mobile client = untrusted
Admin browser = untrusted
Network = untrusted
External provider = untrusted until verified
Database = trusted infrastructure
```

Every important business rule must therefore be enforced on the server.

---

# 110. Canonical API Flow

## Vendor Requirement

```text
POST /vendor/requirements
        ↓
Requirement created
        ↓
Dispatch triggered
        ↓
Driver offers created
        ↓
Driver accepts
        ↓
Assignment created
        ↓
Vendor receives realtime update
```

## Driver Trip

```text
GET /driver/offers
        ↓
POST /driver/offers/{id}/accept
        ↓
Assignment
        ↓
POST /driver/trips/{id}/arrived
        ↓
POST /driver/trips/{id}/start
        ↓
Trip IN_PROGRESS
        ↓
POST /driver/trips/{id}/complete
        ↓
Earnings / settlement workflow
```

---

# 111. End-to-End API Invariant

The complete system must maintain:

```text
Authenticated Actor
        ↓
Authorized Action
        ↓
Valid Resource
        ↓
Valid Resource State
        ↓
Valid Business Rule
        ↓
Transactional Mutation
        ↓
Persisted Source of Truth
        ↓
Realtime / Notification Side Effects
```

Not:

```text
Client says it happened
        ↓
Backend trusts client
```

---

# 112. Source of Truth Hierarchy

For API behavior:

```text
01_PRD.md
    ↓
02_FEATURES.md
    ↓
03_USER_ROLES_AND_PERMISSIONS.md
    ↓
12_STATE_MACHINES.md
    ↓
09_DATABASE.md
    ↓
10_API_SPECIFICATION.md
```

This document defines the API contract but must not contradict higher-level product and domain rules.

---

# 113. Relationship With Other Documents

This document depends on:

```text
01_PRD.md
02_FEATURES.md
03_USER_ROLES_AND_PERMISSIONS.md
07_ARCHITECTURE.md
09_DATABASE.md
```

It directly informs:

```text
11_DISPATCH_ENGINE.md
12_STATE_MACHINES.md
13_SECURITY.md
14_REALTIME_AND_NOTIFICATIONS.md
15_PAYMENTS_AND_LEDGER.md
16_ENGINEERING_STANDARDS.md
17_TESTING_STRATEGY.md
```

---

# 114. AI Agent API Rules

Any AI coding agent implementing AdhocX must:

1. Read this document before creating endpoints.
2. Read state machines before implementing mutations.
3. Read authorization rules before implementing guards.
4. Never invent endpoint behavior.
5. Never expose ORM entities directly.
6. Never create arbitrary status-update endpoints.
7. Never bypass domain/application services.
8. Never trust client-supplied ownership.
9. Never trust client-supplied pricing.
10. Never trust client-supplied role.
11. Implement validation at the API boundary.
12. Implement authorization server-side.
13. Use transactions for critical mutations.
14. Implement idempotency for required operations.
15. Use documented error codes.
16. Keep OpenAPI documentation synchronized.
17. Add tests for every critical mutation.
18. Never silently change an existing API contract.
19. Mark unresolved business rules as `TBD`.
20. Do not invent commercial rules.

---

# 115. API Definition of Done

An endpoint is not considered complete merely because it returns data.

A production-ready endpoint requires:

```text
[ ] Correct route
[ ] Authentication
[ ] Authorization
[ ] Request DTO
[ ] Validation
[ ] Resource ownership validation
[ ] State validation
[ ] Business-rule validation
[ ] Application service/use case
[ ] Domain logic where required
[ ] Repository interaction
[ ] Transaction where required
[ ] Idempotency where required
[ ] Correct response DTO
[ ] Correct error codes
[ ] Request ID
[ ] Structured logging
[ ] Audit event where required
[ ] OpenAPI documentation
[ ] Unit tests
[ ] Integration tests
[ ] Concurrency tests where required
```

---

# 116. Final API Principle

The AdhocX API is not a thin CRUD layer over PostgreSQL.

It is the **business boundary of the platform**.

The API must enforce:

```text
Identity
Authorization
Ownership
State
Concurrency
Business Rules
Financial Integrity
Auditability
```

The frontend requests actions.

The backend decides whether those actions are valid.

The database guarantees persistence and integrity.

Realtime systems communicate changes.

The API therefore acts as the controlled boundary between AdhocX users and the underlying business system.

**No client is authoritative.
No critical state is client-controlled.
No financial operation is implicit.
No business transition bypasses the backend.**