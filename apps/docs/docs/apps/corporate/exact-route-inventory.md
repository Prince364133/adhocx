---
title: Corporate exact route inventory
description: Source-derived inventory of all 65 Corporate page files, their runtime route behavior, and primary API areas.
---

# Corporate exact route inventory

**Coverage:** The 65 rows below correspond to the 65 `page.tsx` files found
under `apps/corporate/src/app/`. A page file does not guarantee a reachable
URL: the parent layouts for `/live`, `/bookings`, `/rosters`, and `/safety`
currently redirect to `/dashboard`, blocking every child page in those
segments. The purpose, component, API and backend details are in the
[route-by-route reference](./detailed-route-reference.md); exact HTTP
signatures are in the [frontend API reference](./api-reference.md).

| Route pattern | Runtime result and page purpose | Primary API area | Source file |
|---|---|---|---|
| `/billing/details` | Invoice detail/download; accepts selected ID or falls back to latest invoice. | `billingApi.invoice`, `billingApi.invoices`, `billingApi.downloadPdf` | `apps/corporate/src/app/billing/details/page.tsx` |
| `/billing/disputes` | Billing dispute list and form; requires invoice, reason, positive amount, and `billing:write`. | `billingApi.disputes`, `invoices`, `raiseDispute` | `apps/corporate/src/app/billing/disputes/page.tsx` |
| `/billing/invoices/:id` | Re-exports invoice details; dynamic ID supported by shared page. | Invoice detail and PDF helpers | `apps/corporate/src/app/billing/invoices/[id]/page.tsx` |
| `/billing/invoices` | Tenant invoice register and PDF downloads. | `billingApi.invoices`, `downloadPdf` | `apps/corporate/src/app/billing/invoices/page.tsx` |
| `/billing` | Billing overview from tenant invoices and disputes. | `billingApi.invoices`, `disputes` | `apps/corporate/src/app/billing/page.tsx` |
| `/bookings/:id` | **Blocked by bookings layout.** Source re-exports booking detail and cancel workflow. | `tripsApi.requests`, `rescheduleOrCancel` | `apps/corporate/src/app/bookings/[id]/page.tsx` |
| `/bookings/approvals` | **Blocked by bookings layout.** Source request review queue with approve/reject actions. | `tripsApi.requests`, `reviewRequest` | `apps/corporate/src/app/bookings/approvals/page.tsx` |
| `/bookings/details` | **Blocked by bookings layout.** Source booking detail selected by ID; cancellation where eligible. | `tripsApi.requests`, `rescheduleOrCancel` | `apps/corporate/src/app/bookings/details/page.tsx` |
| `/bookings/overview` | **Blocked by bookings layout.** Source booking totals and status chart. | `analyticsApi.dashboard` | `apps/corporate/src/app/bookings/overview/page.tsx` |
| `/bookings` | **Blocked by bookings layout.** Source tenant booking/request queue. | `tripsApi.requests`, tenant office reads | `apps/corporate/src/app/bookings/page.tsx` |
| `/cancellations` | Cancelled request history with local search and pagination. | `tripsApi.requests` filtered to cancelled | `apps/corporate/src/app/cancellations/page.tsx` |
| `/company-profile` | Tenant profile, legal details, office/department/zone, and user access administration. | `tenantApi`, `usersApi` | `apps/corporate/src/app/company-profile/page.tsx` |
| `/dashboard/analytics` | Recent-period transport and trip analytics; checks report completeness. | `analyticsApi.dashboard`, `analyticsApi.tripsReport` | `apps/corporate/src/app/dashboard/analytics/page.tsx` |
| `/dashboard/exceptions` | Redirects to `/dashboard`; not an independent exception view. | None | `apps/corporate/src/app/dashboard/exceptions/page.tsx` |
| `/dashboard/live-summary` | Redirects to `/dashboard`; not an independent live page. | None | `apps/corporate/src/app/dashboard/live-summary/page.tsx` |
| `/dashboard` | Tenant business/transport overview from analytics, trip report, and tenant data. | `analyticsApi.dashboard`, `analyticsApi.tripsReport`, `tenantApi.get` | `apps/corporate/src/app/dashboard/page.tsx` |
| `/employee-support` | Employee support case list/detail, messaging, and supported status updates. | `supportApi`, employee context | `apps/corporate/src/app/employee-support/page.tsx` |
| `/employees` | Searchable/paginated employee directory with create, edit, status, and delete/deactivate actions. | `employeeApi.list/create/update/delete` | `apps/corporate/src/app/employees/page.tsx` and `EmployeeDirectory.tsx` |
| `/help` | Static help content and navigation guidance. | None | `apps/corporate/src/app/help/page.tsx` |
| `/live/employees` | **Blocked by live layout.** Source employee list associated with in-transit route/tracking context. | `employeeApi`, `routesApi`, tracking helpers | `apps/corporate/src/app/live/employees/page.tsx` |
| `/live/exceptions` | **Blocked by live layout.** Source exception list/search and map/list presentation. | `analyticsApi.exceptions` | `apps/corporate/src/app/live/exceptions/page.tsx` |
| `/live` | **Blocked by live layout.** Source live route overview with periodic tracking refresh. | `routesApi`, `analyticsApi`, tracking helpers | `apps/corporate/src/app/live/page.tsx` |
| `/live/trips/:id` | **Blocked by live layout.** Re-exports live trip board and selected-route implementation. | Route list and tracking helpers | `apps/corporate/src/app/live/trips/[id]/page.tsx` |
| `/live/trips` | **Blocked by live layout.** Source in-transit trip board, map, and tracking. | `routesApi`, tracking helpers | `apps/corporate/src/app/live/trips/page.tsx` |
| `/login` | Password/OTP sign-in for existing corporate accounts. | `authApi` | `apps/corporate/src/app/login/page.tsx` |
| `/notifications` | Paginated notifications; local filters, read/unread, mark-read, delete, clear, and safe navigation. | `notificationsApi` | `apps/corporate/src/app/notifications/page.tsx` |
| `/offices/:id` | Re-exports office details; shared page supports the dynamic path ID or `?id=` and loads the office geofence. | Tenant office/geofence reads | `apps/corporate/src/app/offices/[id]/page.tsx` |
| `/offices/cost-centers` | Read-only tenant cost-center directory. | `tenantApi.costCenters` | `apps/corporate/src/app/offices/cost-centers/page.tsx` |
| `/offices/details` | Office detail/geofence view selected by query ID. | Tenant offices and geofences | `apps/corporate/src/app/offices/details/page.tsx` |
| `/offices/geofences` | Read-only geofence overview across tenant offices. | Tenant office/geofence reads | `apps/corporate/src/app/offices/geofences/page.tsx` |
| `/offices` | Office directory with client-side search/status filter and create form. | `tenantApi.offices`, `createOffice` | `apps/corporate/src/app/offices/page.tsx` |
| `/` | Redirects to `/dashboard`. | None | `apps/corporate/src/app/page.tsx` |
| `/reports/costs` | Invoice/cost-center cost grouping and summary. | `billingApi.invoices`, tenant cost centers | `apps/corporate/src/app/reports/costs/page.tsx` |
| `/reports/fleet` | Fleet/route metrics and supported export. | Routes and analytics/report helpers | `apps/corporate/src/app/reports/fleet/page.tsx` |
| `/reports` | General tenant transport reports and CSV export. | `analyticsApi`, `tripsApi` | `apps/corporate/src/app/reports/page.tsx` |
| `/reports/performance` | Re-exports the general reports page; no separate performance implementation. | Same as `/reports` | `apps/corporate/src/app/reports/performance/page.tsx` |
| `/reports/usage` | Employee and attendance usage report/export. | `employeeApi`, attendance analytics | `apps/corporate/src/app/reports/usage/page.tsx` |
| `/rosters/approve` | **Blocked by rosters layout.** Source review page publishes selected rosters; it does not call `rosterApi.approve`. | `rosterApi.get`, `publish` | `apps/corporate/src/app/rosters/approve/page.tsx` |
| `/rosters/calendar` | **Blocked by rosters layout.** Source saved-roster list with local office/search filters. | `rosterApi.list` | `apps/corporate/src/app/rosters/calendar/page.tsx` |
| `/rosters/import` | **Blocked by rosters layout.** Source template, file validation, and draft upload form. | `rosterApi.downloadTemplate`, `validate`, `upload` | `apps/corporate/src/app/rosters/import/page.tsx` |
| `/rosters` | **Blocked by rosters layout.** Child page would redirect to `/rosters/shifts` if layout redirect were removed. | None | `apps/corporate/src/app/rosters/page.tsx` |
| `/rosters/shifts` | **Blocked by rosters layout.** Source lists and creates shift templates. | `schedulingApi.shiftTemplates`, `createShiftTemplate` | `apps/corporate/src/app/rosters/shifts/page.tsx` |
| `/routes/:id` | Route dossier from dynamic ID, with directions, stops, and route map. | `routesApi.get`, `directions` | `apps/corporate/src/app/routes/[id]/page.tsx` |
| `/routes/active` | In-transit route list and refresh. | `routesApi.list` with active status | `apps/corporate/src/app/routes/active/page.tsx` |
| `/routes/allocation` | Read-only route/vehicle/driver assignment counts and local filters; no assignment mutation. | `routesApi.list` | `apps/corporate/src/app/routes/allocation/page.tsx` |
| `/routes/details` | Route dossier selected from `?id=`. | `routesApi.get`, `directions` | `apps/corporate/src/app/routes/details/page.tsx` |
| `/routes` | Tenant route directory with detail navigation. | `routesApi.list` | `apps/corporate/src/app/routes/page.tsx` |
| `/routes-list` | Redirects to `/routes`. | None | `apps/corporate/src/app/routes-list/page.tsx` |
| `/safety/:id` | **Blocked by safety layout.** Re-exports query-ID incident dossier and does not forward path ID. | `safetyApi.incident`, `incidents` | `apps/corporate/src/app/safety/[id]/page.tsx` |
| `/safety/:id/resolve` | **Blocked by safety layout.** Re-exports query-ID resolution page; path ID is not forwarded. | `safetyApi.incident`, `resolveIncident` | `apps/corporate/src/app/safety/[id]/resolve/page.tsx` |
| `/safety/incidents/:id` | **Blocked by safety layout.** Re-exports query-ID dossier; path ID is not forwarded. | `safetyApi.incident`, `incidents` | `apps/corporate/src/app/safety/incidents/[id]/page.tsx` |
| `/safety/incidents/:id/resolve` | **Blocked by safety layout.** Re-exports query-ID resolution page; path ID is not forwarded. | `safetyApi.incident`, `resolveIncident` | `apps/corporate/src/app/safety/incidents/[id]/resolve/page.tsx` |
| `/safety/incidents/details` | **Blocked by safety layout.** Source dossier reads `?id=` or falls back to first listed incident. | `safetyApi.incident`, `incidents` | `apps/corporate/src/app/safety/incidents/details/page.tsx` |
| `/safety/incidents/resolve` | **Blocked by safety layout.** Source form requires category/notes and resolves selected incident. | `safetyApi.incident`, `resolveIncident` | `apps/corporate/src/app/safety/incidents/resolve/page.tsx` |
| `/safety` | **Blocked by safety layout.** Source tenant SOS/incident overview and local incident filters. | `safetyApi.alerts`, `incidents` | `apps/corporate/src/app/safety/page.tsx` |
| `/safety/reports` | **Blocked by safety layout.** Source status, office, and seven-day SOS alert report. | `safetyApi.alerts` | `apps/corporate/src/app/safety/reports/page.tsx` |
| `/settings/health` | Integration status/health view; reads tenant integration data. | `tenantApi.integrations` | `apps/corporate/src/app/settings/health/page.tsx` |
| `/settings/hrms` | Re-exports the settings page; no distinct HRMS API flow. | `tenantApi.integrations` | `apps/corporate/src/app/settings/hrms/page.tsx` |
| `/settings/mapping` | Mapping/integration configuration presentation; no write operation in this page. | `tenantApi.integrations` | `apps/corporate/src/app/settings/mapping/page.tsx` |
| `/settings` | Integration settings/status page. | `tenantApi.integrations` | `apps/corporate/src/app/settings/page.tsx` |
| `/support` | Ticket list, summary, create, reply/reopen; list refreshes periodically. | `supportApi`, employee list for non-employees | `apps/corporate/src/app/support/page.tsx` |
| `/support/sla` | Redirects to `/support`; no separate SLA implementation. | None | `apps/corporate/src/app/support/sla/page.tsx` |
| `/support/tickets/:id` | Re-exports ticket details; shared page supports route/query ID, messages, reply, and reopen. | `supportApi` | `apps/corporate/src/app/support/tickets/[id]/page.tsx` |
| `/support/tickets/details` | Ticket detail/conversation page. | `supportApi.get`, `listMessages`, `sendMessage`, `reopen` | `apps/corporate/src/app/support/tickets/details/page.tsx` |
| `/support/tickets` | Tenant ticket list and create workflow. | `supportApi.list`, `create` | `apps/corporate/src/app/support/tickets/page.tsx` |

## Route tree behavior

The root `src/app/layout.tsx` wraps routes in `PortalShell`. The following
nested layouts currently override their child pages and redirect:

| Layout source | Effect |
|---|---|
| `src/app/live/layout.tsx` | Redirects every `/live/**` page to `/dashboard`. |
| `src/app/bookings/layout.tsx` | Redirects every `/bookings/**` page to `/dashboard`. |
| `src/app/rosters/layout.tsx` | Redirects every `/rosters/**` page to `/dashboard`. |
| `src/app/safety/layout.tsx` | Redirects every `/safety/**` page to `/dashboard`. |

Other nested layouts wrap children or add section navigation. See the
[architecture page](./architecture.md) and
[troubleshooting guide](./troubleshooting.md) for impact and diagnosis.

