/**
 * Smart Donation Matching Service
 *
 * Evaluates available food donations against registered receivers
 * using an explainable 6-factor algorithm:
 * 1. Geographic distance — 30%
 * 2. Food compatibility — 20%
 * 3. Receiver capacity — 15%
 * 4. Donation urgency — 15%
 * 5. Receiver availability — 10%
 * 6. Current receiver workload — 10%
 */

import { prisma } from '@/lib/prisma';
import { calculateHaversineDistance, resolveCoordinates, formatDistance } from '@/lib/geo';
import { computeFoodUrgency, FoodUrgencyResult } from '@/services/food-urgency.service';

export interface ReceiverRecommendation {
  receiver: {
    id: string;
    name: string;
    location: string | null;
    dailyCapacity: number;
    serviceRadiusKm: number;
    acceptedCategories: string[];
    // Phone numbers are explicitly excluded for privacy
  };
  score: number;
  distanceKm: number;
  foodCompatibility: {
    isCompatible: boolean;
    category: string;
    acceptedCategories: string[];
  };
  capacityStatus: {
    hasCapacity: boolean;
    listingQuantityServings: number;
    receiverCapacityServings: number;
    capacityScore: number;
  };
  availability: {
    isAvailable: boolean;
    statusText: string;
  };
  workload: {
    activeClaimsCount: number;
    workloadLevel: 'LOW' | 'MODERATE' | 'HIGH';
    workloadScore: number;
  };
  reasons: string[];
}

export interface DonationMatchResult {
  listingId: string;
  title: string;
  foodType: string;
  quantity: string;
  estimatedServings: number;
  expiryTime: Date;
  locationAddress: string;
  urgency?: FoodUrgencyResult;
  matches: ReceiverRecommendation[];
}

/**
 * Normalizes input food category string to standard taxonomy.
 */
export function normalizeFoodCategory(category: string): string {
  const c = (category || '').trim().toUpperCase();

  if (['NON_VEG', 'NON-VEG', 'NONVEG', 'MEAT', 'POULTRY', 'FISH', 'CHICKEN'].some((k) => c.includes(k))) {
    return 'NON_VEG';
  }
  if (['VEG', 'VEGETARIAN', 'VEGAN', 'PLANT_BASED'].some((k) => c.includes(k))) {
    return 'VEG';
  }
  if (['RAW', 'PRODUCE', 'FRUITS', 'VEGETABLES', 'GROCERY'].some((k) => c.includes(k))) {
    return 'RAW';
  }
  if (['COOKED', 'BAKERY', 'PREPARED', 'MEAL', 'HOT_FOOD'].some((k) => c.includes(k))) {
    return 'COOKED';
  }
  return c || 'COOKED';
}

/**
 * Parses diverse quantity strings (e.g. "18 kg", "45 servings", "60 packs")
 * into estimated servings for capacity benchmarking.
 */
export function parseQuantityToServings(quantityStr: string): number {
  if (!quantityStr) return 20;

  const lower = quantityStr.toLowerCase().trim();
  const numericMatch = lower.match(/([\d.]+)/);
  const amount = numericMatch ? parseFloat(numericMatch[1]) : 20;

  if (lower.includes('kg') || lower.includes('kilo')) {
    // Standard rule: 1 kg cooked or prepared food yields ~2.5 standard meal servings
    return Math.max(1, Math.round(amount * 2.5));
  }
  if (lower.includes('serving') || lower.includes('meal') || lower.includes('portion')) {
    return Math.max(1, Math.round(amount));
  }
  if (lower.includes('pack') || lower.includes('box') || lower.includes('bag') || lower.includes('item')) {
    return Math.max(1, Math.round(amount * 1.5));
  }

  return Math.max(1, Math.round(amount));
}

/**
 * Reusable urgency calculation based on expiration time window.
 * Integrated with the Food Urgency Engine.
 */
export function calculateDonationUrgency(
  expiryTime: Date,
  listingContext?: any
): {
  urgencyScore: number;
  reason: string;
  hoursLeft: number;
} {
  const result = computeFoodUrgency(listingContext || { expiryTime });
  return {
    urgencyScore: result.score,
    reason: result.reasons[0] || result.recommendedAction,
    hoursLeft: result.timeRemainingMinutes / 60,
  };
}

/**
 * Core Matching Algorithm
 * Evaluates and ranks all eligible receivers for a specific food listing.
 */
export async function getRankedMatchesForDonation(listingId: string): Promise<DonationMatchResult> {
  // 1. Fetch listing and its donor
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
    },
  });

  if (!listing) {
    throw new Error('Food listing not found.');
  }

  const normalizedListingCategory = normalizeFoodCategory(listing.foodType);
  const estimatedServings = parseQuantityToServings(listing.quantity);
  const urgency = computeFoodUrgency(listing);

  // Resolve donor pickup coordinates
  const donorCoords = resolveCoordinates(
    listing.latitude || listing.donor.latitude,
    listing.longitude || listing.donor.longitude,
    listing.locationAddress || listing.donor.location
  );

  // 2. Fetch all receivers and their active claims for workload calculation
  const receivers = await prisma.user.findMany({
    where: {
      role: 'RECEIVER',
    },
    include: {
      claims: {
        where: {
          status: { in: ['PENDING', 'APPROVED'] },
          deliveryStatus: { not: 'DELIVERED' },
        },
        select: {
          id: true,
          status: true,
          deliveryStatus: true,
        },
      },
    },
  });

  const candidates: ReceiverRecommendation[] = [];

  for (const receiver of receivers) {
    // Exclusion 1: Inactive / unavailable receivers
    if (!receiver.isAvailable) {
      continue;
    }

    // Exclusion 2: Receiver capacity must be positive
    const dailyCapacity = receiver.dailyCapacity || 100;
    if (dailyCapacity <= 0) {
      continue;
    }

    // Exclusion 3: Food category compatibility
    const acceptedList = (receiver.acceptedCategories || 'VEG,NON_VEG,RAW,COOKED')
      .split(',')
      .map((c) => normalizeFoodCategory(c));

    const isFoodCompatible = acceptedList.includes(normalizedListingCategory);
    if (!isFoodCompatible) {
      continue;
    }

    // Exclusion 4: Geographic distance vs service radius
    const receiverCoords = resolveCoordinates(
      receiver.latitude,
      receiver.longitude,
      receiver.location
    );

    const distanceKm = calculateHaversineDistance(
      donorCoords.latitude,
      donorCoords.longitude,
      receiverCoords.latitude,
      receiverCoords.longitude
    );

    const serviceRadius = receiver.serviceRadiusKm || 15.0;
    if (distanceKm > serviceRadius) {
      continue;
    }

    // ----------------------------------------------------
    // SCORING FACTORS (0 - 100)
    // ----------------------------------------------------

    // Factor 1: Distance Score (30% weight)
    let distanceScore = 100;
    if (distanceKm <= 2) {
      distanceScore = 100;
    } else if (distanceKm <= 5) {
      distanceScore = Math.max(75, Math.round(90 - (distanceKm - 2) * 5));
    } else if (distanceKm <= 10) {
      distanceScore = Math.max(50, Math.round(75 - (distanceKm - 5) * 5));
    } else {
      distanceScore = Math.max(10, Math.round(50 - (distanceKm - 10) * 8));
    }

    // Factor 2: Food Compatibility Score (20% weight)
    const compatibilityScore = 100; // Verified compatible above

    // Factor 3: Capacity Score (15% weight)
    let capacityScore = 100;
    let hasCapacity = true;
    if (dailyCapacity >= estimatedServings) {
      capacityScore = 100;
      hasCapacity = true;
    } else {
      const ratio = dailyCapacity / estimatedServings;
      capacityScore = Math.max(20, Math.round(ratio * 100));
      hasCapacity = ratio >= 0.6;
    }

    // Factor 4: Urgency Score (15% weight)
    const urgencyScore = urgency.score;

    // Factor 5: Availability Score (10% weight)
    const availabilityScore = 100; // Verified available above

    // Factor 6: Workload Score (10% weight)
    const activeClaimsCount = receiver.claims.length;
    let workloadScore = 100;
    let workloadLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';

    if (activeClaimsCount === 0) {
      workloadScore = 100;
      workloadLevel = 'LOW';
    } else if (activeClaimsCount === 1) {
      workloadScore = 80;
      workloadLevel = 'LOW';
    } else if (activeClaimsCount === 2) {
      workloadScore = 50;
      workloadLevel = 'MODERATE';
    } else {
      workloadScore = 20;
      workloadLevel = 'HIGH';
    }

    // ----------------------------------------------------
    // WEIGHTED TOTAL SCORE (0 - 100)
    // ----------------------------------------------------
    const weightedScore =
      distanceScore * 0.30 +
      compatibilityScore * 0.20 +
      capacityScore * 0.15 +
      urgencyScore * 0.15 +
      availabilityScore * 0.10 +
      workloadScore * 0.10;

    const finalScore = Math.min(100, Math.max(0, Math.round(weightedScore)));

    // ----------------------------------------------------
    // EXPLAINABLE REASONS LIST
    // ----------------------------------------------------
    const reasons: string[] = [];

    // Distance reason
    reasons.push(`✓ ${formatDistance(distanceKm)}`);

    // Compatibility reason
    reasons.push(`✓ Accepts ${listing.foodType} food donations`);

    // Capacity reason
    if (dailyCapacity >= estimatedServings) {
      reasons.push(`✓ Has sufficient capacity (${dailyCapacity} servings intake)`);
    } else {
      reasons.push(`✓ High intake capacity (${dailyCapacity} servings available)`);
    }

    // Urgency reason
    if (!urgency.isExpired && (urgency.level === 'CRITICAL' || urgency.level === 'HIGH')) {
      reasons.push(`✓ Priority rescue match (${urgency.timeRemainingDisplay})`);
    }

    // Availability reason
    reasons.push('✓ Currently accepting donations');

    // Workload reason
    if (workloadLevel === 'LOW') {
      reasons.push(
        activeClaimsCount === 0
          ? '✓ Low active workload (0 active pickups)'
          : '✓ Low active workload (1 active pickup)'
      );
    } else if (workloadLevel === 'MODERATE') {
      reasons.push('✓ Moderate workload (2 active pickups)');
    }

    candidates.push({
      receiver: {
        id: receiver.id,
        name: receiver.name,
        location: receiver.location,
        dailyCapacity,
        serviceRadiusKm: serviceRadius,
        acceptedCategories: acceptedList,
      },
      score: finalScore,
      distanceKm,
      foodCompatibility: {
        isCompatible: true,
        category: normalizedListingCategory,
        acceptedCategories: acceptedList,
      },
      capacityStatus: {
        hasCapacity,
        listingQuantityServings: estimatedServings,
        receiverCapacityServings: dailyCapacity,
        capacityScore,
      },
      availability: {
        isAvailable: true,
        statusText: 'Accepting Donations',
      },
      workload: {
        activeClaimsCount,
        workloadLevel,
        workloadScore,
      },
      reasons,
    });
  }

  // Sort candidate recommendations from highest score to lowest
  candidates.sort((a, b) => b.score - a.score);

  return {
    listingId: listing.id,
    title: listing.title,
    foodType: listing.foodType,
    quantity: listing.quantity,
    estimatedServings,
    expiryTime: listing.expiryTime,
    locationAddress: listing.locationAddress,
    urgency,
    matches: candidates,
  };
}
