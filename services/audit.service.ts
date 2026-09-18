/**
 * Audit Log Service
 *
 * Provides append-only, tamper-resistant system event logging for FoodRescue.
 * Tracks all lifecycle events across donations, claims, deliveries, driver assignments,
 * QR verifications, admin interventions, and disputes.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type AuditAction =
  | 'DONATION_CREATED'
  | 'DONATION_UPDATED'
  | 'DONATION_CANCELLED'
  | 'CLAIM_CREATED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_REASSIGNED'
  | 'DELIVERY_STATUS_CHANGED'
  | 'QR_VERIFIED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_DISMISSED'
  | 'ADMIN_ACTION';

export type AuditEntityType =
  | 'FOOD_LISTING'
  | 'CLAIM'
  | 'USER'
  | 'INCIDENT'
  | 'SYSTEM';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface AuditQueryFilters {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Record an append-only audit event in the database.
 * Designed to fail gracefully so that logging errors never disrupt primary business logic.
 */
export async function logAuditEvent(params: CreateAuditLogParams) {
  try {
    const { actorId, action, entityType, entityId, metadata } = params;

    const log = await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        action,
        entityType,
        entityId: entityId || null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return log;
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error, params);
    return null;
  }
}

/**
 * Retrieve audit logs with filtering and pagination.
 * Exclusively intended for authorized administrative audits.
 */
export async function getAuditLogs(filters: AuditQueryFilters = {}) {
  const {
    actorId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  const where: Prisma.AuditLogWhereInput = {};

  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    logs,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

/**
 * Summary metrics for administrative audit dashboards.
 */
export async function getAuditStats() {
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [totalLogs, last24hCount, actionGroup] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        createdAt: { gte: past24h },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        id: true,
      },
    }),
  ]);

  const actionsCountMap: Record<string, number> = {};
  for (const item of actionGroup) {
    actionsCountMap[item.action] = item._count.id;
  }

  return {
    totalLogs,
    last24hCount,
    actionsCountMap,
  };
}
