import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getRankedDriversForDonation,
  validateDriverEligibility,
} from '@/services/driver-assignment.service';
import { createNotification } from '@/services/notification.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/listings/[id]/drivers
 *
 * Retrieves ranked eligible volunteer drivers for a specific food donation listing.
 * Strictly authorized to:
 * - The donor who owns the listing
 * - Platform administrators
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be signed in to view driver recommendations.' },
        { status: 401 }
      );
    }

    const listingId = params.id;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing ID.' }, { status: 400 });
    }

    // Verify listing existence and ownership
    const listing = await prisma.foodListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        donorId: true,
        status: true,
        title: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Food listing not found.' }, { status: 404 });
    }

    const isOwner = listing.donorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. You are not authorized to view driver recommendations for this donation.' },
        { status: 403 }
      );
    }

    // Compute ranked volunteer couriers
    const result = await getRankedDriversForDonation(listingId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching driver recommendations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve driver recommendations.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/listings/[id]/drivers
 *
 * Assigns or reassigns an eligible volunteer driver to an active food donation claim.
 * Executes within an atomic database transaction to prevent concurrent race conditions.
 * Strictly authorized to:
 * - The donor who owns the listing
 * - Platform administrators
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be signed in to assign a courier.' },
        { status: 401 }
      );
    }

    const listingId = params.id;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing ID.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { driverId, allowReassign } = body;

    if (!driverId) {
      return NextResponse.json(
        { error: 'Missing driverId in request body.' },
        { status: 400 }
      );
    }

    // Full server-side validation of authorization, listing, claim, and driver eligibility
    const validation = await validateDriverEligibility(
      listingId,
      driverId,
      session.user.id,
      session.user.role,
      Boolean(allowReassign)
    );

    if (!validation.success) {
      const isForbidden = validation.error?.startsWith('Forbidden');
      return NextResponse.json(
        { error: validation.error },
        { status: isForbidden ? 403 : 400 }
      );
    }

    const claimToAssign = validation.claim!;
    const selectedDriver = validation.driver!;
    const listing = validation.listing!;

    // Execute assignment within an atomic Prisma transaction with conditional check
    // to guarantee no concurrent double-assignment race conditions occur
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify the active claim has not been modified or completed in parallel
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

      // Conditional atomic update
      const updateResult = await tx.claim.updateMany({
        where: {
          id: currentClaim.id,
          driverId: allowReassign ? currentClaim.driverId : null,
          deliveryStatus: allowReassign ? currentClaim.deliveryStatus : 'UNASSIGNED',
        },
        data: {
          driverId: selectedDriver.id,
          deliveryStatus: 'DRIVER_ASSIGNED',
          assignedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error('Conflict: Concurrent update detected. Courier assignment could not be applied.');
      }

      return {
        claimId: currentClaim.id,
        driverId: selectedDriver.id,
        driverName: selectedDriver.name,
      };
    });

    // Notify assigned volunteer driver
    await createNotification({
      userId: selectedDriver.id,
      eventType: 'DRIVER_ASSIGNED',
      title: '🚚 New Delivery Assignment',
      message: `You have been assigned as volunteer courier for "${listing.title}".`,
      claimId: result.claimId,
      foodListingId: listingId,
    });

    // Notify listing donor
    if (listing.donorId) {
      await createNotification({
        userId: listing.donorId,
        eventType: 'DRIVER_ASSIGNED',
        title: '👤 Volunteer Courier Designated',
        message: `${selectedDriver.name} was assigned to pick up your donation "${listing.title}".`,
        claimId: result.claimId,
        foodListingId: listingId,
      });
    }

    // Invalidate relevant Next.js cache paths
    revalidatePath('/donations');
    revalidatePath(`/donations/${listingId}`);
    revalidatePath('/dashboard/driver');
    revalidatePath('/dashboard/donor');
    revalidatePath('/dashboard/receiver');
    revalidatePath('/admin');
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${result.driverName} as volunteer courier!`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error assigning volunteer driver:', error);
    const isConflict = error.message?.includes('Conflict');
    return NextResponse.json(
      { error: error.message || 'Failed to assign volunteer driver.' },
      { status: isConflict ? 409 : 500 }
    );
  }
}
