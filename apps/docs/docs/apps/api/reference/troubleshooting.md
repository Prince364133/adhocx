---
title: API Troubleshooting
description: Diagnose common AdhocX API authentication, validation, authorization, provider and endpoint issues.
status: partial
last_reviewed: "2026-11-23"
---

# API Troubleshooting

Use the [endpoint reference](./exact-controller-endpoints.md) to locate a
handler and its first-level service/data evidence. Use the
[error catalog](./error-code-catalog.md) to interpret the standard response
shape. Do not infer the cause solely from an error message.

## Common failures

| Symptom | Likely source-level cause | Safe diagnostic steps |
|---|---|---|
| `401 Unauthorized` | Missing/invalid bearer token, revoked/expired session, or invalid/expired/already-used live-stream ticket | Confirm `Authorization: Bearer ...` for ordinary protected routes. Reauthenticate after revocation/password update. For an EventSource route ending in `/live-stream`, obtain a fresh single-use ticket through the authenticated ticket flow; never put the access token in the URL. |
| `403 Forbidden` | Role guard rejected the caller, a corporate/resource permission denied the request, or a webhook signature/configuration check failed | Compare caller role and tenant/office scope with the route's `@Roles`, `CorporateResource`, `CorporateTenantScoped` and permission declarations. For webhooks, verify the expected header and server-side secret configuration without logging secret values. |
| `400 Bad Request` with `details` | Missing/invalid DTO fields, undeclared properties, invalid route parameters, or explicit handler validation | Compare the payload with the linked DTO catalog. The global pipe rejects non-whitelisted fields and does not enable implicit conversion; send numbers/booleans in the declared form and remove unknown keys. |
| `404 Not Found` | Resource does not exist or is outside the handler's lookup path | Confirm the identifier and tenant/resource context. Check the route reference for resource-specific access and lookup behavior. |
| `409 Conflict` / `INVALID_STATE_OPERATION` | Requested action conflicts with the resource's current state | Read the resource state first and follow the documented lifecycle transition; do not blindly repeat a mutation. |
| `410 Gone` | Client called a retired endpoint | Follow the replacement documented in the endpoint reference. For payout processing use batch creation, checker approval and provider submission. |
| `422 Unprocessable Entity` / `CAPACITY_EXCEEDED` | Domain invariant, such as already-satisfied requirement capacity | Refresh the requirement/assignment state and retry only if the business operation remains valid. |
| `500 Internal Server Error` | Unhandled exception | The global filter intentionally hides server details. Use server-side logs and request context available to operators; do not ask clients to expose secrets or stack traces. |
| `502` / `503` | Controlled upstream/provider availability or configuration error | Check the relevant provider configuration and service health. Do not retry a financial or non-idempotent operation until its status is known. |

## Request validation checklist

1. Confirm the correct API base and route path. The default global prefix is
   `/api/v1`, but `main.ts` declares exclusions and some controllers have
   path aliases.
2. Check method, route parameters, query names and headers against the
   controller reference.
3. Check the body against its concrete DTO and class-validator rules.
4. Remove undeclared fields; `whitelist` plus
   `forbidNonWhitelisted` rejects them.
5. Do not rely on implicit string-to-number or string-to-boolean conversion.
6. Handle the standard `success/data/timestamp` and
   `success/error/timestamp` envelopes. SSE values are not wrapped in the
   JSON envelope.

## Swagger availability

`main.ts` enables Swagger when the resolved `app.enableSwagger` configuration
is true, `ENABLE_SWAGGER=true`, or the environment is not production. Do not
assume Swagger is reachable in a deployed environment; use the checked-in
controller and DTO sources when it is disabled.

## Provider callback issues

For signed callbacks, compare the expected signature algorithm and raw/parsed
body behavior in the [webhook and idempotency reference](./webhooks-and-idempotency.md).
The payment, DigiO and corporate payout handlers have different authentication
and replay semantics. A successful acknowledgement may mean the callback
was accepted for later reconciliation, not that all downstream work is
complete.

## Sources and verification

- `apps/api/src/main.ts` — route prefix, validation pipe, response interceptors and Swagger conditions.
- `apps/api/src/common/guards/auth.guard.ts`, `roles.guard.ts`, `corporate-access.guard.ts` — authentication and authorization.
- `apps/api/src/common/filters/http-exception.filter.ts` — error response shaping.
- [API error catalog](./error-code-catalog.md) and [API conventions](./api-conventions.md) — shared contracts.
- [Endpoint reference](./exact-controller-endpoints.md) — route-specific inputs, guards, service calls and exception evidence.
