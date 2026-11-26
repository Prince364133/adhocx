/**
 * COMPREHENSIVE AUTOMATED TEST SUITE FOR ROUTE OPTIMIZATION TESTING LAB
 * Tests CVRP clustering, TSP sequencing, candidate generation, deduplication,
 * multi-objective scoring, CSV validation, and scale benchmarks (5, 12, 25, 50 employees).
 */

import {
  parseRawCsv,
  validateEmployeeCsv,
  geocodeAddress,
  haversineDistanceKm,
  estimateRoadDistanceKm,
  clusterEmployeesWithSweep,
  optimizeClusterPickupSequence,
  schedulePickupTimes,
  buildAuthoritativeGoogleMapsUrl,
  scoreRouteCandidates,
} from './lib/geoUtils';
import { TestEmployee, RouteOption, RawCsvRow } from './types';

// Assertion helper
function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
  console.log(`✅ PASS: ${testName}`);
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('RUNNING ENTERPRISE ROUTE OPTIMIZATION TEST SUITE');
  console.log('======================================================\n');

  // -----------------------------------------------------------------
  // 1. CSV Parsing & Enterprise Validation
  // -----------------------------------------------------------------
  console.log('--- 1. CSV Parsing & Validation Tests ---');
  const sampleCsv = `employee_name,pickup_address,office_address,required_arrival_time,gender,phone_number
"Aarav Sharma","Aparna Sarovar Grande, Nallagandla, Hyderabad","Mindspace IT Park, Hyderabad","08:00","MALE","+91 98765 43210"
"Priya Reddy","My Home Bhooja, Madhapur, Hyderabad","Mindspace IT Park, Hyderabad","08:00","FEMALE","+91 98765 43211"
"","Missing Name Address, Hyderabad","Mindspace IT Park, Hyderabad","08:00","MALE","+91 98765 43212"
"Sneha","123","Mindspace IT Park, Hyderabad","08:00","FEMALE","+91 98765 43213"
"Aarav Sharma","Duplicate Person, Hyderabad","Mindspace IT Park, Hyderabad","08:00","MALE","+91 98765 43210"
`;

  const parsed = parseRawCsv(sampleCsv);
  assert(parsed.length === 5, 'Parsed exactly 5 raw CSV lines');

  const { validEmployees, report } = validateEmployeeCsv(parsed);
  assert(validEmployees.length === 3, 'Filtered out invalid rows (missing name, short address)');
  assert(report.errors.length === 2, 'Detected 2 row-level validation errors');
  assert(report.warnings.length >= 1, 'Detected duplicate employee warning');

  // -----------------------------------------------------------------
  // 2. Geocoding & Offline Deterministic Spatial Fallback
  // -----------------------------------------------------------------
  console.log('\n--- 2. Geocoding & Cache Tests ---');
  const officeGeo = await geocodeAddress('Mindspace IT Park, Hitec City, Hyderabad');
  assert(officeGeo.lat > 17.4 && officeGeo.lng > 78.3, 'Resolved valid Hyderabad office coordinates');

  const unknownGeo = await geocodeAddress('Some Unknown Nonexistent Road 1234, Bangalore', 12.9716, 77.5946);
  assert(unknownGeo.isSimulatedGeocode === true, 'Gracefully flagged simulated geocode for offline unknown address');
  assert(Math.abs(unknownGeo.lat - 12.9716) < 0.1, 'Generated deterministic coordinate within Bangalore catchment');

  // -----------------------------------------------------------------
  // 3. Capacitated Vehicle Sweep Clustering (Gillett-Miller)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Spatial Sweep Clustering (CVRP) Tests ---');
  const dummy12Employees: TestEmployee[] = Array.from({ length: 12 }, (_, i) => {
    // Distribute around office in a circle at 5-15km distance
    const angle = (i / 12) * 2 * Math.PI;
    const distDeg = 0.05 + (i % 3) * 0.02;
    return {
      id: `emp-${i + 1}`,
      name: `Rider ${i + 1}`,
      phone: `+91 98765 4321${i}`,
      gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
      pickupAddress: `Pickup Address Sector ${i + 1}`,
      officeAddress: 'Mindspace IT Park, Hyderabad',
      arrivalDate: '2026-11-20',
      arrivalTime: '08:00',
      lat: officeGeo.lat + Math.sin(angle) * distDeg,
      lng: officeGeo.lng + Math.cos(angle) * distDeg,
      formattedAddress: `Address Sector ${i + 1}`,
      directDistanceKm: Number((distDeg * 111 * 1.35).toFixed(1)),
    };
  });

  // Test Sedan Allocation (Capacity = 4)
  const sedanClusters = clusterEmployeesWithSweep(dummy12Employees, officeGeo.lat, officeGeo.lng, 'SEDAN');
  assert(sedanClusters.length === 3, '12 employees grouped into exactly 3 Sedans of 4 seats each');
  sedanClusters.forEach((c) => {
    assert(c.passengers.length === 4, 'Sedan cluster capacity respected (4/4)');
    assert(c.vehicleCategory === 'SEDAN', 'Vehicle category assigned as SEDAN');
  });

  // Test SUV Allocation (Capacity = 6)
  const suvClusters = clusterEmployeesWithSweep(dummy12Employees, officeGeo.lat, officeGeo.lng, 'SUV');
  assert(suvClusters.length === 2, '12 employees grouped into exactly 2 SUVs of 6 seats each');
  suvClusters.forEach((c) => {
    assert(c.passengers.length === 6, 'SUV cluster capacity respected (6/6)');
    assert(c.vehicleCategory === 'SUV', 'Vehicle category assigned as SUV');
  });

  // -----------------------------------------------------------------
  // 4. Pickup Sequence Optimization (Exact Permutations & 2-Opt)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Pickup Sequence Optimization (TSP) Tests ---');
  const testCluster = sedanClusters[0].passengers;
  const seqResult = optimizeClusterPickupSequence(testCluster, officeGeo.lat, officeGeo.lng, 'MIN_DISTANCE');

  assert(seqResult.orderedPassengers.length === 4, 'All 4 passengers retained in optimized sequence');
  assert(seqResult.sequencingMethod === 'EXACT_PERMUTATION', 'Utilized exact permutation solver for N <= 6');
  assert(seqResult.totalEvaluatedSequences === 24, 'Evaluated all 4! = 24 permutations');
  assert(seqResult.totalDistanceKm > 0, 'Calculated non-zero route distance');

  // Verify reverse scheduling
  const scheduled = schedulePickupTimes(seqResult.orderedPassengers, 35, '08:00', 5, 10);
  assert(scheduled.scheduledPassengers.length === 4, 'All 4 passengers scheduled');
  assert(scheduled.arrivalTimeStr.includes(':'), 'Valid buffer arrival time formatted');
  assert(scheduled.departureTimeStr.includes(':'), 'Valid initial departure time formatted');

  // -----------------------------------------------------------------
  // 5. Multi-Objective Scoring & Configurable Profiles
  // -----------------------------------------------------------------
  console.log('\n--- 5. Multi-Objective Scoring Tests ---');
  const mockCandidates: RouteOption[] = [
    {
      index: 0,
      candidateType: 'SHORTEST_DISTANCE',
      title: 'Shortest Distance Route',
      tag: 'Shortest',
      summary: 'Local Arterials',
      description: 'Lowest km',
      distanceMeters: 20000,
      distanceKm: 20.0,
      durationSeconds: 2400,
      durationMinutes: 40,
      formattedDistance: '20.0 km',
      formattedEta: '40 mins',
      encodedPolyline: '',
      decodedPath: [],
      isRealRoad: false,
      avoidTolls: true,
      isShortest: true,
      isFastest: false,
      googleMapsUrl: '',
      legs: [],
      orderedStopIds: ['1', '2', '3', '4'],
      score: 0,
      scoreBreakdown: { distanceScore: 0, timeScore: 0, detourScore: 0, utilizationScore: 0, costScore: 0 },
      recommendationReason: '',
      deltaVsBest: { kmDelta: 0, minDelta: 0, pctDelta: 0 },
    },
    {
      index: 1,
      candidateType: 'FASTEST_JOURNEY',
      title: 'Fastest Journey Route',
      tag: 'Fastest',
      summary: 'Expressways',
      description: 'Fastest ETA',
      distanceMeters: 23000,
      distanceKm: 23.0,
      durationSeconds: 1800,
      durationMinutes: 30, // 10 mins faster
      formattedDistance: '23.0 km',
      formattedEta: '30 mins',
      encodedPolyline: '',
      decodedPath: [],
      isRealRoad: false,
      avoidTolls: false,
      isShortest: false,
      isFastest: true,
      googleMapsUrl: '',
      legs: [],
      orderedStopIds: ['1', '2', '3', '4'],
      score: 0,
      scoreBreakdown: { distanceScore: 0, timeScore: 0, detourScore: 0, utilizationScore: 0, costScore: 0 },
      recommendationReason: '',
      deltaVsBest: { kmDelta: 0, minDelta: 0, pctDelta: 0 },
    },
  ];

  // Under DISTANCE_PRIORITY profile, the 20km route MUST win
  const scoredDist = scoreRouteCandidates(mockCandidates, 'DISTANCE_PRIORITY', 4, 4);
  assert(scoredDist[0].candidateType === 'SHORTEST_DISTANCE', 'Candidate A won under Distance Priority profile');

  // Under TIME_PRIORITY profile, the 30min route MUST win
  const scoredTime = scoreRouteCandidates(mockCandidates, 'TIME_PRIORITY', 4, 4);
  assert(scoredTime[0].candidateType === 'FASTEST_JOURNEY', 'Candidate B won under Time Priority profile');

  // -----------------------------------------------------------------
  // 6. Google Maps URL Verification Syntax
  // -----------------------------------------------------------------
  console.log('\n--- 6. Google Maps URL Verification Tests ---');
  const gUrl = buildAuthoritativeGoogleMapsUrl(
    { lat: 17.48, lng: 78.31 },
    { lat: 17.44, lng: 78.38 },
    [{ lat: 17.46, lng: 78.35 }, { lat: 17.45, lng: 78.36 }],
    true,
  );
  assert(gUrl.startsWith('https://www.google.com/maps/dir/'), 'Starts with official Google Maps directions URL');
  assert(gUrl.includes('travelmode=driving'), 'Specifies driving travel mode');
  assert(gUrl.includes('waypoints='), 'Includes encoded intermediate stopover waypoints');

  // -----------------------------------------------------------------
  // 7. Scale & Stress Benchmarks (5, 25, 50 Employees)
  // -----------------------------------------------------------------
  console.log('\n--- 7. Scale & Performance Benchmarks ---');
  for (const count of [5, 25, 50]) {
    const scaleEmps: TestEmployee[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 2 * Math.PI;
      return {
        id: `bench-emp-${i + 1}`,
        name: `Rider ${i + 1}`,
        phone: `+91 98765 0000${i}`,
        gender: 'MALE',
        pickupAddress: `Pickup Address ${i + 1}`,
        officeAddress: 'Mindspace IT Park, Hyderabad',
        arrivalDate: '2026-11-20',
        arrivalTime: '08:00',
        lat: officeGeo.lat + Math.sin(angle) * 0.08,
        lng: officeGeo.lng + Math.cos(angle) * 0.08,
        formattedAddress: `Address ${i + 1}`,
        directDistanceKm: 15.0,
      };
    });

    const tStart = Date.now();
    const clusters = clusterEmployeesWithSweep(scaleEmps, officeGeo.lat, officeGeo.lng, 'ALL');
    clusters.forEach((c) => {
      optimizeClusterPickupSequence(c.passengers, officeGeo.lat, officeGeo.lng, 'MIN_DISTANCE');
    });
    const durationMs = Date.now() - tStart;

    console.log(`⚡ Scaled ${count} employees -> ${clusters.length} cabs solved in ${durationMs}ms`);
    assert(durationMs < 100, `Benchmark passed: ${count} employees solved in under 100ms (took ${durationMs}ms)`);
  }

  // -----------------------------------------------------------------
  // 8. Extreme Edge Cases: Opposite Directions & Colocated Pickups
  // -----------------------------------------------------------------
  console.log('\n--- 8. Extreme Edge Cases ---');
  // Colocated pickups (same apartment building)
  const colocatedEmps: TestEmployee[] = [
    {
      id: 'c-1',
      name: 'Twin 1',
      phone: '+91 99999 11111',
      gender: 'MALE',
      pickupAddress: 'Tower A, Flat 101',
      officeAddress: 'Office Hub',
      arrivalDate: '2026-11-20',
      arrivalTime: '08:00',
      lat: 17.45,
      lng: 78.35,
      formattedAddress: 'Tower A',
      directDistanceKm: 10,
    },
    {
      id: 'c-2',
      name: 'Twin 2',
      phone: '+91 99999 22222',
      gender: 'FEMALE',
      pickupAddress: 'Tower A, Flat 502',
      officeAddress: 'Office Hub',
      arrivalDate: '2026-11-20',
      arrivalTime: '08:00',
      lat: 17.45,
      lng: 78.35,
      formattedAddress: 'Tower A',
      directDistanceKm: 10,
    },
  ];
  const colocatedClusters = clusterEmployeesWithSweep(colocatedEmps, officeGeo.lat, officeGeo.lng, 'SEDAN');
  assert(colocatedClusters.length === 1, 'Colocated employees grouped together into single cab');
  assert(colocatedClusters[0].passengers.length === 2, 'Both colocated passengers assigned');

  // Opposite directions (North vs South)
  const polarOpposites: TestEmployee[] = [
    {
      id: 'n-1',
      name: 'North Rider',
      phone: '+91 99999 33333',
      gender: 'MALE',
      pickupAddress: 'North Pole',
      officeAddress: 'Office Hub',
      arrivalDate: '2026-11-20',
      arrivalTime: '08:00',
      lat: officeGeo.lat + 0.15, // North (+16km)
      lng: officeGeo.lng,
      formattedAddress: 'North Pole',
      directDistanceKm: 16,
    },
    {
      id: 's-1',
      name: 'South Rider',
      phone: '+91 99999 44444',
      gender: 'FEMALE',
      pickupAddress: 'South Pole',
      officeAddress: 'Office Hub',
      arrivalDate: '2026-11-20',
      arrivalTime: '08:00',
      lat: officeGeo.lat - 0.15, // South (-16km)
      lng: officeGeo.lng,
      formattedAddress: 'South Pole',
      directDistanceKm: 16,
    },
  ];
  const oppositeClusters = clusterEmployeesWithSweep(polarOpposites, officeGeo.lat, officeGeo.lng, 'SEDAN');
  assert(
    oppositeClusters.length === 2,
    'Opposite direction riders separated into different cabs by angular gap analysis',
  );

  console.log('\n======================================================');
  console.log('ALL 18 TEST SUITE ASSERTIONS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
