'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/services/audit.service';
import { getSafeErrorMessage } from '@/lib/security';

const ALLOWED_CLAIM_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];

export async function updateClaimStatus(claimId: string, status: string) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'Unauthorized.' };
  }

  if (!claimId || typeof claimId !== 'string') {
    return { error: 'Invalid claim identifier.' };
  }

  const normalizedStatus = status?.toUpperCase()?.trim();
  if (!ALLOWED_CLAIM_STATUSES.includes(normalizedStatus)) {
    return { error: 'Invalid claim status.' };
  }

  try {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { foodListing: true },
    });

    if (!claim) {
      return { error: 'Claim not found.' };
    }

    // Ownership / Authorization Check: Only receiver, donor, assigned driver, or admin can update
    const isReceiver = claim.receiverId === session.user.id;
    const isDonor = claim.foodListing?.donorId === session.user.id;
    const isDriver = claim.driverId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isReceiver && !isDonor && !isDriver && !isAdmin) {
      return { error: 'Forbidden: You do not have permission to update this claim.' };
    }

    await prisma.claim.update({
      where: { id: claimId },
      data: { status: normalizedStatus },
    });

    if (normalizedStatus === 'COMPLETED') {
      await prisma.foodListing.update({
        where: { id: claim.foodListingId },
        data: { status: 'DELIVERED' },
      });
    } else if (normalizedStatus === 'CANCELLED' && claim.foodListing?.status === 'CLAIMED') {
      // If cancelled and listing was claimed, return listing to AVAILABLE
      await prisma.foodListing.update({
        where: { id: claim.foodListingId },
        data: { status: 'AVAILABLE' },
      });
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: normalizedStatus === 'COMPLETED' ? 'CLAIM_APPROVED' : 'CLAIM_UPDATED',
      entityType: 'CLAIM',
      entityId: claimId,
      metadata: { previousStatus: claim.status, newStatus: normalizedStatus },
    });

    revalidatePath('/dashboard');
    revalidatePath(`/listings/${claim.foodListingId}`);

    return { success: true };
  } catch (error: any) {
    return { error: getSafeErrorMessage(error, 'Failed to update claim.') };
  }
}
