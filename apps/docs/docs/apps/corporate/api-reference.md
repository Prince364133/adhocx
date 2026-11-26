---
title: Corporate frontend API reference
description: HTTP methods, paths, request shapes, and backend ownership for APIs called by the Corporate portal.
---

# Corporate frontend API reference

This page documents the API helpers exposed to the Corporate frontend in
`apps/corporate/src/lib/api/corporate.ts`. Paths below are relative to the API
base URL; in the browser the shared client normally appends `/api/v1`. Query
parameters with no value are omitted. `GET` is the helper default when no
method is shown. Payload names are summarized from the TypeScript helper
signatures and the pages that call them; the backend DTO/controller remains
the contract authority.

The shared client in `src/lib/api/client.ts` adds the stored bearer token,
unwraps `{ success: true, data }`, retries eligible 401 requests after
`POST /auth/refresh`, clears the session and redirects after failed refresh,
surfaces 403 responses as `ApiError`, and uses `apiDownload` for binary/CSV
downloads. See [architecture](./architecture.md) for session and tenant scope.

## Authentication

| Method and path | Request | Caller and backend/data |
|---|---|---|
| `POST /auth/login` | JSON `{ identifier, password }`; anonymous request. | Login page; auth controller verifies the account and returns the session. |
| `POST /auth/otp/request` | JSON `{ phone? or email?, isRegister: false }`; anonymous request. | Login page; requests an OTP for an existing account (the Corporate portal does not use this helper to register). |
| `POST /auth/otp/verify` | JSON `{ requestId?, phone?, email?, otp, isRegister: false }`; anonymous request. | Login page; auth controller verifies the OTP and returns the session. |
| `POST /auth/logout` | JSON `{}` with the current session. | Portal logout; auth controller invalidates/logs out the session as supported by backend. |

## Tenant, office, departments, zones, integrations, and users

Backend reference: [Corporate tenant controller](../api/reference/endpoints/corporate-tenant-controller.md).

| Method and path | Request | Purpose and backend data |
|---|---|---|
| `GET /corporate/tenants/:tenantId` | Path tenant ID. | Loads tenant profile and permitted tenant details. |
| `PATCH /corporate/tenants/:tenantId/profile` | `UpdateCorporateTenantProfileDto` JSON. | Updates company profile/legal details. |
| `GET /corporate/tenants/:tenantId/offices` | Optional query `includeInactive`. | Reads tenant offices. |
| `POST /corporate/tenants/:tenantId/offices` | `CreateCorporateOfficeDto` JSON; includes office identity/location and coordinates where required. | Creates an office; the office page validates numeric coordinates before calling. |
| `PATCH /corporate/tenants/:tenantId/offices/:officeId` | `UpdateCorporateOfficeDto` JSON. | Updates office details. |
| `GET /corporate/tenants/:tenantId/offices/:officeId/geofences` | Tenant and office path IDs. | Reads geofence details for an office. |
| `GET /corporate/tenants/:tenantId/integrations` | Tenant path ID. | Reads configured integration status/settings. |
| `GET /corporate/tenants/:tenantId/cost-centers` | Tenant path ID. | Reads tenant cost centers. |
| `GET /corporate/tenants/:tenantId/departments` | Optional query `includeInactive`. | Lists tenant departments. |
| `POST /corporate/tenants/:tenantId/departments` | JSON `{ code, name, departmentHead?, officeId?, description?, isActive? }`. | Creates a department. |
| `PATCH /corporate/tenants/:tenantId/departments/:departmentId` | Partial department fields. | Updates a department. |
| `GET /corporate/tenants/:tenantId/transport-zones` | Optional query `includeInactive`. | Lists tenant transport zones. |
| `POST /corporate/tenants/:tenantId/transport-zones` | `CreateCorporateTransportZoneDto` JSON. | Creates a transport zone. |
| `PATCH /corporate/tenants/:tenantId/transport-zones/:zoneId` | `UpdateCorporateTransportZoneDto` JSON. | Updates a transport zone. |
| `GET /corporate/tenants/:tenantId/users` | Tenant path ID. | Lists corporate tenant users/memberships. |
| `POST /corporate/tenants/:tenantId/users` | JSON `{ fullName, email?, phone?, corporateRole, officeIds }`. | Invites/adds a tenant user with role and office scope. |
| `PATCH /corporate/tenants/:tenantId/users/:userId` | JSON `{ corporateRole?, officeIds? }`. | Updates the user's Corporate role or office scope. |

These endpoints receive a tenant identifier in the URL or query, but the
backend's corporate access and tenant-scope guards—not the browser-provided
identifier—must enforce tenant ownership.

## Analytics and reporting

Backend reference: [Corporate analytics controller](../api/reference/endpoints/corporate-analytics-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /corporate/analytics/dashboard` | Query: `tenantId`, optional `from`, `to`, `officeId`, `direction`, `shiftTime`. | Returns the dashboard aggregate used by company and booking overviews. |
| `GET /corporate/analytics/reports/trips` | Same analytics filters, plus `format=json`. | Returns a trip report with row count/truncation information; used by dashboard/report pages. |
| `GET /corporate/analytics/exceptions` | Optional query `tenantId`, `officeId`, `from`, `to`. | Returns exception data for live exception views. |
| `GET /corporate/analytics/attendance` | Query includes `tenantId`, optional date/office filters, `page`, and `pageSize`. | Returns a paginated attendance report used by usage reporting. |
| `GET /corporate/analytics/reports/:type` | Query includes analytics filters and `format=csv`; type is `trips`, `no-shows`, or `attendance`. | Downloads the requested CSV report. |

Pages may compute display-only metrics from returned rows. In particular,
dashboard pages check report truncation and consistency before showing derived
totals; client-derived values are not an independent backend aggregate.

## Employees

Backend reference: [Corporate tenant controller](../api/reference/endpoints/corporate-tenant-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /corporate/tenants/:tenantId/employees` | Optional query: `search`, `officeId`, `department`, `isActive`, `page`, `limit`. | Paginated employee directory. |
| `GET /corporate/tenants/:tenantId/employees/:employeeId` | Tenant and employee path IDs. | Reads one employee. |
| `GET /corporate/tenants/:tenantId/employees/:employeeId/requests` | Optional query `limit` (default 30). | Reads an employee's request history. |
| `POST /corporate/tenants/:tenantId/employees` | `EmployeeInput`: `officeId`, `employeeCode`, `fullName`, `email`, `phoneNumber`, `gender`, optional department/cost center/location data. | Creates an employee. The directory supplies the required identity and office fields. |
| `PATCH /corporate/tenants/:tenantId/employees/:employeeId` | Partial employee fields such as name, email, phone, gender, office, department, cost center, address, and `isActive`. | Updates an employee. |
| `DELETE /corporate/tenants/:tenantId/employees/:employeeId` | Tenant and employee path IDs. | Deletes or deactivates according to backend retention rules; response distinguishes `deleted` and `deactivated`. |
| `POST /corporate/tenants/:tenantId/employees/:employeeId/locations` | JSON `{ addressText, landmark?, latitude, longitude, isDefault? }`. | Adds an employee location. This helper exists even if a given page does not expose it. |

## Rosters and scheduling

Backend references: [Corporate roster controller](../api/reference/endpoints/corporate-roster-controller.md) and [Corporate scheduling controller](../api/reference/endpoints/corporate-scheduling-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /corporate/rosters/template` | No body. | Downloads the `.xlsx` roster template. |
| `POST /corporate/rosters/validate` | Multipart form with `file` and `tenantId`; tenant ID is also in the query. | Dry-run validation; returns validation results without committing the imported roster. |
| `POST /corporate/rosters/upload` | Multipart form with `file`, `tenantId`, and `mode` (`draft` or `publish`); tenant/mode are also query values. | Uploads/ingests a roster; the UI currently selects `draft` from the import page. |
| `GET /corporate/rosters` | Query `tenantId`, optional `rosterDate`, `officeId`. | Lists tenant rosters. |
| `GET /corporate/rosters/:rosterId` | Roster path ID. | Reads a roster and its requests. |
| `GET /corporate/rosters/:rosterId/requests` | Optional query `status`. | Lists roster requests. |
| `POST /corporate/rosters/:rosterId/approve` | JSON `{}`. | Calls the distinct roster approval API. The current `/rosters/approve` page does not call this helper for its visible publish action. |
| `POST /corporate/rosters/:rosterId/publish` | JSON `{}`. | Calls the roster publishing API used by the current review page. |
| `GET /corporate/scheduling/shift-templates` | Query `tenantId`, optional `officeId`. | Lists shift templates. |
| `POST /corporate/scheduling/shift-templates` | JSON `{ tenantId, officeId, name, loginTime, logoutTime, weekdays }`. | Creates a shift template. The page requires an office, name, times, and at least one weekday. |
| `GET /corporate/scheduling/holidays` | Query `tenantId`, optional `from`, `to`. | Lists tenant holidays. |
| `POST /corporate/scheduling/holidays` | JSON `{ tenantId, officeId?, holidayDate, name }`. | Creates a holiday; helper is available to the app. |

## Routes, tracking, and transport requests

Backend references: [Corporate routing controller](../api/reference/endpoints/corporate-routing-controller.md), [Corporate tracking controller](../api/reference/endpoints/corporate-tracking-controller.md), and [Corporate trip execution controller](../api/reference/endpoints/corporate-trip-execution-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /corporate/routes/portal` | Query includes `includeStops=true`, optional tenant/date/shift/direction/status/dispatch/search/limit/offset filters. | Reads the Corporate route list used by route and live pages. |
| `GET /corporate/routes/:routeId` | Path ID and `includeDirections=true`. | Reads route details, including directions when available. |
| `GET /corporate/routes/:routeId/directions` | Optional query `refresh=true`. | Reads or refreshes route directions/traffic information. |
| `GET /corporate/trips/routes/:routeId/tracking` | Route path ID. | Reads latest route tracking data. |
| `GET /corporate/trips/routes/:routeId/timeline` | Route path ID. | Reads route timeline events. |
| `GET /corporate/trips/requests` | Optional query `tenantId`, `status`, `direction`, `scheduledDate`, `search`, `page`, `limit`. | Lists corporate transport requests across rosters for the tenant. |
| `POST /corporate/trips/requests/:requestId/review` | JSON `{ decision, notes? }`, where decision is `APPROVE` or `REJECT`. | Reviews an ad-hoc/exception request and returns updated request status. |
| `POST /corporate/trips/requests/:requestId/reschedule` | JSON `{ employeeId, action, newShiftTime?, newShiftDate? }`, where action is `CANCEL` or `RESCHEDULE`. | Cancels or reschedules a request. The backend enforces the documented nine-hour cutoff; the platform-admin override is not called by the Corporate helper. |

The route page's assignment summary is a read operation. Route creation,
editing, dispatch, driver execution, and telemetry mutations are not implied
by the list/detail helpers above; see the linked backend/controller references
and Ops app documentation for their distinct interfaces.

## Safety

Backend reference: [Corporate safety controller](../api/reference/endpoints/corporate-safety-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /corporate/safety/alerts` | Query includes `tenantId`, optional `status`. Both `alerts` and `incidents` frontend helpers use this path. | Reads tenant SOS alert/incident records for lists and reports. |
| `GET /corporate/safety/alerts/:id` | Alert/incident path ID. | Reads a single safety record. |
| `POST /corporate/safety/alerts/:id/resolve` | JSON `{ reason?, resolutionNotes?, falsePositive? }`. | Resolves an alert/incident. The incident form requires category and notes, then maps the category to `reason` and false-positive flag. |
| `POST /corporate/safety/routes/:routeId/stops/:stopId/confirm-safe-drop` | JSON `{ confirmedByRole: "DRIVER" | "EMPLOYEE", notes? }`. | Confirms safe drop for a route stop. |
| `POST /corporate/safety/routes/:routeId/stops/:stopId/confirm-safe-reach` | JSON `{ confirmedSafely?, notes? }`. | Confirms safe reach for a route stop. |
| `POST /corporate/safety/routes/:routeId/stops/:stopId/emergency-boarding-override` | JSON `{ reason, verificationEvidence?, notes? }`. | Calls the emergency boarding override API. |
| `GET /corporate/safety/tracking-loss` | No query. | Reads route IDs with tracking loss. |
| `GET /corporate/safety/stops/:stopId/safe-drop-status` | Stop path ID. | Reads safe-drop status. |

## Support tickets

Backend reference: [Corporate support-ticket controller](../api/reference/endpoints/corporate-support-ticket-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /corporate/support/tickets` | Optional query: `tenantId`, `status`, `priority`, `category`, `search`, `from`, `to`, `limit`, `offset`. | Lists tickets visible to the caller. Omitting tenant ID is used by the support overview; server authorization still scopes the results. |
| `GET /corporate/support/tickets/:ticketId` | Ticket path ID. | Reads ticket detail. |
| `GET /corporate/support/tickets/summary` | No query. | Returns total/open/in-progress/resolved/closed counts for the authorized scope. |
| `POST /corporate/support/tickets` | JSON ticket fields `{ tenantId, employeeId?, category, priority?, subject, description, routeId? }`, or multipart with these fields and `attachments`; helper sends `Idempotency-Key`. | Creates a ticket; page validates supported image types and file count/size before upload. |
| `POST /corporate/support/tickets/:ticketId/replies` | Multipart form `message` and optional `attachments`. | Adds a reply to the ticket. |
| `GET /corporate/support/tickets/:ticketId/messages` | Ticket path ID. | Reads the conversation messages. |
| `POST /corporate/support/tickets/:ticketId/messages` | JSON `{ message }`. | Adds a message. |
| `POST /corporate/support/tickets/:ticketId/reopen` | JSON `{ reason? }` (or `{}`). | Reopens a ticket where backend state rules allow. |
| `PATCH /corporate/support/tickets/:ticketId/status` | JSON `{ status, notes? }`. | Changes supported ticket status. |
| `GET /corporate/support/tickets/:ticketId/activity` | Ticket path ID. | Reads ticket activity history. |

## Billing

Backend reference: [Corporate billing controller](../api/reference/endpoints/corporate-billing-controller.md) and [Corporate rate-card controller](../api/reference/endpoints/corporate-rate-card-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /corporate/billing/invoices` | Query `tenantId`, optional `status`, `page`, `limit`. | Lists tenant invoices. |
| `GET /corporate/billing/invoices/:invoiceId` | Invoice path ID. | Reads invoice detail and line items. |
| `GET /corporate/billing/invoices/:invoiceId/pdf` | Invoice path ID; binary response. | Downloads invoice PDF. |
| `POST /corporate/billing/invoices/:invoiceId/disputes` | JSON `{ reason, claimedAmountPaise, invoiceLineId? }`. | Raises a dispute for an invoice. UI input is rupees and is converted to integer paise. |
| `GET /corporate/billing/disputes` | Query `tenantId`, optional `status`, `invoiceId`. | Lists disputes. |
| `GET /corporate/billing/credit-notes` | Query `tenantId`, optional `invoiceId`. | Lists credit notes. |
| `GET /corporate/billing/rate-cards/corporate` | Query `tenantId`, optional `includeRetired`. | Reads corporate rate cards. |

## Notifications

Backend reference: [Notifications controller](../api/reference/endpoints/notifications-controller.md).

| Method and path | Request | Purpose and response |
|---|---|---|
| `GET /notifications/in-app` | Query `limit` (default 8 in helper) and `page` (default 1). | Returns notification items, unread count, and pagination information. |
| `PATCH /notifications/in-app/:notificationId/read` | Notification ID in path. | Marks one notification as read. |
| `PATCH /notifications/in-app/read-all` | No body. | Marks all visible notifications as read. |
| `DELETE /notifications/in-app/:notificationId` | Notification ID in path. | Deletes one notification. |
| `DELETE /notifications/in-app` | No body. | Clears all notifications in the authorized user's scope. |

## Response, validation, and error handling

- The frontend types are compile-time shapes, not a substitute for backend DTO validation or database constraints.
- The client unwraps the standard success/data envelope. For `204`, it returns `undefined`; binary requests use `apiDownload`.
- Network failures are surfaced as `ApiError(0, ...)`; non-success HTTP responses preserve the status and parsed error body. A 403 remains an authorization error.
- Eligible authenticated 401 responses attempt one refresh and replay. If refresh cannot produce a token, the client clears the session and redirects to `/login`.
- Browser-side checks improve usability, but tenant ownership, permission checks, state transitions, retention, monetary rules, and validation are server responsibilities.
- Controller pages in `apps/docs/docs/apps/api/reference/endpoints/` record declared controller inputs and direct service/persistence evidence. They are marked partial where a full runtime call graph or tested response contract is not established; read their evidence/status notes before treating declarations as verified runtime behavior.

## Backend controller, service, and data references

| API group | Controller and service implementation | Data/reference guide |
|---|---|---|
| Authentication | `apps/api/src/modules/auth/auth.controller.ts` and the auth service it delegates to. | [Auth controller reference](../api/reference/endpoints/auth-controller.md) |
| Tenant, organization, employee, and users | `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts`; `corporate-tenant.service.ts`, `corporate-org-structure.service.ts`, and `corporate-tenant-users.service.ts`. | [Tenant controller reference](../api/reference/endpoints/corporate-tenant-controller.md); [tenancy and organization dictionary](../api/data/dictionary/corporate-tenancy-and-organization.md) |
| Analytics and reports | `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts` and `corporate-analytics.service.ts`. | [Analytics controller reference](../api/reference/endpoints/corporate-analytics-controller.md); [routing/execution/safety dictionary](../api/data/dictionary/corporate-routing-execution-and-safety.md) |
| Roster ingest and lifecycle | `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts`, `roster-ingestion.service.ts`, and `roster-lifecycle.service.ts`. | [Roster controller reference](../api/reference/endpoints/corporate-roster-controller.md); [rosters and scheduling dictionary](../api/data/dictionary/corporate-rosters-and-scheduling.md) |
| Scheduling | `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts` and `corporate-shift-template.service.ts`. | [Scheduling controller reference](../api/reference/endpoints/corporate-scheduling-controller.md); [rosters and scheduling dictionary](../api/data/dictionary/corporate-rosters-and-scheduling.md) |
| Route list and directions | `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts`, `corporate-route-planner.service.ts`, and `corporate-route-directions.service.ts`. | [Routing controller reference](../api/reference/endpoints/corporate-routing-controller.md); [routing/execution/safety dictionary](../api/data/dictionary/corporate-routing-execution-and-safety.md) |
| Trip request and tracking | `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts` and `corporate-trip-execution.service.ts`; tracking reads are in `tracking/corporate-tracking.controller.ts` and `corporate-tracking.service.ts`. | [Trip execution reference](../api/reference/endpoints/corporate-trip-execution-controller.md); [tracking controller reference](../api/reference/endpoints/corporate-tracking-controller.md) |
| Safety | `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts` and `corporate-safety.service.ts`. | [Safety controller reference](../api/reference/endpoints/corporate-safety-controller.md); [routing/execution/safety dictionary](../api/data/dictionary/corporate-routing-execution-and-safety.md) |
| Support | `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts` and `corporate-support-ticket.service.ts`. | [Support controller reference](../api/reference/endpoints/corporate-support-ticket-controller.md); [support dictionary](../api/data/dictionary/corporate-support.md) |
| Billing and disputes | `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts`, `corporate-billing.service.ts`, and `corporate-invoice-dispute.service.ts`. | [Billing controller reference](../api/reference/endpoints/corporate-billing-controller.md); [billing and payouts dictionary](../api/data/dictionary/corporate-billing-and-payouts.md) |
| Corporate rate cards | `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts` and rate-card services. | [Rate-card controller reference](../api/reference/endpoints/corporate-rate-card-controller.md); [billing and payouts dictionary](../api/data/dictionary/corporate-billing-and-payouts.md) |
| Notifications | Notifications controller/service under `apps/api/src/modules/notifications/`. | [Notifications controller reference](../api/reference/endpoints/notifications-controller.md); [platform and communications dictionary](../api/data/dictionary/platform-and-communications.md) |

The cancellations page uses a thin `cancellationsApi` adapter in
`apps/corporate/src/lib/api/cancellations.ts`; it delegates to
`tripsApi.requests` with `status: "CANCELLED"` and does not introduce another
HTTP endpoint. Database models and relations are defined in
`apps/api/prisma/schema.prisma`; the linked dictionaries provide the
beginner-oriented business descriptions.

