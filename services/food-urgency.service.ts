/**
 * Food Urgency & Freshness Engine
 *
 * Operational prioritization system that determines how urgently a food
 * donation should be collected and distributed.
 *
 * NOTE: This is an operational scheduling system and NOT a food-safety
 * certification system. It never claims food is safe/unsafe based on score.
 */

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FoodUrgencyResult {
  score: number; // 0 - 100
  level: UrgencyLevel;
  isExpired: boolean;
  isCompleted: boolean;
  timeRemainingMinutes: number;
  timeRemainingDisplay: string;
  reasons: string[];
  recommendedAction: string;
  badge: {
    color: 'emerald' | 'amber' | 'orange' | 'rose' | 'slate';
    label: string;
    icon: string;
  };
}

/**
 * Formats minutes into a concise, readable duration string.
 */
function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Cutoff Exceeded';
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m left` : `${hours}h left`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h left` : `${days}d left`;
}

/**
 * Computes authoritative operational urgency for a food listing.
 * Strictly deterministic and server-side computed.
 */
export function computeFoodUrgency(
  listing: {
    id?: string;
    status?: string;
    expiryTime?: Date | string | null;
    foodType?: string | null;
    temperatureControl?: string | null;
    prepTimestamp?: Date | string | null;
    quantity?: string | null;
    createdAt?: Date | string | null;
    claims?: any[];
  },
  claimContext?: {
    status?: string;
    deliveryStatus?: string;
  } | null
): FoodUrgencyResult {
  const now = Date.now();

  // 1. Terminal State: Delivered / Completed donations
  const isDeliveredOrCompleted =
    listing.status === 'DELIVERED' ||
    listing.status === 'COMPLETED' ||
    claimContext?.status === 'COMPLETED' ||
    claimContext?.deliveryStatus === 'DELIVERED';

  if (isDeliveredOrCompleted) {
    return {
      score: 0,
      level: 'LOW',
      isExpired: false,
      isCompleted: true,
      timeRemainingMinutes: 0,
      timeRemainingDisplay: 'Delivered',
      reasons: ['Food donation successfully collected and delivered to beneficiaries'],
      recommendedAction: 'Handover complete. No further operational action needed.',
      badge: {
        color: 'slate',
        label: 'DELIVERED',
        icon: 'CheckCircle2',
      },
    };
  }

  // 2. Resolve & validate Expiry Time
  let expiryMs = 0;
  let hasValidExpiry = false;

  if (listing.expiryTime) {
    const parsed = new Date(listing.expiryTime).getTime();
    if (!isNaN(parsed)) {
      expiryMs = parsed;
      hasValidExpiry = true;
    }
  }

  // Fallback if expiry is missing or invalid: default to 24h from now or created date
  if (!hasValidExpiry) {
    const created = listing.createdAt ? new Date(listing.createdAt).getTime() : now;
    expiryMs = (isNaN(created) ? now : created) + 24 * 60 * 60 * 1000;
  }

  const diffMs = expiryMs - now;
  const timeRemainingMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  const reasons: string[] = [];

  // 3. Expired State: past cutoff
  if (diffMs <= 0) {
    return {
      score: 100,
      level: 'CRITICAL',
      isExpired: true,
      isCompleted: false,
      timeRemainingMinutes: 0,
      timeRemainingDisplay: 'Expired',
      reasons: ['Scheduled pickup deadline has passed.'],
      recommendedAction: 'Pickup deadline has passed. Mark as expired or refresh pickup window.',
      badge: {
        color: 'rose',
        label: 'EXPIRED',
        icon: 'AlertOctagon',
      },
    };
  }

  // ----------------------------------------------------
  // OPERATIONAL URGENCY SCORING (0 - 100)
  // ----------------------------------------------------

  // Factor 1: Time Decay (0 - 55 points)
  let timeScore = 10;
  if (timeRemainingMinutes <= 45) {
    timeScore = 55;
    reasons.push(`Critical deadline: only ${formatTimeRemaining(timeRemainingMinutes)}`);
  } else if (timeRemainingMinutes <= 90) {
    timeScore = 48;
    reasons.push(`Under 1.5 hours remaining until cutoff (${formatTimeRemaining(timeRemainingMinutes)})`);
  } else if (timeRemainingMinutes <= 180) {
    timeScore = 40;
    reasons.push(`Under 3 hours remaining (${formatTimeRemaining(timeRemainingMinutes)})`);
  } else if (timeRemainingMinutes <= 360) {
    timeScore = 32;
    reasons.push(`Expiring within 6 hours (${formatTimeRemaining(timeRemainingMinutes)})`);
  } else if (timeRemainingMinutes <= 720) {
    timeScore = 22;
    reasons.push(`Expiring today (${formatTimeRemaining(timeRemainingMinutes)})`);
  } else if (timeRemainingMinutes <= 1440) {
    timeScore = 14;
    reasons.push(`24-hour pickup window available`);
  } else {
    timeScore = 6;
    reasons.push(`Extended shelf life: ${Math.round(timeRemainingMinutes / 1440)} days remaining`);
  }

  // Factor 2: Food Category Perishability (0 - 18 points)
  let categoryScore = 8;
  const foodType = (listing.foodType || 'COOKED').toUpperCase();

  if (foodType === 'COOKED') {
    categoryScore = 18;
    reasons.push('Cooked prepared meals require expedited distribution');
  } else if (foodType === 'NON_VEG') {
    categoryScore = 14;
    reasons.push('Non-veg items require active temperature monitoring');
  } else if (foodType === 'RAW') {
    categoryScore = 8;
  } else if (foodType === 'VEG') {
    categoryScore = 6;
  }

  // Factor 3: Storage Condition (0 - 17 points)
  let storageScore = 10;
  const storage = (listing.temperatureControl || 'ROOM_TEMP').toUpperCase();

  if (storage === 'ROOM_TEMP') {
    storageScore = 17;
    if (foodType === 'COOKED' || foodType === 'NON_VEG') {
      reasons.push('Ambient room-temperature holding accelerates pickup urgency');
    }
  } else if (storage === 'REFRIGERATED') {
    storageScore = 9;
    reasons.push('Chilled storage (1°C-4°C) requires cold-chain transfer');
  } else if (storage === 'FROZEN') {
    storageScore = 3;
    reasons.push('Deep frozen storage provides stable holding window');
  }

  // Factor 4: Elapsed Prep Time (0 - 10 points)
  let prepScore = 0;
  if (listing.prepTimestamp) {
    const prepMs = new Date(listing.prepTimestamp).getTime();
    if (!isNaN(prepMs)) {
      const elapsedHours = Math.max(0, (now - prepMs) / (1000 * 3600));
      if (elapsedHours >= 4 && storage === 'ROOM_TEMP') {
        prepScore = 10;
        reasons.push(`Prepared over ${Math.floor(elapsedHours)} hours ago`);
      } else if (elapsedHours >= 2) {
        prepScore = 5;
      } else {
        prepScore = 2;
      }
    }
  }

  // Factor 5: Logistics & Assignment State Modifier (-15 to +10 points)
  let logisticsModifier = 0;
  const claim = claimContext || (listing.claims && listing.claims.length > 0 ? listing.claims[0] : null);

  if (claim) {
    if (claim.deliveryStatus === 'IN_TRANSIT') {
      logisticsModifier = -15;
      reasons.push('Volunteer courier is actively in transit');
    } else if (claim.deliveryStatus === 'DRIVER_ASSIGNED') {
      logisticsModifier = -5;
      reasons.push('Courier assigned and en route to pickup location');
    }
  } else {
    // Unclaimed / Unassigned
    if (timeRemainingMinutes <= 180) {
      logisticsModifier = 10;
      reasons.push('Unassigned: High operational risk of going uncollected');
    } else if (timeRemainingMinutes <= 360) {
      logisticsModifier = 5;
    }
  }

  // Calculate final score clamped between 5 and 100
  const rawScore = timeScore + categoryScore + storageScore + prepScore + logisticsModifier;
  const score = Math.min(100, Math.max(5, Math.round(rawScore)));

  // Determine Urgency Level & Visual Tokens
  let level: UrgencyLevel = 'LOW';
  let badgeColor: 'emerald' | 'amber' | 'orange' | 'rose' = 'emerald';
  let recommendedAction = 'Standard collection window.';
  let iconName = 'Clock';

  if (score >= 75) {
    level = 'CRITICAL';
    badgeColor = 'rose';
    recommendedAction = `Immediate pickup recommended within ${formatTimeRemaining(timeRemainingMinutes)}. High operational risk.`;
    iconName = 'AlertTriangle';
  } else if (score >= 50) {
    level = 'HIGH';
    badgeColor = 'orange';
    recommendedAction = `Prioritize pickup within ${formatTimeRemaining(timeRemainingMinutes)}.`;
    iconName = 'Clock';
  } else if (score >= 25) {
    level = 'MEDIUM';
    badgeColor = 'amber';
    recommendedAction = 'Schedule pickup today during operating hours.';
    iconName = 'Clock';
  } else {
    level = 'LOW';
    badgeColor = 'emerald';
    recommendedAction = 'Standard collection window. Shelf-stable.';
    iconName = 'CheckCircle2';
  }

  return {
    score,
    level,
    isExpired: false,
    isCompleted: false,
    timeRemainingMinutes,
    timeRemainingDisplay: formatTimeRemaining(timeRemainingMinutes),
    reasons,
    recommendedAction,
    badge: {
      color: badgeColor,
      label: level,
      icon: iconName,
    },
  };
}
