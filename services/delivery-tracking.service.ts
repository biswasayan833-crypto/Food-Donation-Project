/**
 * Delivery Tracking & State Machine Service
 *
 * Implements the server-authoritative operational lifecycle for FoodRescue:
 * UNASSIGNED → DRIVER_ASSIGNED → PICKUP_STARTED → PICKED_UP → IN_TRANSIT → DELIVERED
 *
 * Enforces:
 * - Strict server-side status transition validation
 * - Role & ownership authorization
 * - Idempotent executions (preventing duplicate timestamps & notification spam)
 * - Atomic database updates with conditional concurrency guards
 * - Coordinate validation & location privacy
 * - Multi-party notification triggers
 */

import { prisma } from '@/lib/prisma';
import { calculateHaversineDistance, resolveCoordinates, formatDistance } from '@/lib/geo';
import { computeFoodUrgency } from '@/services/food-urgency.service';
import { calculateEstimatedTravelMinutes } from '@/services/driver-assignment.service';
import { createNotification } from '@/services/notification.service';
import { logAuditEvent } from '@/services/audit.service';

export type DeliveryStatus =
  | 'UNASSIGNED'
  | 'DRIVER_ASSIGNED'
  | 'PICKUP_STARTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED';

const VALID_STATUSES: DeliveryStatus[] = [
  'UNASSIGNED',
  'DRIVER_ASSIGNED',
  'PICKUP_STARTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
];

/**
 * Permitted forward operational transitions
 */
const ALLOWED_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  UNASSIGNED: ['DRIVER_ASSIGNED'],
  DRIVER_ASSIGNED: ['PICKUP_STARTED', 'UNASSIGNED'],
  PICKUP_STARTED: ['PICKED_UP'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [], // Terminal state
};

export interface StatusTransitionParams {
  claimId: string;
  targetStatus: DeliveryStatus;
  requesterId: string;
  requesterRole: string;
  driverId?: string;
  notes?: string;
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  alreadyInState?: boolean;
  claim?: any;
}

export interface TrackingDataResult {
  listingId: string;
  claimId: string;
  title: string;
  foodType: string;
  quantity: string;
  deliveryStatus: DeliveryStatus;
  status: string;
  driverAssigned: boolean;
  driver: {
    id: string;
    name: string;
  } | null;
  donor: {
    id: string;
    name: string;
    locationAddress: string;
  };
  receiver: {
    id: string;
    name: string;
    location: string | null;
  };
  location: {
    latitude: number;
    longitude: number;
    updatedAt: string | null;
    distanceToDestinationKm: number;
    estimatedRemainingMinutes: number;
  } | null;
  urgency: {
    score: number;
    level: string;
    timeRemainingMinutes: number;
    timeRemainingDisplay: string;
  };
  timestamps: {
    assignedAt: string | null;
    pickupStartedAt: string | null;
    pickedUpAt: string | null;
    inTransitAt: string | null;
    deliveredAt: string | null;
  };
}

/**
 * Validates whether latitude and longitude are valid numeric geographic coordinates.
 */
export function isValidCoordinate(lat: any, lon: any): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

/**
 * Validates and executes a server-authoritative delivery state transition.
 */
export async function transitionDeliveryStatus(
  params: StatusTransitionParams
): Promise<TransitionResult> {
  const { claimId, targetStatus, requesterId, requesterRole, driverId } = params;

  if (!claimId || !targetStatus) {
    return { success: false, error: 'Missing claimId or targetStatus.' };
  }

  if (!VALID_STATUSES.includes(targetStatus)) {
    return { success: false, error: `Invalid delivery status '${targetStatus}'.` };
  }

  // 1. Fetch current claim and associated listing
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      foodListing: {
        include: {
          donor: { select: { id: true, name: true } },
        },
      },
      receiver: { select: { id: true, name: true } },
      driver: { select: { id: true, name: true } },
    },
  });

  if (!claim) {
    return { success: false, error: 'Food donation claim not found.' };
  }

  const currentStatus = (claim.deliveryStatus as DeliveryStatus) || 'UNASSIGNED';

  // 2. Idempotency: If already in requested status, return early without error
  if (currentStatus === targetStatus) {
    return { success: true, alreadyInState: true, claim };
  }

  // 3. Terminal state check: completed deliveries cannot be modified
  if (claim.status === 'COMPLETED' || currentStatus === 'DELIVERED') {
    return {
      success: false,
      error: 'This delivery is already completed and cannot be transitioned to a previous state.',
    };
  }

  // 4. Validate permitted transition
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      success: false,
      error: `Invalid transition from '${currentStatus}' to '${targetStatus}'. Valid next states: [${allowed.join(', ')}].`,
    };
  }

  // 5. Role & Ownership Authorization checks
  const isAdmin = requesterRole === 'ADMIN';
  const isDriver = claim.driverId === requesterId;
  const isDonor = claim.foodListing.donorId === requesterId;
  const isReceiver = claim.receiverId === requesterId;

  switch (targetStatus) {
    case 'PICKUP_STARTED':
      if (!isDriver && !isAdmin) {
        return {
          success: false,
          error: 'Forbidden. Only the designated volunteer courier or an admin can start pickup.',
        };
      }
      break;

    case 'PICKED_UP':
      if (!isDriver && !isDonor && !isAdmin) {
        return {
          success: false,
          error: 'Forbidden. Only the courier, donor, or an admin can confirm food pickup.',
        };
      }
      break;

    case 'IN_TRANSIT':
      if (!isDriver && !isAdmin) {
        return {
          success: false,
          error: 'Forbidden. Only the designated courier or an admin can mark transit started.',
        };
      }
      break;

    case 'DELIVERED':
      if (!isDriver && !isReceiver && !isDonor && !isAdmin) {
        return {
          success: false,
          error: 'Forbidden. Only authorized delivery participants can mark delivery as completed.',
        };
      }
      break;

    default:
      if (!isDonor && !isAdmin) {
        return {
          success: false,
          error: 'Forbidden. You are not authorized to perform this transition.',
        };
      }
  }

  const now = new Date();
  const timestampData: any = {};
  if (targetStatus === 'DRIVER_ASSIGNED') {
    timestampData.assignedAt = now;
    if (driverId) {
      timestampData.driverId = driverId;
    }
  }
  if (targetStatus === 'UNASSIGNED') {
    timestampData.driverId = null;
    timestampData.assignedAt = null;
  }
  if (targetStatus === 'PICKUP_STARTED') timestampData.pickupStartedAt = now;
  if (targetStatus === 'PICKED_UP') timestampData.pickedUpAt = now;
  if (targetStatus === 'IN_TRANSIT') timestampData.inTransitAt = now;
  if (targetStatus === 'DELIVERED') {
    timestampData.deliveredAt = now;
    timestampData.status = 'COMPLETED';
  }

  // 6. Execute atomic update with conditional concurrency check
  try {
    const updatedClaim = await prisma.$transaction(async (tx) => {
      const updateCount = await tx.claim.updateMany({
        where: {
          id: claim.id,
          deliveryStatus: currentStatus,
          status: { not: 'COMPLETED' },
        },
        data: {
          deliveryStatus: targetStatus,
          ...timestampData,
        },
      });

      if (updateCount.count === 0) {
        throw new Error('Conflict: Delivery status was updated concurrently by another participant.');
      }

      if (targetStatus === 'DELIVERED') {
        await tx.foodListing.update({
          where: { id: claim.foodListingId },
          data: { status: 'DELIVERED' },
        });
      }

      return await tx.claim.findUnique({
        where: { id: claim.id },
        include: {
          foodListing: { include: { donor: true } },
          receiver: true,
          driver: true,
        },
      });
    }, { maxWait: 10000, timeout: 20000 });

    // Record audit event for state transition
    await logAuditEvent({
      actorId: requesterId,
      action: 'DELIVERY_STATUS_CHANGED',
      entityType: 'CLAIM',
      entityId: claim.id,
      metadata: {
        previousStatus: currentStatus,
        newStatus: targetStatus,
        driverId: claim.driverId,
      },
    });

    // 7. Dispatch multi-party notifications asynchronously
    const listingTitle = claim.foodListing.title;
    const driverName = claim.driver?.name || 'Volunteer Courier';
    const donorId = claim.foodListing.donorId;
    const receiverId = claim.receiverId;
    const driverId = claim.driverId;

    if (targetStatus === 'PICKUP_STARTED') {
      if (donorId) {
        await createNotification({
          userId: donorId,
          eventType: 'PICKUP_STARTED',
          title: '🚚 Courier En Route for Pickup',
          message: `${driverName} has started traveling to pick up "${listingTitle}".`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
      if (receiverId) {
        await createNotification({
          userId: receiverId,
          eventType: 'PICKUP_STARTED',
          title: '📦 Pickup Commenced',
          message: `Courier ${driverName} is picking up your claimed donation "${listingTitle}".`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
    } else if (targetStatus === 'PICKED_UP') {
      if (donorId) {
        await createNotification({
          userId: donorId,
          eventType: 'FOOD_PICKED_UP',
          title: '✓ Food Collected by Courier',
          message: `${driverName} successfully collected "${listingTitle}". Thank you for donating!`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
      if (receiverId) {
        await createNotification({
          userId: receiverId,
          eventType: 'FOOD_PICKED_UP',
          title: '🥘 Food Picked Up from Donor',
          message: `"${listingTitle}" has been collected and is preparing for transit to your shelter.`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
    } else if (targetStatus === 'IN_TRANSIT') {
      if (receiverId) {
        await createNotification({
          userId: receiverId,
          eventType: 'DELIVERY_STARTED',
          title: '🚚 Delivery In Transit',
          message: `${driverName} is on the way to deliver "${listingTitle}". Please prepare for intake.`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
    } else if (targetStatus === 'DELIVERED') {
      if (donorId) {
        await createNotification({
          userId: donorId,
          eventType: 'DELIVERY_COMPLETED',
          title: '🎉 Delivery Verified & Completed',
          message: `Your food donation "${listingTitle}" was successfully delivered and served!`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
      if (receiverId) {
        await createNotification({
          userId: receiverId,
          eventType: 'DELIVERY_COMPLETED',
          title: '✓ Delivery Completed',
          message: `Donation "${listingTitle}" has been successfully delivered.`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
      if (driverId) {
        await createNotification({
          userId: driverId,
          eventType: 'DELIVERY_COMPLETED',
          title: '⭐ Drop-Off Confirmed',
          message: `Drop-off verified for "${listingTitle}". Thank you for your volunteer service!`,
          claimId: claim.id,
          foodListingId: claim.foodListingId,
        });
      }
    }

    return { success: true, claim: updatedClaim };
  } catch (error: any) {
    console.error('Delivery status transition error:', error);
    return { success: false, error: error.message || 'Failed to transition delivery status.' };
  }
}

/**
 * Updates a driver's GPS location with strict coordinate validation.
 */
export async function updateDriverCoordinates(params: {
  driverId: string;
  driverRole?: string;
  latitude: number;
  longitude: number;
  claimId?: string;
}) {
  const { driverId, driverRole, latitude, longitude, claimId } = params;

  if (!driverId) {
    return { success: false, error: 'Missing driver ID.' };
  }

  if (driverRole && driverRole !== 'VOLUNTEER' && driverRole !== 'ADMIN') {
    return {
      success: false,
      error: 'Forbidden. Only registered volunteer couriers can broadcast location.',
    };
  }

  if (!isValidCoordinate(latitude, longitude)) {
    return {
      success: false,
      error: 'Invalid coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.',
    };
  }

  const now = new Date();

  try {
    await prisma.user.update({
      where: { id: driverId },
      data: {
        latitude,
        longitude,
        locationUpdatedAt: now,
      },
    });

    await prisma.claim.updateMany({
      where: claimId
        ? { id: claimId, driverId }
        : { driverId, status: { not: 'COMPLETED' }, deliveryStatus: { not: 'DELIVERED' } },
      data: {
        driverLatitude: latitude,
        driverLongitude: longitude,
        driverLocationUpdatedAt: now,
      },
    });

    return { success: true, timestamp: now };
  } catch (error: any) {
    console.error('Failed to update driver coordinates:', error);
    return { success: false, error: error.message || 'Error updating driver coordinates.' };
  }
}

/**
 * Retrieves sanitized real-time tracking data for authorized delivery participants.
 */
export async function getDeliveryTrackingData(params: {
  listingId: string;
  requesterId: string;
  requesterRole: string;
}): Promise<{ success: boolean; error?: string; data?: TrackingDataResult }> {
  const { listingId, requesterId, requesterRole } = params;

  if (!listingId || !requesterId) {
    return { success: false, error: 'Unauthorized. Missing listing or user credentials.' };
  }

  const listing = await prisma.foodListing.findUnique({
    where: { id: listingId },
    include: {
      donor: { select: { id: true, name: true, location: true } },
      claims: {
        include: {
          receiver: { select: { id: true, name: true, location: true } },
          driver: { select: { id: true, name: true, latitude: true, longitude: true, locationUpdatedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!listing) {
    return { success: false, error: 'Food listing not found.' };
  }

  const activeClaim = listing.claims.find(
    (c) => c.status !== 'COMPLETED' || c.deliveryStatus === 'DELIVERED'
  ) || listing.claims[0];

  if (!activeClaim) {
    return { success: false, error: 'No active delivery claim associated with this donation.' };
  }

  // Authorization Check: Caller must be donor, receiver, assigned driver, or admin
  const isAdmin = requesterRole === 'ADMIN';
  const isDonor = listing.donorId === requesterId;
  const isReceiver = activeClaim.receiverId === requesterId;
  const isDriver = activeClaim.driverId === requesterId;

  if (!isDonor && !isReceiver && !isDriver && !isAdmin) {
    return {
      success: false,
      error: 'Forbidden. You are not authorized to view real-time tracking for this delivery.',
    };
  }

  // Compute operational food urgency
  const urgency = computeFoodUrgency(listing, activeClaim);

  // Compute location & distance if driver assigned
  let locationData = null;
  const driverLat = activeClaim.driverLatitude ?? activeClaim.driver?.latitude;
  const driverLon = activeClaim.driverLongitude ?? activeClaim.driver?.longitude;

  if (typeof driverLat === 'number' && typeof driverLon === 'number') {
    // If before pickup, destination is donor pickup location; if picked up/in transit, destination is receiver location
    const destinationAddress =
      activeClaim.deliveryStatus === 'PICKUP_STARTED' || activeClaim.deliveryStatus === 'DRIVER_ASSIGNED'
        ? listing.locationAddress
        : activeClaim.receiver?.location || listing.locationAddress;

    const destCoords = resolveCoordinates(null, null, destinationAddress);
    const distKm = calculateHaversineDistance(driverLat, driverLon, destCoords.latitude, destCoords.longitude);
    const estimatedMins = calculateEstimatedTravelMinutes(distKm);

    locationData = {
      latitude: driverLat,
      longitude: driverLon,
      updatedAt: (activeClaim.driverLocationUpdatedAt || activeClaim.driver?.locationUpdatedAt)?.toISOString() || null,
      distanceToDestinationKm: distKm,
      estimatedRemainingMinutes: estimatedMins,
    };
  }

  const result: TrackingDataResult = {
    listingId: listing.id,
    claimId: activeClaim.id,
    title: listing.title,
    foodType: listing.foodType,
    quantity: listing.quantity,
    deliveryStatus: (activeClaim.deliveryStatus as DeliveryStatus) || 'UNASSIGNED',
    status: activeClaim.status,
    driverAssigned: Boolean(activeClaim.driverId),
    driver: activeClaim.driver
      ? {
          id: activeClaim.driver.id,
          name: activeClaim.driver.name,
        }
      : null,
    donor: {
      id: listing.donor.id,
      name: listing.donor.name,
      locationAddress: listing.locationAddress,
    },
    receiver: {
      id: activeClaim.receiver.id,
      name: activeClaim.receiver.name,
      location: activeClaim.receiver.location,
    },
    location: locationData,
    urgency: {
      score: urgency.score,
      level: urgency.level,
      timeRemainingMinutes: urgency.timeRemainingMinutes,
      timeRemainingDisplay: urgency.timeRemainingDisplay,
    },
    timestamps: {
      assignedAt: activeClaim.assignedAt?.toISOString() || null,
      pickupStartedAt: activeClaim.pickupStartedAt?.toISOString() || null,
      pickedUpAt: activeClaim.pickedUpAt?.toISOString() || null,
      inTransitAt: activeClaim.inTransitAt?.toISOString() || null,
      deliveredAt: activeClaim.deliveredAt?.toISOString() || null,
    },
  };

  return { success: true, data: result };
}
