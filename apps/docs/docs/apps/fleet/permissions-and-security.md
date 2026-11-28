---
title: Permissions and security
description: Role-based access matrix, server-side fleet isolation, driver earnings redaction, and audit logging rules for AdhocX Fleet.
last_reviewed: "2026-11-27"
---

# Permissions and security

## 1. Role Matrix

| Capability | AdhocX Team (`apps/admin`) | Fleet Owner (`FLEET_OWNER`) | Fleet Manager (`FLEET_MANAGER`) | Fleet Driver (`DRIVER`) |
| :--- | :---: | :---: | :---: | :---: |
| Provision Fleet & Credentials | Yes | No | No | No |
| View & Copy Fleet Code | Yes | Yes | Yes | No (Enters at onboarding) |
| Regenerate / Disable Fleet Code | Yes | Yes | No (unless delegated) | No |
| View Fleet Drivers & 1:1 Vehicles | Yes | Yes (own fleet) | Yes (own fleet) | Own profile only |
| Reassign Vehicle / Remove Driver | Yes | Yes (own fleet) | Permission-gated | No |
| View Live Operations | Yes | Yes (own fleet) | Yes (own fleet) | Own active trip |
| View Driver-Wise / Per-Trip Earnings | Yes | Yes (own fleet) | Permission-gated | **Strictly Blocked** |
| Request Fleet Payout | No | Yes | No | No |
| Create / Pause Driver Incentives | No | Yes | Permission-gated | View & progress only |
| Create / Reply Support Tickets | Responds | Yes (own fleet) | Yes (own fleet) | Driver support only |

## 2. Mandatory Security Controls

1. **Server-Side Fleet Isolation**: `FleetAuthGuard` extracts `fleetId` exclusively from the signed JWT / `FleetAdminUser` record. Every Prisma query filters with `where: { fleetId: req.fleetContext.fleetId }`. Accessing a resource belonging to another fleet returns `404` or `403`.
2. **Fleet Code Is Not Authentication**: Validating a Fleet Code associates `Driver.fleetId` only; drivers must always complete individual OTP/password authentication.
3. **Driver Earnings Redaction**: Any driver-facing serializer in `apps/api` must omit or redact normal trip fare/earnings fields when `driver.fleetId` is non-null.
4. **Audit Logging**: Fleet Code rotation/disabling, driver association/removal, vehicle reassignment, payout requests, and incentive lifecycle mutations write immutable audit log records.
