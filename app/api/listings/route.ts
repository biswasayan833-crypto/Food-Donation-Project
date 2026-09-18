import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeFoodUrgency } from '@/services/food-urgency.service';
import { logAuditEvent } from '@/services/audit.service';
import { sanitizeString, getSafeErrorMessage } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const foodType = searchParams.get('foodType');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const location = searchParams.get('location');
    const donorId = searchParams.get('donorId');

    const session = await getServerSession(authOptions);
    const requesterId = session?.user?.id;
    const requesterRole = session?.user?.role;
    const isAdmin = requesterRole === 'ADMIN';

    const where: any = {};

    // 1. Server-side donor scoping with strict authorization check
    if (donorId) {
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized. You must be signed in to query scoped donor listings.' },
          { status: 401 }
        );
      }

      if (requesterId !== donorId && !isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden. You are not authorized to view another donor listings.' },
          { status: 403 }
        );
      }

      where.donorId = donorId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (foodType && foodType !== 'ALL') {
      where.foodType = foodType.toUpperCase();
    }

    if (location) {
      where.locationAddress = { contains: location, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { locationAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const listings = await prisma.foodListing.findMany({
      where,
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            role: true,
            location: true,
            phone: true,
          },
        },
        claims: {
          include: {
            receiver: {
              select: {
                id: true,
                name: true,
                role: true,
                location: true,
                phone: true,
              },
            },
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const sortBy = searchParams.get('sortBy');
    const urgencyLevel = searchParams.get('urgencyLevel');

    // 2. Privacy filter: sanitize sensitive data and compute server-authoritative urgency
    const sanitizedListings = listings.map((item) => {
      const isDonorOwner = requesterId === item.donorId;
      const myClaim = requesterId ? item.claims.find((c) => c.receiverId === requesterId) : null;
      const isAssignedCourier = requesterId ? item.claims.some((c) => c.driverId === requesterId) : false;

      const hasPrivilegedAccess = isAdmin || isDonorOwner || Boolean(myClaim) || isAssignedCourier;

      // Authoritative operational urgency calculation
      const primaryClaim = item.claims && item.claims.length > 0 ? item.claims[0] : null;
      const urgency = computeFoodUrgency(item, primaryClaim);

      // Donor contact info: redact phone number for unprivileged discovery
      const donorData = {
        id: item.donor.id,
        name: item.donor.name,
        role: item.donor.role,
        location: item.donor.location,
        phone: hasPrivilegedAccess ? item.donor.phone : null,
      };

      // Claims info: redact all non-owned claim data
      let sanitizedClaims: any[] = [];
      if (isAdmin || isDonorOwner) {
        sanitizedClaims = item.claims;
      } else if (myClaim) {
        sanitizedClaims = [myClaim];
      } else if (isAssignedCourier) {
        sanitizedClaims = item.claims.filter((c) => c.driverId === requesterId);
      } else {
        sanitizedClaims = [];
      }

      return {
        ...item,
        donor: donorData,
        claims: sanitizedClaims,
        urgency,
      };
    });

    let finalListings = sanitizedListings;

    if (urgencyLevel) {
      finalListings = finalListings.filter(
        (l) => l.urgency.level.toUpperCase() === urgencyLevel.toUpperCase()
      );
    }

    if (sortBy === 'urgency') {
      finalListings.sort((a, b) => b.urgency.score - a.urgency.score);
    }

    return NextResponse.json({ listings: finalListings });
  } catch (error: any) {
    console.error('Failed to fetch listings:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching listings.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to create a food listing.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'DONOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Only registered Donors and Admins can create food listings.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      quantity,
      foodType,
      expiryTime,
      locationAddress,
      imageUrl,
      temperatureControl,
      prepTimestamp,
      safetyChecklistPassed,
    } = body;

    if (!title || !quantity || !foodType || !expiryTime || !locationAddress) {
      return NextResponse.json(
        { error: 'Please provide all required fields: title, quantity, foodType, expiryTime, locationAddress.' },
        { status: 400 }
      );
    }

    const cleanFoodType = foodType.toString().toUpperCase().trim();
    const validFoodTypes = ['VEG', 'NON_VEG', 'RAW', 'COOKED'];
    if (!validFoodTypes.includes(cleanFoodType)) {
      return NextResponse.json(
        { error: 'Invalid foodType. Must be VEG, NON_VEG, RAW, or COOKED.' },
        { status: 400 }
      );
    }

    const parsedExpiry = new Date(expiryTime);
    if (isNaN(parsedExpiry.getTime()) || parsedExpiry.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Invalid expiry time. Expiry date must be set in the future.' },
        { status: 400 }
      );
    }

    const listing = await prisma.foodListing.create({
      data: {
        title: sanitizeString(title, 200),
        description: description ? sanitizeString(description, 2000) : null,
        imageUrl: imageUrl ? sanitizeString(imageUrl, 500) : null,
        quantity: sanitizeString(quantity, 100),
        foodType: cleanFoodType,
        temperatureControl: temperatureControl ? sanitizeString(temperatureControl, 50) : 'ROOM_TEMP',
        prepTimestamp: prepTimestamp ? new Date(prepTimestamp) : new Date(),
        safetyChecklistPassed: safetyChecklistPassed === true || safetyChecklistPassed === 'true',
        expiryTime: parsedExpiry,
        locationAddress: sanitizeString(locationAddress, 300),
        status: 'AVAILABLE',
        donorId: session.user.id,
      },
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
      },
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: 'DONATION_CREATED',
      entityType: 'FOOD_LISTING',
      entityId: listing.id,
      metadata: {
        title: listing.title,
        foodType: listing.foodType,
        quantity: listing.quantity,
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create listing:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to create food listing.') },
      { status: 500 }
    );
  }
}
