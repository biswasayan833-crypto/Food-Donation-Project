import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserReputationProfile } from '@/services/reputation.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reputation/[userId]
 *
 * Retrieves the transparent server-calculated trust and reputation profile
 * for a specific user ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view reputation profiles.' },
        { status: 401 }
      );
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter.' },
        { status: 400 }
      );
    }

    const profile = await getUserReputationProfile(userId);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error('Failed to compute user reputation profile:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to compute reputation profile.' },
      { status }
    );
  }
}
