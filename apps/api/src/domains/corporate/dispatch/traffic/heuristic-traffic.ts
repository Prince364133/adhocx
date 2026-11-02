/**
 * Legacy Hyderabad peak-hour heuristic, kept as the offline/failed-API fallback for the DDA.
 * Peak morning 07:00-09:59, peak evening 17:00-19:59 (server-local hours).
 *  - long route (> 30 km) in peak  => 35 min (SEVERE)
 *  - any route in peak             => 15 min (MODERATE)
 *  - otherwise                     => 0 min
 */
export interface HeuristicTrafficDelay {
  delayMinutes: number;
  congestionLevel: 'NORMAL' | 'MODERATE' | 'SEVERE';
  reason: string;
}

export function heuristicTrafficDelay(distanceMeters: number, departureTime: Date): HeuristicTrafficDelay {
  const hour = departureTime.getHours();
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

  if (isPeak && distanceMeters > 30000) {
    return {
      delayMinutes: 35,
      congestionLevel: 'SEVERE',
      reason: 'Severe peak-hour arterial corridor congestion detected on ORR/Cyberabad stretch',
    };
  }
  if (isPeak) {
    return {
      delayMinutes: 15,
      congestionLevel: 'MODERATE',
      reason: 'Moderate peak-hour flow detected; traffic buffer recommended',
    };
  }
  return {
    delayMinutes: 0,
    congestionLevel: 'NORMAL',
    reason: 'Traffic conditions are optimal along route corridor',
  };
}

/** Haversine x 1.25 road-tortuosity, matching the route solver's planning model. */
export function estimateRoadDistanceMeters(waypoints: { latitude: number; longitude: number }[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    const R = 6371000;
    const toRad = (d: number) => (Number(d) * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 1.25;
  }
  return Math.round(total);
}
