---
title: Corporate portal troubleshooting
description: Source-grounded checks for common Corporate portal routes, session, API, and workflow issues.
---

# Corporate portal troubleshooting

Use this guide to distinguish a page/UI issue from an API, authorization, or
data-state issue. Start with the page's visible error and the corresponding
network request. Do not copy bearer tokens, refresh tokens, OTPs, or personal
employee information into tickets or logs.

## Fast diagnosis

1. Confirm the URL and intended page in the [route reference](./detailed-route-reference.md).
2. Confirm the user is signed in to the expected tenant and, if relevant, office.
3. Check the browser Network panel for the API request's method, path, status,
   and safe error message. Do not expose request authorization headers.
4. A 401 indicates session/refresh trouble; a 403 indicates that the API denied
   access. Neither should be interpreted as an empty result.
5. Match the request to the [Corporate API reference](./api-reference.md) and
   backend controller reference. Backend tenant and role guards are
   authoritative.
6. Retry only after verifying whether a write already succeeded. Some actions
   are idempotent, but not every operation is safe to repeat.

## Common symptoms

| Symptom | Likely explanation | What to check |
|---|---|---|
| Sign-in returns to `/login` or a page reloads after a 401 | Access token expired/revoked, refresh token missing/rejected, or API unreachable during refresh. | Confirm API reachability and auth response status. The shared client retries an eligible request once, then clears the session and redirects. Sign in again; do not repeatedly replay a write request without checking whether it committed. |
| A page loads but an action returns 403 | The current role/office/tenant scope does not have permission, or backend resource ownership does not match. | Confirm effective Corporate role and tenant/office context; check the controller permission declaration and backend guard. UI visibility alone does not grant access. |
| A page is empty without an error | The authorized tenant may have no records, a client-side filter may exclude records, or a component may represent a failed optional read as empty. | Clear local filters, verify tenant scope and the API response, and distinguish an empty `200` from failed requests. Billing pages may handle secondary reads separately; inspect their network results. |
| Dashboard says a report is incomplete or inconsistent | The trip report is truncated or its row/count totals do not reconcile. | The dashboard intentionally avoids presenting derived totals as complete when the report exceeds the page's accepted limit or is inconsistent. Narrow the date/office filters or use the backend report endpoint. |
| `/dashboard/exceptions` or `/dashboard/live-summary` shows the main dashboard | These routes redirect to `/dashboard`. The source live exception/overview pages are also redirected by `/live/layout.tsx`. | There is currently no reachable Corporate live exception page under `/live/**`; the parent layout redirect must be addressed before using those source pages. |
| `/rosters` opens shift templates | The root roster route is an intentional redirect to `/rosters/shifts`. | Use `/rosters/calendar` to browse saved rosters, `/rosters/import` to validate/upload, and `/rosters/approve` to review/publish. |
| Roster file validation succeeds but nothing appears in calendar | Validation is a dry run and does not persist the roster. | Submit the file using the draft upload action, then inspect the persisted records on the review/calendar page. |
| Roster publishing fails for a draft | Backend lifecycle requires `DRAFT -> APPROVED -> PUBLISHED`, but the current review page's visible action calls `publish`, not `approve`. | Confirm roster status through the roster detail endpoint. If still `DRAFT`, the current UI does not perform the required approval call. This is a documented implementation mismatch; do not mark it as successfully published. |
| Roster upload reports duplicate or holiday entries | Publishing applies idempotency and holiday rules. | Read the publish result counts (`requestsCreated`, `duplicatesSkipped`, `holidaySkipped`) and roster status; retries may return idempotent results. |
| `/safety/:id` shows the wrong/first incident or “No incident was selected” | Dynamic route aliases re-export a query-string-driven page and do not forward the path parameter. | Open `/safety/incidents/details?id=<incident-id>` or `/safety/incidents/resolve?id=<incident-id>`. Avoid exposing real IDs outside authorized support channels. |
| `/offices/:id` does not select the office | The details page uses the dynamic ID when present, then falls back to `?id=` or the first tenant office. The requested ID may not belong to the current tenant. | Confirm tenant scope and the office ID. The backend office read is tenant-scoped; `/offices/details?id=<office-id>` is also supported. |
| Route detail shows a directions/map error | Route detail can load route data and directions separately; directions may be unavailable or external map configuration may be missing. | Check route detail and directions requests separately, verify map configuration, and use the explicit refresh-traffic action only when needed. Route data and map tiles/directions are separate concerns. |
| Fleet/driver allocation page does not let me assign a driver | `/routes/allocation` is currently an inspection/summary page. | Use the designated route/dispatch operations workflow; do not treat the allocation report as a write interface. |
| Employee delete says deactivated rather than deleted | Historical references require retaining the employee record. | Read the delete response's `deleted`/`deactivated` fields and message; do not retry deletion to force a hard delete. |
| Cancellation is rejected though the button was available | The backend applies state and time eligibility rules; the client is not authoritative. | Check the request's current status and backend error. The Corporate helper documents the nine-hour cutoff; the platform-admin override is not part of this portal flow. |
| A dispute cannot be submitted | Invoice/reason/positive amount may be missing, user may lack `billing:write`, invoice may not belong to tenant, or backend validation may fail. | Verify invoice selection, reason, positive rupee value, conversion to paise, and permission. Read the API error; a visible button is not final authorization. |
| Support attachment is rejected | Client restricts attachments to images, maximum five files and 5 MB per file. | Confirm MIME type is JPEG/PNG/WEBP and each file is within the limit. The backend may apply additional constraints. |
| Support filter appears to change results only after load | `/support` loads a bounded list and filters that loaded page client-side; it also polls the list every 30 seconds. | Check how many records were returned and whether the filter is local. Do not assume filter state was sent as a server query. |
| Notification link does not navigate | The page only opens same-origin destinations on an explicit allowlist. | Confirm the notification has a valid `actionUrl`/`route` pointing to an allowed Corporate path. Unsafe or unsupported links are intentionally ignored. |
| A notification disappeared or counts changed after an action | Mark-read/delete/clear actions update server state and then local counts. | Check the specific mutation response and reload if needed. Clear-all is destructive and requires confirmation. |

## Safe browser evidence to collect

For a reproducible issue report, include:

- Corporate route pattern (mask real IDs if they identify a person or tenant).
- App build/commit and browser version.
- The action performed and expected versus actual result.
- HTTP method, endpoint path with sensitive query values removed, status code,
  timestamp, and safe response error message.
- Whether a reload or a second authorized account reproduces the issue.

Do not include cookies, authorization headers, access/refresh tokens, OTPs,
full request bodies containing employee data, or screenshots exposing
personal information.

## Implementation caveats confirmed in source

- Several compatibility routes are redirects or re-exports, not independent
  feature pages. Check their row in the [route reference](./detailed-route-reference.md).
- Safety dynamic aliases currently fail to forward route IDs to query-string-
  driven pages. Office details support both route and query IDs.
- Roster review/publish UI and the backend approval lifecycle are not aligned.
- `/routes/allocation` reads assignment state; it does not create assignments.
- Client-side permissions and validation are usability aids. The API remains
  responsible for enforcement and the final outcome.

