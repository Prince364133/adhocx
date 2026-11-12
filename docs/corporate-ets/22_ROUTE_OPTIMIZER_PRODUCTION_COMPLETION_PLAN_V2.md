# 22 — Route Optimizer Production Completion Plan (V2)

**Status:** Core implementation and deterministic API verification are complete; production acceptance remains pending  
**Prepared:** 2026-11-12  
**Scope:** Close every partial or unverified Route Optimizer item identified in the V1 verification session  
**Related:** `21_ONBOARDING_ROUTING_DISPATCH_AUDIT_2026-11-11.md`, `03_ROUTE_OPTIMIZATION_AND_CAPACITY_SOLVER.md`

## Execution checkpoint — 2026-11-12

Implemented in this pass:

- Strict planner ranges and direction-specific times are checked server-side; BOTH roster planning parses once, shares address geocodes, and returns independent outcomes.
- Mixed Sedan/SUV allocation and capacity limits are aligned at 3/6 seats; legacy Sedan policies above three are capped at read time and new invalid policy values are rejected.
- Direction-specific commit behavior, duplicate employee checks, configured LOGIN/LOGOUT dwell, and routing option/provider propagation are covered by focused tests.
- Ops uses one stream request for roster BOTH, displays per-direction outcomes and actual Live Shift totals, and exposes strategy radios with independent toll/highway checkboxes.

Verification completed:

- API and Ops typechecks and production builds pass.
- Prisma schema validation passes.
- Six focused API suites pass: 120 passed, 1 skipped (including the final tenant-policy validation case).
- The deterministic backend lifecycle simulation (roster planning → commit → dispatch) passes.

Still required before calling this production-complete:

- Browser-level Ops interaction tests and a real local API/UI workflow through both planner modes.
- Apply the capacity migration to a disposable database and verify the resulting schema/data behavior; only Prisma schema validation was run.
- Exercise database transaction rollback and retry after a partial BOTH commit failure against a deterministic database.

The backend lifecycle simulation is not a browser end-to-end test, and no production database migration was applied in this pass.

### Audit pass — 2026-11-12 (follow-up)

Defects found and fixed:

- `test/route-solver.spec.ts` no longer compiled (union return type); `optimizeAndCreateRoutes` now has direction-typed overloads.
- The 20-step and 500-commuter simulations still asserted 4-seat Sedans and failed (15 tests); updated to the canonical 3-seat rule.
- Live Shift could double-assign a request under concurrent optimize runs; the request update is now guarded on `status: 'APPROVED'` and rolls back with HTTP 409.
- `TRAFFIC_AWARE_OPTIMAL` matrix requests used 625-element chunks, which Google rejects above 100, silently degrading to haversine; chunks are now capped at 100 elements.
- Commit applied the tenant SEDAN policy capacity even when the request sent an explicit `sedanCapacity`, unlike planning; both paths now use request value first, then a SEDAN-only policy fallback.
- A stored policy dwell outside 1–10 failed planning even when the request supplied its own wait; a policy arrival buffer above 30 min (policy allows 120) failed planning; the fallback is now capped at 30.
- Ops: recalculating did not clear committed-route markers; commit used live form values instead of the settings the plan was computed with; BOTH plans drew duplicate office markers and listed exclusions without direction; logout defaulted to 08:00; blank date/time inputs threw `Invalid time value`; single-direction Live Shift warnings were hidden.

Verified: API/Ops typecheck, lint on touched files, API and Ops production builds, 12 routing/simulation suites (197 passed, 1 skipped live-Google smoke). Browser E2E, migration-on-disposable-DB and DB-level rollback checks remain open, as listed above.

---

## 1. Objective

Finish the remaining Route Optimizer work to a production-ready, test-verifiable state. “Complete” means the backend contract, roster planner, Live Shift Optimize flow, persistence, Ops UI, failure handling, and relevant tests agree with one another. A control is not complete merely because it appears in the UI or a helper function has a unit test.

The work must preserve the existing dirty worktree. In particular, do not restore or overwrite the unrelated deletions of the Ops board and companies pages. Do not add `BOTH` to any persisted route-direction enum. `BOTH` is orchestration only; database routes remain `LOGIN` or `LOGOUT`.

## 2. Verification baseline

The V1 verification found the following already implemented in the worktree:

- Roster planning excludes employees outside the configured straight-line office catchment or max-trip distance, using full-precision comparisons and returning an exclusion reason.
- Planner constraints have backend range checks for catchment/max trip (1–50 km), wait (1–10 minutes), and safety buffer (0–30 minutes).
- The Ops planner has separate Login/Logout time controls, direction selection, vehicle category/capacity controls, highway/toll checkboxes, and no manual employee-exclusion input.
- The frontend and API types use the actual Live Shift response fields: `routesCreated`, `passengersAssigned`, and `unassignedRequests`.
- Sedan/SUV shared capacity defaults are aligned to 3/6.
- The Ops planner groups roster commits by actual direction and has partial outcome messaging.

Previously run checks passed: API and Ops typechecks; focused route planner and solver suites (74 passed, 1 skipped). These checks did not cover all requirements below. Re-run them after implementation; they are not substitutes for the missing tests and end-to-end checks.

## 3. Contract decisions for this completion pass

Use these decisions consistently in API DTOs, services, UI copy, tests, and docs:

1. **Distance semantics:** catchment and “Max Trip (km)” both mean straight-line distance from an employee pickup/drop location to that employee’s applicable office. They are independent eligibility limits; an employee must satisfy both. Neither is a total road-distance cap for a cab.
2. **Range limits:** preserve the existing catchment/max-trip minimum of 1 km; maximum 50 km. Wait/dwell is an integer 1–10 minutes. Safety buffer is an integer 0–30 minutes.
3. **Direction-specific times:** LOGIN requires a LOGIN time; LOGOUT requires a LOGOUT time; BOTH requires both. Roster row times take precedence when valid; the selected direction time supplies a missing row time. Invalid row times are errors, not silently replaced.
4. **Logout dwell:** apply the configured 1–10 minute employee-stop dwell to LOGOUT drop stops as well as LOGIN pickup stops. The office stop has no employee dwell. Remove the hard-coded two-minute LOGOUT employee dwell.
5. **Vehicle capacity:** canonical maximum capacities remain Sedan 3 and SUV 6. User-configured capacities may lower, but never exceed, those maxima. In BOTH mode, only vehicles whose configured capacity can seat the route are candidates. Select the least-cost eligible vehicle under the existing pricing rules; use Sedan as a deterministic tie-break. If the Live Shift path has no pricing inputs, use the same deterministic “smallest feasible category” rule and document it in the response.
6. **Primary routing strategy:** exactly one strategy may be selected. Present it accessibly as a mutually exclusive radio group styled consistently with the requested checkbox-like controls. Toll avoidance and highway avoidance remain independent checkboxes.
7. **Partial outcomes:** report each direction’s planning/optimization/commit status independently. Aggregate counts include successful directions only and must never imply that a failed direction succeeded.
8. **Legacy API compatibility:** keep persisted route directions unchanged. Before removing legacy `shiftTime` or `excludedEmployees` request compatibility, search all clients and external-contract docs. Where compatibility must remain, mark it explicitly as deprecated and test the behavior; the Ops UI must not expose manual employee exclusion.

## 4. Remaining work and implementation sequence

### Phase A — Freeze and validate the API contract

**Files:** `corporate-routing.controller.ts`, `routing.types.ts`, `opsClient.ts`, `opsTypes.ts`

- Define typed request/response DTOs for:
  - Single-direction optimize requests.
  - BOTH direction batches with separate LOGIN and LOGOUT times.
  - Roster single-direction plans and roster BOTH batch plans.
  - Per-direction status, errors, route/passenger/unassigned counts, vehicle totals, and exclusions.
- Require the applicable explicit time(s), strict `HH:mm` values, and a real calendar date. Validate date components rather than accepting JavaScript date rollover.
- Validate category and capacity values as integers and reject values outside canonical maxima.
- Validate all planner limits at the HTTP boundary and again at the service boundary. A direct API call must receive HTTP 400 for invalid values; do not rely on browser input constraints.
- Validate `stopDwellMinutes` in the commit endpoint. Replace clamping of invalid commit requests with a clear 400.
- Validate selected routing strategy against the supported set. Parse multipart booleans and numeric fields without treating malformed values as defaults.
- Preserve `shiftTime` compatibility only if repository-wide client search shows it is needed. It must not bypass the required direction-specific time for new Ops requests.
- Search all uses of `excludedEmployees`; retain a backend compatibility field only if another client depends on it. Do not restore a manual-exclusion UI.
- Document the exact success and partial-success shapes in controller/API types. Avoid `any` for optimizer responses and direction outcomes.

**Exit criteria:** controller tests assert HTTP 400 for each invalid lower/upper boundary and malformed date/time, and valid boundary values reach the service unchanged.

### Phase B — One-upload BOTH roster planning

**Files:** `corporate-route-planner.service.ts`, `corporate-routing.controller.ts`, Ops planner and API client

- Add an explicit roster batch operation (or a backward-compatible extension to the stream endpoint) that accepts selected direction(s) and the associated times.
- Parse the uploaded roster once, normalize employee/office rows once, deduplicate once, and geocode each unique pickup/office address at most once for the batch.
- Build independent LOGIN and LOGOUT planning contexts from the normalized/geocoded records. Use each direction’s own row-time column and fallback time; do not reuse LOGIN row time as LOGOUT time.
- Apply catchment and max-trip filtering against the same employee-to-office definition in both direction plans. Return exclusions separately per direction because office/time eligibility can differ.
- Stream progress with a direction label and an overall progress value. Send a final structured batch result containing a status for each direction, including error details when only one direction fails.
- Do not return an HTTP/SSE success-shaped result if both plans failed. If one succeeds, retain that plan and explicitly mark the other failed.
- Keep the existing single-direction endpoint contract working for callers that do not use BOTH.
- Update the UI to make one upload for BOTH and display independent LOGIN/LOGOUT summaries, exclusions, routes, and failures.

**Exit criteria:** an instrumented test proves one roster parse and one geocode per unique address for BOTH; two independent direction plans are produced with correct times; a direction failure does not erase the other plan.

### Phase C — Make vehicle allocation capacity-aware end-to-end

**Files:** `corporate-route-planner.service.ts`, `cvrptw-cluster-solver.ts`, `cost-optimizer.ts`, `route-solver.service.ts`, policy/onboarding code as needed

- Trace capacity from UI request through clustering, vehicle selection, commit validation, route persistence, and response totals.
- Ensure clustering cannot create a route above the selected category’s capacity. BOTH may cluster up to the largest selected capacity, but each resulting cluster must be assigned only to a feasible category before route finalization.
- For roster planning, preserve cost-based category selection among feasible vehicles and ensure all relevant custom capacities are used by both LOGIN and LOGOUT solvers.
- For Live Shift Optimize, assign each route one persisted category, never BOTH. Use a single request/allocation workflow; do not call optimization twice against requests whose status changes after the first call.
- Verify persisted route `vehicleCategory`, `maxCapacity`, and passenger count agree. Enforce the same category/capacity limits in the commit path.
- Return sedan/SUV route counts by direction and in aggregate. A partial batch aggregates successful plans only.
- Validate existing tenant policy records safely. Do not rely solely on changing the database default; cap or migrate existing values deliberately, with a reversible migration plan where data is changed.

**Exit criteria:** mixed-fleet tests cover configurable lower capacities, exact category boundaries, over-capacity rejection, deterministic assignment, no duplicate/missing employees, correct route-category totals, and real mixed output for a fixture that requires both categories.

### Phase D — Complete time, dwell, and commit reliability

**Files:** `corporate-route-planner.service.ts`, `cvrptw-cluster-solver.ts`, `route-solver.service.ts`, controller, Ops planner

- Remove fixed two-minute LOGOUT drop dwell and use the validated configured employee-stop dwell. Preserve zero dwell at the office.
- Ensure all departure/arrival calculations, ETA sequences, and persisted `dwellBufferSeconds` use the selected dwell and the correct direction.
- Ensure LOGIN and LOGOUT commit calls use their actual per-direction date/time and direction; BOTH must never be persisted.
- Keep each direction commit transaction independent and return explicit per-direction outcomes. Failed direction transactions must roll back; a successful direction remains clearly successful.
- Make retries safe: successful route groups must not be re-committed when retrying the failed direction. Backend duplicate-assignment checks remain authoritative, and UI selection state must identify committed route groups, not just direction labels.
- Prevent route/cab selection collisions in the combined UI result. If cab numbers are display-only, keep them globally unique in the batch; use stable route identifiers for selection and commit payloads.
- Surface exact committed directions and route/stop totals. Do not show a generic success banner for a partial result.

**Exit criteria:** tests demonstrate direction-correct stop ordering and timestamps, rollback on one-direction commit failure, safe retry of only the failed direction, duplicate assignment rejection, and no direction/cab collisions.

### Phase E — Complete routing controls in both planning paths

**Files:** `planner/page.tsx`, `opsClient.ts`, `routing.types.ts`, controller, travel-time matrix interface/Google adapter and solver as required

- Keep the primary strategy mutually exclusive and expose all currently supported values without describing traffic-unaware routing as a guaranteed shortest path.
- Keep toll and highway avoidance independently configurable.
- Verify roster requests carry the selected strategy and both modifiers through multipart parsing into Google route requests.
- Add equivalent routing options to Live Shift Optimize only if the underlying matrix/solver path can honor them. Extend the matrix port/options contract and Google adapter as required; if a provider cannot honor a modifier, return an explicit warning rather than silently ignoring it.
- If an option is intentionally unsupported for Live Shift, clearly disable/label it for that mode instead of implying it takes effect.
- Confirm every displayed routing option affects the backend request, and every accepted backend option affects the provider payload.

**Exit criteria:** adapter/request tests assert strategy, toll, and highway values for both roster and Live Shift paths; unsupported-provider behavior is explicit and tested.

### Phase F — Correct Live Shift summaries and UI behavior

**Files:** `planner/page.tsx`, `opsClient.ts`, `opsTypes.ts`

- Use the typed single/batch response union without `any`.
- For a single result, display actual API totals. For BOTH, display aggregate totals and a per-direction result table/card.
- Display `unassignedRequests` and direction failures; do not infer a successful total from a legacy array fallback.
- Disable duplicate submissions while running; preserve successful direction results when the other direction fails.
- Add UI tests for LOGIN-only, LOGOUT-only, BOTH field visibility, required-time validation, payload shape, partial result rendering, route/passenger/unassigned aggregation, and retry/commit state.
- Keep accessibility: associated labels, keyboard-operable controls, error announcements, and explicit status text.

**Exit criteria:** UI tests fail if direction/time payloads or displayed totals disagree with API response fixtures.

### Phase G — Complete distance and validation regression coverage

**Files:** `corporate-route-planner.spec.ts`, controller/service specs, route commit tests

Add focused coverage that exercises actual behavior, not only helper functions:

- Catchment and max-trip exact equality and just-outside boundaries using real coordinates/distances.
- Each exclusion reason, including both constraints exceeded; excluded people never appear in any route or committed stop.
- Invalid and valid HTTP request values for catchment, max trip, dwell, buffer, capacities, date, and times.
- Explicitly defined all-employees-excluded behavior with an empty route list and complete exclusion details.
- Roster LOGIN/LOGOUT time-column parsing, direction-specific fallback, malformed time errors, and no cross-direction fallback.
- Commit DTO validation rejects invalid dwell; it does not clamp malformed input.

**Exit criteria:** API tests verify status codes, response shapes, and persisted results; there are no tests that merely assert the internal validator’s implementation.

### Phase H — Integration and end-to-end acceptance

- Use a deterministic test database/provider setup; do not depend on live Google APIs for required CI tests.
- Exercise the Ops flow from roster upload through streamed batch planning, route review, selection, and direction-specific commit.
- Exercise Live Shift Optimize for LOGIN, LOGOUT, and BOTH from submitted payload through request assignment/status update, route/stop persistence, and rendered totals.
- Include injected failures: geocoder failure, one direction solver failure, one transaction failure, invalid user values, and retry after partial success.
- Confirm migrations apply to a clean database and existing policy data follows the documented capacity strategy.
- Run API and Ops typechecks, focused API suites, Ops UI tests, lint for touched files, and production builds for API/Ops.
- Run browser automation against the local app/API with mocked external map/geocoding provider. Record any environment-blocked live provider checks separately.
- Recheck `git status` and diff. Confirm unrelated board/company deletions and all unrelated worktree edits remain untouched.

**Final release gate:** all phase exit criteria pass; no open partial requirement remains. If any check cannot run, report it as a blocker and do not call the workflow production-complete.

## 5. Required focused test matrix

| Area | Required cases |
|---|---|
| Request validation | Every minimum/maximum accepted; just-below/above rejected; malformed integers, dates, and times rejected with HTTP 400 |
| Catchment/max trip | Exact boundary included; just outside excluded; reasons independently and jointly correct; excluded employee absent from planned and committed routes |
| Roster BOTH | One upload/parse/geocode pass; independent LOGIN/LOGOUT row/fallback times; per-direction progress/result/failure; one direction failure preserves the other |
| Vehicle allocation | Sedan 1–3, SUV 1–6, custom lower caps, BOTH mixed allocation, no over-capacity category, all employees assigned at most once, correct totals |
| Dwell/timing | LOGIN and LOGOUT use configured 1 and 10 minute dwell; 0/11 rejected; safety buffer 0/30 accepted and -1/31 rejected; ETA and persisted dwell agree |
| Routing | Each primary strategy maps correctly; toll and highway modifiers independently map; Live Shift path honors or explicitly rejects unsupported options |
| Commit | LOGIN/LOGOUT direction and times persist correctly; no BOTH enum; duplicate assignment rejected; direction transaction rollback; partial success and failed-only retry |
| Live Shift | API totals match actual routes/passengers/unassigned; BOTH aggregation equals successful direction summaries; partial failures visible |
| Ops UI | Conditional time fields, selected values in payload, summary accuracy, exclusion reasons, accessibility, and retry state |

## 6. Dependencies and implementation order

1. Freeze DTOs and business rules (Phase A).
2. Implement shared BOTH roster context and response contract (Phase B).
3. Implement and verify shared capacity allocation (Phase C).
4. Finish dwell/commit semantics (Phase D).
5. Extend routing options and provider mapping (Phase E).
6. Update typed UI and UI tests (Phase F).
7. Complete backend validation/regression tests (Phase G).
8. Run integration, browser E2E, migration, and release gates (Phase H).

Do not parallelize work that edits the same service/DTO/UI files until the request/response contract and capacity rules are fixed.

## 7. Out of scope for V2

- Replacing the existing solver with OR-Tools or changing its optimization objective beyond deterministic feasible vehicle assignment.
- Changing persisted route direction enums or introducing a persisted `BOTH`.
- Redesigning unrelated Ops pages or restoring the deleted board/companies pages.
- Changing catchment/max-trip to mean total driven road distance.
- Adding filters that the active routing provider cannot enforce.

---

## 8. Completion sign-off template

Complete this section only after execution; do not pre-mark items complete:

- [ ] Contract and strict backend validation complete.
- [ ] BOTH roster is one upload/parse/geocode with independent outcomes.
- [ ] Mixed capacity-aware assignment and persisted counts verified.
- [ ] LOGOUT dwell matches the selected setting.
- [ ] Directional commits, partial failures, and retry behavior verified.
- [ ] Routing strategy/modifiers verified through provider payloads.
- [ ] Live Shift response aggregation and UI tests pass.
- [ ] API and Ops typechecks, focused suites, lint, and builds pass.
- [ ] Browser E2E covers roster and Live Shift flows with deterministic providers.
- [ ] Migration and existing policy-data behavior verified.
- [ ] Worktree review confirms unrelated changes were preserved.
- [ ] Remaining limitations (if any) are explicitly documented; otherwise none.
