/**
 * Smart Volunteer Driver Assignment Service
 *
 * Intelligently recommends and ranks eligible volunteer couriers for surplus food
 * pickups using an explainable 7-factor composite algorithm:
 * 1. Distance to pickup          — 25%
 * 2. Driver availability         — 20%
 * 3. Current active workload     — 15%
 * 4. Estimated travel time       — 15%
 * 5. Transport capacity          — 10%
 * 6. Service area compatibility  — 10%
 * 7. Food urgency                — 5%
 *
 * NOTE: Calculations are strictly server-side authoritative.
 */

import { prisma } from '@/lib/prisma';
import { calculateHaversineDistance, resolveCoordinates, formatDistance } from '@/lib/geo';
import { computeFoodUrgency, FoodUrgencyResult } from '@/services/food-urgency.service';
import { parseQuantityToServings } from '@/services/donation-matching.service';

export interface DriverRecommendation {
  driver: {
    id: string;
    name: string;
    location: string | null;
    dailyCapacity: number;
    serviceRadiusKm: number;
    isAvailable: boolean;
  };
  score: number; // 0 - 100
  distanceKm: number;
  estimatedTravelMinutes: number;
  availability: 'AVAILABLE' | 'UNAVAILABLE' | 'BUSY';
  activeWorkload: number;
  capacityCompatible: boolean;
  serviceAreaCompatible: boolean;
  urgencyLevel: string;
  reasons: string[];
}

export interface DriverAssignmentResult {
  listingId: string;
  claimId?: string;
  title: string;
  pickupAddress: string;
  dropoffAddress?: string;
  currentDriverId?: string | null;
  urgency: {
    score: number;
    level: string;
    timeRemainingDisplay: string;
    timeRemainingMinutes: number;
  };
  drivers: DriverRecommendation[];
}

/**
 * Calculates deterministic estimated urban courier travel time in minutes.
 * Models an average urban courier transit speed of 25 km/h + 3 min staging/parking buffer.
 */
export function calculateEstimatedTravelMinutes(distanceKm: number): number {
  if (distanceKm <= 0.05) return 3;
  const transitMinutes = (distanceKm / 25) * 60;
  return Math.max(3, Math.round(transitMinutes + 3));
}

/**
 * Evaluates and ranks eligible volunteer drivers for a food donation listing.
 */
export async function getRankedDriversForDonation(
  listingId: string
): Promise<DriverAssignmentResult> {
  // 1. Fetch listing with donor and active claims
  const listing = await prisma.foodListing.findUnique({
    where: { id: listingId },
    include: {
      donor: {
        select: {
          id: true,
          name: true,
          location: true,
          latitude: true,
          longitude: true,
        },
      },
      claims: {
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              location: true,
              latitude: true,
              longitude: true,
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!listing) {
    throw new Error('Food listing not found.');
  }

  // Active claim if already claimed by a receiver
  const activeClaim = listing.claims.find(
    (c) => c.status !== 'COMPLETED' && c.deliveryStatus !== 'DELIVERED'
  ) || listing.claims[0];

  // 2. Compute authoritative food urgency
  const urgencyResult: FoodUrgencyResult = computeFoodUrgency(listing, activeClaim);

  // 3. Resolve pickup coordinates (Donor location)
  const pickupCoords = resolveCoordinates(
    listing.latitude,
    listing.longitude,
    listing.locationAddress || listing.donor?.location
  );

  // Resolve dropoff address if claim exists
  const dropoffAddress = activeClaim?.receiver?.location || undefined;

  // 4. Fetch all volunteer drivers and their current active delivery workloads in bulk
  const drivers = await prisma.user.findMany({
    where: {
      role: 'VOLUNTEER',
    },
    include: {
      driverDeliveries: {
        where: {
          deliveryStatus: { in: ['DRIVER_ASSIGNED', 'IN_TRANSIT'] },
          status: { not: 'COMPLETED' },
        },
        select: {
          id: true,
          foodListingId: true,
          deliveryStatus: true,
        },
      },
    },
  });

  const estimatedServings = parseQuantityToServings(listing.quantity);
  const candidates: DriverRecommendation[] = [];

  for (const driver of drivers) {
    // Exclusion 1: Driver is already assigned to this exact donation claim
    if (activeClaim?.driverId && activeClaim.driverId === driver.id) {
      continue;
    }

    // Exclusion 2: Driver is marked unavailable
    if (!driver.isAvailable) {
      continue;
    }

    // Exclusion 3: Active workload limit (Maximum 3 concurrent active delivery runs)
    const activeWorkload = driver.driverDeliveries?.length || 0;
    if (activeWorkload >= 3) {
      continue;
    }

    // Resolve driver coordinates
    const driverCoords = resolveCoordinates(
      driver.latitude,
      driver.longitude,
      driver.location
    );

    // Calculate distance to pickup
    const distanceKm = calculateHaversineDistance(
      driverCoords.latitude,
      driverCoords.longitude,
      pickupCoords.latitude,
      pickupCoords.longitude
    );

    // Exclusion 4: Service radius constraint
    const serviceRadius = driver.serviceRadiusKm || 15.0;
    if (distanceKm > serviceRadius) {
      continue;
    }

    // ----------------------------------------------------
    // 7-FACTOR SCORING COMPUTATION
    // ----------------------------------------------------

    // 1. Distance to pickup score (0 - 100) — Weight: 25%
    let distanceScore = 100;
    if (distanceKm <= 2) {
      distanceScore = 100;
    } else if (distanceKm <= 5) {
      distanceScore = Math.round(100 - (distanceKm - 2) * 10);
    } else if (distanceKm <= 10) {
      distanceScore = Math.round(70 - (distanceKm - 5) * 6);
    } else if (distanceKm <= 20) {
      distanceScore = Math.round(40 - (distanceKm - 10) * 3);
    } else {
      distanceScore = Math.max(0, Math.round(10 - (distanceKm - 20) * 1));
    }

    // 2. Driver availability score (0 - 100) — Weight: 20%
    const availabilityScore = driver.isAvailable ? 100 : 0;

    // 3. Active workload score (0 - 100) — Weight: 15%
    let workloadScore = 100;
    if (activeWorkload === 0) {
      workloadScore = 100;
    } else if (activeWorkload === 1) {
      workloadScore = 75;
    } else if (activeWorkload === 2) {
      workloadScore = 40;
    } else {
      workloadScore = 10;
    }

    // 4. Estimated travel time score (0 - 100) — Weight: 15%
    const estimatedTravelMinutes = calculateEstimatedTravelMinutes(distanceKm);
    let travelScore = 100;
    if (estimatedTravelMinutes <= 10) {
      travelScore = 100;
    } else if (estimatedTravelMinutes <= 20) {
      travelScore = Math.round(100 - (estimatedTravelMinutes - 10) * 3);
    } else if (estimatedTravelMinutes <= 30) {
      travelScore = Math.round(70 - (estimatedTravelMinutes - 20) * 3);
    } else if (estimatedTravelMinutes <= 45) {
      travelScore = Math.round(40 - (estimatedTravelMinutes - 30) * 2);
    } else {
      travelScore = Math.max(0, Math.round(10 - (estimatedTravelMinutes - 45)));
    }

    // 5. Transport / vehicle capacity score (0 - 100) — Weight: 10%
    const driverCapacity = driver.dailyCapacity || 100;
    let capacityScore = 80; // neutral fallback
    const capacityCompatible = driverCapacity >= estimatedServings;
    if (driverCapacity >= estimatedServings) {
      capacityScore = 100;
    } else if (driverCapacity >= estimatedServings * 0.7) {
      capacityScore = 70;
    } else {
      capacityScore = 40;
    }

    // 6. Service area compatibility score (0 - 100) — Weight: 10%
    const radiusRatio = distanceKm / serviceRadius;
    let serviceAreaScore = 70;
    if (radiusRatio <= 0.3) {
      serviceAreaScore = 100;
    } else if (radiusRatio <= 0.7) {
      serviceAreaScore = 85;
    } else {
      serviceAreaScore = 65;
    }

    // 7. Food urgency score (0 - 100) — Weight: 5%
    // Higher operational urgency values elevate prioritization of available couriers
    let urgencyScore = urgencyResult.score;
    if (urgencyResult.level === 'LOW' || urgencyResult.level === 'MEDIUM') {
      urgencyScore = Math.max(50, urgencyResult.score);
    }

    // Composite Weighted Calculation
    const weightedScore =
      distanceScore * 0.25 +
      availabilityScore * 0.20 +
      workloadScore * 0.15 +
      travelScore * 0.15 +
      capacityScore * 0.10 +
      serviceAreaScore * 0.10 +
      urgencyScore * 0.05;

    const finalScore = Math.min(100, Math.max(0, Math.round(weightedScore)));

    // ----------------------------------------------------
    // EXPLAINABLE REASONS LIST
    // ----------------------------------------------------
    const reasons: string[] = [];

    // Distance reason
    reasons.push(`✓ ${formatDistance(distanceKm)} from pickup`);

    // Travel time reason
    reasons.push(`✓ ~${estimatedTravelMinutes} min estimated travel time`);

    // Availability reason
    reasons.push('✓ Active & available for dispatch');

    // Workload reason
    if (activeWorkload === 0) {
      reasons.push('✓ No active runs (immediate departure)');
    } else if (activeWorkload === 1) {
      reasons.push('✓ Light active workload (1 current delivery)');
    } else {
      reasons.push(`✓ Manageable active workload (${activeWorkload} runs)`);
    }

    // Service area reason
    reasons.push(`✓ Within courier service area (${serviceRadius} km radius)`);

    // Capacity reason
    if (capacityCompatible) {
      reasons.push(`✓ Suitable transport capacity (${driverCapacity} servings intake)`);
    }

    // Urgency reason
    if (!urgencyResult.isExpired && (urgencyResult.level === 'CRITICAL' || urgencyResult.level === 'HIGH')) {
      reasons.push(`✓ Critical priority pickup (${urgencyResult.timeRemainingDisplay})`);
    }

    candidates.push({
      driver: {
        id: driver.id,
        name: driver.name,
        location: driver.location,
        dailyCapacity: driverCapacity,
        serviceRadiusKm: serviceRadius,
        isAvailable: driver.isAvailable,
      },
      score: finalScore,
      distanceKm,
      estimatedTravelMinutes,
      availability: activeWorkload >= 2 ? 'BUSY' : 'AVAILABLE',
      activeWorkload,
      capacityCompatible,
      serviceAreaCompatible: true,
      urgencyLevel: urgencyResult.level,
      reasons,
    });
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  return {
    listingId: listing.id,
    claimId: activeClaim?.id,
    title: listing.title,
    pickupAddress: listing.locationAddress,
    dropoffAddress,
    currentDriverId: activeClaim?.driverId,
    urgency: {
      score: urgencyResult.score,
      level: urgencyResult.level,
      timeRemainingDisplay: urgencyResult.timeRemainingDisplay,
      timeRemainingMinutes: urgencyResult.timeRemainingMinutes,
    },
    drivers: candidates,
  };
}

/**
 * Validates driver eligibility server-side before executing assignment or reassignment.
 * Guaranteed server-side checks: never trusts client parameters.
 */
export async function validateDriverEligibility(
  listingId: string,
  driverId: string,
  requesterUserId: string,
  requesterUserRole: string,
  allowReassign = false
): Promise<{
  success: boolean;
  error?: string;
  claim?: any;
  listing?: any;
  driver?: any;
}> {
  // 1. Listing existence and authorization check
  const listing = await prisma.foodListing.findUnique({
    where: { id: listingId },
    include: {
      claims: {
        include: {
          driver: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!listing) {
    return { success: false, error: 'Food listing not found.' };
  }

  // Donor who created the listing or ADMIN can assign
  const isOwner = listing.donorId === requesterUserId;
  const isAdmin = requesterUserRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return {
      success: false,
      error: 'Forbidden. Only the donor who posted this donation or a platform admin can assign drivers.',
    };
  }

  // 2. Claim status check: must have an active claim needing courier
  const activeClaim = listing.claims.find(
    (c) => c.status !== 'COMPLETED' && c.deliveryStatus !== 'DELIVERED'
  );

  if (!activeClaim) {
    return {
      success: false,
      error: 'No active recipient claim found for this donation. Receivers must claim the food first.',
    };
  }

  // Check if already in transit or delivered
  if (activeClaim.deliveryStatus === 'IN_TRANSIT') {
    return {
      success: false,
      error: 'This delivery is currently in transit and cannot be reassigned.',
    };
  }

  if (activeClaim.deliveryStatus === 'DELIVERED') {
    return {
      success: false,
      error: 'This delivery has already been verified and delivered.',
    };
  }

  // Check if driver is already assigned to this claim
  if (activeClaim.driverId === driverId) {
    return {
      success: false,
      error: 'This volunteer courier is already assigned to this delivery.',
    };
  }

  // If driver is already assigned and reassignment is not allowed
  if (activeClaim.driverId && !allowReassign) {
    return {
      success: false,
      error: 'A courier is already assigned. Please confirm reassignment to proceed.',
    };
  }

  // 3. Driver existence and role check
  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    include: {
      driverDeliveries: {
        where: {
          deliveryStatus: { in: ['DRIVER_ASSIGNED', 'IN_TRANSIT'] },
          status: { not: 'COMPLETED' },
        },
      },
    },
  });

  if (!driver) {
    return { success: false, error: 'Volunteer driver not found.' };
  }

  if (driver.role !== 'VOLUNTEER' && driver.role !== 'ADMIN') {
    return { success: false, error: 'Selected user is not registered as a volunteer courier.' };
  }

  // Check availability
  if (!driver.isAvailable) {
    return { success: false, error: 'Selected volunteer driver is currently marked unavailable.' };
  }

  // Check driver active capacity threshold (max 3)
  if ((driver.driverDeliveries?.length || 0) >= 3) {
    return {
      success: false,
      error: 'Selected volunteer driver is already at maximum concurrent delivery capacity (3 active runs).',
    };
  }

  // Check service radius
  const pickupCoords = resolveCoordinates(listing.latitude, listing.longitude, listing.locationAddress);
  const driverCoords = resolveCoordinates(driver.latitude, driver.longitude, driver.location);
  const distanceKm = calculateHaversineDistance(
    driverCoords.latitude,
    driverCoords.longitude,
    pickupCoords.latitude,
    pickupCoords.longitude
  );

  const maxRadius = driver.serviceRadiusKm || 15.0;
  if (distanceKm > maxRadius) {
    return {
      success: false,
      error: `Pickup location is outside this driver's configured service radius (${distanceKm} km > ${maxRadius} km).`,
    };
  }

  return {
    success: true,
    claim: activeClaim,
    listing,
    driver,
  };
}
