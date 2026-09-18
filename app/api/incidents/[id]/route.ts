import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getIncidentById,
  resolveIncident,
  IncidentStatus,
} from '@/services/incident.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/incidents/[id]
 *
 * Retrieve details for a single incident.
 * Accessible only to admins or the participants (reporter or reported user).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = params;
    const isAdmin = session.user.role === 'ADMIN';

    const incident = await getIncidentById(id, session.user.id, isAdmin);

    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      incident,
    });
  } catch (error: any) {
    console.error('Failed to get incident by id:', error);
    const status = error.message?.includes('Access denied') ? 403 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve incident.' },
      { status }
    );
  }
}

/**
 * PATCH /api/incidents/[id]
 *
 * Adjudicate or update an incident dispute.
 * Exclusively restricted to platform administrators.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'Forbidden. Incident resolution requires administrator privileges.' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { status, resolutionNotes } = body;

    const validStatuses: IncidentStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (!resolutionNotes || !resolutionNotes.trim()) {
      return NextResponse.json(
        { error: 'Resolution notes are required when updating incident status.' },
        { status: 400 }
      );
    }

    const updated = await resolveIncident({
      incidentId: id,
      resolvedById: session.user.id,
      status,
      resolutionNotes,
    });

    return NextResponse.json({
      success: true,
      incident: updated,
    });
  } catch (error: any) {
    console.error('Failed to resolve incident:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to update incident.' },
      { status }
    );
  }
}
