'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/services/audit.service';
import { getSafeErrorMessage } from '@/lib/security';

export interface ClaimResult {
  success?: boolean;
  claimId?: string;
  error?: string;
}

export async function claimFoodDonation(listingId: string): Promise<ClaimResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'You must be signed in to claim a food donation.' };
  }

  if (session.user.role !== 'RECEIVER' && session.user.role !== 'ADMIN') {
    return { error: 'Only registered Receivers and NGOs are authorized to claim food donations.' };
  }

  if (!listingId) {
    return { error: 'Invalid food listing ID provided.' };
  }

  try {
    const listing = await prisma.foodListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return { error: 'Food listing not found.' };
    }

    if (listing.status !== 'AVAILABLE') {
      return {
        error: `This food listing is currently ${listing.status.toLowerCase()} and cannot be claimed.`,
      };
    }

    // Generate a unique, secure QR verification payload
    const qrCodeSecret = `FOOD-RESCUE-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Atomic conditional transaction: ensure food listing is still AVAILABLE
    const claim = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.foodListing.updateMany({
        where: {
          id: listingId,
          status: 'AVAILABLE',
        },
        data: { status: 'CLAIMED' },
      });

      if (updateResult.count === 0) {
        throw new Error('This food listing is no longer available or was already claimed.');
      }

      return await tx.claim.create({
        data: {
          foodListingId: listingId,
          receiverId: session.user.id,
          qrCodeSecret,
          deliveryStatus: 'UNASSIGNED',
          status: 'PENDING',
        },
      });
    }, { maxWait: 10000, timeout: 20000 });

    await logAuditEvent({
      actorId: session.user.id,
      action: 'CLAIM_CREATED',
      entityType: 'CLAIM',
      entityId: claim.id,
      metadata: {
        foodListingId: listingId,
        receiverId: session.user.id,
      },
    });

    revalidatePath('/donations');
    revalidatePath(`/donations/${listingId}`);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/donor');
    revalidatePath('/listings');
    revalidatePath('/');

    return {
      success: true,
      claimId: claim.id,
    };
  } catch (err: any) {
    console.error('Failed to claim food donation:', err);
    return {
      error: getSafeErrorMessage(err, 'An unexpected error occurred while claiming the donation.'),
    };
  }
}
