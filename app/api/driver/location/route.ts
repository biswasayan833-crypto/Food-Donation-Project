import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateDriverCoordinates, isValidCoordinate } from '@/services/delivery-tracking.service';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSafeErrorMessage } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * POST /api/driver/location
 *
 * Receives authenticated GPS coordinate updates from volunteer couriers.
 * Enforces:
 * - Session authentication
 * - Volunteer/Admin role check
 * - Serverless rate limiting (60 updates per minute)
 * - Latitude (-90 to 90) and Longitude (-180 to 180) numeric validation
 * - Driver identity derived strictly from server session
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to update driver location.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'VOLUNTEER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Only registered volunteer couriers can broadcast location.' },
        { status: 403 }
      );
    }

    // Rate Limiting: 60 updates per minute per driver
    const rateLimit = await checkRateLimit(`driver:location:${session.user.id}`, 60, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'GPS broadcast rate limit exceeded. Please throttle coordinate updates.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds || 1),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, claimId } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing latitude or longitude in request body.' },
        { status: 400 }
      );
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return NextResponse.json(
        {
          error:
            'Invalid coordinates. Latitude must be a number between -90 and 90, and longitude between -180 and 180.',
        },
        { status: 400 }
      );
    }

    const result = await updateDriverCoordinates({
      driverId: session.user.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      claimId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        updatedAt: result.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/driver/location:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to update courier location.') },
      { status: 500 }
    );
  }
}
