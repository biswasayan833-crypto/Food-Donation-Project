/**
 * Notification Service
 *
 * Provides reusable, server-authoritative in-app notifications for:
 * - DRIVER_ASSIGNED
 * - PICKUP_STARTED
 * - FOOD_PICKED_UP
 * - DELIVERY_STARTED
 * - DELIVERY_COMPLETED
 * - DELIVERY_DELAYED
 * - URGENT_DELIVERY
 * - DRIVER_REASSIGNED
 *
 * Enforces strict recipient data isolation, idempotent deduplication,
 * and high-performance querying on Neon PostgreSQL.
 */

import { prisma } from '@/lib/prisma';

export interface CreateNotificationParams {
  userId: string;
  eventType: string;
  title: string;
  message: string;
  claimId?: string | null;
  foodListingId?: string | null;
}

export interface UserNotificationsResult {
  notifications: Array<{
    id: string;
    userId: string;
    eventType: string;
    title: string;
    message: string;
    claimId: string | null;
    foodListingId: string | null;
    isRead: boolean;
    createdAt: Date;
  }>;
  unreadCount: number;
}

/**
 * Creates an in-app notification for a designated user.
 * Idempotently deduplicates identical notifications created within the last 15 seconds.
 */
export async function createNotification(params: CreateNotificationParams): Promise<{
  success: boolean;
  deduplicated?: boolean;
  notification?: any;
  error?: string;
}> {
  const { userId, eventType, title, message, claimId, foodListingId } = params;

  if (!userId || !eventType || !title || !message) {
    return { success: false, error: 'Missing required notification fields.' };
  }

  try {
    // Idempotency check: prevent duplicate notifications for same event & claim within 15 seconds
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        eventType,
        claimId: claimId || undefined,
        createdAt: { gte: fifteenSecondsAgo },
      },
    });

    if (existing) {
      return { success: true, deduplicated: true, notification: existing };
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        eventType,
        title,
        message,
        claimId: claimId || null,
        foodListingId: foodListingId || null,
      },
    });

    return { success: true, deduplicated: false, notification };
  } catch (error: any) {
    console.error('Failed to create notification:', error);
    return { success: false, error: error.message || 'Failed to create notification.' };
  }
}

/**
 * Retrieves notifications for a specific authenticated user with unread count.
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 30
): Promise<UserNotificationsResult> {
  if (!userId) {
    return { notifications: [], unreadCount: 0 };
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

/**
 * Marks a single notification as read, enforcing strict recipient ownership.
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  if (!notificationId || !userId) {
    return { success: false, error: 'Invalid notification or user ID.' };
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return { success: false, error: 'Notification not found.' };
  }

  if (notification.userId !== userId) {
    return { success: false, error: 'Forbidden. You do not own this notification.' };
  }

  if (notification.isRead) {
    return { success: true, notification };
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return { success: true, notification: updated };
}

/**
 * Marks all notifications as read for a specific authenticated user.
 */
export async function markAllNotificationsAsRead(userId: string) {
  if (!userId) {
    return { success: false, error: 'Invalid user ID.' };
  }

  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { success: true };
}
