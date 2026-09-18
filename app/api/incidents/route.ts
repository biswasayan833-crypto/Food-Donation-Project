import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createIncident,
  getUserIncidents,
  getPlatformIncidents,
  IncidentCategory,
  IncidentStatus,
} from '@/services/incident.service';

import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeString, sanitizeUrl, getSafeErrorMessage } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/incidents
 *
 * Retrieves incidents.
 * Administrators view all platform incidents with filtering and pagination.
 * Normal users view only incidents they reported or are targeted by.
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

    const { searchParams } = new URL(req.url);

    if (session.user.role === 'ADMIN') {
      const status = (searchParams.get('status') as IncidentStatus) || undefined;
      const category = (searchParams.get('category') as IncidentCategory) || undefined;
      const reporterId = searchParams.get('reporterId') || undefined;
      const reportedUserId = searchParams.get('reportedUserId') || undefined;
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '30', 10);

      const result = await getPlatformIncidents({
        status,
        category,
        reporterId,
        reportedUserId,
        page,
        limit,
      });

      return NextResponse.json({
        success: true,
        incidents: result.incidents,
        pagination: result.pagination,
      });
    }

    // Normal users receive their isolated incidents
    const incidents = await getUserIncidents(session.user.id);
    return NextResponse.json({
      success: true,
      incidents,
    });
  } catch (error: any) {
    console.error('Failed to get incidents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve incidents.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incidents
 *
 * File a new incident report or dispute. Reporter identity is strictly derived from the session.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to file an incident.' },
        { status: 401 }
      );
    }

    // Rate Limiting: 5 incidents per minute per user
    const rateLimit = await checkRateLimit(`incident:create:${session.user.id}`, 5, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Incident report rate limit exceeded. Please wait before submitting another report.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      category,
      title,
      description,
      reportedUserId,
      foodListingId,
      claimId,
      evidenceUrl,
    } = body;

    if (!category || !title || !description) {
      return NextResponse.json(
        { error: 'Category, title, and description are required fields.' },
        { status: 400 }
      );
    }

    const incident = await createIncident({
      reporterId: session.user.id,
      reportedUserId: reportedUserId || null,
      foodListingId: foodListingId || null,
      claimId: claimId || null,
      category: sanitizeString(category, 50),
      title: sanitizeString(title, 200),
      description: sanitizeString(description, 2000),
      evidenceUrl: sanitizeUrl(evidenceUrl),
    });

    return NextResponse.json(
      {
        success: true,
        incident,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create incident:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to submit incident report.') },
      { status: 500 }
    );
  }
}
