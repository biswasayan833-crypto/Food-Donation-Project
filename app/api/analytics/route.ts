import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRoleScopedAnalytics, TimeRange } from '@/services/impact-analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get('range') || '30D').toUpperCase() as TimeRange;
    const validRanges: TimeRange[] = ['TODAY', '7D', '30D', '90D', 'ALL'];
    const range = validRanges.includes(rangeParam) ? rangeParam : '30D';

    const userRole = (session.user.role || 'DONOR').toUpperCase() as
      | 'DONOR'
      | 'RECEIVER'
      | 'VOLUNTEER'
      | 'ADMIN';

    const analytics = await getRoleScopedAnalytics(session.user.id, userRole, range);

    return NextResponse.json({
      analytics,
    });
  } catch (error: any) {
    console.error('Failed to fetch role-scoped analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error while computing user analytics.' },
      { status: 500 }
    );
  }
}
