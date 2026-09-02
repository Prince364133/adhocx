# 13_SECURITY.md

# AdhocX Security Specification

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Mobile Engineers, Admin Engineers, DevOps, QA, Security Reviewers, AI Coding Agents

---

# 1. Purpose

This document defines the security requirements for AdhocX V1.

Security must protect:

* user accounts
* vendor accounts
* driver accounts
* administrator accounts
* KYC information
* vehicle information
* locations
* trip information
* financial information
* authentication credentials
* payment information
* internal operational data
* APIs
* infrastructure
* audit records

Security is not a feature added after implementation.

It is a system-wide constraint.

---

# 2. Security Principles

AdhocX follows these principles:

1. Never trust the client.
2. Authenticate every protected operation.
3. Authorize every protected operation.
4. Enforce resource ownership server-side.
5. Enforce state transitions server-side.
6. Minimize sensitive data exposure.
7. Store secrets only in secure secret-management systems.
8. Encrypt sensitive data in transit.
9. Encrypt sensitive data at rest where appropriate.
10. Use least privilege.
11. Fail securely.
12. Audit privileged operations.
13. Make security controls observable.
14. Prefer explicit allowlists over implicit permissions.
15. Do not build security around obscurity.
16. Do not rely on frontend security controls.
17. Protect against replay and duplicate critical operations.
18. Keep dependencies and infrastructure patched.
19. Design for compromise containment.
20. Security controls must not be bypassed for convenience.

---

# 3. Security Architecture

The security boundary is:

```text
Mobile App
     ↓
Admin Web App
     ↓
HTTPS
     ↓
API Gateway / Application
     ↓
Authentication
     ↓
Authorization
     ↓
Application Services
     ↓
Domain Rules
     ↓
Database / Infrastructure
```

External providers are separate trust boundaries:

```text
Payment Provider
OTP Provider
Push Providers
Maps Provider
Object Storage
```

All external integrations must be treated as untrusted inputs until verified.

---

# 4. Threat Model

Important threat categories include:

```text
Account takeover
OTP abuse
Session theft
Broken authorization
IDOR/resource enumeration
Privilege escalation
API abuse
Replay attacks
Duplicate financial operations
Malicious file uploads
KYC document exposure
Location abuse
Fake/stale location
Payment webhook forgery
Admin account compromise
Sensitive data leakage
Database compromise
Dependency vulnerabilities
Insider misuse
```

---

# 5. Authentication

AdhocX V1 uses OTP-based authentication.

Authentication must establish:

```text
User identity
+
Authenticated session
+
Account status
```

Authentication does not grant permission by itself.

---

# 6. OTP Security

OTP handling must:

* use a cryptographically appropriate random generator
* have a short validity period
* have limited verification attempts
* have request rate limits
* have verification rate limits
* invalidate used OTPs
* prevent unlimited retries
* avoid exposing OTP values in logs
* avoid exposing OTP values in API responses

The exact OTP expiry and retry values are **TBD/configurable**.

---

# 7. OTP Enumeration Protection

The API must avoid revealing unnecessary account-existence information.

For example, an attacker should not be able to repeatedly request OTPs and determine:

```text
"This phone number has an account."
```

through materially different responses.

Responses should be designed consistently where possible.

---

# 8. OTP Brute Force Protection

The system must rate-limit OTP verification using appropriate dimensions such as:

```text
phone number
request ID
IP address
device/session signals where appropriate
```

Exact thresholds are **TBD**.

Repeated failures may trigger temporary blocking or additional verification.

---

# 9. Session Security

Authenticated sessions must have:

* expiration
* revocation capability
* secure token handling
* controlled refresh
* server-side validation
* logout/revocation support

Access tokens must have limited lifetime.

Refresh tokens, if used, require stronger protection.

---

# 10. Token Storage

### Mobile

Tokens must be stored using platform-secure storage.

Do not store authentication tokens in:

```text
plain SharedPreferences
plain local files
SQLite without appropriate protection
logs
```

Flutter should use platform-backed secure storage.

### Admin

Authentication/session cookies or tokens must follow secure browser storage practices.

Sensitive authentication tokens should not be exposed to JavaScript unnecessarily.

---

# 11. Token Revocation

Sessions must be revocable when:

```text
account suspended
account deactivated
security incident
admin revokes session
refresh token compromise
```

The exact implementation may use a session store, token versioning, refresh-token rotation, or another secure mechanism.

---

# 12. Authorization

Authorization follows:

```text
Identity
 ↓
Role
 ↓
Permission
 ↓
Resource ownership
 ↓
Current state
 ↓
Business rule
```

A role alone is never sufficient.

---

# 13. Role-Based Access Control

Primary roles:

```text
VENDOR
DRIVER
ADMIN
```

Permissions must be explicit.

Example:

```text
requirement.create
requirement.read
requirement.cancel

offer.read
offer.accept
offer.decline

trip.read
trip.start
trip.complete

driver.verify
driver.suspend

settlement.process
```

---

# 14. Resource-Level Authorization

Every resource access must be scoped.

Example:

```text
Vendor A
    ↓
GET /vendor/requirements/123
```

The backend must verify:

```text
Requirement 123 belongs to Vendor A
```

It must not rely on the resource ID being hidden from the user.

---

# 15. IDOR Protection

The API must prevent insecure direct object reference attacks.

This is unsafe:

```text id="r7l0s3"
GET /vendor/requirements/{arbitraryId}
```

if the backend returns the object solely because the ID exists.

Correct:

```text id="u9xw3f"
authenticated vendor
+
resource belongs to vendor
+
permission allows read
```

---

# 16. Driver Data Isolation

A driver must not access another driver's:

* KYC documents
* earnings
* bank/payment information
* personal information
* location history
* assignments
* private notifications

unless explicitly required by a legitimate product workflow.

---

# 17. Vendor Data Isolation

A vendor must not access another vendor's:

* requirements
* trips
* payments
* drivers
* pricing configuration
* operational metrics

unless a future business rule explicitly permits it.

---

# 18. Admin Security

Admin accounts are highly privileged.

Admin access must receive stronger protection than normal user access.

Recommended controls include:

* strong authentication
* restricted administrative permissions
* session expiration
* audit logging
* privileged-action monitoring
* optional MFA in environments where supported

The exact production admin authentication policy is **TBD**.

---

# 19. Least Privilege

Every service, worker, user, and integration should have only the permissions required for its function.

Example:

```text
Dispatch Worker
```

does not need:

```text
Admin user management permissions
```

Payment workers do not need unrestricted access to KYC documents.

---

# 20. Service Permissions

Backend modules should not receive unrestricted access to every domain.

Example:

```text
Dispatch
 → requirements
 → drivers
 → vehicles
 → offers
 → assignments
```

It should not directly manipulate:

```text
ledger internals
authentication credentials
admin accounts
```

without an explicit domain interface.

---

# 21. Database Security

Production database access must be restricted.

Controls include:

* private networking
* strong credentials
* TLS where applicable
* least-privileged database users
* restricted inbound access
* encrypted backups
* monitored access
* migration control

The application must not expose database access publicly.

---

# 22. Database Credentials

Database credentials must never be:

```text
committed to Git
hard-coded
embedded in Flutter
embedded in Next.js client bundles
printed in logs
shared through source code
```

Secrets belong in environment/secret-management infrastructure.

---

# 23. Secrets Management

Secrets include:

```text
database passwords
JWT secrets
OTP provider credentials
payment credentials
webhook secrets
storage credentials
maps server keys
push credentials
encryption keys
```

They must be stored in secure secret-management infrastructure.

Examples may include:

* cloud secret managers
* encrypted environment configuration
* deployment secret stores

The exact provider is an infrastructure decision.

---

# 24. Environment Separation

At minimum:

```text
development
staging
production
```

must have separate credentials and infrastructure.

Production credentials must never be reused in development.

---

# 25. Client-Side Secrets

Never place server secrets inside:

```text
Flutter application
Next.js browser bundle
mobile source code
public environment variables
```

Mobile applications are distributed to potentially hostile environments.

Anything shipped to the client should be considered discoverable.

---

# 26. API Keys

Public/client-side API keys may be required for some third-party services.

However:

* scope them
* restrict them by application where supported
* restrict APIs
* rotate them
* monitor usage

Server-side credentials must never be exposed.

---

# 27. Transport Security

Production traffic must use HTTPS.

Plain HTTP must not be used for authenticated production communication.

TLS termination and certificate management belong to the infrastructure layer.

---

# 28. TLS

Production systems should use modern TLS configurations.

Deprecated protocols and insecure cipher configurations must not be enabled.

Certificate validation must not be disabled in mobile clients.

---

# 29. Certificate Pinning

Certificate pinning is a possible defense for mobile applications but introduces operational risks during certificate rotation.

It should not be enabled casually.

If implemented, the rotation/recovery strategy must be documented and tested.

---

# 30. API Input Validation

Every API request is untrusted.

Validate:

* types
* lengths
* ranges
* enums
* coordinates
* timestamps
* identifiers
* file metadata
* business constraints

Validation must occur server-side.

---

# 31. Injection Protection

Use parameterized queries/ORM mechanisms.

Never construct SQL using raw user input.

Bad:

```text id="u2q1l0"
"SELECT * FROM drivers WHERE name = '" + input + "'"
```

Preferred:

```text id="x0j3j5"
parameterized query
```

Raw SQL is allowed only when deliberately reviewed and parameterized.

---

# 32. NoSQL/Command Injection

If external systems accept structured queries or commands, inputs must be validated and parameterized.

Never pass arbitrary user-controlled input directly into:

* shell commands
* Redis commands
* database expressions
* filesystem paths
* external API query syntax

---

# 33. XSS Protection

Admin web applications must protect against:

* reflected XSS
* stored XSS
* DOM XSS

User-generated text must be treated as untrusted.

Do not render arbitrary HTML unless there is a deliberate sanitization pipeline.

---

# 34. CSRF Protection

If browser authentication uses cookies, state-changing endpoints require appropriate CSRF protection.

Possible controls:

* SameSite cookies
* CSRF tokens
* origin checks

The exact mechanism depends on the authentication architecture.

Bearer-token APIs used outside cookie authentication have different CSRF characteristics.

---

# 35. CORS

CORS must use explicit allowed origins.

Production should not blindly allow:

```text
*
```

for authenticated APIs.

Allowed origins must be environment-specific.

---

# 36. Rate Limiting

Rate limits must protect:

```text
OTP request
OTP verification
login
search
location updates
expensive reports
administrative operations
public endpoints
```

Limits should be configurable.

---

# 37. Abuse Prevention

The platform must monitor abuse patterns such as:

```text
OTP flooding
offer spam
fake account creation
excessive location updates
repeated failed authentication
automated enumeration
API scraping
withdrawal abuse
payment abuse
```

Controls may include:

* rate limits
* temporary blocking
* anomaly monitoring
* account suspension
* operational review

---

# 38. Replay Protection

Critical operations must resist replay.

Examples:

```text
accept offer
start trip
complete trip
withdraw funds
payment initiation
settlement
```

Use:

* idempotency keys
* server-side state checks
* expiration
* unique constraints
* transaction boundaries

where appropriate.

---

# 39. Offer Security

An offer must be tied to:

```text
requirement
driver
expiration
current state
```

A driver must not be able to modify:

```text
driverId
requirementId
price
expiration
```

through the acceptance request.

The server already knows these values from the offer.

---

# 40. Assignment Security

Assignment creation must happen only through authorized backend operations.

Clients cannot submit:

```json id="8jsv8x"
{
  "driverId": "another-driver"
}
```

and cause an assignment without eligibility validation.

---

# 41. Trip Start Security

Trip OTP must be validated server-side.

Never:

```text id="4e7kg0"
OTP stored in Flutter
```

and checked locally.

Correct:

```text id="2x7m0k"
Driver
 ↓
API
 ↓
Backend OTP validation
 ↓
Trip transition
```

---

# 42. OTP Storage

Trip-start OTPs must not be stored in plaintext when avoidable.

The system should use a secure representation suitable for verification.

OTP values must not appear in logs.

---

# 43. Trip Completion Security

Trip completion must verify:

* authenticated driver
* correct assignment
* valid trip state
* completion authorization
* required completion information

A driver must not be able to complete another driver's trip.

---

# 44. Location Security

Location data is sensitive operational information.

The system must minimize:

* retention
* access
* exposure
* unnecessary precision

Only collect location when required for product functionality.

---

# 45. Location Access Control

Location data should be available only to authorized actors.

Examples:

```text
Driver → own current location
Vendor → relevant assigned driver location
Admin → operational location when required
```

A vendor must not receive arbitrary historical location data for unrelated drivers.

---

# 46. Location Retention

High-frequency location data can become extremely large and sensitive.

Retention should be configurable based on:

* operational need
* analytics requirements
* legal requirements
* storage cost
* privacy requirements

Do not retain unlimited location history by default.

---

# 47. Location Integrity

The system should treat client-reported location as potentially inaccurate.

Potential issues:

```text
GPS error
mock location
stale location
device clock manipulation
network delay
```

V1 should preserve enough metadata to detect obvious inconsistencies later.

---

# 48. KYC Security

KYC data is highly sensitive.

Access must be restricted.

KYC information must:

* use encrypted transport
* use secure storage
* have controlled access
* avoid unnecessary API exposure
* be audited when accessed administratively
* have defined retention rules

---

# 49. KYC Document Storage

KYC documents should be stored in private object storage.

They must not be publicly accessible through predictable URLs.

Use controlled access such as:

```text
authenticated request
    ↓
authorization check
    ↓
short-lived signed URL
```

where appropriate.

---

# 50. KYC Document Upload Validation

Uploaded documents must be validated for:

* allowed file type
* size
* upload authorization
* content expectations
* malware/security scanning where available

Do not trust:

```text
filename
Content-Type header
file extension
```

alone.

---

# 51. File Upload Security

The system must protect against:

```text
malicious files
oversized files
path traversal
executable uploads
polyglot files
unexpected MIME types
resource exhaustion
```

Files should not be executed by the application.

---

# 52. Path Traversal

Never construct storage paths directly from untrusted filenames.

Bad:

```text id="j4z3we"
uploads/<user-provided-filename>
```

Use generated identifiers and controlled storage paths.

---

# 53. Payment Security

AdhocX must not unnecessarily store sensitive payment credentials.

Where possible, use the payment provider's tokenization mechanisms.

The application should store provider references rather than raw payment secrets.

---

# 54. Payment Webhook Security

Every payment webhook must verify provider authenticity.

Typical controls:

```text
signature verification
timestamp verification where supported
event ID
idempotency
payload validation
```

Never trust a webhook merely because it reached the endpoint.

---

# 55. Webhook Replay

A valid payment webhook may be delivered multiple times.

The system must ensure:

```text
same event
→
same business effect
```

rather than:

```text
same event
→
duplicate payment
→
duplicate ledger entry
```

---

# 56. Financial Security

Financial records require stronger integrity controls.

Never allow clients to:

```text
modify earnings
modify balances
modify ledger entries
modify settlement status
```

Financial mutations must be generated by trusted backend workflows.

---

# 57. Ledger Immutability

Ledger entries should be append-oriented.

Do not silently rewrite historical financial transactions.

Corrections should be represented through appropriate adjustment/reversal entries.

---

# 58. Admin Financial Controls

Financial administrative operations should require:

```text
explicit permission
state validation
audit event
actor identity
timestamp
reason where appropriate
```

High-risk operations may later require dual approval.

That policy is **TBD**.

---

# 59. Sensitive API Responses

API responses must follow data minimization.

Do not return large objects containing unrelated sensitive fields.

Bad:

```json id="6ud0kn"
{
  "driver": {
    "allDatabaseColumns": "..."
  }
}
```

Preferred:

```json id="k0c9c0"
{
  "driver": {
    "id": "uuid",
    "name": "Driver Name",
    "vehicleType": "SEDAN",
    "status": "VERIFIED"
  }
}
```

---

# 60. Error Message Security

Errors must not reveal:

* SQL queries
* stack traces
* database schema
* secret values
* internal filesystem paths
* infrastructure credentials
* unnecessary security-sensitive information

Production users receive safe error messages.

Detailed information belongs in secured logs.

---

# 61. Logging Security

Logs must never contain:

```text
OTP
password
access token
refresh token
payment credentials
private keys
KYC document contents
full sensitive financial credentials
```

PII should be minimized and redacted where possible.

---

# 62. Audit Logging

Security-sensitive operations require immutable or tamper-resistant audit records.

Examples:

```text
login
logout
failed authentication
driver verification
driver suspension
vendor approval
admin permission change
manual assignment
payment action
settlement action
withdrawal action
KYC access
security configuration change
```

---

# 63. Audit Record

Audit records should include:

```text
actorId
actorRole
action
resourceType
resourceId
timestamp
requestId
result
metadata
```

The metadata must not contain secrets.

---

# 64. Audit vs Application Logs

These are different.

### Application log

Used for:

```text
debugging
performance
errors
operations
```

### Audit record

Used for:

```text
who did what
to which resource
when
with what result
```

Do not treat ordinary logs as the only audit system.

---

# 65. Mobile Security

Flutter applications must assume the device may be compromised.

The backend must therefore never trust:

```text
local role
local state
local price
local assignment
local verification
```

The mobile application is a client, not a security boundary.

---

# 66. Mobile Secure Storage

Sensitive local data should use platform secure storage.

Avoid storing:

```text
access tokens
refresh tokens
private KYC data
payment secrets
```

in plaintext.

---

# 67. Local Data Minimization

The mobile app should store only data needed for:

* current operation
* reasonable offline experience
* session continuity

Do not cache entire operational databases locally.

---

# 68. Screenshot/Screen Privacy

Sensitive screens may optionally use platform privacy controls where appropriate.

Examples:

```text
KYC document viewing
payment information
sensitive account information
```

This is an enhancement rather than a universal V1 requirement.

---

# 69. Admin Browser Security

Admin application security must include:

* secure authentication
* session timeout
* permission checks
* XSS protection
* CSRF protection where applicable
* secure cookies where used
* no secrets in browser bundles
* auditability
* controlled file access

---

# 70. Dependency Security

All production dependencies must be tracked.

The project should use:

```text
lockfiles
automated vulnerability scanning
dependency updates
security review for critical packages
```

Do not blindly install packages from unknown sources.

---

# 71. Dependency Update Policy

Security-critical vulnerabilities should be prioritized.

Updates must be tested before production deployment.

AI agents must not upgrade major dependencies arbitrarily during unrelated feature work.

---

# 72. Supply Chain Security

Repository controls should include:

* protected main branch
* code review
* dependency lockfiles
* CI security checks
* secret scanning
* least-privileged CI credentials
* controlled deployment credentials

---

# 73. Git Security

Never commit:

```text
.env
production credentials
private keys
payment secrets
database passwords
service account JSON
KYC documents
customer exports
```

Repository secret scanning should be enabled.

---

# 74. CI/CD Security

CI/CD systems should:

* use short-lived credentials where possible
* restrict deployment permissions
* separate environments
* protect production deployment
* store secrets securely
* log deployment actions

Production deployment should not depend on a developer's personal credentials.

---

# 75. Infrastructure Security

Production infrastructure should use:

```text
private networking where appropriate
firewalls/security groups
restricted database access
TLS
secret management
backups
monitoring
least privilege
```

Only required public services should be publicly reachable.

---

# 76. Redis Security

Redis must not be exposed publicly without strong protection.

Use:

* private networking
* authentication where supported
* TLS where appropriate
* restricted access
* memory controls

Redis must never be treated as an unauthenticated public service.

---

# 77. Object Storage Security

Object storage must use:

```text
private buckets
least-privilege credentials
signed URLs where appropriate
encryption
access logging
retention policies
```

Public bucket access should not be used for sensitive documents.

---

# 78. Backup Security

Backups must be:

* encrypted
* access-controlled
* monitored
* tested for restoration

A backup that cannot be restored is not a reliable backup.

---

# 79. Backup Retention

Retention should be based on:

* operational needs
* legal requirements
* recovery objectives
* storage cost

Exact retention periods are **TBD**.

---

# 80. Disaster Recovery

The production environment should define:

```text
RPO
RTO
backup frequency
restore procedure
failover procedure
incident ownership
```

Exact targets are **TBD**.

---

# 81. Security Monitoring

Monitor for:

```text
authentication spikes
OTP abuse
permission failures
unusual admin activity
API rate-limit violations
payment anomalies
repeated webhook failures
unusual location behavior
large data exports
unexpected infrastructure access
```

---

# 82. Security Alerts

High-priority alerts may include:

```text
credential compromise
admin account anomaly
database exposure
payment webhook attack
mass authentication abuse
unexpected production secret access
large unauthorized export
```

Alert thresholds are **TBD**.

---

# 83. Incident Response

Security incidents should follow:

```text
Detect
 ↓
Contain
 ↓
Investigate
 ↓
Remediate
 ↓
Recover
 ↓
Review
```

The incident process must preserve evidence where appropriate.

---

# 84. Account Compromise

If an account is suspected to be compromised:

```text
invalidate sessions
 ↓
secure account
 ↓
investigate activity
 ↓
restore access after verification
```

Admin accounts require special handling because of their elevated privileges.

---

# 85. Secret Rotation

Secrets must be rotatable without requiring major application rewrites.

Rotation should cover:

```text
API credentials
database credentials
webhook secrets
storage credentials
JWT/signing secrets
third-party provider credentials
```

The exact rotation process belongs to deployment documentation.

---

# 86. Encryption

### In Transit

Use TLS for:

```text
mobile → API
admin → API
API → external providers
```

### At Rest

Sensitive storage should use provider/database encryption where available.

Particularly sensitive fields may require application-level encryption depending on the finalized threat model.

---

# 87. Encryption Key Management

Encryption keys must not be hard-coded.

Use secure key management infrastructure.

Keys should have:

* controlled access
* rotation strategy
* backup/recovery considerations
* auditability

---

# 88. Data Retention

AdhocX should not retain sensitive information forever.

Retention policies should exist for:

```text
KYC documents
location history
notifications
audit records
application logs
payment records
support records
```

Exact retention periods are **TBD**.

---

# 89. Data Deletion

Deletion must respect:

* legal requirements
* financial record requirements
* audit requirements
* operational requirements

Financial records may require retention even after a user account is deactivated.

---

# 90. Privacy by Design

The product should collect the minimum information required to operate.

For every sensitive field ask:

```text
Why do we collect it?
Who needs it?
How long do we retain it?
Can we reduce its precision?
Can we avoid storing it?
```

---

# 91. Third-Party Security

External services must be isolated behind provider abstractions.

Examples:

```text
OTP provider
Payment provider
Maps provider
Push provider
Storage provider
```

Business logic must not become tightly coupled to provider-specific implementation details.

---

# 92. External API Input Security

External API responses are also untrusted.

Validate:

* response schema
* identifiers
* amounts
* statuses
* signatures
* timestamps

Do not blindly persist provider responses as authoritative business state.

---

# 93. Payment Provider Trust Boundary

Correct:

```text
Payment Provider
      ↓
Verify webhook
      ↓
Validate event
      ↓
Map provider state
      ↓
AdhocX domain transition
```

Incorrect:

```text
Payment Provider says PAID
      ↓
blindly set database = PAID
```

---

# 94. Maps Provider Trust Boundary

Maps results are inputs.

The backend should not assume every:

```text
distance
ETA
address
coordinate
```

returned by a provider is necessarily correct without validation appropriate to the use case.

---

# 95. Push Notification Security

Push payloads should not contain unnecessary sensitive information.

Avoid sending:

```text
KYC documents
financial credentials
authentication tokens
sensitive personal data
```

through push payloads.

Prefer:

```text
"You have a new trip offer."
```

and let the authenticated application fetch details.

---

# 96. Deep Link Security

Deep links must not automatically authorize actions.

Example:

```text
adhocx://offer/123
```

means:

```text
Open offer 123
```

not:

```text
Accept offer 123
```

Critical actions still require authenticated API authorization.

---

# 97. Webhook Endpoint Security

Webhook endpoints must:

* verify signatures
* validate event schemas
* enforce idempotency
* rate-limit where appropriate
* log safely
* reject malformed payloads
* avoid exposing internal errors

---

# 98. Security Testing

Security testing should cover:

```text
authentication
authorization
IDOR
privilege escalation
rate limiting
OTP abuse
session handling
input validation
XSS
CSRF
file upload
webhook verification
replay attacks
financial operations
```

---

# 99. Authorization Testing

For every protected resource test:

```text
correct owner → allowed
wrong owner → denied
wrong role → denied
unauthenticated → denied
suspended account → denied where applicable
invalid state → denied
```

---

# 100. Concurrency Security Testing

Security testing must include race conditions.

Examples:

```text
two offer acceptances
two withdrawals
duplicate payment webhook
duplicate trip completion
admin action + user action
```

The system must preserve financial and operational integrity.

---

# 101. Penetration Testing

Before serious production rollout, the platform should undergo an appropriate security assessment.

At minimum, assess:

```text
API authorization
authentication
admin security
file uploads
financial endpoints
KYC access
common web/mobile vulnerabilities
```

The exact scope and timing are **TBD**.

---

# 102. Security Headers

Admin web infrastructure should use appropriate security headers, including where applicable:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Strict-Transport-Security
Frame protections
```

Exact configuration depends on deployment architecture.

---

# 103. Error Handling

Security-sensitive failures must fail closed.

Example:

If authorization service fails:

```text
do not grant access
```

If payment verification fails:

```text
do not mark payment successful
```

If KYC authorization fails:

```text
do not return document
```

---

# 104. Fail-Closed Principle

When the system cannot establish that an action is authorized:

```text
DENY
```

not:

```text
ALLOW
```

This is especially important for:

* admin operations
* financial operations
* KYC access
* resource access

---

# 105. Security and Offline Mode

Offline mode must never bypass security.

If the client cannot reach the backend:

```text
critical authorization-sensitive action
→ wait for backend confirmation
```

The mobile app may display cached information but cannot authorize critical business transitions locally.

---

# 106. Security and Dispatch

Dispatch security requires:

```text
eligible driver
+
valid offer
+
correct requirement
+
valid capacity
+
transactional acceptance
```

A malicious client cannot:

```text
forge assignment
change offer owner
change pricing
bypass vehicle requirements
```

---

# 107. Security and State Machines

Security and state validation work together.

Example:

```text
Driver authenticated
+
Driver has trip permission
+
Trip belongs to driver
+
Trip = ARRIVED
+
OTP valid
```

Only then:

```text
Trip → IN_PROGRESS
```

Authentication alone is insufficient.

---

# 108. Security and Financial Ledger

Financial state must be backend-generated.

Clients may request:

```text
withdraw
```

but cannot request:

```text
balance = 100000
```

The ledger remains authoritative.

---

# 109. Security and Admin Overrides

Admin privileges must never mean:

```text
bypass all rules
```

Instead:

```text
Admin permission
+
explicit action
+
state validation
+
audit
```

If an override is genuinely required, it should be represented as an explicit domain operation.

---

# 110. Security Documentation Rules

Any new sensitive feature must document:

```text
data collected
authorization requirements
storage
encryption
retention
audit requirements
failure behavior
```

before implementation.

---

# 111. AI Agent Security Rules

Any AI coding agent working on AdhocX must:

1. Treat all client input as untrusted.
2. Never implement frontend-only authorization.
3. Never expose secrets.
4. Never commit credentials.
5. Never disable TLS verification.
6. Never bypass authentication for convenience.
7. Never create admin backdoors.
8. Never create hidden privileged endpoints.
9. Never trust client-supplied role.
10. Never trust client-supplied ownership.
11. Never trust client-supplied financial values.
12. Never trust client-side state transitions.
13. Never expose KYC documents publicly.
14. Never log OTPs or tokens.
15. Never log payment secrets.
16. Never bypass webhook verification.
17. Never bypass idempotency for financial operations.
18. Never weaken authorization to make a test pass.
19. Never disable security checks because they complicate development.
20. Never invent security-sensitive behavior without documenting it.

---

# 112. Security Definition of Done

A security-sensitive feature is not complete until:

```text
[ ] Authentication verified
[ ] Authorization verified
[ ] Resource ownership verified
[ ] State transition verified
[ ] Input validation implemented
[ ] Sensitive data minimized
[ ] Secrets protected
[ ] Logs redacted
[ ] Audit requirements implemented
[ ] Rate limits considered
[ ] Replay protection considered
[ ] Concurrency considered
[ ] Error handling fails safely
[ ] Tests implemented
[ ] Security tests implemented
[ ] Documentation updated
```

---

# 113. Security Priority

Security controls should be prioritized around the most damaging failure modes.

Highest priority:

```text
Account takeover
Admin compromise
Broken authorization
Financial manipulation
KYC exposure
Credential leakage
Payment fraud
Database exposure
```

---

# 114. Final Security Principle

AdhocX security is based on one fundamental assumption:

> **Anything outside the trusted backend boundary can be manipulated.**

Therefore:

```text
Client
    ↓
Untrusted

API
    ↓
Authentication
    ↓
Authorization
    ↓
Business Rules
    ↓
State Validation
    ↓
Transactional Operation
    ↓
Trusted Persistence
```

Security must not depend on users being honest, mobile applications behaving correctly, or clients hiding information.

The backend must enforce the rules.

The database must protect critical invariants.

Privileged actions must be auditable.

Sensitive information must be minimized and protected.

And when the system cannot prove that an action is safe and authorized:

> **It must deny the action.**