---
title: API Error Code Catalog
description: Shared HTTP error envelope and source-defined exception mappings for the AdhocX API.
status: partial
last_reviewed: "2026-11-23"
---

# API Error Code Catalog

The global `HttpExceptionFilter` converts NestJS HTTP exceptions into the
AdhocX error envelope. Endpoint pages record explicit exception classes
found in each handler and its first directly called service method. Those
lists are not exhaustive where errors are thrown in deeper helpers or
external providers.

## Error envelope

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Invoice with identifier 'example-id' was not found"
  },
  "timestamp": "2026-11-23T10:00:00.000Z"
}
```

`details` is omitted when it is undefined. Validation errors may put an array
of field messages in `details`; the client should display a safe message and
not assume every error includes the same fields.

## Source-defined mappings

| HTTP status | Code or source behavior | Meaning / where it is used |
|---:|---|---|
| 400 | `Bad Request` (Nest default) | Invalid request, DTO validation, or explicit bad-request checks |
| 400 | `INVALID_STATE_TRANSITION` | `InvalidStateTransitionError` is mapped by `HttpExceptionFilter` |
| 401 | `Unauthorized` (Nest default) | Missing, invalid, expired or revoked JWT; invalid/expired single-use stream ticket; invalid DigiO checksum or corporate payout signature |
| 403 | `Forbidden` or `FORBIDDEN_OPERATION` | Role/resource authorization failure, payment webhook signature/configuration failure, or an explicitly forbidden action |
| 404 | `Not Found` or `RESOURCE_NOT_FOUND` | Resource lookup failed |
| 409 | `Conflict` or `INVALID_STATE_OPERATION` | Conflicting state operation or invariant |
| 410 | `Gone` | Retired Corporate payout-preparation route |
| 422 | `Unprocessable Entity` or `CAPACITY_EXCEEDED` | Capacity constraint rejected the operation |
| 429 | `Too Many Requests` (Nest default) | Rate limiter rejected the request |
| 500 | `INTERNAL_SERVER_ERROR` for an unexpected non-HTTP exception | Most 5xx messages and details are hidden; HTTP exceptions retain their response-derived code |
| 502/503 | Nest/provider code when controlled | A nonempty controlled upstream message may be preserved if it does not resemble internal SQL, stack or connection details |

These are source-defined examples, not a closed public enum. For ordinary
`HttpException` instances, the filter uses the exception response's `error`
value where provided, otherwise the Nest status name. Consumers should use
the HTTP status and message/details safely, and avoid hard-coding every
framework-generated code string as a permanent contract.

## Domain error types

The API defines these reusable domain exceptions in
`apps/api/src/common/errors/domain-errors.ts`:

| Exception | HTTP status | Code | Intended use |
|---|---:|---|---|
| `ResourceNotFoundException` | 404 | `RESOURCE_NOT_FOUND` | Named resource lookup failure |
| `InvalidStateOperationException` | 409 | `INVALID_STATE_OPERATION` | Operation conflicts with current state |
| `CapacityExceededException` | 422 | `CAPACITY_EXCEEDED` | Requirement capacity is already satisfied |
| `UnauthorizedActionException` | 403 | `FORBIDDEN_OPERATION` | Caller cannot perform an action on a resource |

## Example: retired route

The `CorporateBillingController.preparePayoutBatch` handler throws a 410
`GoneException`; its message directs clients to create, approve and submit a
payout batch instead. The global filter serializes the HTTP exception into
the standard error envelope. It constructs `error.code` and `error.message`
from the exception response; additional fields such as the exception's
`replacement` object are not guaranteed to survive this filter.

For `POST /api/v1/corporate/billing/payouts/prepare-batch`, the source-backed
response shape is:

```json
{
  "success": false,
  "error": {
    "code": "Gone",
    "message": "POST /corporate/billing/payouts/prepare-batch is retired. Create a batch with POST /corporate/billing/payouts/batches, have a different admin approve it (POST payouts/batches/:id/approve), then submit it (POST payouts/batches/:id/submit). A payout is PAID only when the payout provider confirms it."
  },
  "timestamp": "2026-11-23T10:00:00.000Z"
}
```

The timestamp is illustrative. The replacement links shown in the exception
object are not included because the global filter currently serializes only
the exception's code, message and details fields.

## Client handling guidance

1. Use HTTP status to choose the broad UI state (authentication, permission,
   validation, conflict, unavailable service).
2. Show `error.message` only as user-facing text after normal UI escaping.
3. If `error.details` is an array, associate available validation messages
   with the form; otherwise retain it for diagnostics without exposing
   internal provider or database details.
4. Treat a 5xx as retryable only when the operation is safe to retry or has an
   explicit idempotency mechanism.
5. Do not retry a 401 without renewing the session, or a 403 without changing
   the authorization context.

## Sources and verification

- `apps/api/src/common/filters/http-exception.filter.ts` — global serialization and 5xx masking behavior.
- `apps/api/src/common/errors/domain-errors.ts` — reusable domain status/code mappings.
- `apps/api/src/main.ts` — global filter registration and validation pipe.
- [Controller endpoint reference](./exact-controller-endpoints.md) — route-level exception evidence.
- [API conventions](./api-conventions.md) — request/response envelope and validation rules.
