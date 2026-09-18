import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markNotificationAsRead } from '@/services/notification.service';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notifications/[id]/read
 *
 * Marks an individual notification as read.
 * Enforces recipient ownership check (cannot mark other users' notifications).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const notificationId = params.id;
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notification ID.' },
        { status: 400 }
      );
    }

    const result = await markNotificationAsRead(notificationId, session.user.id);

    if (result.error) {
      const isForbidden = result.error.startsWith('Forbidden');
      return NextResponse.json(
        { error: result.error },
        { status: isForbidden ? 403 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.notification,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/notifications/[id]/read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification.' },
      { status: 500 }
    );
  }
}
