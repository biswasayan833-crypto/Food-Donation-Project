/**
 * Incident & Dispute Management Service
 *
 * Handles reporting, tracking, lifecycle review, and resolution of incidents/disputes
 * across the FoodRescue platform.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logAuditEvent } from './audit.service';
import { createNotification } from './notification.service';

export type IncidentCategory =
  | 'SPOILED_FOOD'
  | 'NO_SHOW'
  | 'LATE_DELIVERY'
  | 'WRONG_QUANTITY'
  | 'PACKAGING_DEFECT'
  | 'UNPROFESSIONAL_BEHAVIOR'
  | 'OTHER';

export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface CreateIncidentParams {
  reporterId: string;
  reportedUserId?: string | null;
  foodListingId?: string | null;
  claimId?: string | null;
  category: IncidentCategory | string;
  title: string;
  description: string;
  evidenceUrl?: string | null;
}

export interface ResolveIncidentParams {
  incidentId: string;
  resolvedById: string;
  status: IncidentStatus;
  resolutionNotes: string;
}

export interface IncidentFilterParams {
  status?: IncidentStatus | string;
  category?: IncidentCategory | string;
  reporterId?: string;
  reportedUserId?: string;
  page?: number;
  limit?: number;
}

/**
 * Report a new incident / dispute.
 */
export async function createIncident(params: CreateIncidentParams) {
  const {
    reporterId,
    reportedUserId,
    foodListingId,
    claimId,
    category,
    title,
    description,
    evidenceUrl,
  } = params;

  if (!title || !description || !category) {
    throw new Error('Title, description, and category are required to report an incident.');
  }

  const incident = await prisma.incident.create({
    data: {
      reporterId,
      reportedUserId: reportedUserId || null,
      foodListingId: foodListingId || null,
      claimId: claimId || null,
      category,
      title: title.trim(),
      description: description.trim(),
      evidenceUrl: evidenceUrl?.trim() || null,
      status: 'OPEN',
    },
    include: {
      reporter: {
        select: { id: true, name: true, email: true, role: true },
      },
      reportedUser: {
        select: { id: true, name: true, email: true, role: true },
      },
      foodListing: {
        select: { id: true, title: true },
      },
      claim: {
        select: { id: true, deliveryStatus: true },
      },
    },
  });

  // Record append-only audit event
  await logAuditEvent({
    actorId: reporterId,
    action: 'INCIDENT_CREATED',
    entityType: 'INCIDENT',
    entityId: incident.id,
    metadata: {
      category: incident.category,
      reportedUserId: incident.reportedUserId,
      claimId: incident.claimId,
      foodListingId: incident.foodListingId,
    },
  });

  // Notify reporter confirmation
  await createNotification({
    userId: reporterId,
    eventType: 'INCIDENT_CREATED',
    title: 'Incident Report Submitted',
    message: `Your incident report "${incident.title}" has been received and is pending administrator review.`,
    claimId: incident.claimId,
    foodListingId: incident.foodListingId,
  });

  return incident;
}

/**
 * Retrieve incidents involving a specific user (either reporter or reported user).
 */
export async function getUserIncidents(userId: string) {
  return prisma.incident.findMany({
    where: {
      OR: [{ reporterId: userId }, { reportedUserId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: {
        select: { id: true, name: true, role: true },
      },
      reportedUser: {
        select: { id: true, name: true, role: true },
      },
      resolvedBy: {
        select: { id: true, name: true },
      },
      foodListing: {
        select: { id: true, title: true },
      },
      claim: {
        select: { id: true, deliveryStatus: true },
      },
    },
  });
}

/**
 * Platform-wide incident query for administrators with pagination and filters.
 */
export async function getPlatformIncidents(filters: IncidentFilterParams = {}) {
  const { status, category, reporterId, reportedUserId, page = 1, limit = 30 } = filters;

  const where: Prisma.IncidentWhereInput = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (reporterId) where.reporterId = reporterId;
  if (reportedUserId) where.reportedUserId = reportedUserId;

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [total, incidents] = await Promise.all([
    prisma.incident.count({ where }),
    prisma.incident.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, name: true, email: true, role: true },
        },
        reportedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        resolvedBy: {
          select: { id: true, name: true },
        },
        foodListing: {
          select: { id: true, title: true },
        },
        claim: {
          select: { id: true, deliveryStatus: true },
        },
      },
    }),
  ]);

  return {
    incidents,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

/**
 * Fetch a single incident with authorization check.
 */
export async function getIncidentById(incidentId: string, requestingUserId: string, isAdmin: boolean) {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      reporter: {
        select: { id: true, name: true, email: true, role: true },
      },
      reportedUser: {
        select: { id: true, name: true, email: true, role: true },
      },
      resolvedBy: {
        select: { id: true, name: true, email: true },
      },
      foodListing: {
        select: { id: true, title: true, status: true },
      },
      claim: {
        select: { id: true, deliveryStatus: true, status: true },
      },
    },
  });

  if (!incident) {
    return null;
  }

  // Enforce access control
  if (!isAdmin && incident.reporterId !== requestingUserId && incident.reportedUserId !== requestingUserId) {
    throw new Error('Access denied. You do not have permission to view this incident.');
  }

  return incident;
}

/**
 * Resolve or update the status of an incident (Admin action).
 */
export async function resolveIncident(params: ResolveIncidentParams) {
  const { incidentId, resolvedById, status, resolutionNotes } = params;

  const existing = await prisma.incident.findUnique({
    where: { id: incidentId },
  });

  if (!existing) {
    throw new Error(`Incident with id "${incidentId}" not found.`);
  }

  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status,
      resolutionNotes: resolutionNotes.trim(),
      resolvedById,
      resolvedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : null,
    },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      reportedUser: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });

  // Record audit log
  await logAuditEvent({
    actorId: resolvedById,
    action: status === 'RESOLVED' ? 'INCIDENT_RESOLVED' : status === 'DISMISSED' ? 'INCIDENT_DISMISSED' : 'ADMIN_ACTION',
    entityType: 'INCIDENT',
    entityId: incidentId,
    metadata: {
      previousStatus: existing.status,
      newStatus: status,
      resolutionNotes,
    },
  });

  // Notify reporter
  await createNotification({
    userId: updated.reporterId,
    eventType: 'INCIDENT_RESOLVED',
    title: `Incident ${status === 'RESOLVED' ? 'Resolved' : status === 'DISMISSED' ? 'Dismissed' : 'Updated'}`,
    message: `Your report "${updated.title}" has been marked as ${status}. Admin notes: ${resolutionNotes}`,
    claimId: updated.claimId,
    foodListingId: updated.foodListingId,
  });

  // Notify reported user if involved
  if (updated.reportedUserId) {
    await createNotification({
      userId: updated.reportedUserId,
      eventType: 'INCIDENT_RESOLVED',
      title: `Incident Involving You ${status === 'RESOLVED' ? 'Resolved' : status === 'DISMISSED' ? 'Dismissed' : 'Updated'}`,
      message: `The reported issue regarding "${updated.title}" was updated to ${status}. Admin notes: ${resolutionNotes}`,
      claimId: updated.claimId,
      foodListingId: updated.foodListingId,
    });
  }

  return updated;
}
