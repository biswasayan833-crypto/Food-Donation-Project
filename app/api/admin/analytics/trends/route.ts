import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAnalyticsTimeseries } from '@/services/impact-analytics.service';

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
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') || '30', 10) || 30));

    const timeseries = await getAnalyticsTimeseries({ days });

    return NextResponse.json({
      days,
      timeseries,
    });
  } catch (error: any) {
    console.error('Failed to fetch admin analytics trends:', error);
    return NextResponse.json(
      { error: 'Internal server error while computing trend timeseries.' },
      { status: 500 }
    );
  }
}
