# 21 — Onboarding → Route Optimizer → Routes → 30m Dispatch: Audit & Fix Plan (2026-11-11)

Scope: the flow built in f689a99 + the uncommitted dispatch work on `staging`
(company onboarding, CSV route optimizer + commit, routes list/detail with Google
directions, autonomous 30m approach + 30m / 6×5m search + "Drivers not found").

Method: read every backend path end-to-end (onboarding, planner parse → solve →
commit, directions, dispatch service + scheduler + reaper + ops reassign), then the
Ops and Corporate pages that call them. Each finding below has a concrete failure.

## Findings

Severity: **P0** = wrong data / safety / security in normal use; **P1** = breaks a
stated requirement or fails under realistic load; **P2** = edge case / hygiene.

### A. Route commit & planner (`corporate-route-planner.service.ts`, `cvrptw-cluster-solver.ts`)
| # | Sev | Finding | Failure |
|---|---|---|---|
| A1 | P0 | Commit stores `stop.boardingOtp \|\| '1234'` — client-supplied or constant | Every employee on a route can share OTP `1234`; boarding OTP proves nothing |
| A2 | P0 | LOGOUT plans are committed as LOGIN geometry (employee PICKUPs → office DROPOFF) and the solver always plans home→office against an arrival deadline | Evening routes run backwards; trip execution / dispatch / DDA read wrong stop types |
| A3 | P0 | Commit is one interactive transaction with Prisma's default 5 s timeout, ~4 queries per stop | 300-employee commits fail with "Transaction already closed" |
| A4 | P0 | Re-commit / double click creates duplicate routes | Same employee in two cabs, two drivers dispatched |
| A5 | P0 | Employee linking matches `fullName` inside the OR | Two "Rahul Kumar"s → stop linked to the wrong employee (wrong phone, wrong notifications) |
| A6 | P1 | `officeId` not checked against `tenantId` | Routes for company A attached to company B's office |
| A7 | P1 | Planner hard-codes 6 per cab (UI + controller default); commit sets SEDAN `maxCapacity` 3 | Policy "SEDAN 4" ignored; `assignedPassengerCount` > `maxCapacity` |
| A8 | P1 | Office-arrival fallback parsed as `${date}T${time}:00Z` (UTC) | 5h30 shift error when the plan lacks `requiredArrivalDateTime` |
| A9 | P1 | CSV `latitude`/`longitude` columns ignored | Spec says coordinates are optional; given ones are re-geocoded (cost, drift) |
| A10 | P1 | Duplicate detection by *name* drops **both** employees | Common names silently removed from the roster |
| A11 | P2 | `stopSequence` trusted from client; office stop OTP `0000` | Duplicate sequences possible; inconsistent with `------` office convention |
| A12 | P2 | Office buffer uses request default 15 instead of tenant `officeArrivalBufferMinutes` | Policy buffer ignored |

### B. Geocoding (`google-geocoding.adapter.ts`)
| # | Sev | Finding | Failure |
|---|---|---|---|
| B1 | P0 | On Google failure the adapter returns fabricated Hyderabad coordinates, in production too | Offices / pickups placed at fake points; drivers sent there |
| B2 | P0 | Fallback result cached in-process forever | Google recovers, wrong coordinates persist until restart |
| B3 | P0 | Redis key = first 48 chars of base64(address) | Long addresses in the same complex collide → employees geocoded to a neighbour |

### C. Dispatch lifecycle (`corporate-dispatch.service.ts`, `-scheduler.service.ts`)
| # | Sev | Finding | Failure |
|---|---|---|---|
| C1 | P0 | Retries ride the 120 s recovery sweep + 300 s Redis marker + 120 s `stuckAfter` | Runs land 5–9 min apart; fewer than 6 fit before T-30; Redis TTL ignores the simulated clock |
| C2 | P0 | Every non-cascade re-entry (`ALL_DRIVERS_BUSY` 60 s retry, crash recovery) increments `dispatchAttempts` | 6-run budget burnt in a few minutes when drivers are busy |
| C3 | P0 | Exhaustion requires `attempts >= 2`; cascades skip the deadline check | Late routes / long cascades keep offering after T-30 (driver can't reach pickup 1) |
| C4 | P1 | LOGOUT deadline ignores the 15-min office staging | LOGOUT search window is 45 min, not 30 |
| C5 | P1 | Ops reassign leaves `dispatchStatus=DRIVER_ASSIGNED` and old attempts | Re-dispatch exhausts immediately; UI shows "assigned" with no driver |
| C6 | P1 | `dispatchStatus` OFFERED/PENDING written unconditionally after the offer is published | Fast accept → status overwritten back to OFFERED |
| C7 | P1 | Exhaustion scan: `take: 250`, unordered, policy N+1, runs twice per tick | Routes beyond 250 never exhaust; extra DB load |
| C8 | P2 | Directed ops offer keeps `NO_DRIVERS_FOUND` while the offer is live | Banner says "Drivers not found" while a driver is being offered |

### D. Routes API / directions (`corporate-routing.controller.ts`, `corporate-route-directions.service.ts`)
| # | Sev | Finding | Failure |
|---|---|---|---|
| D1 | P0 | `GET /corporate/routes/:id` returns `boardingOtp` to DRIVER and corporate roles | Driver can board without the employee |
| D2 | P1 | `?includeDirections=true` bypasses the 180 s cache; `refresh=true` unthrottled | A Google Routes call on every page load / click (cost, quota) |
| D3 | P1 | LOGOUT: office waypoint appended at the end; live ETAs re-anchor on plan at every stop | Wrong map for LOGOUT; delays never propagate |
| D4 | P1 | Office-scoped corporate managers see every office's routes on `/routes/portal` | Office scope bypass |
| D5 | P2 | Invalid `shiftDate` / `status` query → Prisma 500 | Should be 400 |

### E. Onboarding (`corporate-onboarding.service.ts`, `corporate-tenant-users.service.ts`)
| # | Sev | Finding | Failure |
|---|---|---|---|
| E1 | P1 | Password minimum 6 (spec: 8) | Weak portal passwords |
| E2 | P1 | Concurrent onboard → unique violation surfaces as 500; geocode error → 500 | Should be 409 / 400 with a reason |
| E3 | P1 | Fallback geocode accepted for the office | Office at a fake point (see B1) |
| E4 | P2 | `cancelCutoffHours`, `maxRideMinutes`, night window, capacity not validated | Bad policy rows (e.g. capacity 0) |
| E5 | P2 | Phone stored as typed (not E.164) | Inconsistent with the rest of the user table |

### F. Frontend
| # | Sev | Finding |
|---|---|---|
| F1 | P1 | Ops planner sends `cabCapacity=6` regardless of company policy |
| F2 | P2 | Commit button stays active after a successful commit (backend guard A4 is the real fix) |

### Noted, out of scope (other session's / pre-existing work)
- `apps/corporate/src/lib/api/corporate.ts` reports fallback hard-codes a tenant id.
- Uncommitted `auth.service.ts` change removes `jti` from issued tokens (not part of this work; review before committing).

## Fix plan (phased)

1. **Geocoding** — strict mode in production (`CORPORATE_GEOCODE_FALLBACK=true` to opt in), never cache fallbacks, sha256 cache key. (B1–B3, E3)
2. **Planner** — honour CSV lat/lng, identity-based duplicates, policy capacity + office buffer, true LOGOUT solve (office → drops). (A2, A7, A9, A10, A12, F1)
3. **Commit** — server-generated OTPs, office/tenant check, office-location check, code/phone-only matching, active-route duplicate guard, IST fallback, sequential sequences, LOGOUT shape, 60 s transaction. (A1–A8, A11)
4. **Dispatch** — one deadline helper (`anchor − approach`, LOGOUT anchor = departure − 15 m); DB-anchored retry (`lastDispatchAttemptAt + interval`) checked every tick; re-entry inside an interval is the same run; cascades stop at the deadline unless ops-forced; conditional status writes; paged exhaustion scan; reassign resets counters; directed offer sets OFFERED. (C1–C8)
5. **Routes API** — strip OTPs for non-staff, cached directions + refresh throttle, LOGOUT office-first waypoints with propagated live ETAs, office-scope filter, 400 on bad query. (D1–D5)
6. **Onboarding** — shared policy validator, 8-char password, 409/400 mapping, E.164 phone. (E1–E5)
7. **Tests** — unit specs per fix + a clock-driven simulation of the 6×5 m window (T-60 … T-30), busy-retry, late commit, LOGOUT window, reassign reset.

## Status (2026-11-11, uncommitted on `staging`)
All findings A1–A12, B1–B3, C1–C8, D1–D5, E1–E5, F1–F2 are fixed in the working tree.
New dispatch states: `SEARCHING` (run in progress) and `RETRY_SCHEDULED` (waiting for the next 5-min run),
alongside `PENDING`, `OFFERED`, `DRIVER_ASSIGNED`, `NO_DRIVERS_FOUND`.

Regression tests:
- `test/corporate-dispatch-window-invariants.spec.ts`: exact runs at T-60…T-35 then NO_DRIVERS_FOUND; in-run re-entry; late route; LOGOUT deadline; no cascade after the deadline; Ops force window.
- `test/corporate-commit-geocode-audit.spec.ts`: OTPs, office ownership/drift, live-route duplicate guard, no name linking, phone linking, LOGOUT shape, capacity, IST fallback, roster coordinates/dedupe, geocode strict mode + cache key, OTP visibility, onboarding rules, LOGOUT solver.

Operational notes:
- Production now **fails** a geocode instead of inventing coordinates. `GOOGLE_MAPS_API_KEY` must be set on the API (`CORPORATE_GEOCODE_FALLBACK=true` only for staging/demo).
- Geocode cache keys moved to `corporate:geocode:v2:*`: expect one re-geocode per address after deploy.
- Pre-existing failures that are not from this work: `corporate-route-solver-matrix` and `corporate-ets-500-commute-simulation` (solver count expectations from f3cf37d).

## Verification
`tsc --noEmit` (api, ops, corporate), Jest corporate suites in IST and `TZ=UTC`, ops + corporate `next build`.
