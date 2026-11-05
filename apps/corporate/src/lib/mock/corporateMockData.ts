/**
 * Corporate Mock & Hydrated State Dataset for AdhocX Corporate Dashboard
 * Reflects authentic enterprise commute operations in Hyderabad tech corridors
 * (HITEC City, Gachibowli, Financial District, Kondapur, Madhapur).
 * All counts, financial figures, vehicle plates, and employee records match
 * the corporate dashboard visual mockup boards.
 */

export interface ExecutiveMetrics {
  totalEmployees: number;
  employeesDelta: string;
  scheduledTrips: number;
  scheduledTripsDelta: string;
  activeTrips: number;
  completedTrips: number;
  completedTripsDelta: string;
  unservedTrips: number;
  unservedTripsDelta: string;
  vehiclesCount: number;
  routesCount: number;
  officesCount: number;
  seatUtilizationPct: number;
  onTimePickupPct: number;
}

export const mockExecutiveMetrics: ExecutiveMetrics = {
  totalEmployees: 2846,
  employeesDelta: '+2.4%',
  scheduledTrips: 412,
  scheduledTripsDelta: '+5.1%',
  activeTrips: 96,
  completedTrips: 372,
  completedTripsDelta: '+6.8%',
  unservedTrips: 28,
  unservedTripsDelta: '-12.5%',
  vehiclesCount: 126,
  routesCount: 84,
  officesCount: 3,
  seatUtilizationPct: 92.0,
  onTimePickupPct: 96.8,
};

export const mockTripStatusBreakdown = [
  { label: 'Completed', count: 372, pct: 90.3, color: '#16A34A' },
  { label: 'In Progress', count: 96, pct: 23.3, color: '#5728B2' },
  { label: 'Unserved', count: 28, pct: 5.8, color: '#DC2626' },
  { label: 'Cancelled', count: 16, pct: 3.9, color: '#94A3B8' },
];

export const mock7DayTripsTrend = [
  { day: '08 Dec', trips: 310, scheduled: 320, completed: 305 },
  { day: '09 Dec', trips: 345, scheduled: 350, completed: 340 },
  { day: '10 Dec', trips: 390, scheduled: 395, completed: 382 },
  { day: '11 Dec', trips: 360, scheduled: 370, completed: 355 },
  { day: '12 Dec', trips: 405, scheduled: 410, completed: 398 },
  { day: '13 Dec', trips: 380, scheduled: 385, completed: 376 },
  { day: '14 Dec', trips: 412, scheduled: 412, completed: 372 },
];

export const mockTransportAnalytics = {
  onTimePickupPct: 96.8,
  onTimeDelta: '+1.9 pp',
  avgPickupDelayMin: 6.4,
  avgDelayDelta: '-2.1 min',
  seatUtilizationPct: 92.0,
  seatUtilDelta: '+3.8 pp',
  avgTripDistanceKm: 124.6,
  distanceDelta: '+4.2%',
  totalTransportCostLakhs: 18.4,
  costDelta: '+2.6%',
  tripDistribution: [
    { label: 'Login (Pickup)', count: 214, pct: 52, color: '#5728B2' },
    { label: 'Logout (Drop)', count: 181, pct: 44, color: '#8B5CF6' },
    { label: 'Ad-hoc', count: 17, pct: 4, color: '#EE9811' },
  ],
};

export interface LiveTripItem {
  id: string;
  cabNumber: string;
  type: 'Login Trip' | 'Logout Trip' | 'Ad-hoc Trip';
  driverName: string;
  driverPhone: string;
  vehicleModel: string;
  stopsCount: number;
  totalSeats: number;
  occupiedSeats: number;
  etaMinutes: number;
  status: 'In Progress' | 'Delayed' | 'Completed' | 'Boarding';
  route: string;
  currentStop: string;
  lastGpsUpdateSecondsAgo: number;
  coordinates: { lat: number; lng: number };
}

export const mockActiveTrips: LiveTripItem[] = [
  {
    id: 'TRP-101',
    cabNumber: 'TS09UB7845',
    type: 'Login Trip',
    driverName: 'Suresh R',
    driverPhone: '+91 98765 43210',
    vehicleModel: 'Maruti Ertiga (Yellow Plate)',
    stopsCount: 5,
    totalSeats: 20,
    occupiedSeats: 12,
    etaMinutes: 11,
    status: 'In Progress',
    route: 'Kondapur → HiTEC City',
    currentStop: 'Stop 3: Kothaguda Junction',
    lastGpsUpdateSecondsAgo: 10,
    coordinates: { lat: 17.4589, lng: 78.3728 },
  },
  {
    id: 'TRP-102',
    cabNumber: 'TS10UC9281',
    type: 'Logout Trip',
    driverName: 'Amit Kumar',
    driverPhone: '+91 98480 11223',
    vehicleModel: 'Toyota Innova Crysta',
    stopsCount: 8,
    totalSeats: 18,
    occupiedSeats: 15,
    etaMinutes: 18,
    status: 'In Progress',
    route: 'HiTEC City → Kondapur & Miyapur',
    currentStop: 'Stop 2: Botanical Garden Rd',
    lastGpsUpdateSecondsAgo: 15,
    coordinates: { lat: 17.4475, lng: 78.3612 },
  },
  {
    id: 'TRP-103',
    cabNumber: 'TS07EZ1199',
    type: 'Login Trip',
    driverName: 'Priya Swaminathan',
    driverPhone: '+91 94401 55667',
    vehicleModel: 'Maruti Dzire Tour',
    stopsCount: 4,
    totalSeats: 14,
    occupiedSeats: 12,
    etaMinutes: 22,
    status: 'In Progress',
    route: 'Gachibowli → HiTEC City',
    currentStop: 'Stop 1: IIIT Junction',
    lastGpsUpdateSecondsAgo: 25,
    coordinates: { lat: 17.4431, lng: 78.3489 },
  },
  {
    id: 'TRP-104',
    cabNumber: 'TS12AB4387',
    type: 'Logout Trip',
    driverName: 'Mahesh G',
    driverPhone: '+91 99887 76655',
    vehicleModel: 'Force Urbania (16-Seater)',
    stopsCount: 6,
    totalSeats: 16,
    occupiedSeats: 14,
    etaMinutes: 29,
    status: 'Delayed',
    route: 'Financial District → Kukatpally',
    currentStop: 'Stop 4: Gachibowli Flyover',
    lastGpsUpdateSecondsAgo: 45,
    coordinates: { lat: 17.4385, lng: 78.3512 },
  },
];

export interface ExceptionItem {
  id: string;
  type: 'Delayed' | 'Unassigned' | 'GPS Stale' | 'Route Deviation' | 'Safety Alert';
  target: string; // cab plate or employee ID
  details: string;
  office: string;
  duration: string;
  status: 'Open' | 'In Review' | 'Escalated' | 'Resolved';
  action: 'View' | 'Assign' | 'Track' | 'Resolve' | 'Locate';
}

export const mockExceptions: ExceptionItem[] = [
  {
    id: 'EXC-01',
    type: 'Delayed',
    target: 'TS09UB7845',
    details: 'Pickup delayed by 14 min due to road construction at Hafeezpet',
    office: 'HiTEC City',
    duration: '14 min',
    status: 'Open',
    action: 'View',
  },
  {
    id: 'EXC-02',
    type: 'Unassigned',
    target: 'EMP08742 (Rajesh V)',
    details: 'No cab assigned for 08:00 AM login trip (Route 14 full)',
    office: 'HiTEC City',
    duration: '28 min',
    status: 'Open',
    action: 'Assign',
  },
  {
    id: 'EXC-03',
    type: 'GPS Stale',
    target: 'TS10UC9281',
    details: 'No location telemetry update received for >6 minutes',
    office: 'Kondapur',
    duration: '6 min',
    status: 'Open',
    action: 'Track',
  },
  {
    id: 'EXC-04',
    type: 'Route Deviation',
    target: 'TS07EZ1199',
    details: 'Vehicle 1.8 km off assigned corridor near ORR exit',
    office: 'Gachibowli',
    duration: '9 min',
    status: 'In Review',
    action: 'View',
  },
  {
    id: 'EXC-05',
    type: 'Safety Alert',
    target: 'EMP06531 (Ananya R)',
    details: 'SOS emergency button triggered by employee via Mobile App',
    office: 'HiTEC City',
    duration: '2 min',
    status: 'Escalated',
    action: 'Resolve',
  },
];

export const mockExceptionsSummary = {
  delayedPickups: 12,
  unassignedTrips: 28,
  gpsStaleCount: 6,
  routeDeviations: 4,
  safetyAlerts: 3,
};

export const mockExceptionsTrend = [
  { day: '08 Dec', delayed: 18, unassigned: 32, gpsStale: 8, deviation: 5, safety: 1 },
  { day: '09 Dec', delayed: 15, unassigned: 30, gpsStale: 9, deviation: 4, safety: 2 },
  { day: '10 Dec', delayed: 14, unassigned: 29, gpsStale: 7, deviation: 3, safety: 0 },
  { day: '11 Dec', delayed: 16, unassigned: 34, gpsStale: 8, deviation: 6, safety: 4 },
  { day: '12 Dec', delayed: 13, unassigned: 27, gpsStale: 5, deviation: 4, safety: 2 },
  { day: '13 Dec', delayed: 11, unassigned: 26, gpsStale: 6, deviation: 3, safety: 1 },
  { day: '14 Dec', delayed: 12, unassigned: 28, gpsStale: 6, deviation: 4, safety: 3 },
];

export const mockOfficesList = [
  { id: 'OFF-01', code: 'HITEC', name: 'HiTEC City Campus (Main Hub)', city: 'Hyderabad', employees: 1840 },
  { id: 'OFF-02', code: 'GACHI', name: 'Gachibowli SEZ Hub', city: 'Hyderabad', employees: 680 },
  { id: 'OFF-03', code: 'KONDA', name: 'Kondapur Innovation Lab', city: 'Hyderabad', employees: 326 },
];


// ── Batch 02: Detailed Live Operations & Employee Tracking Dataset ───────────

export interface TrackedEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  avatarUrl?: string;
  department: string;
  status: 'On Trip' | 'Scheduled' | 'Boarded' | 'Completed' | 'No Show';
  office: string;
  shift: string;
  pickupLocation: string;
  dropLocation: string;
  tripId: string;
  cabNumber: string;
  driverName: string;
  vehicleModel: string;
  seatNumber: string;
  lastGpsUpdate: string;
  eta: string;
  timeline: Array<{
    title: string;
    time: string;
    status: 'completed' | 'current' | 'pending';
    note?: string;
  }>;
}

export const mockTrackedEmployees: TrackedEmployee[] = [
  {
    id: 'EMP-01',
    employeeCode: 'EMP02467',
    fullName: 'Priya Sharma',
    department: 'Product Team',
    status: 'On Trip',
    office: 'HiTEC City',
    shift: 'Login (8:00 AM)',
    pickupLocation: 'Kondapur, Bus Stop Near Metro',
    dropLocation: 'HiTEC Office, Main Gate',
    tripId: 'TRP-101',
    cabNumber: 'TS09UB7845',
    driverName: 'Suresh R',
    vehicleModel: 'Maruti Ertiga',
    seatNumber: 'Seat 12/20',
    lastGpsUpdate: '10 sec ago',
    eta: '8:24 AM',
    timeline: [
      { title: 'Trip Assigned', time: '7:42 AM', status: 'completed' },
      { title: 'Driver En Route', time: '7:50 AM', status: 'completed' },
      { title: 'Picked Up', time: '8:05 AM', status: 'completed', note: 'Verified via OTP (5419)' },
      { title: 'In Transit', time: 'ETA 8:24 AM', status: 'current', note: 'Speed: 38 km/h' },
      { title: 'Drop at Office', time: '~ 8:35 AM', status: 'pending' },
    ],
  },
  {
    id: 'EMP-02',
    employeeCode: 'EMP01893',
    fullName: 'Amit Kumar',
    department: 'Engineering',
    status: 'On Trip',
    office: 'Kondapur',
    shift: 'Logout (7:00 PM)',
    pickupLocation: 'HiTEC Office, Gate 2',
    dropLocation: 'Kondapur, Whitefields',
    tripId: 'TRP-102',
    cabNumber: 'TS10UC9281',
    driverName: 'Amit K',
    vehicleModel: 'Toyota Innova Crysta',
    seatNumber: 'Seat 08/18',
    lastGpsUpdate: '15 sec ago',
    eta: '7:22 PM',
    timeline: [
      { title: 'Trip Assigned', time: '6:35 PM', status: 'completed' },
      { title: 'Boarded at Hub', time: '6:55 PM', status: 'completed' },
      { title: 'In Transit', time: 'ETA 7:22 PM', status: 'current' },
      { title: 'Drop at Home', time: '~ 7:35 PM', status: 'pending' },
    ],
  },
  {
    id: 'EMP-03',
    employeeCode: 'EMP03124',
    fullName: 'Neha Verma',
    department: 'Design',
    status: 'Scheduled',
    office: 'Gachibowli',
    shift: 'Login (9:00 AM)',
    pickupLocation: 'Madhapur, Police Station Rd',
    dropLocation: 'Gachibowli SEZ Hub',
    tripId: 'TRP-103',
    cabNumber: 'TS07EZ1199',
    driverName: 'Priya S',
    vehicleModel: 'Maruti Dzire Tour',
    seatNumber: 'Seat 03/14',
    lastGpsUpdate: '25 sec ago',
    eta: '8:45 AM',
    timeline: [
      { title: 'Trip Assigned', time: '8:10 AM', status: 'completed' },
      { title: 'Driver En Route', time: '8:25 AM', status: 'current' },
      { title: 'Pickup', time: '8:45 AM', status: 'pending' },
      { title: 'Drop at Office', time: '~ 9:10 AM', status: 'pending' },
    ],
  },
];

export interface DetailedTripInfo {
  tripId: string;
  cabNumber: string;
  status: 'In Progress' | 'Delayed' | 'Completed';
  tripType: 'Login (Pickup)' | 'Logout (Drop)';
  date: string;
  route: string;
  plannedPickup: string;
  actualPickup: string;
  etaDrop: string;
  tripDistanceKm: number;
  driver: {
    name: string;
    rating: number;
    phone: string;
    totalTrips: number;
  };
  vehicle: {
    model: string;
    plateNumber: string;
    seatsOccupied: number;
    totalSeats: number;
  };
  stops: Array<{
    stopNumber: number;
    locationName: string;
    scheduledTime: string;
    actualTime: string;
    status: 'Completed' | 'In Transit' | 'Pending';
    passengers: string[];
    isOffice?: boolean;
  }>;
  employees: Array<{
    empId: string;
    name: string;
    department: string;
    stopNumber: number;
    pickupTime: string;
    boarded: boolean;
    otpVerified: boolean;
  }>;
}

export const mockDetailedTrip: DetailedTripInfo = {
  tripId: 'TRP-101',
  cabNumber: 'TS09UB7845',
  status: 'In Progress',
  tripType: 'Login (Pickup)',
  date: 'Tue, 08 Dec 2026',
  route: 'Kondapur → HiTEC City',
  plannedPickup: '8:00 AM',
  actualPickup: '8:05 AM (+5 min)',
  etaDrop: '8:35 AM',
  tripDistanceKm: 12.4,
  driver: {
    name: 'Suresh R',
    rating: 4.8,
    phone: '+91 98765 43210',
    totalTrips: 1420,
  },
  vehicle: {
    model: 'Maruti Ertiga',
    plateNumber: 'TS09UB7845',
    seatsOccupied: 12,
    totalSeats: 20,
  },
  stops: [
    {
      stopNumber: 1,
      locationName: 'Kondapur Main Signal',
      scheduledTime: '07:45 AM',
      actualTime: '07:47 AM',
      status: 'Completed',
      passengers: ['EMP03376 Anjali Rao', 'EMP04109 Sanya Mehta'],
    },
    {
      stopNumber: 2,
      locationName: 'Hafeezpet Road Jn',
      scheduledTime: '07:55 AM',
      actualTime: '07:58 AM',
      status: 'Completed',
      passengers: ['EMP01893 Amit Kumar'],
    },
    {
      stopNumber: 3,
      locationName: 'Kothaguda X Roads',
      scheduledTime: '08:05 AM',
      actualTime: '08:08 AM',
      status: 'Completed',
      passengers: ['EMP02467 Priya Sharma'],
    },
    {
      stopNumber: 4,
      locationName: 'Botanical Garden Rd',
      scheduledTime: '08:18 AM',
      actualTime: 'ETA 08:22 AM',
      status: 'In Transit',
      passengers: ['EMP02911 Rohit Singh', 'EMP03124 Neha Verma'],
    },
    {
      stopNumber: 5,
      locationName: 'HiTEC City Main Hub (Destination)',
      scheduledTime: '08:30 AM',
      actualTime: 'ETA 08:35 AM',
      status: 'Pending',
      passengers: [],
      isOffice: true,
    },
  ],
  employees: [
    { empId: 'EMP02467', name: 'Priya Sharma', department: 'Product', stopNumber: 3, pickupTime: '08:08 AM', boarded: true, otpVerified: true },
    { empId: 'EMP01893', name: 'Amit Kumar', department: 'Engineering', stopNumber: 2, pickupTime: '07:58 AM', boarded: true, otpVerified: true },
    { empId: 'EMP03376', name: 'Anjali Rao', department: 'HR', stopNumber: 1, pickupTime: '07:47 AM', boarded: true, otpVerified: true },
    { empId: 'EMP04109', name: 'Sanya Mehta', department: 'Marketing', stopNumber: 1, pickupTime: '07:47 AM', boarded: true, otpVerified: true },
    { empId: 'EMP02911', name: 'Rohit Singh', department: 'Operations', stopNumber: 4, pickupTime: '08:22 AM', boarded: false, otpVerified: false },
    { empId: 'EMP03124', name: 'Neha Verma', department: 'Design', stopNumber: 4, pickupTime: '08:22 AM', boarded: false, otpVerified: false },
  ],
};

// ==========================================
// BATCH 04: OFFICES, BUILDINGS & ORGANIZATION
// ==========================================
export interface OfficeSite {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  pincode: string;
  headcount: number;
  activeCabsDaily: number;
  securityGatesCount: number;
  geofenceRadiusMeters: number;
  status: 'Active' | 'Maintenance' | 'Planned';
  leadContact: string;
  leadPhone: string;
  gates: Array<{
    id: string;
    gateName: string;
    type: 'Entry Only' | 'Exit Only' | 'Bidirectional';
    rfidEnabled: boolean;
    operationalHours: string;
    boomBarrierStatus: 'Online' | 'Offline';
  }>;
}

export const mockOffices: OfficeSite[] = [
  {
    id: 'OFF-HYD-01',
    name: 'HiTEC City Cyber Towers Hub',
    code: 'H-CYBER',
    address: 'Building 4, Cyber Gateway, Madhapur',
    city: 'Hyderabad',
    pincode: '500081',
    headcount: 1420,
    activeCabsDaily: 68,
    securityGatesCount: 4,
    geofenceRadiusMeters: 250,
    status: 'Active',
    leadContact: 'Venkatesh Rao (Facility Head)',
    leadPhone: '+91 98480 11223',
    gates: [
      { id: 'GT-1', gateName: 'Main North Gate (Pillar 24)', type: 'Bidirectional', rfidEnabled: true, operationalHours: '24x7', boomBarrierStatus: 'Online' },
      { id: 'GT-2', gateName: 'South Cargo & Fleet Gate', type: 'Bidirectional', rfidEnabled: true, operationalHours: '05:00 - 23:30', boomBarrierStatus: 'Online' },
      { id: 'GT-3', gateName: 'East Pedestrian Bay', type: 'Entry Only', rfidEnabled: true, operationalHours: '06:00 - 22:00', boomBarrierStatus: 'Online' },
      { id: 'GT-4', gateName: 'West VIP / Escort Gate', type: 'Exit Only', rfidEnabled: false, operationalHours: '24x7', boomBarrierStatus: 'Online' },
    ],
  },
  {
    id: 'OFF-HYD-02',
    name: 'Gachibowli Financial District SEZ',
    code: 'G-FIN',
    address: 'Tower B, WaveRock SEZ, Nanakramguda',
    city: 'Hyderabad',
    pincode: '500032',
    headcount: 980,
    activeCabsDaily: 42,
    securityGatesCount: 3,
    geofenceRadiusMeters: 300,
    status: 'Active',
    leadContact: 'Swathi Nambiar (Site Ops)',
    leadPhone: '+91 97000 88991',
    gates: [
      { id: 'GT-21', gateName: 'SEZ Main Portal 1', type: 'Bidirectional', rfidEnabled: true, operationalHours: '24x7', boomBarrierStatus: 'Online' },
      { id: 'GT-22', gateName: 'Tower B Basemennt Drop Zone', type: 'Entry Only', rfidEnabled: true, operationalHours: '06:00 - 00:00', boomBarrierStatus: 'Online' },
      { id: 'GT-23', gateName: 'Emergency Perimeter Gate 4', type: 'Exit Only', rfidEnabled: false, operationalHours: 'On-Demand', boomBarrierStatus: 'Online' },
    ],
  },
  {
    id: 'OFF-HYD-03',
    name: 'Kondapur Innovation Tech Park',
    code: 'K-INNOV',
    address: 'Mindspace Rd, Beside Botanical Garden, Kondapur',
    city: 'Hyderabad',
    pincode: '500084',
    headcount: 446,
    activeCabsDaily: 16,
    securityGatesCount: 2,
    geofenceRadiusMeters: 200,
    status: 'Active',
    leadContact: 'Mahesh Goud (Admin)',
    leadPhone: '+91 94400 55667',
    gates: [
      { id: 'GT-31', gateName: 'Botanical Garden Main Gate', type: 'Bidirectional', rfidEnabled: true, operationalHours: '24x7', boomBarrierStatus: 'Online' },
      { id: 'GT-32', gateName: 'Rear Shuttle Bay Gate', type: 'Bidirectional', rfidEnabled: true, operationalHours: '06:00 - 22:30', boomBarrierStatus: 'Online' },
    ],
  },
];

export interface GeofenceZone {
  id: string;
  name: string;
  officeName: string;
  zoneType: 'Main Hub' | 'Drop Point' | 'Escort Zone' | 'Staging Yard';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  autoCheckout: boolean;
  activeTripsInside: number;
  status: 'Active' | 'Inactive';
}

export const mockGeofencePoints: GeofenceZone[] = [
  { id: 'GEO-01', name: 'Cyber Gateway Main Canopy', officeName: 'HiTEC City Cyber Towers Hub', zoneType: 'Main Hub', latitude: 17.4504, longitude: 78.3808, radiusMeters: 250, autoCheckout: true, activeTripsInside: 14, status: 'Active' },
  { id: 'GEO-02', name: 'Inorbit Metro Connector Bay', officeName: 'HiTEC City Cyber Towers Hub', zoneType: 'Drop Point', latitude: 17.4334, longitude: 78.3866, radiusMeters: 180, autoCheckout: true, activeTripsInside: 8, status: 'Active' },
  { id: 'GEO-03', name: 'WaveRock North Terminal', officeName: 'Gachibowli Financial District SEZ', zoneType: 'Main Hub', latitude: 17.4209, longitude: 78.3489, radiusMeters: 300, autoCheckout: true, activeTripsInside: 11, status: 'Active' },
  { id: 'GEO-04', name: 'Nanakramguda Circle Escort Post', officeName: 'Gachibowli Financial District SEZ', zoneType: 'Escort Zone', latitude: 17.4182, longitude: 78.3552, radiusMeters: 150, autoCheckout: false, activeTripsInside: 3, status: 'Active' },
  { id: 'GEO-05', name: 'Botanical Garden Shuttle Staging', officeName: 'Kondapur Innovation Tech Park', zoneType: 'Staging Yard', latitude: 17.4612, longitude: 78.3615, radiusMeters: 200, autoCheckout: true, activeTripsInside: 5, status: 'Active' },
];

export interface CostCenterOrg {
  id: string;
  code: string;
  name: string;
  headDepartment: string;
  managerName: string;
  budgetAllocatedLakhs: number;
  budgetSpentLakhs: number;
  activeEmployees: number;
  monthlyTripVolume: number;
  costPerCommuteInr: number;
  status: 'Within Budget' | 'Near Cap' | 'Exceeded';
}

export const mockCostCenters: CostCenterOrg[] = [
  { id: 'CC-101', code: 'CC-ENG-01', name: 'Core Engineering & Platform', headDepartment: 'Engineering', managerName: 'Karthik Ramanathan', budgetAllocatedLakhs: 8.5, budgetSpentLakhs: 7.2, activeEmployees: 940, monthlyTripVolume: 11200, costPerCommuteInr: 64.2, status: 'Within Budget' },
  { id: 'CC-102', code: 'CC-PRD-02', name: 'Product Experience & Growth', headDepartment: 'Product', managerName: 'Priya Sharma', budgetAllocatedLakhs: 4.8, budgetSpentLakhs: 4.1, activeEmployees: 512, monthlyTripVolume: 6100, costPerCommuteInr: 67.2, status: 'Within Budget' },
  { id: 'CC-103', code: 'CC-OPS-03', name: 'Customer Operations 24x7', headDepartment: 'Operations', managerName: 'Rohit Singh', budgetAllocatedLakhs: 3.8, budgetSpentLakhs: 3.6, activeEmployees: 680, monthlyTripVolume: 8400, costPerCommuteInr: 42.8, status: 'Near Cap' },
  { id: 'CC-104', code: 'CC-HR-04', name: 'Human Capital & Workplace', headDepartment: 'HR', managerName: 'Anjali Rao', budgetAllocatedLakhs: 2.0, budgetSpentLakhs: 1.8, activeEmployees: 234, monthlyTripVolume: 2800, costPerCommuteInr: 64.0, status: 'Within Budget' },
  { id: 'CC-105', code: 'CC-DSG-05', name: 'Experience & UX Design Studio', headDepartment: 'Design', managerName: 'Neha Verma', budgetAllocatedLakhs: 1.9, budgetSpentLakhs: 1.7, activeEmployees: 180, monthlyTripVolume: 2150, costPerCommuteInr: 79.0, status: 'Within Budget' },
];

// ==========================================
// BATCH 07: ROUTES & TRIP MANAGEMENT
// ==========================================
export interface RoutePlan {
  id: string;
  routeCode: string;
  name: string;
  origin: string;
  destinationOffice: string;
  shiftName: string;
  totalDistanceKm: number;
  estDurationMin: number;
  stopsCount: number;
  assignedVehicle: string;
  assignedDriver: string;
  driverPhone: string;
  capacityUtilizationPct: number;
  status: 'In Progress' | 'Scheduled' | 'Completed' | 'Delayed';
  currentStopIndex: number;
  stops: Array<{
    seq: number;
    name: string;
    time: string;
    employeesCount: number;
    status: 'Passed' | 'Current' | 'Upcoming';
  }>;
}

export const mockRoutes: RoutePlan[] = [
  {
    id: 'RT-101',
    routeCode: 'RT-KND-CYB-01',
    name: 'Kondapur Main → Cyber Gateway',
    origin: 'Kondapur Junction',
    destinationOffice: 'HiTEC City Cyber Towers Hub',
    shiftName: 'General (09:00 AM)',
    totalDistanceKm: 12.4,
    estDurationMin: 35,
    stopsCount: 5,
    assignedVehicle: 'TS09UB7845 (Maruti Ertiga)',
    assignedDriver: 'Suresh R',
    driverPhone: '+91 98765 43210',
    capacityUtilizationPct: 85,
    status: 'In Progress',
    currentStopIndex: 3,
    stops: [
      { seq: 1, name: 'Kondapur Main Signal', time: '07:45 AM', employeesCount: 2, status: 'Passed' },
      { seq: 2, name: 'Hafeezpet Road Jn', time: '07:55 AM', employeesCount: 1, status: 'Passed' },
      { seq: 3, name: 'Kothaguda X Roads', time: '08:05 AM', employeesCount: 1, status: 'Passed' },
      { seq: 4, name: 'Botanical Garden Rd', time: '08:18 AM', employeesCount: 2, status: 'Current' },
      { seq: 5, name: 'Cyber Towers Terminal', time: '08:35 AM', employeesCount: 0, status: 'Upcoming' },
    ],
  },
  {
    id: 'RT-102',
    routeCode: 'RT-GCB-FIN-04',
    name: 'Gachibowli Outer Ring → WaveRock',
    origin: 'Gachibowli Stadium',
    destinationOffice: 'Gachibowli Financial District SEZ',
    shiftName: 'Morning A (08:00 AM)',
    totalDistanceKm: 16.8,
    estDurationMin: 40,
    stopsCount: 6,
    assignedVehicle: 'TS10UC9281 (Force Traveller)',
    assignedDriver: 'Amit K',
    driverPhone: '+91 98111 22334',
    capacityUtilizationPct: 92,
    status: 'In Progress',
    currentStopIndex: 4,
    stops: [
      { seq: 1, name: 'Gachibowli Stadium Post', time: '07:15 AM', employeesCount: 3, status: 'Passed' },
      { seq: 2, name: 'IIIT Junction', time: '07:25 AM', employeesCount: 2, status: 'Passed' },
      { seq: 3, name: 'Wipro Circle', time: '07:38 AM', employeesCount: 4, status: 'Passed' },
      { seq: 4, name: 'ISB Road Cross', time: '07:48 AM', employeesCount: 3, status: 'Current' },
      { seq: 5, name: 'Q-City Gate', time: '07:55 AM', employeesCount: 2, status: 'Upcoming' },
      { seq: 6, name: 'WaveRock SEZ Terminal', time: '08:05 AM', employeesCount: 0, status: 'Upcoming' },
    ],
  },
  {
    id: 'RT-103',
    routeCode: 'RT-MDP-CYB-02',
    name: 'Madhapur Metro → HiTEC City Hub',
    origin: 'Durgam Cheruvu Metro',
    destinationOffice: 'HiTEC City Cyber Towers Hub',
    shiftName: 'Night Shift (10:00 PM)',
    totalDistanceKm: 8.6,
    estDurationMin: 22,
    stopsCount: 4,
    assignedVehicle: 'TS07EZ1199 (Toyota Innova)',
    assignedDriver: 'Priya S (Female Escort Driver)',
    driverPhone: '+91 97222 33445',
    capacityUtilizationPct: 100,
    status: 'Scheduled',
    currentStopIndex: 0,
    stops: [
      { seq: 1, name: 'Durgam Cheruvu Metro Gate 3', time: '09:10 PM', employeesCount: 2, status: 'Upcoming' },
      { seq: 2, name: 'Kavuri Hills Park', time: '09:20 PM', employeesCount: 1, status: 'Upcoming' },
      { seq: 3, name: 'Mindspace Inorbit Junction', time: '09:32 PM', employeesCount: 3, status: 'Upcoming' },
      { seq: 4, name: 'Cyber Gateway Campus', time: '09:45 PM', employeesCount: 0, status: 'Upcoming' },
    ],
  },
  {
    id: 'RT-104',
    routeCode: 'RT-MYP-KND-03',
    name: 'Miyapur Metro → Kondapur Innovation',
    origin: 'Miyapur Bus Depot',
    destinationOffice: 'Kondapur Innovation Tech Park',
    shiftName: 'General (09:00 AM)',
    totalDistanceKm: 14.2,
    estDurationMin: 32,
    stopsCount: 5,
    assignedVehicle: 'TS12AB4387 (Tata Nexon EV)',
    assignedDriver: 'Kishore M',
    driverPhone: '+91 99887 76655',
    capacityUtilizationPct: 80,
    status: 'Delayed',
    currentStopIndex: 2,
    stops: [
      { seq: 1, name: 'Miyapur Allwyn X Roads', time: '08:00 AM', employeesCount: 2, status: 'Passed' },
      { seq: 2, name: 'Hafeezpet Flyover End', time: '08:15 AM', employeesCount: 2, status: 'Current' },
      { seq: 3, name: 'Kondapur RTO Office', time: '08:28 AM', employeesCount: 1, status: 'Upcoming' },
      { seq: 4, name: 'Botanical Garden North', time: '08:40 AM', employeesCount: 1, status: 'Upcoming' },
      { seq: 5, name: 'Tech Park Bay 2', time: '08:52 AM', employeesCount: 0, status: 'Upcoming' },
    ],
  },
];

export const mockFleetAllocation = [
  { vehicleNumber: 'TS09UB7845', model: 'Maruti Ertiga (7-Seater)', driverName: 'Suresh R', rating: 4.8, status: 'Assigned', routeCode: 'RT-KND-CYB-01', complianceStatus: 'Verified (Valid PUC/Ins)', batteryFuel: '78%' },
  { vehicleNumber: 'TS10UC9281', model: 'Force Traveller (17-Seater)', driverName: 'Amit K', rating: 4.9, status: 'Assigned', routeCode: 'RT-GCB-FIN-04', complianceStatus: 'Verified (Valid PUC/Ins)', batteryFuel: '84%' },
  { vehicleNumber: 'TS07EZ1199', model: 'Toyota Innova Crysta (7-Seater)', driverName: 'Priya S', rating: 5.0, status: 'Assigned', routeCode: 'RT-MDP-CYB-02', complianceStatus: 'Verified (Valid PUC/Ins)', batteryFuel: '92%' },
  { vehicleNumber: 'TS12AB4387', model: 'Tata Nexon EV (5-Seater)', driverName: 'Kishore M', rating: 4.6, status: 'Assigned', routeCode: 'RT-MYP-KND-03', complianceStatus: 'Warning: Speed Flag', batteryFuel: '45%' },
  { vehicleNumber: 'TS14CD9931', model: 'Mahindra Marazzo (8-Seater)', driverName: 'Rajesh G', rating: 4.7, status: 'Available', routeCode: 'Unassigned', complianceStatus: 'Verified (Valid PUC/Ins)', batteryFuel: '100%' },
  { vehicleNumber: 'TS08EF4412', model: 'Tata Tigor EV (4-Seater)', driverName: 'Vikram N', rating: 4.5, status: 'Available', routeCode: 'Unassigned', complianceStatus: 'Verified (Valid PUC/Ins)', batteryFuel: '65%' },
];

// ==========================================
// BATCH 08: SAFETY & INCIDENT MANAGEMENT
// ==========================================
export interface SafetyIncident {
  id: string;
  incidentNumber: string;
  title: string;
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  status: 'Open' | 'Investigating' | 'Escalated' | 'Resolved';
  reportedAt: string;
  employeeName: string;
  employeeId: string;
  driverName: string;
  vehicleNumber: string;
  tripId: string;
  office: string;
  location: string;
  incidentType: 'SOS Alert' | 'Route Deviation' | 'Harsh Braking / Over-speed' | 'Breakdown' | 'Late Night Escort Delay';
  description: string;
  audioRecordingAvailable: boolean;
  sosTriggeredBy: 'Employee App' | 'Driver App' | 'Automated Telemetry';
  resolutionTimeline: Array<{
    time: string;
    actor: string;
    action: string;
    notes: string;
  }>;
}

export const mockSafetyIncidents: SafetyIncident[] = [
  {
    id: 'INC-801',
    incidentNumber: 'INC-2026-081',
    title: 'Panic SOS Triggered by Female Commuter',
    severity: 'Critical',
    status: 'Investigating',
    reportedAt: '14 Dec 2026, 08:14 AM',
    employeeName: 'Priya Sharma',
    employeeId: 'EMP02467',
    driverName: 'Suresh R',
    vehicleNumber: 'TS09UB7845',
    tripId: 'TRP-101',
    office: 'HiTEC City Cyber Towers Hub',
    location: 'Near Kothaguda Flyover Jn (17.4582° N, 78.3690° E)',
    incidentType: 'SOS Alert',
    description: 'In-app SOS button held for 3 seconds. Real-time microphone audio streaming activated. Route deviated 1.2 km off planned corridor towards Botanical Garden service road.',
    audioRecordingAvailable: true,
    sosTriggeredBy: 'Employee App',
    resolutionTimeline: [
      { time: '08:14:02 AM', actor: 'System Auto-Monitor', action: 'SOS Signal Detected', notes: 'Vehicle TS09UB7845 flagged red. Dispatched immediate pop-up to AdhocX Emergency Ops Desk.' },
      { time: '08:15:10 AM', actor: 'Rohan Deshmukh (Safety Officer)', action: 'Acknowledged Incident', notes: 'Dialed driver mobile +91 98765 43210. Audio line connected.' },
      { time: '08:16:30 AM', actor: 'Rohan Deshmukh (Safety Officer)', action: 'Driver Contacted', notes: 'Driver clarified taking service lane due to overturned cement mixer on main road. Employee confirmed safe via secondary 2-way call.' },
      { time: '08:20:00 AM', actor: 'Rohan Deshmukh (Safety Officer)', action: 'Escort Vehicle Staged', notes: 'Quick Response Team vehicle QRT-02 dispatched to monitor until office arrival.' },
    ],
  },
  {
    id: 'INC-802',
    incidentNumber: 'INC-2026-079',
    title: 'Repeated Over-speeding & Harsh Cornering Alert',
    severity: 'High',
    status: 'Escalated',
    reportedAt: '14 Dec 2026, 07:42 AM',
    employeeName: 'Rohit Singh',
    employeeId: 'EMP02911',
    driverName: 'Kishore M',
    vehicleNumber: 'TS12AB4387',
    tripId: 'TRP-104',
    office: 'Kondapur Innovation Tech Park',
    location: 'Outer Ring Road (ORR) Stretch (17.4320° N, 78.3312° E)',
    incidentType: 'Harsh Braking / Over-speed',
    description: 'Vehicle clocked 94 km/h in an 60 km/h corporate zone with 3 consecutive hard braking incidents within 10 minutes.',
    audioRecordingAvailable: false,
    sosTriggeredBy: 'Automated Telemetry',
    resolutionTimeline: [
      { time: '07:42:15 AM', actor: 'Telemetry Engine', action: 'Speed Violation Flagged', notes: 'Speed 94 km/h recorded via OBD-II GPS stream.' },
      { time: '07:48:00 AM', actor: 'AdhocX Transport Desk', action: 'Driver Warning Dispatched', notes: 'Automated IVR call sent to cab console requesting speed reduction.' },
      { time: '08:00:00 AM', actor: 'Safety Lead', action: 'Escalated to Vendor Fleet Partner', notes: 'Vendor requested to audit driver Kishore M for compliance prior to evening shift.' },
    ],
  },
  {
    id: 'INC-803',
    incidentNumber: 'INC-2026-075',
    title: 'Flat Tyre & Electrical Stall during Login',
    severity: 'Moderate',
    status: 'Resolved',
    reportedAt: '13 Dec 2026, 06:50 PM',
    employeeName: 'Anjali Rao',
    employeeId: 'EMP03376',
    driverName: 'Vikram N',
    vehicleNumber: 'TS08EF4412',
    tripId: 'TRP-109',
    office: 'HiTEC City Cyber Towers Hub',
    location: 'Madhapur 100ft Road',
    incidentType: 'Breakdown',
    description: 'Vehicle suffered front-right tyre puncture. Alternate cab backup deployed within 11 minutes.',
    audioRecordingAvailable: false,
    sosTriggeredBy: 'Driver App',
    resolutionTimeline: [
      { time: '06:50:00 PM', actor: 'Driver Vikram N', action: 'Reported Mechanical Stall', notes: 'Pushed breakdown alert on driver mobile console.' },
      { time: '06:53:00 PM', actor: 'Dispatcher', action: 'Backup Cab Dispatched', notes: 'Cab TS14CD9931 re-routed from nearby standby zone.' },
      { time: '07:04:00 PM', actor: 'AdhocX Ops', action: 'Transferred Commuters', notes: 'All 3 employees transferred safely to backup cab.' },
      { time: '07:28:00 PM', actor: 'Rohan Deshmukh', action: 'Incident Closed', notes: 'Employees dropped at office on schedule. No injuries reported.' },
    ],
  },
  {
    id: 'INC-804',
    incidentNumber: 'INC-2026-071',
    title: 'Unannounced Route Deviation Outside Buffer',
    severity: 'Low',
    status: 'Resolved',
    reportedAt: '12 Dec 2026, 09:15 PM',
    employeeName: 'Neha Verma',
    employeeId: 'EMP03124',
    driverName: 'Amit K',
    vehicleNumber: 'TS10UC9281',
    tripId: 'TRP-102',
    office: 'Gachibowli Financial District SEZ',
    location: 'Bio-Diversity Flyover Underpass',
    incidentType: 'Route Deviation',
    description: 'Driver deviated 450 meters to avoid water-logging near bio-diversity park underpass.',
    audioRecordingAvailable: false,
    sosTriggeredBy: 'Automated Telemetry',
    resolutionTimeline: [
      { time: '09:15:00 PM', actor: 'Telemetry Engine', action: 'Deviation Flagged', notes: 'Vehicle left designated corridor buffer by 450m.' },
      { time: '09:18:00 PM', actor: 'Safety Desk', action: 'Verified Geo-Condition', notes: 'Confirmed local road repair and waterlogging diversion.' },
      { time: '09:30:00 PM', actor: 'Safety Desk', action: 'Resolved', notes: 'Route re-aligned. Drop completed safely.' },
    ],
  },
];

export const mockSafetyReportsStats = {
  totalIncidentsMonth: 14,
  resolvedCount: 11,
  inProgressCount: 2,
  escalatedCount: 1,
  avgResponseTimeMin: 1.8,
  sosIncidents: 2,
  speedViolations: 6,
  breakdowns: 3,
  routeDeviations: 3,
  officeBreakdown: [
    { office: 'HiTEC City Cyber Towers', incidents: 8, resolutionRate: '92%' },
    { office: 'Gachibowli Financial District', incidents: 4, resolutionRate: '100%' },
    { office: 'Kondapur Innovation Park', incidents: 2, resolutionRate: '100%' },
  ],
};

// ==========================================
// BATCH 09: SUPPORT & SLA MANAGEMENT
// ==========================================
export interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  employeeName: string;
  employeeId: string;
  office: string;
  category: 'Missed Pickup' | 'Cab AC / Comfort' | 'Driver Behavior' | 'Late Arrival' | 'App / OTP Issue' | 'Route Change Request';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Overdue';
  createdAt: string;
  elapsedTimeHours: string;
  slaTargetHours: number;
  slaBreached: boolean;
  tripReference?: string;
  conversation: Array<{
    sender: string;
    role: 'Employee' | 'Agent' | 'System';
    time: string;
    message: string;
  }>;
}

export const mockSupportTickets: SupportTicket[] = [
  {
    id: 'TKT-901',
    ticketId: 'TKT-2026-941',
    subject: 'Driver arrived 15 min late and missed pickup point',
    employeeName: 'Priya Sharma',
    employeeId: 'EMP02467',
    office: 'HiTEC City Cyber Towers Hub',
    category: 'Missed Pickup',
    priority: 'High',
    status: 'In Progress',
    createdAt: '14 Dec 2026, 08:30 AM',
    elapsedTimeHours: '1.2h',
    slaTargetHours: 2,
    slaBreached: false,
    tripReference: 'TRP-101 (TS09UB7845)',
    conversation: [
      { sender: 'Priya Sharma', role: 'Employee', time: '08:30 AM', message: 'I was waiting at Kondapur Gate 3 since 07:45 AM. The cab bypassed the stop and I had to walk to the main junction in the drizzle.' },
      { sender: 'AdhocX Support Bot', role: 'System', time: '08:31 AM', message: 'Ticket created with priority HIGH. Assigned to Senior Support Specialist Arjun K.' },
      { sender: 'Arjun K (AdhocX Support)', role: 'Agent', time: '08:42 AM', message: 'Hi Priya, we have pulled the driver GPS logs. The driver took a detour around the junction. We are crediting your transport balance and initiating a coaching review with the fleet supervisor.' },
    ],
  },
  {
    id: 'TKT-902',
    ticketId: 'TKT-2026-938',
    subject: 'Air conditioning not working in Force Traveller',
    employeeName: 'Amit Kumar',
    employeeId: 'EMP01893',
    office: 'Gachibowli Financial District SEZ',
    category: 'Cab AC / Comfort',
    priority: 'Medium',
    status: 'Open',
    createdAt: '14 Dec 2026, 07:55 AM',
    elapsedTimeHours: '2.5h',
    slaTargetHours: 4,
    slaBreached: false,
    tripReference: 'TRP-102 (TS10UC9281)',
    conversation: [
      { sender: 'Amit Kumar', role: 'Employee', time: '07:55 AM', message: 'AC cooling was completely non-functional during the 40 min commute from Gachibowli today.' },
      { sender: 'AdhocX Support Bot', role: 'System', time: '07:56 AM', message: 'Ticket logged. Vehicle maintenance alert dispatched to vendor fleet manager.' },
    ],
  },
  {
    id: 'TKT-903',
    ticketId: 'TKT-2026-920',
    subject: 'Emergency OTP not generating on mobile app',
    employeeName: 'Neha Verma',
    employeeId: 'EMP03124',
    office: 'Gachibowli Financial District SEZ',
    category: 'App / OTP Issue',
    priority: 'Critical',
    status: 'Resolved',
    createdAt: '13 Dec 2026, 09:40 PM',
    elapsedTimeHours: '0.4h',
    slaTargetHours: 1,
    slaBreached: false,
    tripReference: 'TRP-102',
    conversation: [
      { sender: 'Neha Verma', role: 'Employee', time: '09:40 PM', message: 'Driver cannot start the trip because OTP SMS is delayed on my phone.' },
      { sender: 'AdhocX Support Desk', role: 'Agent', time: '09:44 PM', message: 'Manual override OTP 8492 issued after identity verification. Boarding confirmed.' },
      { sender: 'Neha Verma', role: 'Employee', time: '09:46 PM', message: 'Thank you, boarding now!' },
    ],
  },
  {
    id: 'TKT-904',
    ticketId: 'TKT-2026-895',
    subject: 'Driver rash driving near bio-diversity junction',
    employeeName: 'Rohit Singh',
    employeeId: 'EMP02911',
    office: 'Kondapur Innovation Tech Park',
    category: 'Driver Behavior',
    priority: 'Critical',
    status: 'Overdue',
    createdAt: '12 Dec 2026, 06:15 PM',
    elapsedTimeHours: '38h',
    slaTargetHours: 24,
    slaBreached: true,
    tripReference: 'TRP-104 (TS12AB4387)',
    conversation: [
      { sender: 'Rohit Singh', role: 'Employee', time: '06:15 PM', message: 'Driver Kishore M was tailgating aggressively and honking continuously.' },
      { sender: 'AdhocX Support Desk', role: 'Agent', time: '06:20 PM', message: 'Case marked for fleet vendor manager penalty hearing.' },
    ],
  },
];

export const mockSlaMetrics = {
  totalTicketsMonth: 48,
  resolvedTickets: 41,
  openTickets: 5,
  overdueTickets: 2,
  firstResponseTimeMin: 4.2,
  avgResolutionTimeHours: 2.8,
  slaCompliancePct: 97.8,
  resolutionByCategory: [
    { category: 'Missed Pickup', total: 12, resolvedInSla: 11, pct: 91.6 },
    { category: 'Driver Behavior', total: 8, resolvedInSla: 7, pct: 87.5 },
    { category: 'Cab Comfort / AC', total: 14, resolvedInSla: 14, pct: 100 },
    { category: 'App & OTP Issue', total: 10, resolvedInSla: 10, pct: 100 },
    { category: 'Route Adjustment', total: 4, resolvedInSla: 4, pct: 100 },
  ],
};

// ==========================================
// BATCH 11: REPORTS & ANALYTICS
// ==========================================
export const mockTransportPerformanceReport = {
  period: 'Last 30 Days (15 Nov - 14 Dec 2026)',
  totalTripsCompleted: 11840,
  completionRatePct: 98.6,
  onTimeArrivalPct: 96.8,
  delayedTripsCount: 165,
  unservedTripsCount: 42,
  avgDelayMinutes: 5.8,
  carbonSavedKg: 18450,
  dailyPerformance: [
    { date: '10 Dec', scheduled: 410, completed: 405, onTime: 395, delayed: 10 },
    { date: '11 Dec', scheduled: 415, completed: 408, onTime: 398, delayed: 10 },
    { date: '12 Dec', scheduled: 420, completed: 414, onTime: 402, delayed: 12 },
    { date: '13 Dec', scheduled: 390, completed: 388, onTime: 380, delayed: 8 },
    { date: '14 Dec', scheduled: 412, completed: 407, onTime: 396, delayed: 11 },
  ],
};

export const mockEmployeeUsageReport = {
  totalRegisteredEmployees: 2846,
  transportEligible: 2568,
  regularDailyCommuters: 2190,
  occasionalCommuters: 378,
  inactiveEmployees: 278,
  departmentUsage: [
    { department: 'Engineering', activeUsers: 940, tripsMonth: 18800, utilization: '94%' },
    { department: 'Operations', activeUsers: 680, tripsMonth: 14200, utilization: '98%' },
    { department: 'Product', activeUsers: 512, tripsMonth: 9800, utilization: '91%' },
    { department: 'HR & Admin', activeUsers: 234, tripsMonth: 4400, utilization: '88%' },
    { department: 'Design Studio', activeUsers: 180, tripsMonth: 3200, utilization: '85%' },
  ],
  shiftUsageDistribution: [
    { shift: 'General Day (09:00 - 18:00)', pct: 54, count: 1246 },
    { shift: 'Morning A (08:00 - 17:00)', pct: 24, count: 684 },
    { shift: 'Night Shift (22:00 - 07:00)', pct: 16, count: 398 },
    { shift: 'Rotating Special', pct: 6, count: 240 },
  ],
};

export const mockVehicleRouteAnalytics = {
  activeFleetSize: 126,
  avgFleetUtilizationPct: 92.4,
  totalDistanceCoveredKm: 89450,
  deadMileagePct: 4.8,
  fuelEvSharePct: 35, // 35% EV electric cabs
  fastestCorridors: [
    { corridor: 'Gachibowli ORR → WaveRock', avgSpeedKmh: 48, avgDurationMin: 22 },
    { corridor: 'Kondapur Main → Cyber Gateway', avgSpeedKmh: 34, avgDurationMin: 32 },
    { corridor: 'Miyapur Depot → Innovation Park', avgSpeedKmh: 38, avgDurationMin: 28 },
  ],
  congestedCorridors: [
    { corridor: 'Madhapur 100ft Road → Cyber Towers', avgSpeedKmh: 18, delayFreqPct: 28 },
    { corridor: 'Kothaguda X Roads → Botanical Jn', avgSpeedKmh: 20, delayFreqPct: 22 },
  ],
};

export const mockCostDepartmentReport = {
  totalExpenditureInr: '₹28,76,500',
  budgetUtilizationPct: 88.5,
  avgCostPerEmployeeMonthlyInr: 1010,
  avgCostPerTripInr: 64.5,
  costBreakdown: [
    { dept: 'Engineering', spendInr: '₹12,40,000', budgetInr: '₹14,00,000', perTripInr: 66.0 },
    { dept: 'Customer Operations', spendInr: '₹8,10,000', budgetInr: '₹9,00,000', perTripInr: 57.0 },
    { dept: 'Product Team', spendInr: '₹5,20,000', budgetInr: '₹6,00,000', perTripInr: 53.0 },
    { dept: 'HR & Facilities', spendInr: '₹1,80,000', budgetInr: '₹2,00,000', perTripInr: 41.0 },
    { dept: 'Design Studio', spendInr: '₹1,26,500', budgetInr: '₹1,50,000', perTripInr: 39.5 },
  ],
};

// ==========================================
// BATCH 12: INTEGRATIONS, SETTINGS & ACCESS CONTROL
// ==========================================
export interface HrmsIntegrationConfig {
  id: string;
  name: string;
  provider: 'Workday' | 'Darwinbox' | 'SAP SuccessFactors' | 'BambooHR' | 'Custom SFTP / CSV';
  status: 'Connected' | 'Syncing' | 'Error' | 'Disconnected';
  lastSyncTimestamp: string;
  syncedRecordsCount: number;
  syncFrequency: 'Every 1 Hour' | 'Every 6 Hours' | 'Daily at Midnight' | 'Real-time Webhook';
  apiEndpoint: string;
  autoDeactivateLeavers: boolean;
  autoAssignOffice: boolean;
}

export const mockHrmsIntegrations: HrmsIntegrationConfig[] = [
  {
    id: 'HRMS-01',
    name: 'Primary Enterprise HRMS (Workday)',
    provider: 'Workday',
    status: 'Connected',
    lastSyncTimestamp: '14 Dec 2026, 08:00 AM (12 min ago)',
    syncedRecordsCount: 2846,
    syncFrequency: 'Every 1 Hour',
    apiEndpoint: 'https://wd5-impl-services.workday.com/ccx/service/v1/hitec_corp',
    autoDeactivateLeavers: true,
    autoAssignOffice: true,
  },
  {
    id: 'HRMS-02',
    name: 'Darwinbox India Payroll & Attendance',
    provider: 'Darwinbox',
    status: 'Connected',
    lastSyncTimestamp: '14 Dec 2026, 06:30 AM',
    syncedRecordsCount: 2846,
    syncFrequency: 'Daily at Midnight',
    apiEndpoint: 'https://hitec.darwinbox.in/api/v2/roster_feed',
    autoDeactivateLeavers: false,
    autoAssignOffice: false,
  },
];

export interface ImportFieldMapping {
  sourceColumn: string;
  adhocxField: string;
  sampleValue: string;
  isRequired: boolean;
  validationRule: string;
  status: 'Mapped' | 'Unmapped' | 'Warning';
}

export const mockImportMappings: ImportFieldMapping[] = [
  { sourceColumn: 'Emp_Code', adhocxField: 'employeeId', sampleValue: 'EMP02467', isRequired: true, validationRule: 'Format: ^EMP\\d{5}$', status: 'Mapped' },
  { sourceColumn: 'Full_Legal_Name', adhocxField: 'name', sampleValue: 'Priya Sharma', isRequired: true, validationRule: 'String min 2 chars', status: 'Mapped' },
  { sourceColumn: 'Primary_Work_Email', adhocxField: 'email', sampleValue: 'priya.sharma@hitec.com', isRequired: true, validationRule: 'Valid Corporate Email', status: 'Mapped' },
  { sourceColumn: 'Mobile_Phone', adhocxField: 'phone', sampleValue: '+91 98765 43210', isRequired: true, validationRule: 'E.164 Phone format', status: 'Mapped' },
  { sourceColumn: 'Cost_Center_Code', adhocxField: 'costCenterCode', sampleValue: 'CC-PRD-02', isRequired: false, validationRule: 'Exists in Cost Centers', status: 'Mapped' },
  { sourceColumn: 'Work_Location_Site', adhocxField: 'officeName', sampleValue: 'HiTEC City Cyber Towers', isRequired: true, validationRule: 'Matches Registered Office', status: 'Mapped' },
  { sourceColumn: 'Residential_Pickup_Landmark', adhocxField: 'pickupAddress', sampleValue: 'Kondapur Main Signal', isRequired: true, validationRule: 'Geocodable address string', status: 'Mapped' },
  { sourceColumn: 'Special_Escort_Flag', adhocxField: 'isFemaleNightEscortRequired', sampleValue: 'TRUE', isRequired: false, validationRule: 'Boolean true/false', status: 'Mapped' },
];

export const mockIntegrationHealth = {
  overallUptimePct: 99.98,
  avgWebhookLatencyMs: 142,
  dailySyncEventsCount: 14200,
  recentEvents: [
    { time: '08:00:14 AM', event: 'Workday Roster Delta Ingestion', status: 'Success', records: 14 },
    { time: '07:30:00 AM', event: 'Employee Directory Full Scan', status: 'Success', records: 2846 },
    { time: '06:15:22 AM', event: 'Darwinbox Shift Swap Webhook', status: 'Success', records: 3 },
    { time: '04:00:00 AM', event: 'Night Shift Attendance Reconciliation', status: 'Success', records: 398 },
  ],
  failuresLog: [
    { time: '12 Dec 03:15 AM', event: 'SFTP Batch Upload', reason: 'Connection timeout after 30s', severity: 'Low', resolved: true },
  ],
};

export const mockOrganizationSettings = {
  companyName: 'HiTEC Technologies India Pvt Ltd',
  corporateCode: 'CORP-HYD-409',
  contactEmail: 'transport.desk@hitec-tech.com',
  emergencyDeskPhone: '+91 40 6812 9000',
  headquartersAddress: 'Building 4, Cyber Gateway, Madhapur, Hyderabad, TS 500081',
  timezone: 'Asia/Kolkata (IST +05:30)',
  currency: 'INR (₹)',
  maxAutoApprovalPerMonth: 4,
  femaleEscortNightHours: '20:00 - 06:00',
  defaultGeofenceRadiusMeters: 250,
  enforceOtpAtPickup: true,
  roles: [
    { roleName: 'Corporate Super Admin', usersCount: 3, permissions: 'Full Access to Fleet, Billing, Rosters & Security' },
    { roleName: 'Transport Operations Manager', usersCount: 8, permissions: 'Live Tracking, Roster Approval, Fleet Allocation' },
    { roleName: 'HR & Employee Success Lead', usersCount: 6, permissions: 'Employee Directory, Shift Rosters, Approvals' },
    { roleName: 'Safety & Security Officer', usersCount: 5, permissions: 'SOS Alerts, Incidents, Route Deviations, Logs' },
    { roleName: 'Finance & Accounts Specialist', usersCount: 4, permissions: 'Invoices, Disputes, Cost Centers, Rate Cards' },
    { roleName: 'Read-Only Executive', usersCount: 12, permissions: 'Dashboard & Reports Analytics View Only' },
  ],
};

export const mockAuditLogs = [
  { id: 'AUD-901', timestamp: '14 Dec 2026, 08:14:02 AM', actor: 'Priya Sharma (EMP02467)', role: 'Employee', action: 'SOS_TRIGGERED', ipAddress: '103.21.144.12', details: 'Triggered Emergency SOS button on Android App' },
  { id: 'AUD-902', timestamp: '14 Dec 2026, 07:45:00 AM', actor: 'Rakesh Kumar (CORP-ADM)', role: 'Corp Super Admin', action: 'ROSTER_PUBLISHED', ipAddress: '192.168.1.45', details: 'Published Roster V2.1 for Week 50 (8 Dec - 14 Dec)' },
  { id: 'AUD-903', timestamp: '13 Dec 2026, 05:20:10 PM', actor: 'Anjali Rao (HR-LEAD)', role: 'HR Lead', action: 'EMPLOYEE_IMPORTED', ipAddress: '192.168.1.78', details: 'Imported batch of 14 new joiners via Workday sync' },
  { id: 'AUD-904', timestamp: '13 Dec 2026, 02:11:45 PM', actor: 'Finance Admin', role: 'Finance Specialist', action: 'DISPUTE_RAISED', ipAddress: '192.168.2.11', details: 'Raised billing dispute DIS-0264 on invoice INV-2026-010' },
  { id: 'AUD-905', timestamp: '12 Dec 2026, 11:00:22 AM', actor: 'Venkatesh Rao (FACILITY)', role: 'Facility Head', action: 'GEOFENCE_UPDATED', ipAddress: '192.168.1.102', details: 'Expanded Cyber Gateway geofence radius to 250m' },
];

