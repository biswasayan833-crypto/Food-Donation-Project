import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/services/audit.service';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateId, getSafeErrorMessage } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to claim food.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'RECEIVER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only registered Receivers and NGOs are authorized to claim food donations.' },
        { status: 403 }
      );
    }

    // 1. Rate Limiting: 10 claim attempts per minute per user
    const rateLimit = await checkRateLimit(`claim:create:${session.user.id}`, 10, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before claiming another donation.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { foodListingId, listingId } = body;
    const targetListingId = foodListingId || listingId;

    if (!targetListingId || !validateId(targetListingId)) {
      return NextResponse.json({ error: 'Valid foodListingId is required.' }, { status: 400 });
    }

    const qrCodeSecret = `FOOD-RESCUE-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // 2. Concurrency Hardening: Atomic conditional update prevents double-claiming race conditions
    const claim = await prisma.$transaction(async (tx) => {
      const listingUpdate = await tx.foodListing.updateMany({
        where: {
          id: targetListingId,
          status: 'AVAILABLE',
        },
        data: { status: 'CLAIMED' },
      });

      if (listingUpdate.count === 0) {
        throw new Error('Conflict: This food listing is no longer available to be claimed.');
      }

      return await tx.claim.create({
        data: {
          foodListingId: targetListingId,
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
        foodListingId: targetListingId,
        receiverId: session.user.id,
      },
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to claim listing:', error);
    const isConflict = error.message?.includes('Conflict') || error.message?.includes('no longer available');
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to claim listing.') },
      { status: isConflict ? 409 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { claimId, status } = body;

    if (!claimId || !status || !validateId(claimId)) {
      return NextResponse.json(
        { error: 'claimId and status (PENDING, APPROVED, COMPLETED) are required.' },
        { status: 400 }
      );
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { foodListing: true },
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found.' }, { status: 404 });
    }

    // Enforce ownership: only receiver, donor of the listing, or admin can modify
    const isReceiverOwner = claim.receiverId === session.user.id;
    const isDonorOwner = claim.foodListing?.donorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isReceiverOwner && !isDonorOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. You are not authorized to modify this food donation claim.' },
        { status: 403 }
      );
    }

    const cleanStatus = status.toString().toUpperCase().trim();
    const validStatuses = ['PENDING', 'APPROVED', 'COMPLETED'];
    if (!validStatuses.includes(cleanStatus)) {
      return NextResponse.json(
        { error: 'Invalid claim status. Must be PENDING, APPROVED, or COMPLETED.' },
        { status: 400 }
      );
    }

    const updatedClaim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: cleanStatus,
        ...(cleanStatus === 'COMPLETED' && !claim.deliveredAt ? { deliveredAt: new Date() } : {}),
      },
    });

    // If completed, update foodListing to DELIVERED
    if (cleanStatus === 'COMPLETED') {
      await prisma.foodListing.update({
        where: { id: claim.foodListingId },
        data: { status: 'DELIVERED' },
      });
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: cleanStatus === 'COMPLETED' ? 'CLAIM_APPROVED' : 'CLAIM_UPDATED',
      entityType: 'CLAIM',
      entityId: claimId,
      metadata: { previousStatus: claim.status, newStatus: cleanStatus },
    });

    return NextResponse.json({ claim: updatedClaim });
  } catch (error: any) {
    console.error('Failed to update claim:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to update claim.') },
      { status: 500 }
    );
  }
}
