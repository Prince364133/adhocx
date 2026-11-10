# 25 — Live Dispatch Correctness Simulation (k6 + H3 oracle)

**Date:** 2026-11-10 · **Tool:** k6 v2.3.0 + independent verifier · **Target:** production build of `apps/api` against local throwaway PostGIS + Redis (no production data, no Google/SMS/Digio).
**Question:** does every live ride request go only to drivers **within 10 km**, with the **right vehicle**, who are **eligible**, ranked by **trust / quality**, expanding outward correctly?

Toolkit (`apps/api/loadtest/`): `dispatch-scenario-seed.js` (scenario + oracle), `k6-dispatch.js` (live run), `verify-dispatch.js` (checks every offer). Separate from the existing Node-based corporate test in `apps/api/load-test/`.

---

## 1. Simulation design

* **21 Indian cities more than 100 km apart**, so scenarios never interfere. 18 cities host one scenario zone (9 scenario types × 2 cities each).
* **4,554 drivers**: 54 scenario drivers at exact distances/bearings from each zone's pickup, plus 4,500 background drivers 15–45 km from each city centre. The background fleet mixes sedans, SUVs and hatchbacks, trust 55–100, rating 3.8–5.0, and 20 % rookies.
* **170 bookings posted at the same moment** (20 scenario + 150 background, each from its own vendor) through the real `POST /requirements`.
* Every driver sends `POST /drivers/location` at its exact position about every 18 s (≈ 253 req/s). Stale drivers never report; offline drivers report and are refused. Drivers poll `GET /offers` but **never accept**, so every booking runs through all of its waves (2 → 4 → 6 → 8 → 10 km).
* **Verifier (independent oracle):** recomputes each offer's straight-line distance (haversine) and **H3 resolution-8 cells + grid distance**, then checks it against the booking's pickup, vehicle and the driver's seeded attributes.

| Zone | Setup | Correct outcome |
|---|---|---|
| A: trust | 2 veterans at 1.2 km, trust 95 vs 60 | trust 95 first |
| A2: trust band | 2 veterans at 1.2 km, trust 82 vs 72 | trust 82 first |
| B: rookie | veteran trust 98 at 0.8 km vs rookie trust 60 at 1.8 km | veteran (rookie only on its 15 % exploration share) |
| C: vehicle | SUVs at 0.5/0.7 km, sedan at 3 km; a sedan booking and an SUV booking at once | sedan booking → sedan only; SUV booking → nearest SUV |
| D: radius edge | sedans at 9.7 km and 10.4 km | 9.7 km offered; 10.4 km never |
| E: ineligible | unverified, offline, stale-GPS, cooldown drivers at 0.3–0.6 km; eligible at 1.5 km | eligible only |
| F: out of radius | sedans at 11/15/30 km | no offer, `NO_DRIVER_AVAILABLE` |
| G: waves | sedans at 1.5/3.5/5.5/7.5/9.5 km | one per wave, each inside its wave radius |
| H: hatchback | hatchback at 2.5 km, sedans at 0.5 km | hatchback only |

## 2. Results

### Safety invariants: held in every run

Across all **451 offers** of the final run (and the 97 of the first valid run):

| Check | Violations |
|---|---|
| Offer beyond 10 km | **0** (furthest 9.96 km; p50 5.45 km, p95 9.43 km) |
| Offer beyond its own wave's radius | **0** |
| H3 grid distance beyond the wave's k-ring | **0** |
| Wrong vehicle type | **0** |
| Ineligible driver (unverified / offline / stale GPS / cooldown) | **0** |
| Same driver twice for one booking | **0** |

### Behaviour: 7/20 zones before fixes → 20/20 after

| # | Finding (before) | Evidence | Fix |
|---|---|---|---|
| D1 | 🔴 **An empty first wave ended dispatch.** With no driver within 2 km, the booking became `NO_DRIVER_AVAILABLE` immediately, even with drivers at 3–10 km. This regression came from the radius fix in doc 23; its simulation forced the wave number and never tested natural progression | zones C-sedan, D, H: no offer; **115 of 145** background bookings with nobody inside 2 km got no offer at all | One dispatch widens 2 → 4 → … → 10 km until a candidate is found (bounded loop); the wave counter advances with it |
| D2 | 🟠 **H3 ring too small at some latitudes** + GEO fallback skipped when every H3 hit had already been offered | Ahmedabad: 9.5 km driver never reached in wave 5 (Kochi, same setup, passed) | k-ring with 30 % margin (10 km → k = 15; the exact distance filter still trims to 10 km); GEO search runs whenever H3 yields no *new* candidate |
| D3 | 🟠 **Rookie quota overrode trust.** `max(1, 15 %)` of a single-offer wave meant any rookie in range got every single-vehicle booking | rookie (trust 60, 4.0★, 1.8 km) beat veteran (trust 98, 5.0★, 0.8 km) in both cities | Exploration share honoured on average: `floor(share × offers)`, and for single-offer waves `share` of bookings chosen deterministically (FNV-1a of requirement id + wave). `DISPATCH_ROOKIE_SHARE` (default 0.15) |
| D4 | 🟠 **Trust inversion.** A hard-coded +5 bonus for trust < 75 made trust 72 outrank trust 82 | both A2 cities | `DISPATCH_LOW_TRUST_BOOST`, default **0** (trust ordering is now monotonic) |
| D5 | 🟡 **Nearer driver not preferred within ~1.5 km.** Ranking used whole-minute ETAs with a 2-minute floor, and Google's exact seconds were discarded | 0.7 km SUV offered before the identical 0.5 km SUV | Rank on unrounded ETA (Google `durationSeconds` kept) and break equal scores by distance |

After the fixes: **20/20 zones**, **142/148** background bookings received an offer. The 8 bookings without an offer (6 background + both F zones) had **no eligible driver of the right vehicle within 10 km**; the verifier confirmed the nearest were 11.0–16.7 km away. So every serviceable booking was served and no unserviceable one was.

Load during the run: 84,601 requests, **0 failed**, 100 % checks passed.

## 3. Ranking as it now stands

`score = proximity (≤ 35, unrounded ETA) + trust (≤ 35) + rating (≤ 20) + rookie +10 + idle fairness (≤ 5)`; low-trust bonus 0 by default. Single-vehicle bookings send one offer per wave: the top score wins (ties → nearer). A rookie wins the slot only on its exploration share (15 % of bookings by default). Trust is a direct, monotonic input: at equal distance and rating, a more-trusted driver always ranks higher.

*"Health"* in the request was interpreted as the driver-quality signals the engine uses: verification, availability, GPS freshness, cooldown (anti-cherry-picking) and trust/rating. The hard filters were checked in zone E; trust/rating ordering in zones A, A2 and B.

## 4. Tests added

`apps/api/test/dispatch-radius.sim.spec.ts` (now 15 scenarios):
* S12: natural progression finds a 6 km driver in the same dispatch
* S13: trust 82 > 72
* S14: 0.5 km > 0.7 km
* S15: rookie share ≈ 15 %, deterministic
* S8: updated for widening within a dispatch

Regression (all pass): dispatch, waterfall, offers, trips, requirements, scheduled trips, locations, application use cases, corporate dispatch/supply, 500-commute simulation.

## 5. Not covered / follow-ups

* Drivers **on an active trip** are filtered by the engine (`trips` check) but were not seeded in this scenario (needs full trip fixtures).
* The **accept race** (many drivers accepting the same booking) was covered by the load test (doc 24: 0 double assignments).
* Product decision for the team: whether to keep the low-trust "recovery" bonus (now 0) and the rookie share (now 15 %). Both are env settings.
