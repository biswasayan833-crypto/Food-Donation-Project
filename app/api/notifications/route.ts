import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserNotifications,
  markAllNotificationsAsRead,
} from '@/services/notification.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 *
 * Retrieves current authenticated user's notifications and unread count.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view notifications.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 30;

    const data = await getUserNotifications(session.user.id, limit);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 *
 * Marks all notifications as read for the authenticated user.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const result = await markAllNotificationsAsRead(session.user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications.' },
      { status: 500 }
    );
  }
}
