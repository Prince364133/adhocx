---
title: Corporate permissions and workflows
description: Corporate UI role capabilities, server authorization boundary, and reachable versus blocked workflows.
---

# Corporate permissions and workflows

**Evidence status:** The frontend role/permission mirror is verified against
`apps/corporate/src/lib/auth/permissions.ts`. API guards and services remain the
authorization authority. Current nested-layout redirects are included because
they prevent several page workflows from being reached.

## Corporate roles

| Role | Business responsibility | UI permission summary |
|---|---|---|
| `CORP_SUPER_ADMIN` | Tenant-wide administration. | All permissions in the client matrix. |
| `HR` | Employee and organizational administration. | Tenant read; office/employee/user reads; employee and department writes; zone, cost-center and policy reads; reports. |
| `TRANSPORT` | Transport and office operations. | Tenant/office/employee reads; office/employee and zone writes; department/zone/cost-center/policy reads; booking and report reads. |
| `FINANCE` | Tenant billing and cost administration. | Tenant/office/department/zone/policy reads; cost-center read/write; invoice read; billing write; reports. |
| `SAFETY` | Safety-related tenant and employee visibility. | Tenant/office/employee/zone/policy reads and reports. |
| `READ_ONLY` | Read-only access to the permission categories that expose a `:read` capability. | Tenant, office, employee, user, department, zone, cost-center, policy, invoice, booking, and report reads. |

Legacy role aliases in the UI are `CORPORATE_ADMIN` → `CORP_SUPER_ADMIN` and
`CORPORATE_MANAGER` → `TRANSPORT`. Unknown corporate role values fail closed
to `READ_ONLY`. The complete permission names and role sets are in
`src/lib/auth/permissions.ts`.

## What the UI permission check means

Pages use `useSession().can(...)` and, where useful, the `RequirePermission`
component to hide/disable actions or show a permission-required state. This is
for usability. It does **not** make a request safe by itself:

1. The frontend sends an API request with the current access token.
2. Corporate backend guards establish caller role, tenant scope, and resource
   access.
3. The service validates the requested business-state transition and data.
4. The API returns success or an explicit error (commonly 403 for denied
   access).

Do not grant access based on a sidebar item, a visible button, or the UI
permission mirror alone.

## Workflow availability

| Workflow | Source implementation | Current UI reachability |
|---|---|---|
| Sign-in and tenant/office context | Login, session provider, portal shell. | Reachable; login is rendered without the authenticated shell. |
| Tenant profile, offices, employees, settings | Root-level pages and tenant/employee APIs. | Reachable, subject to session/role and server authorization. |
| Route directory and route detail | `/routes`, `/routes/:id`, `/routes/details`. | Reachable; route detail reads route/directions data. |
| Billing and reports | Billing and report pages/APIs. | Reachable, subject to permissions and tenant records. |
| Support and employee support | Ticket list, create, reply/reopen and employee-support pages. | Reachable; backend ticket scope/status rules apply. |
| Booking queue, overview, approval/detail | Pages and trip request endpoints exist. | **Blocked:** `src/app/bookings/layout.tsx` redirects all `/bookings/**` URLs to `/dashboard`. |
| Roster shifts, import, review, calendar | Pages and roster/scheduling endpoints exist. | **Blocked:** `src/app/rosters/layout.tsx` redirects all `/rosters/**` URLs to `/dashboard`. The review page also calls `publish` rather than the separate `approve` helper. |
| Live routes, trips, exceptions, employees | Pages and route/tracking/analytics APIs exist. | **Blocked:** `src/app/live/layout.tsx` redirects all `/live/**` URLs to `/dashboard`. |
| Safety alerts, incident details/resolution, reports | Pages and safety APIs exist. | **Blocked:** `src/app/safety/layout.tsx` redirects all `/safety/**` URLs to `/dashboard`. Dynamic safety aliases also fail to pass their path ID to the query-based target. |

The route tables in the [exact inventory](./exact-route-inventory.md) identify
each source file and the runtime behavior. The [troubleshooting guide](./troubleshooting.md)
provides user-facing workarounds and checks.

## Business workflows, as implemented

### Employee administration

An authorized user searches the tenant employee directory, filters by office
or active state, and may create/update or change status when the page grants
`employees:write`. Delete may deactivate rather than physically remove an
employee when history must be retained. Successful changes trigger a list
reload; errors remain visible. Exact API payloads and controller links are
in the [API reference](./api-reference.md).

### Rosters and scheduling

Backend roster ingestion validates a spreadsheet and can store either a
published roster or a draft. The draft lifecycle uses distinct approval and
publish steps; publishing approved entries creates approved transport
requests, skips holiday lines, and avoids duplicates via idempotency hashes.
However, all roster pages are currently unreachable because of the parent
layout redirect. In addition, the source review page calls the publish helper
directly rather than the approval helper. Treat the UI and backend lifecycle
as partially aligned, not a fully functioning end-to-end portal workflow.

### Bookings

Backend request APIs list, review, cancel, or reschedule tenant requests.
Review sends a decision and optional notes; cancellation sends employee ID and
`action: "CANCEL"`. The server enforces status, tenant, permission, and
time-cutoff rules. Corporate booking pages are currently blocked by their
parent layout, so the endpoint capability must not be presented as a
currently reachable user workflow.

### Live route visibility

Route detail reads route/stop/assignment data and directions. Live source
pages query in-transit routes and periodically refresh tracking. This is
read-oriented from the Corporate pages documented here: a route allocation
summary is not an assignment editor, and map rendering does not imply the
Corporate page writes GPS telemetry. Live page routes are currently blocked
by their parent layout.

### Safety

The backend exposes SOS and incident list/detail/lifecycle operations. The
source resolution form requires an incident ID, a category, and closure notes;
it submits reason, resolution notes, and false-positive flag. Safety pages are
currently blocked by the parent layout, and their dynamic aliases do not
forward IDs.

### Support and billing

Support tickets can be created with optional attachments, replied to, read,
reopened, or status-updated where the page exposes those actions. Billing
users with `billing:write` can raise invoice disputes with a positive amount;
the UI converts rupees into paise and the backend validates invoice scope and
dispute rules. Both workflows are currently reachable through the separate
support/billing route trees.

## References

- [Corporate application architecture](./architecture.md)
- [Corporate route-by-route reference](./detailed-route-reference.md)
- [Corporate frontend API reference](./api-reference.md)
- [Corporate end-to-end workflows](./workflow-reference.md)
- [Corporate portal troubleshooting](./troubleshooting.md)
- API controller evidence under `apps/docs/docs/apps/api/reference/endpoints/`

