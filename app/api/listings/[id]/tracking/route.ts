import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDeliveryTrackingData,
  transitionDeliveryStatus,
  DeliveryStatus,
} from '@/services/delivery-tracking.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/listings/[id]/tracking
 *
 * Retrieves sanitized real-time tracking data for authorized delivery participants:
 * - Listing Donor
 * - Claim Receiver
 * - Assigned Volunteer Courier
 * - Platform Admins
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view delivery tracking.' },
        { status: 401 }
      );
    }

    const listingId = params.id;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing ID.' }, { status: 400 });
    }

    const result = await getDeliveryTrackingData({
      listingId,
      requesterId: session.user.id,
      requesterRole: session.user.role,
    });

    if (!result.success) {
      const isForbidden = result.error?.startsWith('Forbidden');
      return NextResponse.json(
        { error: result.error },
        { status: isForbidden ? 403 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/listings/[id]/tracking:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while loading tracking data.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/listings/[id]/tracking
 *
 * Transitions the operational delivery status:
 * - DRIVER_ASSIGNED -> PICKUP_STARTED
 * - PICKUP_STARTED -> PICKED_UP
 * - PICKED_UP -> IN_TRANSIT
 * - IN_TRANSIT -> DELIVERED
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to update delivery tracking.' },
        { status: 401 }
      );
    }

    const listingId = params.id;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing ID.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { claimId, targetStatus, notes } = body;

    if (!targetStatus) {
      return NextResponse.json(
        { error: 'Missing targetStatus in request body.' },
        { status: 400 }
      );
    }

    // If claimId is not provided, fetch the active claim for this listing
    let targetClaimId = claimId;
    if (!targetClaimId) {
      const tracking = await getDeliveryTrackingData({
        listingId,
        requesterId: session.user.id,
        requesterRole: session.user.role,
      });

      if (!tracking.success || !tracking.data) {
        return NextResponse.json(
          { error: tracking.error || 'No active claim found for this listing.' },
          { status: 404 }
        );
      }
      targetClaimId = tracking.data.claimId;
    }

    const transitionResult = await transitionDeliveryStatus({
      claimId: targetClaimId,
      targetStatus: targetStatus as DeliveryStatus,
      requesterId: session.user.id,
      requesterRole: session.user.role,
      notes,
    });

    if (!transitionResult.success) {
      const isForbidden = transitionResult.error?.startsWith('Forbidden');
      return NextResponse.json(
        { error: transitionResult.error },
        { status: isForbidden ? 403 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyInState: transitionResult.alreadyInState || false,
      data: transitionResult.claim,
    });
  } catch (error: any) {
    console.error('Error in POST /api/listings/[id]/tracking:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while transitioning delivery state.' },
      { status: 500 }
    );
  }
}
