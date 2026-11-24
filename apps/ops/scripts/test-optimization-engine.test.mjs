import test from 'node:test';
import assert from 'node:assert/strict';

import {
  haversineDistanceKm,
  estimateRoadDistanceKm,
  estimateTravelMinutes,
  calculateBearingDegrees,
  angularDistanceDegrees,
  calculateDistanceCharge,
  calculatePassengerDetours,
  clusterEmployeesWithSweep,
  optimizeClusterPickupSequence,
  isSequenceSafetyCompliant,
  findParetoAlternativeSequence,
  schedulePickupTimes,
  isCoLocatedPickup,
  calculateGiniDetourCoefficient,
} from '../src/app/test-optimization/lib/fleetOptimizer.ts';

import {
  reoptimizeFleetDisruption,
  simulateWhatIfScenarios,
  generateExplainableAllocations,
} from '../src/app/test-optimization/lib/reoptimizer.ts';

import {
  DEFAULT_SAFETY_POLICIES,
} from '../src/app/test-optimization/types.ts';

import {
  parseRawCsv,
  validateEmployeeCsv,
} from '../src/app/test-optimization/lib/csvValidator.ts';

import {
  scoreRouteCandidates,
} from '../src/app/test-optimization/lib/scoringEngine.ts';

import {
  buildAuthoritativeGoogleMapsUrl,
  generateVehicleRouteCandidates,
} from '../src/app/test-optimization/lib/candidateGenerator.ts';

// -------------------------------------------------------------
// Test Office Hub: Mindspace IT Park, Hitec City, Hyderabad
// -------------------------------------------------------------
const OFFICE = { lat: 17.4435, lng: 78.3772 };

function makeEmployee(id, name, lat, lng, gender = 'MALE', directKm = 0) {
  const direct = directKm || Number((haversineDistanceKm(lat, lng, OFFICE.lat, OFFICE.lng) * 1.35).toFixed(1));
  return {
    id,
    name,
    phone: '+91 98765 00000',
    gender,
    pickupAddress: `Pickup Address ${name}`,
    officeAddress: 'Mindspace IT Park, Hyderabad',
    arrivalDate: '2026-11-23',
    arrivalTime: '08:00',
    lat,
    lng,
    formattedAddress: `Address ${name}`,
    directDistanceKm: direct,
  };
}

// =============================================================
// 1. D5: Spherical Great-Circle Forward Azimuth Bearing Tests
// =============================================================
test('1. D5: Spherical Forward Azimuth calculates exact navigation bearings & 0/360 wraparound', () => {
  // Due North point
  const northBearing = calculateBearingDegrees(OFFICE.lat, OFFICE.lng, OFFICE.lat + 0.1, OFFICE.lng);
  assert.ok(Math.abs(northBearing - 0) < 0.2 || Math.abs(northBearing - 360) < 0.2, `North bearing should be ~0°, got ${northBearing}`);

  // Due East point
  const eastBearing = calculateBearingDegrees(OFFICE.lat, OFFICE.lng, OFFICE.lat, OFFICE.lng + 0.1);
  assert.ok(Math.abs(eastBearing - 90) < 0.5, `East bearing should be ~90°, got ${eastBearing}`);

  // Due South point
  const southBearing = calculateBearingDegrees(OFFICE.lat, OFFICE.lng, OFFICE.lat - 0.1, OFFICE.lng);
  assert.ok(Math.abs(southBearing - 180) < 0.5, `South bearing should be ~180°, got ${southBearing}`);

  // Due West point
  const westBearing = calculateBearingDegrees(OFFICE.lat, OFFICE.lng, OFFICE.lat, OFFICE.lng - 0.1);
  assert.ok(Math.abs(westBearing - 270) < 0.5, `West bearing should be ~270°, got ${westBearing}`);

  // Minimal Angular Distance Wraparound
  assert.equal(angularDistanceDegrees(355, 5), 10, '355° to 5° should be 10°');
  assert.equal(angularDistanceDegrees(5, 355), 10, '5° to 355° should be 10°');
  assert.equal(angularDistanceDegrees(0, 180), 180, '0° to 180° should be 180°');
  assert.equal(angularDistanceDegrees(45, 90), 45, '45° to 90° should be 45°');
});

// =============================================================
// 2. D6: Production Tiered Distance Slab Pricing Tests
// =============================================================
test('2. D6: Production Tiered Distance Slabs calculate driver payout with base fees and marginal rates', () => {
  // Sedan: Fixed ₹350, 0-10km @ 14, 10-25km @ 12, >25km @ 10
  // 12 km trip: 350 + (10 * 14) + (2 * 12) = 350 + 140 + 24 = ₹514.00
  const sedan12Km = calculateDistanceCharge(12, 'SEDAN');
  assert.equal(sedan12Km, 514.0, `Sedan 12km payout expected 514.00, got ${sedan12Km}`);

  // 28 km trip: 350 + (10 * 14) + (15 * 12) + (3 * 10) = 350 + 140 + 180 + 30 = ₹700.00
  const sedan28Km = calculateDistanceCharge(28, 'SEDAN');
  assert.equal(sedan28Km, 700.0, `Sedan 28km payout expected 700.00, got ${sedan28Km}`);

  // SUV: Fixed ₹500, 0-10km @ 16, 10-25km @ 14, >25km @ 12
  // 14 km trip (Miyapur example): 500 + (10 * 16) + (4 * 14) = 500 + 160 + 56 = ₹716.00
  const suv14Km = calculateDistanceCharge(14, 'SUV');
  assert.equal(suv14Km, 716.0, `SUV 14km payout expected 716.00, got ${suv14Km}`);

  // SUV 30 km trip: 500 + (10 * 16) + (15 * 14) + (5 * 12) = 500 + 160 + 210 + 60 = ₹930.00
  const suv30Km = calculateDistanceCharge(30, 'SUV');
  assert.equal(suv30Km, 930.0, `SUV 30km payout expected 930.00, got ${suv30Km}`);
});

// =============================================================
// 3. D3: Clarke-Wright Savings with Positive Raw Savings
// =============================================================
test('3. D3: Clarke-Wright Savings strictly rejects non-positive raw savings and does not invert priorities', () => {
  // Collinear north corridor riders
  const collinearA = makeEmployee('C1', 'Collinear 1', 17.54, 78.377);
  const collinearB = makeEmployee('C2', 'Collinear 2', 17.52, 78.377);

  // Orthogonal riders in different quadrants
  const northRider = makeEmployee('N1', 'North', 17.54, 78.377);
  const southRider = makeEmployee('S1', 'South', 17.34, 78.377);

  const merged = clusterEmployeesWithSweep([northRider, southRider, collinearA, collinearB], OFFICE.lat, OFFICE.lng, 'SEDAN');
  
  // North and South must NEVER be clustered together
  for (const cluster of merged) {
    const names = cluster.passengers.map((p) => p.name);
    const hasNorth = names.some((n) => n.includes('North') || n.includes('Collinear'));
    const hasSouth = names.some((n) => n.includes('South'));
    assert.equal(hasNorth && hasSouth, false, 'Opposing corridors must never share a cab cluster');
  }
});

// =============================================================
// 4. D4: Dynamic 5-6 Passenger SUV Allocation in 'ALL' Mode
// =============================================================
test('4. D4: Dynamic 5-6 passenger cluster merges into an SUV when vehicleSelection is ALL', () => {
  // 6 collinear commuters residing along the Miyapur corridor (northwest, ~335-345°)
  const sixCollinear = [
    makeEmployee('m-1', 'Miyapur 1', 17.51, 78.34),
    makeEmployee('m-2', 'Miyapur 2', 17.50, 78.345),
    makeEmployee('m-3', 'Miyapur 3', 17.495, 78.35),
    makeEmployee('m-4', 'Miyapur 4', 17.49, 78.355),
    makeEmployee('m-5', 'Miyapur 5', 17.485, 78.36),
    makeEmployee('m-6', 'Miyapur 6', 17.48, 78.365),
  ];

  const clusters = clusterEmployeesWithSweep(sixCollinear, OFFICE.lat, OFFICE.lng, 'ALL', 50);

  // In ALL mode, 6 collinear riders should form exactly 1 SUV instead of being starved into 2 Sedans
  assert.equal(clusters.length, 1, `Expected 1 consolidated SUV cluster for 6 collinear riders, got ${clusters.length}`);
  assert.equal(clusters[0].vehicleCategory, 'SUV', `Assigned category should be SUV, got ${clusters[0].vehicleCategory}`);
  assert.equal(clusters[0].capacity, 6, `SUV capacity should be 6, got ${clusters[0].capacity}`);
  assert.equal(clusters[0].passengers.length, 6, 'All 6 passengers assigned to the SUV');
});

// =============================================================
// 5. D1: Genuine Passenger Detour (IDF) vs Route Distance Scoring
// =============================================================
test('5. D1: Individual Detour Factor (IDF) correctly measures passenger deviation without double-counting distance', () => {
  // Miyapur (P1) -> Gachibowli (P2) -> Office
  const p1 = makeEmployee('p-1', 'Miyapur', 17.495, 78.345, 'MALE', 8.0);
  const p2 = makeEmployee('p-2', 'Gachibowli', 17.44, 78.348, 'MALE', 6.0);

  const detourResults = calculatePassengerDetours([p1, p2], OFFICE.lat, OFFICE.lng);
  
  assert.equal(detourResults.details.length, 2, '2 passenger detour details calculated');
  assert.ok(detourResults.averageIdf >= 1.0, 'Average IDF must be >= 1.0');
  assert.ok(detourResults.maxIdf >= detourResults.averageIdf, 'Max IDF must be >= Average IDF');

  // Verify scoring engine decoupling: distScore and detourScore are independent
  const candA = {
    index: 0,
    candidateType: 'SHORTEST_DISTANCE',
    title: 'Option 1: Shortest Road',
    tag: 'Shortest',
    summary: 'Direct Arterials',
    description: 'Lowest distance',
    distanceMeters: 20000,
    distanceKm: 20.0,
    durationSeconds: 2400,
    durationMinutes: 40,
    formattedDistance: '20.0 km',
    formattedEta: '40 mins',
    encodedPolyline: '',
    decodedPath: [],
    isRealRoad: false,
    avoidTolls: false,
    isShortest: true,
    isFastest: false,
    googleMapsUrl: '',
    legs: [],
    orderedStopIds: ['p-1', 'p-2'],
    averageIdf: 1.10, // Excellent direct passenger commute
    maxIdf: 1.15,
    score: 0,
    scoreBreakdown: { distanceScore: 0, timeScore: 0, detourScore: 0, utilizationScore: 0, costScore: 0 },
    recommendationReason: '',
    deltaVsBest: { kmDelta: 0, minDelta: 0, pctDelta: 0 },
  };

  const candB = {
    index: 1,
    candidateType: 'FASTEST_JOURNEY',
    title: 'Option 2: Fastest Journey',
    tag: 'Fastest',
    summary: 'Highway Bypass',
    description: 'Fastest ETA with high detour',
    distanceMeters: 26000,
    distanceKm: 26.0,
    durationSeconds: 1500,
    durationMinutes: 25, // 15 mins faster!
    formattedDistance: '26.0 km',
    formattedEta: '25 mins',
    encodedPolyline: '',
    decodedPath: [],
    isRealRoad: false,
    avoidTolls: false,
    isShortest: false,
    isFastest: true,
    googleMapsUrl: '',
    legs: [],
    orderedStopIds: ['p-1', 'p-2'],
    averageIdf: 1.45, // Heavy passenger detour
    maxIdf: 1.55,
    score: 0,
    scoreBreakdown: { distanceScore: 0, timeScore: 0, detourScore: 0, utilizationScore: 0, costScore: 0 },
    recommendationReason: '',
    deltaVsBest: { kmDelta: 0, minDelta: 0, pctDelta: 0 },
  };

  const scored = scoreRouteCandidates([candA, candB], 'BALANCED', 4, 2, 'SEDAN');
  
  // Under reformed scoring, distScore and detourScore are NOT identical!
  assert.notEqual(scored[1].scoreBreakdown.distanceScore, scored[1].scoreBreakdown.detourScore,
    'Distance score and Detour score must be mathematically decoupled');
  assert.ok(scored[0].scoreBreakdown.detourScore > scored[1].scoreBreakdown.detourScore,
    'Candidate A with low IDF must score higher on detour fairness than Candidate B');
});

// =============================================================
// 6. D7: Female Passenger Night-Shift Safety Rule (20:00–06:00)
// =============================================================
test('6. D7: Female Passenger Night Safety enforces male at Stop 0 on night LOGIN shifts', () => {
  const femaleRider = makeEmployee('f-1', 'Priya (Female)', 17.52, 78.37, 'FEMALE');
  const maleRider1 = makeEmployee('m-1', 'Rohan (Male)', 17.49, 78.375, 'MALE');
  const maleRider2 = makeEmployee('m-2', 'Vikram (Male)', 17.46, 78.377, 'MALE');

  const mixedCluster = [femaleRider, maleRider1, maleRider2];

  // Day shift (08:00 AM) - Inward flow starts at furthest rider (Priya)
  const dayResult = optimizeClusterPickupSequence(mixedCluster, OFFICE.lat, OFFICE.lng, 'MIN_DISTANCE', {
    isNightShift: false,
    isLogout: false,
    hasEscort: false,
  });
  assert.equal(dayResult.orderedPassengers[0].gender, 'FEMALE', 'Day shift allows furthest rider to be first pickup');
  assert.equal(dayResult.safetyCompliant, true);

  // Night shift (02:00 AM) - Hard safety constraint: female MUST NOT be first pickup in mixed cab!
  const nightResult = optimizeClusterPickupSequence(mixedCluster, OFFICE.lat, OFFICE.lng, 'MIN_DISTANCE', {
    isNightShift: true,
    isLogout: false,
    hasEscort: false,
  });
  assert.equal(nightResult.orderedPassengers[0].gender, 'MALE', 'Night shift LOGIN requires a MALE rider as first pickup');
  assert.equal(nightResult.safetyCompliant, true, 'Result marked safetyCompliant = true');
  assert.equal(nightResult.escortRequired, false, 'Escort not required because a male took edge seat');

  // All-female night cab - Allowed without error
  const allFemale = [
    makeEmployee('f-1', 'Priya', 17.52, 78.37, 'FEMALE'),
    makeEmployee('f-2', 'Sneha', 17.49, 78.375, 'FEMALE'),
  ];
  const allFemaleResult = optimizeClusterPickupSequence(allFemale, OFFICE.lat, OFFICE.lng, 'MIN_DISTANCE', {
    isNightShift: true,
    isLogout: false,
    hasEscort: false,
  });
  assert.equal(allFemaleResult.safetyCompliant, true, 'All-female cab is inherently compliant');
});

// =============================================================
// 7. Scheduling & Co-Located (0km) Stop Synchronization
// =============================================================
test('7. Scheduling correctly groups co-located 0km passengers with identical pickup time & handles midnight crossovers', () => {
  // Two co-located riders at same apartment complex (0 km) + 1 other rider
  const distantRider = makeEmployee('r-1', 'Rider 1 (Distant)', 17.50, 78.35);
  const coLocatedRider1 = makeEmployee('r-2', 'Rider 2 (Gate A)', 17.4410, 78.3800);
  const coLocatedRider2 = makeEmployee('r-3', 'Rider 3 (Gate A - 0km)', 17.4410, 78.3800); // 0 km from Rider 2

  // Shift at 00:20 (Midnight crossover + co-located pickups)
  const sched = schedulePickupTimes([distantRider, coLocatedRider1, coLocatedRider2], 40, '00:20', 5, 10);
  
  assert.equal(sched.scheduledPassengers.length, 3, 'All 3 passengers scheduled');
  assert.ok(sched.arrivalTimeStr.includes(':'), 'Valid buffer arrival time formatted');
  assert.ok(sched.departureTimeStr.includes(':'), 'Valid departure time formatted');
  assert.ok(!sched.departureTimeStr.includes('NaN'), 'Departure time must not contain NaN');

  // Industry Standard: Co-located 0km riders share the EXACT same pickup time!
  assert.equal(
    sched.scheduledPassengers[1].estimatedPickupTime,
    sched.scheduledPassengers[2].estimatedPickupTime,
    'Co-located riders at same 0km location MUST share the exact same pickup time'
  );
  assert.equal(
    sched.scheduledPassengers[1].pickupSequence,
    sched.scheduledPassengers[2].pickupSequence,
    'Co-located riders must share the same physical stop index'
  );
});

// =============================================================
// 8. Scale & Performance Stress Benchmarks (5, 25, 50, 100, 200, 500 Commuters)
// =============================================================
test('8. Scalability benchmarks: Solves 5 to 500 commuters within performance budgets', () => {
  const scaleBudgets = {
    5: 100,
    25: 150,
    50: 300,
    100: 800,
    200: 2500,
    500: 12000,
  };

  for (const count of [5, 25, 50, 100, 200, 500]) {
    const scaleEmps = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 2 * Math.PI;
      return makeEmployee(
        `scale-${i + 1}`,
        `Commuter ${i + 1}`,
        OFFICE.lat + Math.sin(angle) * 0.08,
        OFFICE.lng + Math.cos(angle) * 0.08,
        i % 3 === 0 ? 'FEMALE' : 'MALE',
        12.0,
      );
    });

    const tStart = Date.now();
    const clusters = clusterEmployeesWithSweep(scaleEmps, OFFICE.lat, OFFICE.lng, 'ALL', 50);
    const elapsedMs = Date.now() - tStart;

    console.log(`  ⚡ Solved N = ${count} commuters -> ${clusters.length} cabs in ${elapsedMs} ms`);
    const budget = scaleBudgets[count] || 5000;
    assert.ok(elapsedMs < budget, `Scale test N=${count} must solve in under ${budget}ms (took ${elapsedMs}ms)`);
  }
});

// =============================================================
// 9. Industry Standard 2-Route Candidate Evaluation
// =============================================================
test('9. Candidate Generator suggests exactly 2 routes (Best Route & Alternative) matching industry standard', async () => {
  const riders = [
    makeEmployee('r-1', 'Rider 1', 17.44, 78.38),
    makeEmployee('r-2', 'Rider 2', 17.45, 78.37),
    makeEmployee('r-3', 'Rider 3', 17.47, 78.35),
  ];
  const { candidates } = await generateVehicleRouteCandidates(
    riders,
    OFFICE.lat,
    OFFICE.lng,
    'Mindspace IT Park, Hyderabad',
  );
  assert.equal(candidates.length, 2, 'Must generate exactly 2 routes per cab according to industry standard');
  assert.equal(candidates[0].isRecommended, true, 'Option 1 is Best Route (Recommended ★)');
  assert.ok(candidates[0].orderedPassengers && candidates[0].orderedPassengers.length === 3, 'Attaches ordered passengers');
});

// =============================================================
// 10. Distant Stops Isolation & Co-Location Guard (Tarnaka vs Peerzadiguda)
// =============================================================
test('10. Distant Stops Isolation: Never merges distinct distant localities (e.g. Tarnaka vs Peerzadiguda)', () => {
  const tarnakaEmp = {
    id: 'emp-1',
    name: 'Manoj Shetty',
    gender: 'MALE',
    pickupAddress: 'Tarnaka Main Road, Tarnaka, Hyderabad',
    formattedAddress: 'Tarnaka Main Rd, Tarnaka, Secunderabad, Telangana 500017',
    lat: 17.429183,
    lng: 78.533607,
  };

  const peerzadigudaEmp = {
    id: 'emp-2',
    name: 'Naveena Rao',
    gender: 'FEMALE',
    pickupAddress: 'Peerzadiguda Main Road, Peerzadiguda, Hyderabad',
    formattedAddress: 'Peerzadiguda Rd, Peerzadiguda, Hyderabad, Telangana 500098',
    lat: 17.394826,
    lng: 78.593991,
  };

  // Distance between Tarnaka and Peerzadiguda is ~7.46 km Haversine / ~8.7 km road
  const dist = haversineDistanceKm(tarnakaEmp.lat, tarnakaEmp.lng, peerzadigudaEmp.lat, peerzadigudaEmp.lng);
  assert.ok(dist > 5.0, `Tarnaka to Peerzadiguda distance must be > 5.0 km (actual: ${dist} km)`);

  // Co-location check MUST return false
  const isCoLocated = isCoLocatedPickup(tarnakaEmp, peerzadigudaEmp);
  assert.equal(isCoLocated, false, 'Tarnaka and Peerzadiguda must NEVER be classified as co-located');

  // Even if a faulty geocoder returned identical coordinates, locality conflict guard must prevent merge
  const faultyGeocodeEmp = { ...peerzadigudaEmp, lat: tarnakaEmp.lat, lng: tarnakaEmp.lng };
  const localityConflictBlocked = isCoLocatedPickup(tarnakaEmp, faultyGeocodeEmp);
  assert.equal(localityConflictBlocked, false, 'Locality conflict guard must block co-location when address names differ');

  // Schedule pickup times must assign distinct stop indices and pickup times
  const sched = schedulePickupTimes([tarnakaEmp, peerzadigudaEmp], 50, '07:50', 5, 10, [
    { distanceKm: 8.7, durationMinutes: 21 },
  ]);

  assert.equal(sched.scheduledPassengers.length, 2);
  assert.equal(sched.scheduledPassengers[0].pickupSequence, 1, 'Stop #1 for Manoj Shetty');
  assert.equal(sched.scheduledPassengers[1].pickupSequence, 2, 'Stop #2 for Naveena Rao');
  assert.notEqual(
    sched.scheduledPassengers[0].estimatedPickupTime,
    sched.scheduledPassengers[1].estimatedPickupTime,
    'Pickup times must be distinct and reflect 21 min transit + dwell'
  );

  // Missing coordinate guard: (0,0) must not return 0 km
  const missingCoordDist = haversineDistanceKm(0, 0, tarnakaEmp.lat, tarnakaEmp.lng);
  assert.ok(missingCoordDist > 100, 'Missing coordinates (0,0) must not return 0 km');
});

// =============================================================
// 11. Balanced Auto-Assign: Sedans As Primary Fleet Workhorses
// =============================================================
test('11. Auto-assign allocates Sedans for standard groups and prevents forced SUV clustering', () => {
  // 4 employees in western corridor -> MUST be 1 Sedan
  const fourWest = [
    makeEmployee('w-1', 'West 1', 17.45, 78.36),
    makeEmployee('w-2', 'West 2', 17.46, 78.35),
    makeEmployee('w-3', 'West 3', 17.47, 78.34),
    makeEmployee('w-4', 'West 4', 17.48, 78.33),
  ];
  const clusters4 = clusterEmployeesWithSweep(fourWest, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters4.length, 1);
  assert.equal(clusters4[0].vehicleCategory, 'SEDAN', '4 passengers must be assigned a SEDAN');
  assert.equal(clusters4[0].capacity, 4);

  // 8 employees across corridors -> MUST be 2 balanced Sedans (4 + 4), NOT 1 SUV (6) + 1 Sedan (2)
  const eightEmps = [
    ...fourWest,
    makeEmployee('e-1', 'East 1', 17.43, 78.41),
    makeEmployee('e-2', 'East 2', 17.42, 78.42),
    makeEmployee('e-3', 'East 3', 17.41, 78.43),
    makeEmployee('e-4', 'East 4', 17.40, 78.44),
  ];
  const clusters8 = clusterEmployeesWithSweep(eightEmps, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters8.length, 2);
  assert.equal(clusters8[0].vehicleCategory, 'SEDAN', 'Cab 1 should be a SEDAN');
  assert.equal(clusters8[1].vehicleCategory, 'SEDAN', 'Cab 2 should be a SEDAN');
  assert.equal(clusters8[0].passengers.length, 4, 'Cab 1 has 4 passengers');
  assert.equal(clusters8[1].passengers.length, 4, 'Cab 2 has 4 passengers');

  // 6 divergent employees (3 North, 3 South) -> MUST remain as 2 separate Sedans, NOT crammed into 1 SUV
  const divergent6 = [
    makeEmployee('n-1', 'North 1', 17.51, 78.38),
    makeEmployee('n-2', 'North 2', 17.52, 78.38),
    makeEmployee('n-3', 'North 3', 17.53, 78.38),
    makeEmployee('s-1', 'South 1', 17.36, 78.38),
    makeEmployee('s-2', 'South 2', 17.35, 78.38),
    makeEmployee('s-3', 'South 3', 17.34, 78.38),
  ];
  const clustersDivergent = clusterEmployeesWithSweep(divergent6, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clustersDivergent.length, 2, 'Divergent groups must not merge into an SUV');
  assert.equal(clustersDivergent[0].vehicleCategory, 'SEDAN', 'North group must be SEDAN');
  assert.equal(clustersDivergent[1].vehicleCategory, 'SEDAN', 'South group must be SEDAN');
});

// =========================================================================
// SECTION 11 MANDATORY REGRESSION TEST SUITE (15 SCENARIOS)
// =========================================================================

// Scenario 1: 3 nearby employees -> 1 Sedan
test('12. Scenario 1: 3 nearby employees assign to exactly 1 Sedan with valid tiered payout', () => {
  const threeRiders = [
    makeEmployee('s1-1', 'Rider 1', 17.46, 78.36),
    makeEmployee('s1-2', 'Rider 2', 17.465, 78.355),
    makeEmployee('s1-3', 'Rider 3', 17.47, 78.35),
  ];
  const clusters = clusterEmployeesWithSweep(threeRiders, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 1, '3 nearby riders must form exactly 1 cab');
  assert.equal(clusters[0].vehicleCategory, 'SEDAN', 'Vehicle must be a SEDAN');
  assert.equal(clusters[0].capacity, 4, 'Sedan capacity is 4');
  assert.equal(clusters[0].passengers.length, 3, 'All 3 riders assigned');

  const payout = calculateDistanceCharge(clusters[0].totalDirectSumKm, 'SEDAN');
  assert.ok(payout > 350.0, 'Payout includes base fixed fee');
});

// Scenario 2: 4 nearby employees -> 1 Sedan
test('13. Scenario 2: 4 nearby employees assign to 1 Sedan, fully utilizing capacity', () => {
  const fourRiders = [
    makeEmployee('s2-1', 'Rider 1', 17.45, 78.36),
    makeEmployee('s2-2', 'Rider 2', 17.455, 78.355),
    makeEmployee('s2-3', 'Rider 3', 17.46, 78.35),
    makeEmployee('s2-4', 'Rider 4', 17.465, 78.345),
  ];
  const clusters = clusterEmployeesWithSweep(fourRiders, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 1, '4 nearby riders must form 1 cab');
  assert.equal(clusters[0].vehicleCategory, 'SEDAN', 'Vehicle must be a SEDAN');
  assert.equal(clusters[0].capacity, 4);
  assert.equal(clusters[0].passengers.length, 4);
});

// Scenario 3: 5 compatible employees -> 1 SUV (in ALL mode)
test('14. Scenario 3: 5 compatible employees merge into 1 SUV rather than 2 Sedans', () => {
  const fiveCollinear = [
    makeEmployee('s3-1', 'Collinear 1', 17.51, 78.34),
    makeEmployee('s3-2', 'Collinear 2', 17.50, 78.345),
    makeEmployee('s3-3', 'Collinear 3', 17.495, 78.35),
    makeEmployee('s3-4', 'Collinear 4', 17.49, 78.355),
    makeEmployee('s3-5', 'Collinear 5', 17.485, 78.36),
  ];
  const clusters = clusterEmployeesWithSweep(fiveCollinear, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 1, '5 compatible riders must form 1 consolidated vehicle');
  assert.equal(clusters[0].vehicleCategory, 'SUV', 'Assigned category must be SUV');
  assert.equal(clusters[0].capacity, 6, 'SUV capacity must be 6');
  assert.equal(clusters[0].passengers.length, 5);
});

// Scenario 4: 6 collinear employees -> 1 SUV
test('15. Scenario 4: 6 collinear employees assign to 1 SUV, fully utilizing 6-seat capacity', () => {
  const sixCollinear = [
    makeEmployee('s4-1', 'Collinear 1', 17.51, 78.34),
    makeEmployee('s4-2', 'Collinear 2', 17.50, 78.345),
    makeEmployee('s4-3', 'Collinear 3', 17.495, 78.35),
    makeEmployee('s4-4', 'Collinear 4', 17.49, 78.355),
    makeEmployee('s4-5', 'Collinear 5', 17.485, 78.36),
    makeEmployee('s4-6', 'Collinear 6', 17.48, 78.365),
  ];
  const clusters = clusterEmployeesWithSweep(sixCollinear, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 1, '6 collinear riders must form 1 SUV');
  assert.equal(clusters[0].vehicleCategory, 'SUV');
  assert.equal(clusters[0].capacity, 6);
  assert.equal(clusters[0].passengers.length, 6);
});

// Scenario 5: 6 geographically divergent employees -> 2 Sedans
test('16. Scenario 5: 6 geographically divergent employees (3 North, 3 South) separate into 2 Sedans', () => {
  const divergent = [
    makeEmployee('s5-n1', 'North 1', 17.51, 78.38),
    makeEmployee('s5-n2', 'North 2', 17.52, 78.38),
    makeEmployee('s5-n3', 'North 3', 17.53, 78.38),
    makeEmployee('s5-s1', 'South 1', 17.36, 78.38),
    makeEmployee('s5-s2', 'South 2', 17.35, 78.38),
    makeEmployee('s5-s3', 'South 3', 17.34, 78.38),
  ];
  const clusters = clusterEmployeesWithSweep(divergent, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 2, 'Divergent groups must form 2 separate vehicles');
  assert.equal(clusters[0].vehicleCategory, 'SEDAN', 'Vehicle 1 must be SEDAN');
  assert.equal(clusters[1].vehicleCategory, 'SEDAN', 'Vehicle 2 must be SEDAN');
  assert.equal(clusters[0].passengers.length, 3);
  assert.equal(clusters[1].passengers.length, 3);
});

// Scenario 6: Mixed clusters across different city corridors -> separate Sedans
test('17. Scenario 6: Mixed clusters across East and West corridors stay cleanly separated', () => {
  const mixed = [
    makeEmployee('s6-w1', 'West 1', 17.45, 78.36),
    makeEmployee('s6-w2', 'West 2', 17.46, 78.35),
    makeEmployee('s6-w3', 'West 3', 17.47, 78.34),
    makeEmployee('s6-e1', 'East 1', 17.43, 78.50),
    makeEmployee('s6-e2', 'East 2', 17.42, 78.51),
    makeEmployee('s6-e3', 'East 3', 17.41, 78.52),
  ];
  const clusters = clusterEmployeesWithSweep(mixed, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 2, 'Opposing East/West corridors must be separated');
  for (const c of clusters) {
    assert.equal(c.vehicleCategory, 'SEDAN');
    assert.equal(c.passengers.length, 3);
  }
});

// Scenario 7: SUV versus two-Sedan cost comparison
test('18. Scenario 7: Economic comparison demonstrates 1 SUV is cheaper than 2 Sedans for 5-6 collinear riders', () => {
  // 1 SUV doing 14 km (Miyapur): Base ₹500 + 10km@16 + 4km@14 = ₹716.00
  const suvCost = calculateDistanceCharge(14, 'SUV');
  assert.equal(suvCost, 716.0);

  // 2 Sedans doing 12 km each: 2 * (Base ₹350 + 10km@14 + 2km@12) = 2 * 514 = ₹1028.00
  const twoSedansCost = calculateDistanceCharge(12, 'SEDAN') * 2;
  assert.equal(twoSedansCost, 1028.0);

  // 1 SUV saves ₹312.00 in direct driver payout + eliminates 1 cab deployment overhead!
  const directPayoutSavings = twoSedansCost - suvCost;
  assert.equal(directPayoutSavings, 312.0, '1 SUV saves ₹312 in driver payout vs 2 Sedans');
  assert.ok(directPayoutSavings > 0, '1 SUV is strictly more cost-effective');
});

// Scenario 8: Large group requiring multiple vehicles (12 collinear employees)
test('19. Scenario 8: 12 collinear employees in one corridor allocate into 2 SUVs (not 3 Sedans)', () => {
  const twelveCollinear = Array.from({ length: 12 }, (_, i) =>
    makeEmployee(`s8-${i + 1}`, `Collinear ${i + 1}`, 17.52 - i * 0.005, 78.34 + i * 0.003),
  );
  const clusters = clusterEmployeesWithSweep(twelveCollinear, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 2, '12 collinear riders must be packed into exactly 2 vehicles');
  assert.equal(clusters[0].vehicleCategory, 'SUV', 'Cab 1 is an SUV');
  assert.equal(clusters[1].vehicleCategory, 'SUV', 'Cab 2 is an SUV');
  assert.equal(clusters[0].passengers.length, 6, 'Cab 1 has 6 passengers');
  assert.equal(clusters[1].passengers.length, 6, 'Cab 2 has 6 passengers');
});

// Scenario 9: A cluster that becomes infeasible after route calculation (> 50 km)
test('20. Scenario 9: Infeasible cluster exceeding maxTripKm is split into separate vehicles', () => {
  // Two commuters 60 km apart from each other
  const farNorth = makeEmployee('s9-n', 'Far North (45km)', 17.85, 78.37);
  const farSouth = makeEmployee('s9-s', 'Far South (45km)', 17.03, 78.37);

  const clusters = clusterEmployeesWithSweep([farNorth, farSouth], OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(clusters.length, 2, 'Far divergent riders must not merge into single infeasible cab');
});

// Scenario 10: Passenger with excessive IDF
test('21. Scenario 10: Passenger detour calculations identify and report excessive IDF', () => {
  const p1 = makeEmployee('s10-1', 'Near P1', 17.46, 78.37, 'MALE', 5.0);
  const p2 = makeEmployee('s10-2', 'Far Outlier P2', 17.48, 78.50, 'MALE', 15.0);

  const detourResults = calculatePassengerDetours([p1, p2], OFFICE.lat, OFFICE.lng);
  assert.ok(detourResults.maxIdf > 1.0, 'Detour factor measures deviation ratio');
  assert.ok(typeof detourResults.averageIdf === 'number', 'Calculates valid average IDF');
});

// Scenario 11: Night safety restrictions (LOGIN female edge-seat guard)
test('22. Scenario 11: Night safety restrictions enforce male at stop 0 on LOGIN shifts', () => {
  const femaleRider = makeEmployee('s11-f', 'Ananya (Female)', 17.52, 78.37, 'FEMALE');
  const maleRider = makeEmployee('s11-m', 'Karthik (Male)', 17.49, 78.375, 'MALE');

  const seq = optimizeClusterPickupSequence([femaleRider, maleRider], OFFICE.lat, OFFICE.lng, 'MIN_DISTANCE', {
    isNightShift: true,
    isLogout: false,
    hasEscort: false,
  });

  assert.equal(seq.orderedPassengers[0].gender, 'MALE', 'Male commuter MUST be first pickup on night shift');
  assert.equal(seq.safetyCompliant, true);
  assert.equal(seq.escortRequired, false);
});

// Scenario 12: Limited vehicle availability (SEDAN-only and SUV-only modes)
test('23. Scenario 12: Limited vehicle availability constraints enforce strict vehicle types', () => {
  const sixCollinear = Array.from({ length: 6 }, (_, i) =>
    makeEmployee(`s12-${i + 1}`, `Collinear ${i + 1}`, 17.50 - i * 0.005, 78.35),
  );

  // SEDAN only mode: 6 employees cannot fit in 1 vehicle (capacity 4) -> must deploy 2 Sedans, 0 SUVs!
  const sedanOnly = clusterEmployeesWithSweep(sixCollinear, OFFICE.lat, OFFICE.lng, 'SEDAN', 50);
  assert.equal(sedanOnly.length, 2, 'Must deploy 2 vehicles under SEDAN constraint');
  assert.equal(sedanOnly[0].vehicleCategory, 'SEDAN');
  assert.equal(sedanOnly[1].vehicleCategory, 'SEDAN');
  assert.ok(sedanOnly[0].passengers.length <= 4);
  assert.ok(sedanOnly[1].passengers.length <= 4);

  // SUV only mode: 3 employees must still be assigned an SUV
  const threeRiders = sixCollinear.slice(0, 3);
  const suvOnly = clusterEmployeesWithSweep(threeRiders, OFFICE.lat, OFFICE.lng, 'SUV', 50);
  assert.equal(suvOnly.length, 1);
  assert.equal(suvOnly[0].vehicleCategory, 'SUV', 'Must deploy SUV when vehicleSelection is SUV');
  assert.equal(suvOnly[0].capacity, 6);
});

// Scenario 13: Employee assigned exactly once (Zero duplicate, zero omitted)
test('24. Scenario 13: Invariant - Every input employee is assigned to the fleet exactly once', () => {
  const emps = Array.from({ length: 20 }, (_, i) =>
    makeEmployee(`s13-${i + 1}`, `Emp ${i + 1}`, 17.44 + (i % 5) * 0.02, 78.35 + Math.floor(i / 5) * 0.02),
  );

  const clusters = clusterEmployeesWithSweep(emps, OFFICE.lat, OFFICE.lng, 'ALL', 50);

  const assignedMap = new Map();
  for (const c of clusters) {
    for (const p of c.passengers) {
      assignedMap.set(p.id, (assignedMap.get(p.id) || 0) + 1);
    }
  }

  assert.equal(assignedMap.size, 20, 'All 20 employees must be assigned');
  for (const [id, count] of assignedMap.entries()) {
    assert.equal(count, 1, `Employee ${id} must appear exactly once, appeared ${count} times`);
  }
});

// Scenario 14: No feasible fleet configuration / empty input handled gracefully
test('25. Scenario 14: Handles empty or single-rider datasets safely without runtime exceptions', () => {
  const emptyRes = clusterEmployeesWithSweep([], OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.deepEqual(emptyRes, [], 'Empty employee list returns empty fleet array');

  const singleEmp = [makeEmployee('s14-1', 'Solo Commuter', 17.45, 78.36)];
  const singleRes = clusterEmployeesWithSweep(singleEmp, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  assert.equal(singleRes.length, 1);
  assert.equal(singleRes[0].passengers.length, 1);
});

// Scenario 15: Deterministic output for identical input
test('26. Scenario 15: Engine produces 100% deterministic fleet allocations on identical inputs', () => {
  const testEmps = Array.from({ length: 15 }, (_, i) =>
    makeEmployee(`s15-${i + 1}`, `Emp ${i + 1}`, 17.44 + (i % 4) * 0.015, 78.36 + Math.floor(i / 4) * 0.015),
  );

  const run1 = clusterEmployeesWithSweep(testEmps, OFFICE.lat, OFFICE.lng, 'ALL', 50);
  const run2 = clusterEmployeesWithSweep(testEmps, OFFICE.lat, OFFICE.lng, 'ALL', 50);

  assert.equal(run1.length, run2.length, 'Cab counts must match');
  for (let i = 0; i < run1.length; i++) {
    assert.equal(run1[i].vehicleCategory, run2[i].vehicleCategory, `Cab ${i} category matches`);
    assert.equal(run1[i].capacity, run2[i].capacity, `Cab ${i} capacity matches`);
    assert.equal(run1[i].passengers.length, run2[i].passengers.length, `Cab ${i} passenger count matches`);
    const ids1 = run1[i].passengers.map((p) => p.id).join(',');
    const ids2 = run2[i].passengers.map((p) => p.id).join(',');
    assert.equal(ids1, ids2, `Cab ${i} passenger order must be 100% deterministic`);
  }
});

// Scenario 16: Physical fleet quota limits & unassigned commuter reporting
test('27. Scenario 16: Physical fleet quota restricts deployment and reports unassigned employees', () => {
  // 12 collinear employees (normally allocated into 2 SUVs or 3 Sedans)
  const testEmps = Array.from({ length: 12 }, (_, i) =>
    makeEmployee(`s16-${i + 1}`, `Emp ${i + 1}`, 17.44 + (i + 1) * 0.008, 78.36 + (i + 1) * 0.008),
  );

  // Restrict fleet to only 1 SUV and 0 Sedans
  const constrainedFleet = clusterEmployeesWithSweep(
    testEmps,
    OFFICE.lat,
    OFFICE.lng,
    'SUV',
    50,
    { availableSUVs: 1, availableSedans: 0 },
  );

  assert.equal(constrainedFleet.length, 1, 'Only 1 SUV permitted by physical inventory');
  assert.equal(constrainedFleet[0].vehicleCategory, 'SUV');
  assert.ok(constrainedFleet[0].passengers.length <= 6, 'SUV capacity must not exceed 6');
  assert.ok(constrainedFleet.unassignedEmployees, 'Must return unassigned employees list');
  assert.equal(constrainedFleet.unassignedEmployees.length, 6, '6 employees must remain unassigned');
  assert.equal(constrainedFleet.unassignedEmployees[0].reason, 'FLEET_EXHAUSTED');
});

// Scenario 17: Vehicle substitution under fleet shortages (Sedan -> SUV)
test('28. Scenario 17: Automatically substitutes SUV when Sedan quota is exhausted', () => {
  const testEmps = Array.from({ length: 4 }, (_, i) =>
    makeEmployee(`s17-${i + 1}`, `Emp ${i + 1}`, 17.45 + i * 0.005, 78.36 + i * 0.005),
  );

  // 0 Sedans available, but 2 SUVs available
  const result = clusterEmployeesWithSweep(
    testEmps,
    OFFICE.lat,
    OFFICE.lng,
    'ALL',
    50,
    { availableSedans: 0, availableSUVs: 2 },
  );

  assert.equal(result.length, 1, '1 vehicle deployed');
  assert.equal(result[0].vehicleCategory, 'SUV', 'Substituted to SUV because Sedans were exhausted');
  assert.equal(result[0].passengers.length, 4);
});

// Scenario 18: Gini Detour Fairness Coefficient Calculation
test('29. Scenario 18: Gini Detour Fairness Coefficient calculates equitable distribution', () => {
  // Equal detours -> Gini = 0
  const equalIdfs = [1.15, 1.15, 1.15, 1.15];
  assert.equal(calculateGiniDetourCoefficient(equalIdfs), 0.0, 'Equal detours have Gini 0');

  // Skewed detours -> Gini > 0
  const skewedIdfs = [1.0, 1.1, 1.2, 1.6];
  const gini = calculateGiniDetourCoefficient(skewedIdfs);
  assert.ok(gini > 0.05 && gini < 0.25, `Expected reasonable Gini, got ${gini}`);
});

// Scenario 19: Dynamic Re-Optimization on Vehicle Breakdown
test('30. Scenario 19: Dynamic Re-Optimization absorbs broken down vehicle into adjacent spare seats', () => {
  const cab1 = {
    clusterId: 'CAB-1',
    cabIndex: 1,
    vehicleCategory: 'SEDAN',
    capacity: 4,
    passengerCount: 2,
    officeAddress: 'Mindspace IT Park, Hyderabad',
    officeLat: OFFICE.lat,
    officeLng: OFFICE.lng,
    departure: '07:15 AM',
    arrival: '08:00 AM',
    distanceKm: 14.0,
    driveMinutes: 30,
    driverPayout: 400,
    corporateRevenue: 750,
    projectedMargin: 350,
    passengers: [
      makeEmployee('c1-1', 'Emp 1', 17.46, 78.36),
      makeEmployee('c1-2', 'Emp 2', 17.47, 78.362),
    ],
    routeOptions: [],
    selectedRouteIndex: 0,
    totalDirectKm: 25,
    savedDistanceKm: 11,
    savingsPercentage: 44,
    auditInfo: {},
  };

  const cab2 = {
    clusterId: 'CAB-2',
    cabIndex: 2,
    vehicleCategory: 'SEDAN',
    capacity: 4,
    passengerCount: 2,
    officeAddress: 'Mindspace IT Park, Hyderabad',
    officeLat: OFFICE.lat,
    officeLng: OFFICE.lng,
    departure: '07:10 AM',
    arrival: '08:00 AM',
    distanceKm: 15.0,
    driveMinutes: 32,
    driverPayout: 410,
    corporateRevenue: 780,
    projectedMargin: 370,
    passengers: [
      makeEmployee('c2-1', 'Stranded 1', 17.465, 78.361),
      makeEmployee('c2-2', 'Stranded 2', 17.472, 78.363),
    ],
    routeOptions: [],
    selectedRouteIndex: 0,
    totalDirectKm: 26,
    savedDistanceKm: 11,
    savingsPercentage: 42,
    auditInfo: {},
  };

  const disruptionEvent = {
    disruptionId: 'DISRUPT-001',
    type: 'VEHICLE_BREAKDOWN',
    cabIndex: 2,
    description: 'Vehicle #2 flat tire on corridor',
    timestamp: '2026-11-24T07:20:00Z',
  };

  const reoptResult = reoptimizeFleetDisruption(
    [cab1, cab2],
    disruptionEvent,
    OFFICE.lat,
    OFFICE.lng,
  );

  assert.equal(reoptResult.type, 'VEHICLE_BREAKDOWN');
  assert.equal(reoptResult.newCabsDeployed, 0, 'No emergency cabs needed because Cab 1 had 2 spare seats');
  assert.equal(reoptResult.reassignedEmployees.length, 2, 'Both stranded employees absorbed');
  assert.equal(reoptResult.reassignedEmployees[0].toCabIndex, 1, 'Absorbed into Cab 1');
  assert.equal(reoptResult.updatedClusters.length, 1, 'Only 1 active cab running now');
  assert.equal(reoptResult.updatedClusters[0].passengerCount, 4, 'Cab 1 now fully utilized with 4 passengers');
});

// Scenario 20: What-If Fleet Strategy Simulation
test('31. Scenario 20: What-If Fleet Strategy Simulation compares Sedans vs SUVs vs Mixed', () => {
  const emps = Array.from({ length: 12 }, (_, i) =>
    makeEmployee(`s20-${i + 1}`, `Emp ${i + 1}`, 17.44 + (i + 1) * 0.007, 78.36 + (i + 1) * 0.007),
  );

  const baseClusters = [
    {
      clusterId: 'CAB-1',
      cabIndex: 1,
      vehicleCategory: 'SUV',
      driverPayout: 700,
    },
    {
      clusterId: 'CAB-2',
      cabIndex: 2,
      vehicleCategory: 'SUV',
      driverPayout: 700,
    },
  ];

  const whatIf = simulateWhatIfScenarios(emps, OFFICE.lat, OFFICE.lng, baseClusters);
  assert.equal(whatIf.length, 4, 'Generates 4 strategic what-if scenarios');
  assert.ok(whatIf.some((s) => s.scenarioName.includes('Sedan')), 'Contains pure Sedan scenario');
  assert.ok(whatIf.some((s) => s.scenarioName.includes('SUV')), 'Contains pure SUV scenario');
  assert.ok(whatIf.some((s) => s.scenarioName.includes('Mixed')), 'Contains optimal mixed scenario');
});

// Scenario 21: Explainable Cab Allocations Generation
test('32. Scenario 21: Generates transparent human-readable allocation explanations', () => {
  const mockClusters = [
    {
      clusterId: 'CAB-1',
      cabIndex: 1,
      vehicleCategory: 'SUV',
      capacity: 6,
      passengerCount: 6,
      averageIdf: 1.14,
      isNightShift: true,
      escortRequired: false,
    },
    {
      clusterId: 'CAB-2',
      cabIndex: 2,
      vehicleCategory: 'SEDAN',
      capacity: 4,
      passengerCount: 4,
      averageIdf: 1.18,
      isNightShift: true,
      escortRequired: true,
    },
  ];

  const explanations = generateExplainableAllocations(mockClusters);
  assert.equal(explanations.length, 2);
  assert.ok(explanations[0].selectionReason.includes('34% operational cost'), 'Explains 6-seater SUV economy');
  assert.ok(explanations[1].safetyComplianceExplanation.includes('Mandatory security escort assigned'), 'Explains night safety escort requirement');
});

// Scenario 22: Configurable Jurisdiction Safety Policies
test('33. Scenario 22: Enforces jurisdiction-specific night safety window definitions', () => {
  const telangana = DEFAULT_SAFETY_POLICIES.TELANGANA;
  const tamilNadu = DEFAULT_SAFETY_POLICIES.TAMIL_NADU;
  const maharashtra = DEFAULT_SAFETY_POLICIES.MAHARASHTRA;

  assert.equal(telangana.nightWindowStartHour, 20, 'Telangana night shift starts at 20:00 (8:00 PM)');
  assert.equal(tamilNadu.nightWindowStartHour, 19, 'Tamil Nadu night shift starts at 19:00 (7:00 PM)');
  assert.equal(maharashtra.nightWindowStartHour, 21, 'Maharashtra night shift starts at 21:00 (9:00 PM)');
  assert.equal(telangana.escortConsumesSeatCapacity, true, 'Escort consumes 1 physical seat in Telangana policy');
});
