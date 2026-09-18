import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getImpactMetrics, calculateImpactScore, TimeRange } from '@/services/impact-analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Admin authorization required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get('range') || '30D').toUpperCase() as TimeRange;
    const validRanges: TimeRange[] = ['TODAY', '7D', '30D', '90D', 'ALL'];
    const range = validRanges.includes(rangeParam) ? rangeParam : '30D';

    const metrics = await getImpactMetrics({ range });
    const impactScore = calculateImpactScore(metrics);

    return NextResponse.json({
      metrics,
      impactScore,
    });
  } catch (error: any) {
    console.error('Failed to fetch admin impact analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error while computing platform analytics.' },
      { status: 500 }
    );
  }
}
