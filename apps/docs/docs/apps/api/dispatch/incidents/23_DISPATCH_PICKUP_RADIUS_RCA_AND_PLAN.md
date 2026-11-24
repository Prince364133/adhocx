# 23 — Dispatch Pickup Radius: Root-Cause Analysis & Fix Plan

**Status:** RCA complete, fix in progress · **Date:** 2026-11-10
**Symptom:** with a 10 km maximum pickup distance, drivers farther than 10 km still receive ride offers.
**Code:** `apps/api/src/modules/dispatch/dispatch.service.ts`, `apps/api/src/modules/locations/locations.service.ts`, `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts`, mobile `home_screen.dart`, `permission_service.dart`, `driver_service.dart`
**Reproduction:** `apps/api/test/dispatch-radius.sim.spec.ts` (real DispatchService, LocationsService and h3-js; in-memory Postgres and Redis)

---

## 1. Finding 0: there is no 10 km limit in the on-demand engine

Nothing in the code reads a "max pickup distance" setting. No env var, database field or admin control exists for it.

* **On-demand** dispatch (`dispatch.service.ts`) searches H3 rings k = 1…5 at resolution 8, then a radial fallback of `min(15, 3 + wave × 2.5)` km. It has **no final distance check**.
* **Corporate** dispatch has hardcoded constants: 5 km, widened to 10 km (`PRIMARY/EXPANDED_SEARCH_RADIUS_KM`).

The comments on the H3 waves are also wrong. They claim "k=5 ≈ 12 km", but at resolution 8 (≈ 0.46 km edge, ≈ 0.8 km between cell centres) k=5 covers about 4.5 km.

## 2. Root causes (all reproduced)

Simulation: pickup at Connaught Place, New Delhi; the limit is 10 km. "Offered" is the driver's **real** distance.

| # | Root cause | Where | Simulation result |
|---|---|---|---|
| **RC1** | **Location-less fallbacks.** If no driver is found in the search area, `dispatch.service` offers the ride to *any* 10 available drivers. If none of the nearby drivers is eligible, it searches *citywide* for 15 more. Neither applies a location, distance or GPS-freshness filter | `dispatch.service.ts` ~L470 and ~L588 | S1: offer to a driver **35 km** away |
| **RC2** | **No final distance gate.** Whatever source produced a candidate (H3, GEO, DB, fallback), nothing compares the distance to a limit before the offer is created | `dispatch.service.ts` selection | (enables RC1, RC3, RC4) |
| **RC3** | **Drivers without a location are treated as standing at the pickup.** `currentLat = null` sets `driverLat = pickupLat`; the stale-GPS check only applies when `lastLocationAt > 0` | `dispatch.service.ts` scoring | S3: driver really **50 km** away offered |
| **RC4** | **Stale H3 cell membership.** The metadata key expires after 15 min, but the driver's membership in the old cell set does not. The next ping can't find the previous cell, so the old membership stays. `findNearbyDriversByH3` returns the driver from the old hexagon with their **new** far location and never filters by distance. GEO entries likewise never expire | `locations.service.ts` | S4: driver **30 km** away offered |
| **RC5** | **Search radius beyond the limit.** The radial fallback reaches 13 km in wave 4 and 15 km in wave 5 | `dispatch.service.ts` | S5: driver **12 km** away offered |
| **RC6** | **The server's idea of an idle driver's position is wrong.** The driver app sends a location only when availability is toggled; there is **no heartbeat while AVAILABLE**. After 30 min every idle driver is "stale", which pushes dispatch into RC1's fallbacks, and their stored position is wherever they went online | mobile `home_screen.dart` | S2: driver who went online 3 km away (now **25 km**) offered |
| **RC7** | **Fabricated locations.** Going online without a GPS fix reports **HITEC City (17.4435, 78.3772)**. `PermissionService.getCurrentPosition` falls back to the last known position with **no age check**, then **IP geolocation** (city-level, often tens of km off, plain HTTP to a third party), then HITEC City. Accuracy and source are never sent, so the server treats a guess as a GPS fix | mobile `home_screen.dart:386`, `permission_service.dart`, `driver_service.dart:389` | (by inspection) |

| **RC8** | **On-demand trips never report location.** `DriverService.sendLocationPing` has **no callers**, and its payload (top-level `latitude`/`longitude`) does not match `TripLocationUpdateDto` (`location: {…}`), which the global `ValidationPipe` (`forbidNonWhitelisted`) would reject. During and after trips the server's position for the driver is the trip's start/end point, and on-demand trips never appear on the live ops map | mobile `driver_service.dart` | (by inspection) |

The scenarios interact. In production, RC6 makes nearby idle drivers stale. RC1 then offers the ride to whoever is available anywhere. RC3, RC4 and RC7 also put wrong positions into the index, and RC2 means nothing catches any of it.

## 3. Design principles for the fix

1. **One invariant, enforced last:** *an offer is created only for a driver whose known, fresh location is within the configured radius.* It is checked after every candidate source and every re-rank, so no future fallback can bypass it.
2. **A single source of truth for the radius:** `DISPATCH_MAX_PICKUP_RADIUS_KM` (default **10**). The H3 rings, the radial fallback and the corporate radii are all derived from it.
3. **Unknown means ineligible.** No location, a stale location or a low-accuracy location ⇒ not dispatchable. An honest "no driver available" (existing `NO_DRIVER_AVAILABLE` flow, with retry and ops alerts) is better than a far-away offer.
4. **Fix location quality at the source** (mobile), and make the server defend itself anyway (freshness and accuracy limits, index hygiene).

## 4. Fix plan

### Server (API)

| Step | Change |
|---|---|
| S-1 | `DispatchConfig`: `maxPickupRadiusKm` (env `DISPATCH_MAX_PICKUP_RADIUS_KM`, default 10), `maxLocationAgeSec` (`DISPATCH_MAX_LOCATION_AGE_SEC`, default 600), `maxLocationAccuracyM` (`DISPATCH_MAX_LOCATION_ACCURACY_M`, default 500), and an optional road cap `maxPickupRoadKm` (`DISPATCH_MAX_PICKUP_ROAD_KM`, unset = off) |
| S-2 | **Delete both location-less fallbacks** (RC1). No candidates in radius ⇒ the existing `markSupplyExhausted('no_supply')` |
| S-3 | **Final eligibility gate** (RC2, RC3): known location, `lastLocationAt` within max age, straight-line distance ≤ radius. After the Google road-ETA re-rank, also enforce `maxPickupRoadKm` when it is set |
| S-4 | Waves derived from the radius: H3 k-ring sized so the disk covers `min(radius, wave fraction)`; the radial fallback is capped at the radius (RC5) |
| S-5 | `findNearbyDriversByH3`: keep a member only if its metadata exists, its `h3Cell` is inside the searched disk, and its distance is within the disk radius; lazily `SREM` stale members (RC4) |
| S-6 | `findNearbyDrivers` (Redis GEO): a member without live metadata is stale and is skipped and lazily `ZREM`'d. DB fallback: require `lastLocationAt` ≥ now − max age (RC4) |
| S-7 | `POST /drivers/location` (heartbeat): `{latitude, longitude, accuracyM?, source?, recordedAt?}`. Only `source = GPS` with `accuracyM ≤ maxLocationAccuracyM` is indexed for dispatch; others are stored for display but removed from the dispatch index. Postgres is written at most every 60 s per driver |
| S-8 | Corporate dispatch: radii derived from the same config (primary = min(5, max), expanded = max) |

### Mobile (driver app)

| Step | Change |
|---|---|
| M-1 | While AVAILABLE (and not on a trip): send the heartbeat every 30 s and on ≥ 100 m movement, with accuracy and source (RC6) |
| M-2 | `getDispatchPosition()`: only a fresh GPS fix, or last known ≤ 2 min old with accuracy ≤ 500 m; otherwise `null`. Never IP or a default city. Used for availability, heartbeat and trip start (RC7) |
| M-3 | Going online without a fix: send availability **without** a location and show "Waiting for GPS…"; the driver is not dispatchable until a real fix arrives (RC7) |
| M-4 | Remove the HITEC City fallback from trip start (`driver_service.dart`) |

### Verification

* `dispatch-radius.sim.spec.ts`: S1–S5 must produce **no offer beyond the radius**, and the S6 control must still offer the 2 km driver.
* New scenarios: road cap; a low-accuracy (IP/network) fix is not dispatchable; heartbeat keeps an idle driver eligible; stale GEO/H3 entries are cleaned.
* Regression: all 19 dispatch/location suites.

## 5. Rollout

1. Ship the API first. It is safe on its own: far offers stop immediately, and some requests in thin-supply areas will become `NO_DRIVER_AVAILABLE` instead.
2. Ship the mobile heartbeat (M-1) promptly. Until it is live, idle drivers drop out of dispatch after `DISPATCH_MAX_LOCATION_AGE_SEC` (10 min). If that's too aggressive during the rollout window, temporarily raise it (e.g. 1800). The radius invariant holds regardless.
3. Watch: count of `NO_DRIVER_AVAILABLE`, offers' `distanceKm` distribution (p99 must be ≤ radius), and the share of AVAILABLE drivers with a fresh location.

---

## 6. Execution log (2026-11-10)

**Server:** done. `pickup-radius.ts` (config + invariant + wave/k-ring math). In `dispatch.service.ts`: both location-less fallbacks deleted, the final gate evaluates the **freshest** position (live index vs Postgres row), waves are derived from the radius, and the optional road cap is enforced. In `locations.service.ts`: H3 and GEO hits require live, fresh metadata; stale members are removed lazily; the H3 fallback uses the same radius; the DB fallback requires a fresh `lastLocationAt` and overlays newer index positions. `POST /drivers/location` heartbeat added. Corporate radii are derived from the config.

Measured while fixing: H3 resolution-8 average edge = 0.53 km; a k=5 disk reaches 4.8 km (not the "≈12 km" in the old comments); 10 km needs k = 11.

**Mobile:** M-1…M-4 done (dispatch-quality fixes only, no fabricated coordinates, 30 s idle heartbeat with accuracy and source). RC8 fixed: trip pings now use the nested `location` body and run every 10 s / 50 m during an assigned or active trip; exactly one location loop runs at a time.

| Verification | Result |
|---|---|
| `dispatch-radius.sim.spec.ts`: S1–S5 (root causes), S6 control, S7 road cap, S8 wave expansion, S9 DB freshness, S10 index cleanup, S11 heartbeat quality | 11/11; **no offer beyond the radius in any scenario** |
| Mobile `dispatch_location_test.dart` | 13/13 (incl. trip-ping body shape and pinger) |
| Regression: all 19 dispatch/location suites (dispatch, locations, waterfall, scheduled trips, offers, requirements, trips, corporate dispatch/supply/ops/simulations incl. 500-commute) | all pass |
| API `tsc --noEmit`, eslint (changed files); mobile `flutter analyze` (changed files) | clean |

Test fixtures that relied on RC3 (drivers without a location treated as "at the pickup") now give each driver a fresh GPS position; the wave test asserts the new radius-derived waves.

**Still open:** not yet observed against production data or on a device. After deploy, watch the offer `distanceKm` p99 (must be ≤ radius) and the `NO_DRIVER_AVAILABLE` rate. Until the new mobile build is widely installed, idle drivers on old builds age out after `DISPATCH_MAX_LOCATION_AGE_SEC`.
