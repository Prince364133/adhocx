---
title: API Conventions
description: Verified URL, authentication, response and error conventions for AdhocX.
---

# API Conventions

**Evidence status:** Verified against `apps/api/src/main.ts`,
exception/filter/interceptor and authentication guard source.

Use the [per-controller endpoint reference](./endpoints/index.md) for
source-declared routes, [DTO catalog](./request-response-dto-catalog.md) for
named payload types, [error catalog](./error-code-catalog.md) for error
mapping, and [webhook/idempotency guide](./webhooks-and-idempotency.md) for
integration-specific authentication and retry rules.

## Base URL

The API sets a global prefix of `/api/v1` unless overridden by configuration.

```text
http://localhost:7001/api/v1
https://api.adhocx.com/api/v1
```

## HTTP Methods

| Method | Intended use |
|---|---|
| `GET` | Read or list a resource |
| `POST` | Create or execute an action |
| `PATCH` | Update a partial resource |
| `PUT` | Replace or publish a defined resource |
| `DELETE` | Remove or invalidate a resource |

## Authentication

Protected routes use `JwtAuthGuard` and, when role-restricted, `RolesGuard`.
Send a bearer token:

```http
Authorization: Bearer <access-token>
```

For live-stream GET routes, the API uses a single-use stream ticket in the
query string instead of placing the access token in the URL.

## Response Envelope

Successful JSON responses are normally transformed into:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-11-23T10:00:00.000Z"
}
```

Arrays and scalar values may appear as `data`. Server-Sent Events bypass the
JSON response envelope.

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "Unauthorized",
    "message": "Missing or invalid Authorization header"
  },
  "timestamp": "2026-11-23T10:00:00.000Z"
}
```

Validation details are generally returned as `details`. Unhandled server
errors are deliberately hidden behind a generic internal-error response.

## Validation

The global validation pipe:

- rejects unknown fields
- transforms only declared DTO fields
- disables implicit conversion
- validates request DTOs

Clients must not depend on server acceptance of undeclared fields.

## Authorization

Role restrictions use the `@Roles(...)` decorator. `ADMIN` is treated as an
unrestricted platform role by `RolesGuard`. Corporate authorization may also
use corporate-resource decorators and the corporate-access guard.

## Idempotency

Critical mutations should use provider idempotency or existing database
uniqueness constraints where implemented. Do not claim a universal
idempotency header contract unless the route/controller implements and
documents it.

## Request Example

```http
POST /api/v1/auth/otp/request
Content-Type: application/json

{
  "phone": "+919999999999"
}
```

## Protected Example

```http
GET /api/v1/trips
Authorization: Bearer <access-token>
Accept: application/json
```
