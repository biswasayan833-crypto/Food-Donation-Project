import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRankedMatchesForDonation } from '@/services/donation-matching.service';
import { logAuditEvent } from '@/services/audit.service';
import { getSafeErrorMessage } from '@/lib/security';

/**
 * GET /api/listings/[id]/matches
 *
 * Retrieves ranked eligible receivers for a specific food donation.
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
        { error: 'Unauthorized. You must be signed in to view smart donation matches.' },
        { status: 401 }
      );
    }

    const listingId = params.id;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing ID.' }, { status: 400 });
    }

    // Verify listing existence and owner
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

    // Enforce strict ownership authorization
    const isOwnerDonor = listing.donorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwnerDonor && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. You are not authorized to view matches for this donation.' },
        { status: 403 }
      );
    }

    // Compute ranked matches
    const matchResult = await getRankedMatchesForDonation(listingId);

    return NextResponse.json({
      success: true,
      data: matchResult,
    });
  } catch (error: any) {
    console.error('Error fetching donation matches:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve donation matches.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/listings/[id]/matches
 *
 * Selects and assigns a recommended receiver to a food donation.
 * Reuses the existing Claim model and generates a secure QR pickup token.
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
        { error: 'Unauthorized. You must be signed in to select a receiver.' },
        { status: 401 }
      );
    }

    const listingId = params.id;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing ID.' }, { status: 400 });
    }

    const body = await req.json();
    const receiverId = body.receiverId?.trim();

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required.' }, { status: 400 });
    }

    // Verify listing
    const listing = await prisma.foodListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Food listing not found.' }, { status: 404 });
    }

    // Enforce ownership
    const isOwnerDonor = listing.donorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwnerDonor && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. You are not authorized to assign receivers for this donation.' },
        { status: 403 }
      );
    }

    if (listing.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: `This food listing is already ${listing.status.toLowerCase()} and cannot be assigned.` },
        { status: 400 }
      );
    }

    // Verify selected receiver is valid
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver || receiver.role !== 'RECEIVER') {
      return NextResponse.json(
        { error: 'Selected receiver is invalid or not registered as a food shelter / NGO.' },
        { status: 400 }
      );
    }

    // Generate secure QR verification payload
    const qrCodeSecret = `FOOD-RESCUE-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Atomic transaction with conditional check: create Claim and set listing to CLAIMED
    const claim = await prisma.$transaction(async (tx) => {
      const updatedListing = await tx.foodListing.updateMany({
        where: { id: listingId, status: 'AVAILABLE' },
        data: { status: 'CLAIMED' },
      });

      if (updatedListing.count === 0) {
        throw new Error('Conflict: This food listing is no longer available to be assigned.');
      }

      return await tx.claim.create({
        data: {
          foodListingId: listingId,
          receiverId: receiver.id,
          qrCodeSecret,
          deliveryStatus: 'UNASSIGNED',
          status: 'APPROVED',
        },
      });
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: 'CLAIM_CREATED',
      entityType: 'CLAIM',
      entityId: claim.id,
      metadata: {
        foodListingId: listingId,
        receiverId: receiver.id,
        matchedViaSmartMatching: true,
      },
    });

    revalidatePath('/donations');
    revalidatePath(`/donations/${listingId}`);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/donor');
    revalidatePath('/dashboard/receiver');
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: `Successfully matched and assigned to ${receiver.name}!`,
      claimId: claim.id,
    });
  } catch (error: any) {
    console.error('Error assigning donation match:', error);
    const isConflict = error.message?.includes('Conflict');
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to assign donation match.') },
      { status: isConflict ? 409 : 500 }
    );
  }
}
