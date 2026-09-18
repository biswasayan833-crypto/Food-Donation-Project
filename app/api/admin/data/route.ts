import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeFoodUrgency } from '@/services/food-urgency.service';

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

    const [listings, users, totalDonations, totalClaims, activeDonationsCount] = await Promise.all([
      prisma.foodListing.findMany({
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              location: true,
            },
          },
          claims: {
            include: {
              receiver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              driver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          location: true,
          phone: true,
          isAvailable: true,
          serviceRadiusKm: true,
          dailyCapacity: true,
          createdAt: true,
          _count: {
            select: {
              foodListings: true,
              claims: true,
              driverDeliveries: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.foodListing.count(),
      prisma.claim.count(),
      prisma.foodListing.count({ where: { status: 'AVAILABLE' } }),
    ]);

    const donorCount = users.filter((u) => u.role === 'DONOR').length;
    const receiverCount = users.filter((u) => u.role === 'RECEIVER').length;
    const adminCount = users.filter((u) => u.role === 'ADMIN').length;
    const volunteerCount = users.filter((u) => u.role === 'VOLUNTEER').length;
    const activeVolunteerCount = users.filter((u) => u.role === 'VOLUNTEER' && u.isAvailable).length;

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let expiredCount = 0;

    const enrichedListings = listings.map((item) => {
      const urgency = computeFoodUrgency(item, item.claims && item.claims.length > 0 ? item.claims[0] : null);
      if (item.status === 'AVAILABLE' || item.status === 'CLAIMED') {
        if (urgency.isExpired) {
          expiredCount++;
        } else if (urgency.level === 'CRITICAL') {
          criticalCount++;
        } else if (urgency.level === 'HIGH') {
          highCount++;
        } else if (urgency.level === 'MEDIUM') {
          mediumCount++;
        } else {
          lowCount++;
        }
      }
      return {
        ...item,
        urgency,
      };
    });

    // Calculate realistic Food Saved estimate based on completed + active listings
    const totalFoodSavedServings = totalDonations * 35 + totalClaims * 50;

    let unassignedDeliveriesCount = 0;
    let assignedDeliveriesCount = 0;
    let pickupStartedDeliveriesCount = 0;
    let pickedUpDeliveriesCount = 0;
    let inTransitDeliveriesCount = 0;
    let deliveredDeliveriesCount = 0;
    let criticalUnassignedDeliveriesCount = 0;

    enrichedListings.forEach((item) => {
      const activeClaim = item.claims && item.claims.length > 0 ? item.claims[0] : null;
      if (activeClaim) {
        if (item.status !== 'COMPLETED' && activeClaim.status !== 'COMPLETED') {
          if (activeClaim.deliveryStatus === 'UNASSIGNED') {
            unassignedDeliveriesCount++;
            if (item.urgency?.level === 'CRITICAL' || item.urgency?.level === 'HIGH') {
              criticalUnassignedDeliveriesCount++;
            }
          } else if (activeClaim.deliveryStatus === 'DRIVER_ASSIGNED') {
            assignedDeliveriesCount++;
          } else if (activeClaim.deliveryStatus === 'PICKUP_STARTED') {
            pickupStartedDeliveriesCount++;
          } else if (activeClaim.deliveryStatus === 'PICKED_UP') {
            pickedUpDeliveriesCount++;
          } else if (activeClaim.deliveryStatus === 'IN_TRANSIT') {
            inTransitDeliveriesCount++;
          }
        }
        if (activeClaim.deliveryStatus === 'DELIVERED' || activeClaim.status === 'COMPLETED') {
          deliveredDeliveriesCount++;
        }
      }
    });

    return NextResponse.json({
      stats: {
        totalFoodSaved: `${totalFoodSavedServings.toLocaleString()} servings`,
        totalActiveDonations: activeDonationsCount,
        totalDonations,
        totalClaims,
        activeUsers: users.length,
        donors: donorCount,
        receivers: receiverCount,
        admins: adminCount,
        volunteers: volunteerCount,
        activeVolunteers: activeVolunteerCount,
      },
      courierStats: {
        totalCouriers: volunteerCount,
        activeCouriers: activeVolunteerCount,
        unassignedDeliveries: unassignedDeliveriesCount,
        assignedDeliveries: assignedDeliveriesCount,
        pickupStartedDeliveries: pickupStartedDeliveriesCount,
        pickedUpDeliveries: pickedUpDeliveriesCount,
        inTransitDeliveries: inTransitDeliveriesCount,
        deliveredDeliveries: deliveredDeliveriesCount,
        criticalUnassignedDeliveries: criticalUnassignedDeliveriesCount,
      },
      urgencyStats: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        expiredCount,
      },
      listings: enrichedListings,
      users,
    });
  } catch (error: any) {
    console.error('Failed to fetch admin data:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching admin overview.' },
      { status: 500 }
    );
  }
}
