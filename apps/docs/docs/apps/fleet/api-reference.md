---
title: API contract reference
description: Complete REST API v1 contract specification for AdhocX Fleet Portal and driver-side Fleet Code integration.
last_reviewed: "2026-11-27"
---

# API contract reference

All Fleet Portal endpoints are served by the centralized backend (`apps/api`) via `FleetDomainModule` under `/api/v1/fleet` (Swagger UI at `/docs`). Every endpoint except `/auth/login` requires `Authorization: Bearer <jwt>` and passes through `FleetAuthGuard`.

All DTO definitions reside in `packages/contracts/src/dtos/fleet-portal/`.

## 1. Authentication & Fleet Code

| Method | Path | Purpose | Role Scope | Contract DTO |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/fleet/auth/login` | Authenticate Fleet Admin/Manager | Public | `FleetLoginDto` -> `FleetAuthResponseDto` |
| `GET` | `/api/v1/fleet/auth/me` | Get active fleet user, role & permissions | Owner, Manager | `FleetAuthUserDto` |
| `POST` | `/api/v1/fleet/auth/logout` | Terminate session & log audit event | Owner, Manager | `{ success: true }` |
| `GET` | `/api/v1/fleet/code` | Retrieve Fleet Code & status | Owner, Manager | `{ code, codeStatus, codeRotatedAt }` |
| `POST` | `/api/v1/fleet/code/regenerate` | Rotate Fleet Code (`FLT-XXXXXX`) | Owner only | `{ code, codeRotatedAt }` |
| `PATCH` | `/api/v1/fleet/code/status` | Enable/disable new associations | Owner only | `UpdateFleetCodeStatusDto` |

### Driver-Side Fleet Integration (`apps/api`)

| Method | Path | Purpose | Role Scope | Contract DTO |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/drivers/fleet-code/validate` | Validate Fleet Code & link existing/new driver (enforces one-fleet rule) | Driver Auth | `ValidateFleetCodeDto` |
| `GET` | `/api/v1/drivers/me/incentives` | View active fleet incentives & progress (earnings redacted) | Driver Auth | `FleetIncentiveDto[]` |

## 2. Dashboard, Drivers & Live Operations

| Method | Path | Purpose | Role Scope | Contract DTO |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/fleet/dashboard` | Fleet header, KPIs, 1 activity series, status breakdown, recent activity | Owner, Manager | `FleetDashboardQueryDto` -> `FleetDashboardResponseDto` |
| `GET` | `/api/v1/fleet/drivers` | Paginated fleet driver list + 1:1 assigned vehicle | Owner, Manager | `FleetPortalDriverQueryDto` -> `FleetDriverSummaryDto[]` |
| `GET` | `/api/v1/fleet/drivers/:driverId` | Driver profile, 1:1 vehicle, trip history, monthly earnings, payouts | Owner, Manager | `FleetDriverDetailDto` |
| `PATCH` | `/api/v1/fleet/drivers/:driverId/vehicle` | Reassign or update 1:1 assigned vehicle | Owner only | `ReassignFleetVehicleDto` |
| `POST` | `/api/v1/fleet/drivers/:driverId/remove` | Remove driver from fleet & free vehicle | Owner only | `{ notes?: string }` |
| `GET` | `/api/v1/fleet/live-operations` | Active drivers/rides + `lastRefreshedAt` timestamp | Owner, Manager | `FleetLiveOpsQueryDto` -> `FleetLiveOpsResponseDto` |

## 3. Earnings, Payouts, Shortfall & Incentives

| Method | Path | Purpose | Role Scope | Contract DTO |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/fleet/earnings` | Fleet summary, monthly breakdown & driver-wise earnings | Owner (or permitted Manager) | `FleetEarningsQueryDto` -> `FleetEarningsResponseDto` |
| `GET` | `/api/v1/fleet/earnings/export` | Export fleet earnings statement CSV | Owner | `FleetEarningsQueryDto` |
| `GET` | `/api/v1/fleet/payouts` | Paginated payout history & statuses | Owner | `FleetPayoutQueryDto` -> `FleetPayoutRecordDto[]` |
| `POST` | `/api/v1/fleet/payouts` | Submit payout request | Owner only | `RequestFleetPayoutDto` -> `FleetPayoutRecordDto` |
| `GET` | `/api/v1/fleet/shortfall-claims` | List minimum-trip shortfall records | Owner | `FleetShortfallRecordDto[]` |
| `GET` | `/api/v1/fleet/incentives` | List target-based & time-based incentives | Owner, Manager | `FleetIncentiveDto[]` |
| `POST` | `/api/v1/fleet/incentives` | Create incentive | Owner only | `CreateFleetIncentiveDto` |
| `PATCH` | `/api/v1/fleet/incentives/:id` | Edit / activate / pause / end incentive | Owner only | `UpdateFleetIncentiveDto` |
| `GET` | `/api/v1/fleet/incentives/:id/progress` | Driver-wise participation & completion status | Owner, Manager | `FleetIncentiveProgressDto[]` |

## 4. Support, Notifications & Optional Shifts

| Method | Path | Purpose | Role Scope | Contract DTO |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/fleet/support/tickets` | Paginated fleet support tickets | Owner, Manager | `FleetSupportTicketQueryDto` -> `FleetSupportTicketDto[]` |
| `POST` | `/api/v1/fleet/support/tickets` | Create ticket with optional attachment keys | Owner, Manager | `CreateFleetSupportTicketDto` |
| `POST` | `/api/v1/fleet/support/attachments/presign` | Presigned R2 upload URL or multipart fallback info | Owner, Manager | `PresignFleetSupportAttachmentDto` |
| `POST` | `/api/v1/fleet/support/attachments/upload` | Direct sanitized multipart attachment upload fallback | Owner, Manager | `FleetSupportAttachmentLinkDto` |
| `GET` | `/api/v1/fleet/support/tickets/:id` | Ticket detail + chronological message thread | Owner, Manager | `FleetSupportTicketDetailDto` |
| `POST` | `/api/v1/fleet/support/tickets/:id/messages` | Reply / reopen resolved or closed ticket | Owner, Manager | `ReplyFleetSupportTicketDto` |
| `GET` | `/api/v1/fleet/notifications` | Paginated fleet notifications + unread count | Owner, Manager | `FleetNotificationQueryDto` -> `FleetNotificationDto[]` |
| `PATCH` | `/api/v1/fleet/notifications/:id/read` | Mark single notification read | Owner, Manager | `FleetNotificationDto` |
| `POST` | `/api/v1/fleet/notifications/read-all` | Mark all fleet notifications read | Owner, Manager | `{ updatedCount }` |
| `POST` | `/api/v1/fleet/notifications/announcements` | Publish `FLEET_ANNOUNCEMENT` notification | Owner only | `CreateFleetAnnouncementDto` |
| `GET/POST/PATCH` | `/api/v1/fleet/shifts` | Optional Shift & Ride Management (`ENABLE_FLEET_SHIFTS=true`) | Owner, Manager | `CreateFleetShiftDto` / `UpdateFleetShiftDto` |

## 5. Admin Fleet Operations (`apps/admin` -> `apps/api`)

Served by `FleetController` and `FleetAdminOperationsController` (`JwtAuthGuard` + `RolesGuard`, restricted to `ADMIN` / `OPS`). DTOs reside in `packages/contracts/src/dtos/fleet.dto.ts`.

| Method | Path | Purpose | Contract DTO |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/fleets` | Create fleet (optional `portalPassword` atomically provisions initial `FLEET_OWNER`) | `CreateFleetDto` |
| `GET` | `/api/v1/admin/fleets/:fleetId/users` | List Fleet Portal accounts (redacting `passwordHash`) | `FleetAdminUser[]` |
| `POST` | `/api/v1/admin/fleets/:fleetId/users` | Provision `FLEET_OWNER` or `FLEET_MANAGER` portal login | `CreateFleetAdminUserDto` |
| `PATCH` | `/api/v1/admin/fleets/:fleetId/users/:userId` | Toggle active status, update role/name, or reset portal password | `UpdateFleetAdminUserDto` |
| `GET` | `/api/v1/admin/fleets/payouts` | List Fleet Owner payout requests with summary metrics | `AdminFleetPayoutQueryDto` |
| `PATCH` | `/api/v1/admin/fleets/payouts/:payoutId` | Transition payout (`REQUESTED -> UNDER_REVIEW -> APPROVED -> SETTLED` or `REJECTED` with reason) + notify fleet | `ProcessFleetPayoutDto` |
| `GET` | `/api/v1/admin/fleets/:fleetId/shortfalls` | List minimum-trip guarantee shortfall records for a fleet | — |
| `POST` | `/api/v1/admin/fleets/:fleetId/shortfalls` | Record shortfall claim (`shortfallTrips` computed cleanly) + notify fleet | `CreateFleetShortfallDto` |
| `GET` | `/api/v1/admin/fleets/support/tickets` | List Fleet Portal support tickets & queue metrics | `AdminFleetSupportQueryDto` |
| `GET` | `/api/v1/admin/fleets/support/tickets/:ticketId` | Get ticket conversation & signed attachment URLs | — |
| `POST` | `/api/v1/admin/fleets/support/tickets/:ticketId/reply` | Post Admin support reply + notify fleet (blocked when `CLOSED`) | `AdminReplyFleetSupportDto` |
| `PATCH` | `/api/v1/admin/fleets/support/tickets/:ticketId/status` | Update ticket status with optional note + notify fleet | `AdminUpdateFleetSupportStatusDto` |

## 6. Standard Error Envelope

```json
{
  "statusCode": 409,
  "errorCode": "ALREADY_IN_FLEET",
  "message": "Driver is already associated with another active fleet.",
  "timestamp": "2026-11-27T11:25:00.000Z",
  "path": "/api/v1/drivers/fleet-code/validate"
}
```
