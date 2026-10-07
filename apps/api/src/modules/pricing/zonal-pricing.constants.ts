/**
 * Canonical source data for the Hyderabad corporate zonal rate card (New Adok Rate Card 2026).
 * Source of truth: users.pdf (Vendor PRD) and driver.pdf (Driver PRD), both v1.0 dated 25 Sep 2026.
 *
 * These constants seed the DB-backed RateCardVersion / LocalityMaster tables on first boot.
 * At runtime, quotes are priced from the ACTIVE DB version; these values are only the
 * fallback when no published version exists yet.
 */

export type OfficeHubId = 'HITEC_NANAKRAMGUDA' | 'KOKAPET';

export type ZoneId = 'EXTRA' | 'ZONE_6' | 'ZONE_5' | 'ZONE_4' | 'ZONE_3' | 'ZONE_2' | 'ZONE_1';

export type ZonalVehicleClass = 'SEDAN' | 'SUV';

export type TripDirection = 'INBOUND_TO_OFFICE' | 'OUTBOUND_FROM_OFFICE';

export const ZONE_IDS: ZoneId[] = ['EXTRA', 'ZONE_6', 'ZONE_5', 'ZONE_4', 'ZONE_3', 'ZONE_2', 'ZONE_1'];
export const HUB_IDS: OfficeHubId[] = ['HITEC_NANAKRAMGUDA', 'KOKAPET'];
export const ZONAL_VEHICLE_CLASSES: ZonalVehicleClass[] = ['SEDAN', 'SUV'];

/** Exactly 7 zones x 2 hubs x 2 vehicle classes = 28 unique rows per audience (PRD release check). */
export const REQUIRED_RATE_ROWS = ZONE_IDS.length * HUB_IDS.length * ZONAL_VEHICLE_CLASSES.length;

export const ZONE_LABELS: Record<ZoneId, string> = {
  EXTRA: 'Extra (E)',
  ZONE_6: 'Zone 6',
  ZONE_5: 'Zone 5',
  ZONE_4: 'Zone 4',
  ZONE_3: 'Zone 3',
  ZONE_2: 'Zone 2',
  ZONE_1: 'Zone 1',
};

export const SEED_RATE_VERSION = '2026.1';
export const SEED_EFFECTIVE_FROM = '2026-09-25T00:00:00.000Z';

export type MatrixCell = { sedan: number; suv: number; escortSedan: number; escortSuv: number };

// Vendor rate card (INR). Escort values are CEILINGS, applied only when an escort service is explicitly selected.
export const VENDOR_ZONAL_RATE_MATRIX: Record<OfficeHubId, Record<ZoneId, MatrixCell>> = {
  HITEC_NANAKRAMGUDA: {
    EXTRA: { sedan: 500, suv: 700, escortSedan: 200, escortSuv: 300 },
    ZONE_6: { sedan: 600, suv: 900, escortSedan: 200, escortSuv: 300 },
    ZONE_5: { sedan: 700, suv: 1000, escortSedan: 300, escortSuv: 400 },
    ZONE_4: { sedan: 800, suv: 1100, escortSedan: 300, escortSuv: 400 },
    ZONE_3: { sedan: 900, suv: 1200, escortSedan: 400, escortSuv: 500 },
    ZONE_2: { sedan: 1000, suv: 1300, escortSedan: 400, escortSuv: 500 },
    ZONE_1: { sedan: 1100, suv: 1400, escortSedan: 400, escortSuv: 500 },
  },
  KOKAPET: {
    EXTRA: { sedan: 600, suv: 800, escortSedan: 300, escortSuv: 400 },
    ZONE_6: { sedan: 700, suv: 900, escortSedan: 300, escortSuv: 400 },
    ZONE_5: { sedan: 800, suv: 1100, escortSedan: 300, escortSuv: 400 },
    ZONE_4: { sedan: 900, suv: 1200, escortSedan: 300, escortSuv: 400 },
    ZONE_3: { sedan: 1000, suv: 1300, escortSedan: 400, escortSuv: 500 },
    ZONE_2: { sedan: 1100, suv: 1400, escortSedan: 400, escortSuv: 500 },
    ZONE_1: { sedan: 1200, suv: 1500, escortSedan: 400, escortSuv: 500 },
  },
};

// Driver earnings (INR), stored as fixed amounts per driver.pdf. They happen to equal 85% of the
// vendor table but must never be computed as a live percentage. Escort is NOT copied into driver
// earnings (Driver PRD D AT04): any driver escort addition needs a separately approved amount.
export const DRIVER_ZONAL_RATE_MATRIX: Record<OfficeHubId, Record<ZoneId, { sedan: number; suv: number }>> = {
  HITEC_NANAKRAMGUDA: {
    EXTRA: { sedan: 425, suv: 595 },
    ZONE_6: { sedan: 510, suv: 765 },
    ZONE_5: { sedan: 595, suv: 850 },
    ZONE_4: { sedan: 680, suv: 935 },
    ZONE_3: { sedan: 765, suv: 1020 },
    ZONE_2: { sedan: 850, suv: 1105 },
    ZONE_1: { sedan: 935, suv: 1190 },
  },
  KOKAPET: {
    EXTRA: { sedan: 510, suv: 680 },
    ZONE_6: { sedan: 595, suv: 765 },
    ZONE_5: { sedan: 680, suv: 935 },
    ZONE_4: { sedan: 765, suv: 1020 },
    ZONE_3: { sedan: 850, suv: 1105 },
    ZONE_2: { sedan: 935, suv: 1190 },
    ZONE_1: { sedan: 1020, suv: 1275 },
  },
};

export interface HubGeofenceAnchor {
  lat: number;
  lng: number;
  /** H3 res-8 kRing around the anchor cell. k=1 is roughly a 0.8-1.2 km radius, k=2 roughly 1.6-2 km. */
  k: number;
}

export interface OfficeHubDefinition {
  id: OfficeHubId;
  displayName: string;
  lat: number;
  lng: number;
  /**
   * Hub geofence = union of H3 res-8 disks around these anchors. Kept tight because the Extra zone
   * (Gachibowli, Madhapur, Kondapur city, HITEC City) surrounds the HITEC hub. Exact hub boundaries are a
   * PRD pre-production decision: override with the ZONAL_HUB_GEOFENCES env JSON once operations approves.
   */
  geofence: HubGeofenceAnchor[];
}

export const OFFICE_HUBS: OfficeHubDefinition[] = [
  {
    id: 'HITEC_NANAKRAMGUDA',
    displayName: 'HITEC / Nanakramguda',
    lat: 17.4435,
    lng: 78.3772,
    geofence: [
      { lat: 17.4435, lng: 78.3772, k: 1 }, // HITEC City / Cyber Towers / Raidurg cluster
      { lat: 17.4155, lng: 78.3416, k: 1 }, // Nanakramguda Financial District cluster
    ],
  },
  {
    id: 'KOKAPET',
    displayName: 'Kokapet',
    lat: 17.385,
    lng: 78.3245,
    geofence: [{ lat: 17.385, lng: 78.3245, k: 2 }],
  },
];

export interface LocalityDefinition {
  name: string;
  zoneId: ZoneId;
  /** Starred in the PRD guide: identity/boundary unverified, cannot auto-quote. */
  requiresReview?: boolean;
  /** Record exists but is not bookable at all until activated by operations. */
  inactive?: boolean;
  notes?: string;
}

/** Stable locality ID derived from the display name, e.g. "Kondapur (outskirts)" -> LOC_KONDAPUR_OUTSKIRTS. */
export function localityIdFor(name: string): string {
  return (
    'LOC_' +
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

/** Normalises free text for exact alias/name lookup (never used for substring matching). */
export function normaliseLocalityKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Names removed from the master; must never be offered as bookable choices (PRD). */
export const EXCLUDED_LOCALITY_NAMES = ['Osmig', 'Old MIG'];

export const LOCALITY_MASTER: LocalityDefinition[] = [
  // Extra (E)
  { name: 'Gachibowli', zoneId: 'EXTRA' },
  { name: 'HITEC City', zoneId: 'EXTRA' },
  { name: 'Kondapur (city area)', zoneId: 'EXTRA' },
  { name: 'Madhapur', zoneId: 'EXTRA' },

  // Zone 6
  { name: 'BHEL', zoneId: 'ZONE_6' },
  { name: 'Borabanda', zoneId: 'ZONE_6' },
  { name: 'Filmnagar', zoneId: 'ZONE_6' },
  { name: 'Gowlidoddi', zoneId: 'ZONE_6' },
  { name: 'Gudimalkapur', zoneId: 'ZONE_6' },
  { name: 'Hafeezpet', zoneId: 'ZONE_6' },
  { name: 'KPHB', zoneId: 'ZONE_6' },
  { name: 'Langerhouse', zoneId: 'ZONE_6' },
  { name: 'Lingampally', zoneId: 'ZONE_6' },
  { name: 'Manikonda', zoneId: 'ZONE_6' },
  { name: 'Mehdipatnam', zoneId: 'ZONE_6' },
  { name: 'Nanakramguda', zoneId: 'ZONE_6' },
  { name: 'Narsingi', zoneId: 'ZONE_6' },
  { name: 'Shaikpet', zoneId: 'ZONE_6' },
  { name: 'Tolichowki', zoneId: 'ZONE_6' },
  { name: 'Yellareddyguda', zoneId: 'ZONE_6' },
  { name: 'Yousufguda', zoneId: 'ZONE_6' },

  // Zone 5
  { name: 'Abids', zoneId: 'ZONE_5' },
  { name: 'Aghapura', zoneId: 'ZONE_5' },
  { name: 'Ameenpur', zoneId: 'ZONE_5' },
  { name: 'Attapur', zoneId: 'ZONE_5' },
  { name: 'Bandlaguda Jagir', zoneId: 'ZONE_5' },
  { name: 'Begumbazar', zoneId: 'ZONE_5' },
  { name: 'Begumpet', zoneId: 'ZONE_5' },
  { name: 'Chandanagar', zoneId: 'ZONE_5' },
  { name: 'Chintalmet', zoneId: 'ZONE_5' },
  { name: 'Erragadda', zoneId: 'ZONE_5' },
  { name: 'Gajularamaram', zoneId: 'ZONE_5' },
  { name: 'Gandhamguda', zoneId: 'ZONE_5' },
  { name: 'Godi Ki Khabeer', zoneId: 'ZONE_5', requiresReview: true },
  { name: 'Gopanpally', zoneId: 'ZONE_5' },
  { name: 'Goshamahal', zoneId: 'ZONE_5' },
  { name: 'Himayatnagar', zoneId: 'ZONE_5' },
  { name: 'Hydershakot', zoneId: 'ZONE_5' },
  { name: 'IDA Bollaram', zoneId: 'ZONE_5' },
  { name: 'Ibrahimbagh', zoneId: 'ZONE_5' },
  { name: 'Jagadgirigutta', zoneId: 'ZONE_5' },
  { name: 'Jambagh', zoneId: 'ZONE_5' },
  { name: 'Jiyaguda', zoneId: 'ZONE_5' },
  { name: 'Karwan', zoneId: 'ZONE_5' },
  { name: 'Khairatabad', zoneId: 'ZONE_5' },
  { name: 'Kishanbagh', zoneId: 'ZONE_5' },
  { name: 'Kismatpur', zoneId: 'ZONE_5' },
  { name: 'Koti', zoneId: 'ZONE_5' },
  { name: 'Kukatpally', zoneId: 'ZONE_5' },
  { name: 'Madinaguda', zoneId: 'ZONE_5' },
  { name: 'Miyapur', zoneId: 'ZONE_5' },
  { name: 'Moosapet', zoneId: 'ZONE_5' },
  { name: 'Nallagandla', zoneId: 'ZONE_5' },
  { name: 'Nampally', zoneId: 'ZONE_5' },
  { name: 'Neknampur', zoneId: 'ZONE_5' },
  { name: 'Nizampet', zoneId: 'ZONE_5' },
  { name: 'Pebel City', zoneId: 'ZONE_5', requiresReview: true },
  { name: 'Pragati Nagar', zoneId: 'ZONE_5' },
  { name: 'Prakash Nagar', zoneId: 'ZONE_5' },
  { name: 'Punjagutta', zoneId: 'ZONE_5' },
  { name: 'Puranapool', zoneId: 'ZONE_5' },
  { name: 'RC Puram', zoneId: 'ZONE_5' },
  { name: 'Rajendra Nagar', zoneId: 'ZONE_5' },
  { name: 'Rasoolpura', zoneId: 'ZONE_5' },
  { name: 'SR Nagar', zoneId: 'ZONE_5' },
  { name: 'Tellapur', zoneId: 'ZONE_5' },
  { name: 'Upperpally', zoneId: 'ZONE_5' },

  // Zone 4
  { name: 'Afzal Gunj', zoneId: 'ZONE_4' },
  { name: 'Aliyabad', zoneId: 'ZONE_4' },
  { name: 'Amberpet', zoneId: 'ZONE_4' },
  { name: 'Bachupally', zoneId: 'ZONE_4' },
  { name: 'Beeramguda', zoneId: 'ZONE_4' },
  { name: 'Bholakpur', zoneId: 'ZONE_4' },
  { name: 'Bowenpally', zoneId: 'ZONE_4' },
  { name: 'Bowrampet', zoneId: 'ZONE_4' },
  { name: 'Chaderghat', zoneId: 'ZONE_4' },
  { name: 'Chaitanya Puri', zoneId: 'ZONE_4' },
  { name: 'Chanchalguda', zoneId: 'ZONE_4' },
  { name: 'Chatrinaka', zoneId: 'ZONE_4' },
  { name: 'Dabeerpura', zoneId: 'ZONE_4' },
  { name: 'Dilsukhnagar', zoneId: 'ZONE_4' },
  { name: 'East Maredpally', zoneId: 'ZONE_4' },
  { name: 'Gandhinagar', zoneId: 'ZONE_4' },
  { name: 'Golnaka', zoneId: 'ZONE_4' },
  { name: 'Gowliguda', zoneId: 'ZONE_4' },
  { name: 'Gowlipura', zoneId: 'ZONE_4' },
  { name: 'Jahanuma', zoneId: 'ZONE_4' },
  { name: 'Jeedimetla', zoneId: 'ZONE_4' },
  { name: 'Kachiguda', zoneId: 'ZONE_4' },
  { name: 'Kavadiguda', zoneId: 'ZONE_4' },
  { name: 'Kharkhana', zoneId: 'ZONE_4' },
  { name: 'Kishtareddypet', zoneId: 'ZONE_4' },
  { name: 'Kollur', zoneId: 'ZONE_4' },
  { name: 'Krishna Reddy Pet', zoneId: 'ZONE_4' },
  { name: 'Lal Darwaza', zoneId: 'ZONE_4' },
  { name: 'Lalaguda', zoneId: 'ZONE_4' },
  { name: 'Lalapet', zoneId: 'ZONE_4' },
  { name: 'MGBS', zoneId: 'ZONE_4' },
  { name: 'Madannapet', zoneId: 'ZONE_4' },
  { name: 'Malakpet', zoneId: 'ZONE_4' },
  { name: 'Mallampet', zoneId: 'ZONE_4' },
  { name: 'Milad Rakshapuram', zoneId: 'ZONE_4', requiresReview: true },
  { name: 'Moin Bagh', zoneId: 'ZONE_4' },
  { name: 'Moosarambagh', zoneId: 'ZONE_4' },
  { name: 'Musheerabad', zoneId: 'ZONE_4' },
  { name: 'Namalgundu', zoneId: 'ZONE_4' },
  { name: 'Nawabshaheen Kunta', zoneId: 'ZONE_4', requiresReview: true },
  { name: 'OU Campus', zoneId: 'ZONE_4' },
  { name: 'Padmarao Nagar', zoneId: 'ZONE_4' },
  { name: 'Parsigutta', zoneId: 'ZONE_4' },
  { name: 'Patancheru', zoneId: 'ZONE_4' },
  { name: 'Patelguda', zoneId: 'ZONE_4' },
  { name: 'Quthbullapur', zoneId: 'ZONE_4' },
  { name: 'RTC X Road', zoneId: 'ZONE_4' },
  { name: 'Ramanthapur', zoneId: 'ZONE_4' },
  { name: 'Ramnagar', zoneId: 'ZONE_4' },
  { name: 'Saidabad', zoneId: 'ZONE_4' },
  { name: 'Santosh Nagar', zoneId: 'ZONE_4' },
  { name: 'Secunderabad', zoneId: 'ZONE_4' },
  { name: 'Seethaphalmandi', zoneId: 'ZONE_4' },
  { name: 'Shahinda', zoneId: 'ZONE_4', requiresReview: true },
  { name: 'Shamsheergunj', zoneId: 'ZONE_4' },
  { name: 'Shapur', zoneId: 'ZONE_4' },
  { name: 'Suraram', zoneId: 'ZONE_4' },
  { name: 'Tarnaka', zoneId: 'ZONE_4' },
  { name: 'Tilaknagar', zoneId: 'ZONE_4' },
  { name: 'Tirumalgiri', zoneId: 'ZONE_4' },
  { name: 'Uppuguda', zoneId: 'ZONE_4' },
  { name: 'Vattepally', zoneId: 'ZONE_4' },
  { name: 'Vidyanagar', zoneId: 'ZONE_4' },
  { name: 'Warasiguda', zoneId: 'ZONE_4' },
  { name: 'West Maredpally', zoneId: 'ZONE_4' },
  { name: 'Yakutpura', zoneId: 'ZONE_4' },

  // Zone 3
  { name: 'AS Rao Nagar', zoneId: 'ZONE_3' },
  { name: 'Almasguda', zoneId: 'ZONE_3' },
  { name: 'Alwal', zoneId: 'ZONE_3' },
  { name: 'BN Reddy', zoneId: 'ZONE_3' },
  { name: 'Babanagar', zoneId: 'ZONE_3' },
  { name: 'Badangpet', zoneId: 'ZONE_3' },
  { name: 'Bahadurpally', zoneId: 'ZONE_3' },
  { name: 'Balapur', zoneId: 'ZONE_3' },
  { name: 'Balapur Gayathri Nagar', zoneId: 'ZONE_3' },
  { name: 'Balapur Malapur', zoneId: 'ZONE_3', requiresReview: true },
  { name: 'Barkas', zoneId: 'ZONE_3' },
  { name: 'Boduppal', zoneId: 'ZONE_3' },
  { name: 'Chakripuram', zoneId: 'ZONE_3' },
  { name: 'Chandrayangutta', zoneId: 'ZONE_3' },
  { name: 'Dulapally', zoneId: 'ZONE_3' },
  { name: 'ECIL', zoneId: 'ZONE_3' },
  { name: 'Gandimaisamma', zoneId: 'ZONE_3' },
  { name: 'Gundlapochampally', zoneId: 'ZONE_3' },
  { name: 'Hastinapuram', zoneId: 'ZONE_3' },
  { name: 'Indresham', zoneId: 'ZONE_3' },
  { name: 'Jalpally', zoneId: 'ZONE_3' },
  { name: 'Kapra', zoneId: 'ZONE_3' },
  { name: 'Karmanghat', zoneId: 'ZONE_3' },
  { name: 'Kompally', zoneId: 'ZONE_3' },
  { name: 'Kushaiguda', zoneId: 'ZONE_3' },
  { name: 'LB Nagar', zoneId: 'ZONE_3' },
  { name: 'Machabollaram', zoneId: 'ZONE_3' },
  { name: 'Madannaguda', zoneId: 'ZONE_3', requiresReview: true },
  { name: 'Malkajgiri', zoneId: 'ZONE_3' },
  { name: 'Mallapur', zoneId: 'ZONE_3' },
  { name: 'Medipally', zoneId: 'ZONE_3' },
  { name: 'Meerpet', zoneId: 'ZONE_3' },
  { name: 'Moinabad', zoneId: 'ZONE_3' },
  { name: 'Moulali', zoneId: 'ZONE_3' },
  { name: 'Nacharam', zoneId: 'ZONE_3' },
  { name: 'Nagole', zoneId: 'ZONE_3' },
  { name: 'Nagole Bandlaguda', zoneId: 'ZONE_3' },
  { name: 'Pahadishareef', zoneId: 'ZONE_3' },
  { name: 'Pardhiguda', zoneId: 'ZONE_3', requiresReview: true },
  { name: 'Peerzadiguda', zoneId: 'ZONE_3' },
  { name: 'Sainikpuri', zoneId: 'ZONE_3' },
  { name: 'Saroor Nagar', zoneId: 'ZONE_3' },
  { name: 'Shaheen Nagar', zoneId: 'ZONE_3' },
  { name: 'Shamshabad', zoneId: 'ZONE_3' },
  { name: 'Uppal', zoneId: 'ZONE_3' },
  { name: 'Vanasthalipuram', zoneId: 'ZONE_3' },

  // Zone 2
  { name: 'Bonthapally', zoneId: 'ZONE_2' },
  { name: 'Chengicherla', zoneId: 'ZONE_2' },
  { name: 'Chellarla', zoneId: 'ZONE_2', requiresReview: true },
  { name: 'Cheriyal', zoneId: 'ZONE_2', requiresReview: true },
  { name: 'Cherlapally', zoneId: 'ZONE_2' },
  { name: 'Dammaiguda', zoneId: 'ZONE_2' },
  { name: 'Dundigal', zoneId: 'ZONE_2' },
  { name: 'Gagillapur', zoneId: 'ZONE_2' },
  { name: 'Gurramguda', zoneId: 'ZONE_2' },
  { name: 'Hayathnagar', zoneId: 'ZONE_2' },
  { name: 'Injapur', zoneId: 'ZONE_2' },
  { name: 'Ismail Khanguda', zoneId: 'ZONE_2' },
  { name: 'Isnapur', zoneId: 'ZONE_2' },
  { name: 'Jinagar', zoneId: 'ZONE_2', requiresReview: true },
  { name: 'Kachavani Singaram', zoneId: 'ZONE_2' },
  { name: 'Kandlakoya', zoneId: 'ZONE_2' },
  { name: 'Kareemguda', zoneId: 'ZONE_2' },
  { name: 'Kowkoor', zoneId: 'ZONE_2' },
  { name: 'Kuntloor', zoneId: 'ZONE_2' },
  { name: 'Nadergul', zoneId: 'ZONE_2' },
  { name: 'Nagaram', zoneId: 'ZONE_2' },
  { name: 'Narapally', zoneId: 'ZONE_2' },
  { name: 'Pashamylaram', zoneId: 'ZONE_2' },
  { name: 'Pasumamula', zoneId: 'ZONE_2' },
  { name: 'Pocharam', zoneId: 'ZONE_2' },
  { name: 'Pratapsingaram', zoneId: 'ZONE_2' },
  { name: 'Rampally X Road', zoneId: 'ZONE_2' },
  { name: 'Rudraram', zoneId: 'ZONE_2' },
  { name: 'Shankerpally', zoneId: 'ZONE_2' },
  { name: 'Thatti Annaram', zoneId: 'ZONE_2' },
  { name: 'Thumkunta', zoneId: 'ZONE_2' },
  { name: 'Yammampet', zoneId: 'ZONE_2', requiresReview: true },

  // Zone 1
  { name: 'Abdullapurmet', zoneId: 'ZONE_1' },
  { name: 'Adibatla', zoneId: 'ZONE_1' },
  { name: 'Aushapur', zoneId: 'ZONE_1' },
  { name: 'Bongulur', zoneId: 'ZONE_1' },
  { name: 'Cheeriyala', zoneId: 'ZONE_1', requiresReview: true },
  { name: 'Edulabad', zoneId: 'ZONE_1' },
  { name: 'Ghatkesar', zoneId: 'ZONE_1' },
  { name: 'Gowrelly', zoneId: 'ZONE_1' },
  { name: 'Gummadidala', zoneId: 'ZONE_1' },
  { name: 'Ibrahimpatnam', zoneId: 'ZONE_1' },
  { name: 'Kandi', zoneId: 'ZONE_1' },
  { name: 'Keesara', zoneId: 'ZONE_1' },
  { name: 'Koheda', zoneId: 'ZONE_1' },
  { name: 'Kondapur (outskirts)', zoneId: 'ZONE_1', requiresReview: true, inactive: true, notes: 'Inactive until a specific map pin is approved' },
  { name: 'Manneguda', zoneId: 'ZONE_1' },
  { name: 'Medchal', zoneId: 'ZONE_1' },
  { name: 'Muchintal', zoneId: 'ZONE_1' },
  { name: 'Pedda Amberpet', zoneId: 'ZONE_1' },
  { name: 'Pedda Golconda', zoneId: 'ZONE_1' },
  { name: 'Rampally Village', zoneId: 'ZONE_1' },
  { name: 'Sangareddy', zoneId: 'ZONE_1' },
  { name: 'Shamirpet', zoneId: 'ZONE_1' },
  { name: 'Taramatipet', zoneId: 'ZONE_1' },
  { name: 'Torrur', zoneId: 'ZONE_1' },
  { name: 'Tukkuguda', zoneId: 'ZONE_1' },
  { name: 'Turkapally', zoneId: 'ZONE_1' },
  { name: 'Turkayamjal', zoneId: 'ZONE_1' },
  { name: 'Yadigirpally', zoneId: 'ZONE_1' },
  { name: 'Yellampet', zoneId: 'ZONE_1' },
];

export const LOCALITY_ALIASES: Record<string, string> = {
  nexampuri: 'Neknampur',
  manaikonda: 'Manikonda',
  upparpally: 'Upperpally',
  pratabsingaram: 'Pratapsingaram',
  pratapasingaram: 'Pratapsingaram',
  nallagundu: 'Namalgundu',
};
