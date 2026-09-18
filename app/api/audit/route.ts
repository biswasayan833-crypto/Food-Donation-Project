import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuditLogs, getAuditStats } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit
 *
 * Platform audit trail query endpoint. Strictly restricted to platform administrators.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Administrative audit access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const actorId = searchParams.get('actorId') || undefined;
    const includeStats = searchParams.get('includeStats') === 'true';

    const [auditData, stats] = await Promise.all([
      getAuditLogs({
        page,
        limit,
        action,
        entityType,
        actorId,
      }),
      includeStats ? getAuditStats() : null,
    ]);

    return NextResponse.json({
      success: true,
      logs: auditData.logs,
      pagination: auditData.pagination,
      stats,
    });
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while fetching audit logs.' },
      { status: 500 }
    );
  }
}
