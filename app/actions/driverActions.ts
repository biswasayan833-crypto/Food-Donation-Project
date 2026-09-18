'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateDriverEligibility } from '@/services/driver-assignment.service';
import { transitionDeliveryStatus } from '@/services/delivery-tracking.service';
import { createNotification } from '@/services/notification.service';
import { logAuditEvent } from '@/services/audit.service';
import { getSafeErrorMessage } from '@/lib/security';

export interface DriverActionResult {
  success?: boolean;
  error?: string;
  driverName?: string;
  claimId?: string;
}

export async function acceptDeliveryTask(claimId: string): Promise<DriverActionResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'Please sign in to accept delivery jobs.' };
  }

  if (session.user.role !== 'VOLUNTEER' && session.user.role !== 'ADMIN') {
    return { error: 'Only registered Volunteer Couriers can accept transport tasks.' };
  }

  if (!claimId) {
    return { error: 'Invalid claim ID provided.' };
  }

  try {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        foodListing: {
          select: { id: true, title: true, donorId: true },
        },
      },
    });

    if (!claim) {
      return { error: 'Food donation claim not found.' };
    }

    if (claim.deliveryStatus !== 'UNASSIGNED') {
      return { error: `This delivery task is already ${claim.deliveryStatus.toLowerCase().replace('_', ' ')}.` };
    }

    if (claim.status === 'COMPLETED') {
      return { error: 'This food donation claim is already completed.' };
    }

    const now = new Date();

    // Concurrency protection: atomicity ensures only the first driver gets assigned
    const updateResult = await prisma.claim.updateMany({
      where: {
        id: claimId,
        deliveryStatus: 'UNASSIGNED',
        driverId: null,
      },
      data: {
        driverId: session.user.id,
        deliveryStatus: 'DRIVER_ASSIGNED',
        assignedAt: now,
      },
    });

    if (updateResult.count === 0) {
      return { error: 'This delivery task has already been accepted by another volunteer courier.' };
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: 'DRIVER_ASSIGNED',
      entityType: 'CLAIM',
      entityId: claimId,
      metadata: { driverId: session.user.id, type: 'SELF_ACCEPTED' },
    });

    // Notify donor
    if (claim.foodListing.donorId) {
      await createNotification({
        userId: claim.foodListing.donorId,
        eventType: 'DRIVER_ASSIGNED',
        title: '👤 Courier Accepted Delivery',
        message: `${session.user.name || 'A volunteer courier'} has accepted the pickup task for "${claim.foodListing.title}".`,
        claimId: claim.id,
        foodListingId: claim.foodListingId,
      });
    }

    // Notify receiver
    if (claim.receiverId) {
      await createNotification({
        userId: claim.receiverId,
        eventType: 'DRIVER_ASSIGNED',
        title: '🚚 Courier Designated',
        message: `${session.user.name || 'A volunteer courier'} is assigned to transport your claimed food "${claim.foodListing.title}".`,
        claimId: claim.id,
        foodListingId: claim.foodListingId,
      });
    }

    revalidatePath('/dashboard/driver');
    revalidatePath('/dashboard/receiver');
    revalidatePath('/dashboard/donor');
    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true };
  } catch (err: any) {
    console.error('Failed to accept delivery task:', err);
    return { error: getSafeErrorMessage(err, 'An unexpected error occurred while accepting the delivery.') };
  }
}

export async function startPickupTask(claimId: string): Promise<DriverActionResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'Please sign in to start pickup.' };
  }

  const result = await transitionDeliveryStatus({
    claimId,
    targetStatus: 'PICKUP_STARTED',
    requesterId: session.user.id,
    requesterRole: session.user.role,
  });

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath('/dashboard/driver');
  revalidatePath('/dashboard/donor');
  revalidatePath('/dashboard/receiver');
  revalidatePath('/admin');
  revalidatePath('/');

  return { success: true, claimId };
}

export async function confirmPickupTask(claimId: string): Promise<DriverActionResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'Please sign in to confirm pickup.' };
  }

  const result = await transitionDeliveryStatus({
    claimId,
    targetStatus: 'PICKED_UP',
    requesterId: session.user.id,
    requesterRole: session.user.role,
  });

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath('/dashboard/driver');
  revalidatePath('/dashboard/donor');
  revalidatePath('/dashboard/receiver');
  revalidatePath('/admin');
  revalidatePath('/');

  return { success: true, claimId };
}

export async function startTransportTask(claimId: string): Promise<DriverActionResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'Please sign in to start transport.' };
  }

  const result = await transitionDeliveryStatus({
    claimId,
    targetStatus: 'IN_TRANSIT',
    requesterId: session.user.id,
    requesterRole: session.user.role,
  });

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath('/dashboard/driver');
  revalidatePath('/dashboard/donor');
  revalidatePath('/dashboard/receiver');
  revalidatePath('/admin');
  revalidatePath('/');

  return { success: true, claimId };
}

export async function assignVolunteerCourier(
  listingId: string,
  driverId: string,
  allowReassign: boolean = false
): Promise<DriverActionResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'Please sign in to assign a courier.' };
  }

  if (!listingId || !driverId) {
    return { error: 'Invalid donation or driver ID.' };
  }

  try {
    const validation = await validateDriverEligibility(
      listingId,
      driverId,
      session.user.id,
      session.user.role,
      allowReassign
    );

    if (!validation.success) {
      return { error: validation.error || 'Courier is not eligible for this delivery.' };
    }

    const claimToAssign = validation.claim!;
    const selectedDriver = validation.driver!;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const currentClaim = await tx.claim.findUnique({
        where: { id: claimToAssign.id },
      });

      if (!currentClaim) {
        throw new Error('Claim record no longer exists.');
      }

      if (currentClaim.status === 'COMPLETED' || currentClaim.deliveryStatus === 'DELIVERED') {
        throw new Error('This delivery has already been completed.');
      }

      if (currentClaim.deliveryStatus === 'IN_TRANSIT') {
        throw new Error('This delivery is already in transit and cannot be reassigned.');
      }

      if (!allowReassign && currentClaim.driverId && currentClaim.driverId !== driverId) {
        throw new Error('Conflict: Another volunteer courier was assigned to this delivery concurrently.');
      }

      const updateResult = await tx.claim.updateMany({
        where: {
          id: currentClaim.id,
          driverId: allowReassign ? currentClaim.driverId : null,
          deliveryStatus: allowReassign ? currentClaim.deliveryStatus : 'UNASSIGNED',
        },
        data: {
          driverId: selectedDriver.id,
          deliveryStatus: 'DRIVER_ASSIGNED',
          assignedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new Error('Conflict: Concurrent update detected. Courier assignment could not be applied.');
      }

      return {
        claimId: currentClaim.id,
        driverName: selectedDriver.name,
      };
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: allowReassign ? 'DRIVER_REASSIGNED' : 'DRIVER_ASSIGNED',
      entityType: 'CLAIM',
      entityId: result.claimId,
      metadata: {
        driverId: selectedDriver.id,
        driverName: selectedDriver.name,
        listingId,
        allowReassign,
      },
    });

    // Notify driver
    await createNotification({
      userId: selectedDriver.id,
      eventType: 'DRIVER_ASSIGNED',
      title: '🚚 New Delivery Assignment',
      message: `You have been assigned as volunteer courier for "${validation.listing?.title || 'food donation'}".`,
      claimId: result.claimId,
      foodListingId: listingId,
    });

    // Notify donor
    if (validation.listing?.donorId) {
      await createNotification({
        userId: validation.listing.donorId,
        eventType: 'DRIVER_ASSIGNED',
        title: '👤 Volunteer Courier Designated',
        message: `${selectedDriver.name} was assigned to pick up your donation "${validation.listing.title}".`,
        claimId: result.claimId,
        foodListingId: listingId,
      });
    }

    revalidatePath('/donations');
    revalidatePath(`/donations/${listingId}`);
    revalidatePath('/dashboard/driver');
    revalidatePath('/dashboard/donor');
    revalidatePath('/dashboard/receiver');
    revalidatePath('/admin');
    revalidatePath('/');

    return {
      success: true,
      claimId: result.claimId,
      driverName: result.driverName,
    };
  } catch (err: any) {
    console.error('Failed to assign volunteer courier:', err);
    return { error: getSafeErrorMessage(err, 'An unexpected error occurred while assigning the courier.') };
  }
}
