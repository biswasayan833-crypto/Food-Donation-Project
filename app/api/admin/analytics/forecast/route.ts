import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateSurplusForecast } from '@/services/surplus-prediction.service';

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

    const forecast = await generateSurplusForecast();

    return NextResponse.json({
      forecast,
    });
  } catch (error: any) {
    console.error('Failed to generate surplus forecast:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating surplus forecast.' },
      { status: 500 }
    );
  }
}
