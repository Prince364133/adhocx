---
title: Ops Live Operations Runbook
description: Source-derived guide to monitoring live routes, fleet freshness, dispatch and support in Ops.
---

# Ops Live Operations Runbook

This is a guide to the operational actions and feedback currently exposed by
the Ops application. It documents the software workflow, not an organizational
incident policy: escalation contacts, response ownership and procedures
outside the application are not defined by the inspected UI source.

## 1. Enter the operations workspace

1. Sign in at `/login` with an Ops account.
2. The Ops shell requires a stored token and a stored `OPS` or `ADMIN` role.
   The shell check is client-side; API guards remain responsible for actual
   authorization.
3. Use the company hub or a page's own selector to choose a corporate tenant
   when the page requires one. The shell automatically chooses the first
   available tenant only for the migrated `/live`, `/routes` and `/safety`
   route families when none is already selected.
4. Confirm the selected tenant and date/shift filters before interpreting
   route counts or taking an action. A browser-side filter does not grant
   access to another tenant.

## 2. Choose the appropriate operations view

| Need | Use | What the page provides |
|---|---|---|
| Current-day, cross-client status | `/dashboard` | Route counts, active-trip and passenger metrics, active exceptions and tenant summaries; refresh is manual. |
| Paginated live operations and recent trends | `/live` | Operational summary with paged routes; refreshes every 15 seconds while visible and supports manual refresh. |
| Prioritized active problems | `/dashboard/exceptions` | SOS, at-risk/unassigned routes, stale GPS and selected-tenant exception-feed items; refreshes every 15 seconds while the tab is visible. |
| Vehicle position stream | `/map` | Last-known position snapshot followed by live fix events; tenant filter scopes the map. |
| Single route's stops and action eligibility | `/routes/:id` | Route manifest, driver/vehicle, stop states, route actions and directions. |
| Current SOS lifecycle | `/safety/cockpit` | Active and terminal alerts with acknowledge, investigate, resolve and escalate actions; refreshes every six seconds while visible. |
| Assigned Ops ticket | `/support` | Shared ticket queue and details; refreshes every 30 seconds. |

`/live/trips`, `/live/trips/:id`, `/live/exceptions` and
`/live/employees` are legacy redirects. Use `/live`, `/dashboard/exceptions`
and `/employees` respectively; the redirect paths do not have their own
operational data requests.

## 3. Interpret live location and freshness

The map first asks for the latest known position from
`GET /corporate/trips/routes/fleet/live`. It then obtains a short-lived
single-use stream ticket and opens an `EventSource` for new fixes. The access
token is not placed in the stream URL. A vehicle is only plotted from
reported fixes; the UI does not estimate a missing location.

When a position appears old or absent:

1. Check the tenant filter and whether the selected client is the one expected.
2. Read the freshness/age state returned with the position. A stale or absent
   fix means there is no sufficiently recent report in this view; it does not
   establish that the vehicle has stopped.
3. Use the page's connection state and refresh behavior to distinguish a
   stream reconnect from a fresh fix.
4. If the view reports no data, remember that the initial snapshot read is
   caught so stream setup can continue. A functioning stream does not prove
   the snapshot request succeeded.
5. If a location problem is tied to a route or passenger, inspect that route
   and its stop/driver context. The source does not define an additional
   out-of-band escalation procedure.

On `/dashboard/exceptions`, stale GPS rows are built from the operations
board's stale-GPS list, and routes can also appear as at-risk or unassigned.
SOS rows come from the alert endpoint. The page catches some SOS and
analytics-feed read failures as empty lists, so use visible errors and
independent views before concluding that there are no exceptions.

## 4. Review and act on a route

1. Open `/routes`, select the intended tenant, and narrow by shift date,
   direction, route status, dispatch status or search text.
2. Inspect a route drawer or open `/routes/:id`. Confirm route ID, status,
   tenant, stops, passengers and driver/vehicle before making a change.
3. Use the action that matches the actual issue:
   - **Retry dispatch** calls the dispatch start-now action. The response can
     report `OFFERED`, `NO_DRIVERS_FOUND`, `ALL_DRIVERS_BUSY` or
     `ALREADY_ASSIGNED`; an attempt does not guarantee a driver accepted.
   - **Reassign** is available in the UI for `ASSIGNED` routes. Provide a
     reason and optionally a target driver. Leaving the driver blank asks the
     dispatch flow to find a replacement. The final candidate and state
     transition are server-controlled.
   - **Cancel** requires a reason. The UI only offers cancellation for
     `PLANNED`, `DISPATCHING` or `ASSIGNED` routes.
   - **Edit route / stops** is offered only for the same planned,
     dispatching or assigned states. The server validates the mutation.
   - **Delete** is limited in the client to `PLANNED` or `DISPATCHING`
     routes without a driver. It is not a substitute for cancelling an
     assigned route.
4. Wait for the API response. On success, the page reloads route data; on
   failure, it displays an error. A server rejection can occur if the route
   changed after the page loaded.

For passenger stop work, the route manifest shows pending or arrived
passenger stops. Manual OTP verification submits the code to trip execution;
mark-no-show submits an operational reason. Office hub stops do not expose
these passenger actions. The backend performs the state transition and
records it; the browser does not directly mark a passenger boarded or absent.

## 5. Plan routes

The planner exposes two distinct workflows: uploaded-roster planning and
direct manual-route creation.

1. Choose a corporate tenant and office. The page loads office details and
   tenant policy values, including the default stop dwell when available.
2. Select shift date/time, direction and vehicle/routing options.
3. For an uploaded roster, submit the file to the route-planning service.
   Watch its progress, review proposed routes/counts/warnings/exclusions, and
   explicitly commit the reviewed plan. Optimization alone does not save the
   proposal. The plan can also be exported or a sample template downloaded.
4. For direct manual creation, enter one or more employee stops and submit
   the manual-route form. This calls the route-creation endpoint directly;
   it is not a candidate plan waiting for the roster commit action.

Manual stops require name, phone and address. The phone must pass the page's
Indian mobile-number validation. The backend remains responsible for complete
business validation and data persistence.

The streamed roster request allows a maximum of 30 minutes overall, a
2-minute initial response and 90 seconds without progress. If a timeout
occurs, the page reports it rather than treating an incomplete plan as
success.

## 6. Work the Ops support queue

The support page shows tickets assigned to Ops or an individual Ops account.
Use ticket number/title search and status filter, then inspect the ticket's
tenant, category, priority, description, attachments and activity history.

- A progress update is submitted as a ticket update and is marked by the UI
  as internal to Admin/OPS.
- Status choices include `IN_PROGRESS`, `WAITING_FOR_CORPORATE` and
  `RESOLVED`; `ASSIGNED` remains available for a ticket already in that
  state.
- The UI requires non-empty resolution notes before saving `RESOLVED`.
- Ticket text fields are limited to 1,000 characters in the browser; the API
  also validates requests.
- After a successful mutation, the page reloads the detail and queue. Failures
  are shown as notices rather than treated as success.

## 7. Diagnose request and display errors

Ops requests use `apps/ops/src/lib/api/opsClient.ts`. It attaches a bearer
token, unwraps the API response envelope and attempts token refresh for
eligible `401` responses. If refresh fails, the local session is cleared and
the user is redirected to login. A `403` is not a signal to silently log out;
it indicates that the API denied the requested access.

For an empty or stale-looking view, check the page's own error message and
refresh, then confirm filters and tenant scope. Some pages have deliberately
limited empty-list fallbacks for secondary requests, described in the
[route-by-route reference](./route-by-route-reference.md). Do not report a
read failure as a confirmed zero count.

## Source and backend references

- [Ops route-by-route reference](./route-by-route-reference.md) — route,
  request, service and data map.
- [Corporate service guide](../api/corporate-module-services.md) — route
  planning, dispatch, trip execution, tracking and scheduled work.
- [Corporate tracking controller](../api/reference/endpoints/corporate-tracking-controller.md)
- [Corporate routing controller](../api/reference/endpoints/corporate-routing-controller.md)
- [Corporate dispatch controller](../api/reference/endpoints/corporate-dispatch-controller.md)
- [Corporate operations controller](../api/reference/endpoints/corporate-operations-controller.md)
- [Ops support-ticket controller](../api/reference/endpoints/ops-support-ticket-controller.md)
