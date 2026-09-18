/**
 * Geographic calculation and coordinate utility functions
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates geographic distance in kilometers between two coordinates
 * using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Standard fallback coordinate mapping for demo and local metro addresses
 * when explicit GPS coordinates were not entered.
 */
const KNOWN_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  brooklyn: { latitude: 40.6782, longitude: -73.9442 },
  manhattan: { latitude: 40.7831, longitude: -73.9712 },
  queens: { latitude: 40.7282, longitude: -73.7949 },
  bronx: { latitude: 40.8448, longitude: -73.8648 },
  'staten island': { latitude: 40.5795, longitude: -74.1502 },
  'lower manhattan': { latitude: 40.7128, longitude: -74.006 },
  'broadway': { latitude: 40.7081, longitude: -74.0113 },
  'grand avenue': { latitude: 40.6833, longitude: -73.9626 },
  'new york': { latitude: 40.7128, longitude: -74.006 },
  ny: { latitude: 40.7128, longitude: -74.006 },
};

/**
 * Resolves coordinates with fuzzy keyword matching fallback
 */
export function resolveCoordinates(
  explicitLat?: number | null,
  explicitLon?: number | null,
  addressOrLocation?: string | null
): { latitude: number; longitude: number } {
  if (
    typeof explicitLat === 'number' &&
    !isNaN(explicitLat) &&
    typeof explicitLon === 'number' &&
    !isNaN(explicitLon)
  ) {
    return { latitude: explicitLat, longitude: explicitLon };
  }

  if (addressOrLocation) {
    const lower = addressOrLocation.toLowerCase();
    for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
      if (lower.includes(key)) {
        return coords;
      }
    }
  }

  // Default metro center (New York City Hall / Downtown)
  return { latitude: 40.7128, longitude: -74.006 };
}

/**
 * Formats a distance in kilometers for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.1) {
    return 'Just around the corner (< 100m)';
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
