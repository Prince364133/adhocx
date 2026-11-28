---
title: Business logic and rules
description: Confirmed business rules, commission and salary model, Fleet Code lifecycle, incentives, shortfall obligation, and explicitly tracked unresolved rules for AdhocX Fleet.
last_reviewed: "2026-11-27"
---

# Business logic and rules

This document records the authoritative product and backend business rules for **AdhocX Fleet**.

## 1. Confirmed Core Rules

| Domain | Confirmed Business Rule |
| :--- | :--- |
| **Fleet Registration** | AdhocX Team registers each Fleet Owner, provisions Fleet Admin login credentials, and issues a unique **Fleet Code** (`FLT-XXXXXX`). |
| **Fleet Code Association** | A new driver entering a valid active Fleet Code during registration is automatically associated with that fleet (`Driver.fleetId`). No separate AdhocX approval follows valid code validation. |
| **Late Association** | A driver who registered without a Fleet Code remains a normal AdhocX driver and can later be linked to a fleet by reusing their existing `Driver` record (never creating a duplicate account). |
| **One-Fleet Rule** | A driver may belong to only **one** fleet at a time and cannot join or register with another fleet while `Driver.fleetId` is active. |
| **Leaving a Fleet** | A fleet driver must leave or be removed from their fleet before returning to normal AdhocX driver status or joining another fleet. |
| **Vehicle 1:1 Rule** | A fleet can have multiple vehicles, but each fleet driver is assigned **exactly one** vehicle and each vehicle is assigned to **one** driver. Vehicle details are captured during driver registration (no separate Fleet Vehicle Registration workflow in MVP). Vehicles can be reassigned after the previous driver leaves. |
| **Trip Allocation** | AdhocX controls trip allocation for both fleet drivers and normal drivers. Fleet Owners **do not** allocate trips. |
| **Driver App Visibility** | Fleet drivers view their assigned trips, completed rides, assigned routes, and active incentives/progress — **normal trip earnings are hidden** in driver-facing views and API responses. |
| **Fleet Owner Visibility** | Fleet Owners view fleet-scoped driver profiles, assigned/active/completed/cancelled trips, per-trip earnings, and driver-wise earnings. |
| **Commission & Salary** | The fleet company calculates its commission from fleet earnings. The Fleet Owner decides driver salaries and pays drivers directly; AdhocX does not determine driver salary. |
| **Shortfall Compensation** | Where AdhocX is obligated to provide a minimum number of trips and fails to provide sufficient trip opportunities, AdhocX pays the applicable shortfall compensation to the fleet company. |
| **Targets & Incentives** | Fleet Admins can create **Target-Based** (e.g., trip count) and **Time-Based** (e.g., active duration / time window) incentives for all or selected fleet drivers, with progress visibility in both Fleet Portal and Driver App. |

## 2. Primary Workflows

### 2.1 Driver Joins Fleet via Fleet Code
1. Fleet Admin copies the unique Fleet Code from the Fleet Portal Dashboard.
2. Driver enters the Fleet Code during onboarding/registration (or post-registration association).
3. Server validates that the code exists, the fleet is `ACTIVE`, the code is `ACTIVE`, and the driver is not already linked to another fleet.
4. Server binds `Driver.fleetId`, appends a `FleetDriverHistory` (`ASSIGNED`) record, and generates a `DRIVER_JOINED` notification for the Fleet Portal.
5. Driver completes personal authentication (`JWT` / OTP) — **Fleet Code is never treated as driver authentication**.

### 2.2 Earnings, Commission, Salary & Payouts
1. AdhocX dispatch assigns trips to fleet drivers; trip completion records earnings in the AdhocX ledger.
2. Fleet Portal displays driver-wise and per-trip earnings to authorized fleet users while redacting normal trip earnings from the fleet driver's own app views.
3. Fleet Owner determines driver salaries and pays drivers directly outside AdhocX.
4. Fleet Owner submits eligible payout requests (`FleetPayoutRequest`) and tracks settlement statuses and any shortfall compensation records (`FleetShortfallRecord`).

### 2.3 Targets & Incentives Lifecycle
1. Fleet Owners configure **Target-Based** (`targetTrips`) or **Time-Based** (`requiredDurationMinutes`, optional time window) incentives scoped to `ALL` fleet drivers or `SELECTED` fleet drivers (validated against `Driver.fleetId`).
2. When a fleet driver completes a trip, `TripsService.updateFleetIncentiveProgress` increments `completedCount` and `activeMinutes` in `FleetIncentiveProgress`, marking `qualified = true` once criteria are met.
3. Crossing 80% progress triggers `INCENTIVE_APPROACHING` and reaching qualification triggers `INCENTIVE_QUALIFIED` notifications for both the Driver App and Fleet Portal.
4. Drivers inspect eligible incentives and progress via `GET /api/v1/drivers/me/incentives` without exposing normal trip earnings.

## 3. Explicitly Tracked Unresolved Business Rules

The implementation does **not** invent arbitrary formulas for unresolved decisions:

| Unresolved Area | Pending Business Decision | Architectural Handling |
| :--- | :--- | :--- |
| **Payout Schedule & Formula** | Weekly vs. monthly vs. on-demand payout cadence, minimum eligibility threshold, and approval workflow. | Configurable `FleetPayoutRequest` workflow (`REQUESTED` to `SETTLED` / `REJECTED`) without hardcoded payout intervals. |
| **Minimum-Trip Shortfall** | Minimum trip threshold, measurement window, failure criteria, and compensation rate per missed trip. | Explicit `FleetShortfallRecord` entity storing agreed terms and adjudicated amounts without hardcoding compensation math. |
| **Optional Shifts** | Whether fleet admins manage driver shifts directly in MVP. | Feature-flagged `Shift & Ride Management` (`ENABLE_FLEET_SHIFTS=false` by default). |
| **Existing Normal Driver Conversion** | Process for converting an active normal AdhocX driver into a fleet driver via Fleet Owner / AdhocX Team approval. | Tracked as a future-phase workflow; not active in initial MVP scope. |
