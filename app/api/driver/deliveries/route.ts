import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeFoodUrgency } from '@/services/food-urgency.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (session.user.role !== 'VOLUNTEER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Volunteer courier credentials required.' },
        { status: 403 }
      );
    }

    const [unassigned, myDeliveries, totalVolunteerCompleted] = await Promise.all([
      // Unassigned delivery tasks waiting for couriers
      prisma.claim.findMany({
        where: {
          deliveryStatus: 'UNASSIGNED',
          status: { not: 'COMPLETED' },
        },
        include: {
          foodListing: {
            include: {
              donor: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  phone: true,
                },
              },
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              location: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // Current volunteer's accepted and past deliveries
      prisma.claim.findMany({
        where: {
          driverId: session.user.id,
        },
        include: {
          foodListing: {
            include: {
              donor: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  phone: true,
                },
              },
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              location: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // Total platform completed by couriers
      prisma.claim.count({
        where: {
          deliveryStatus: { in: ['DELIVERED', 'COMPLETED'] },
        },
      }),
    ]);

    // Enrich tasks with server-authoritative operational urgency and privacy redaction
    const enrichedUnassigned = unassigned.map((claim) => {
      const sanitizedListing = {
        ...claim.foodListing,
        donor: {
          ...claim.foodListing.donor,
          phone: null,
        },
        urgency: computeFoodUrgency(claim.foodListing, claim),
      };

      return {
        ...claim,
        foodListing: sanitizedListing,
        receiver: {
          ...claim.receiver,
          phone: null,
        },
      };
    });

    // Prioritize unassigned feed by urgency score descending
    enrichedUnassigned.sort((a, b) => b.foodListing.urgency.score - a.foodListing.urgency.score);

    const enrichedMyDeliveries = myDeliveries.map((claim) => ({
      ...claim,
      foodListing: {
        ...claim.foodListing,
        urgency: computeFoodUrgency(claim.foodListing, claim),
      },
    }));

    const activeStatuses = ['DRIVER_ASSIGNED', 'PICKUP_STARTED', 'PICKED_UP', 'IN_TRANSIT'];
    const activeTasks = enrichedMyDeliveries.filter(
      (d) => activeStatuses.includes(d.deliveryStatus)
    );
    activeTasks.sort((a, b) => b.foodListing.urgency.score - a.foodListing.urgency.score);

    const completedTasks = enrichedMyDeliveries.filter(
      (d) => d.deliveryStatus === 'DELIVERED' || d.deliveryStatus === 'COMPLETED' || d.status === 'COMPLETED'
    );

    return NextResponse.json({
      unassigned: enrichedUnassigned,
      myDeliveries: enrichedMyDeliveries,
      activeTasks,
      completedTasks,
      stats: {
        availableCount: enrichedUnassigned.length,
        myActiveCount: activeTasks.length,
        myCompletedCount: completedTasks.length,
        platformCompletedCount: totalVolunteerCompleted,
      },
    });
  } catch (error: any) {
    console.error('Failed to load volunteer courier deliveries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch courier deliveries.' },
      { status: 500 }
    );
  }
}
