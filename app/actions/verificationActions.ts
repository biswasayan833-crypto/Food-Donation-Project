'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/services/notification.service';
import { logAuditEvent } from '@/services/audit.service';
import { getSafeErrorMessage } from '@/lib/security';

export interface VerificationResult {
  success?: boolean;
  error?: string;
  claim?: {
    id: string;
    qrCodeSecret: string | null;
    status: string;
    deliveryStatus: string;
    deliveredAt: Date | null;
    foodListing: {
      id: string;
      title: string;
      quantity: string;
      foodType: string;
      locationAddress: string;
      donor: {
        name: string;
        phone: string | null;
      };
    };
    receiver: {
      name: string;
      location: string | null;
      phone: string | null;
    };
    driver?: {
      name: string;
      phone: string | null;
    } | null;
  };
}

export async function verifyPickupQRCode(rawSecret: string): Promise<VerificationResult> {
  const secret = rawSecret?.trim();

  if (!secret || secret.length < 5) {
    return { error: 'Please enter or scan a valid pickup QR code token.' };
  }

  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Graceful fallback when executed outside active HTTP request scope (e.g. automated test suites)
  }

  try {
    const claim = await prisma.claim.findFirst({
      where: {
        qrCodeSecret: secret,
      },
      include: {
        foodListing: {
          include: {
            donor: {
              select: {
                id: true,
                name: true,
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
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!claim) {
      return { error: 'Invalid QR code token. No matching food donation claim was found.' };
    }

    if (claim.deliveryStatus === 'DELIVERED' || claim.status === 'COMPLETED') {
      const deliveredTime = claim.deliveredAt ? new Date(claim.deliveredAt).toLocaleString() : 'previously';
      return {
        error: `This food donation has already been verified and delivered (${deliveredTime}).`,
      };
    }

    const now = new Date();

    // Determine driver assignment if session user is volunteer and claim was unassigned
    let assignedDriverId = claim.driverId;
    if (!assignedDriverId && session?.user && session.user.role === 'VOLUNTEER') {
      assignedDriverId = session.user.id;
    } else if (assignedDriverId && session?.user && session.user.role === 'VOLUNTEER' && session.user.id !== assignedDriverId) {
      return { error: 'Forbidden. You are not the assigned courier for this delivery.' };
    }

    // Atomically complete transfer
    const [updatedClaim] = await prisma.$transaction([
      prisma.claim.update({
        where: { id: claim.id },
        data: {
          deliveryStatus: 'DELIVERED',
          status: 'COMPLETED',
          deliveredAt: now,
          driverId: assignedDriverId,
        },
        include: {
          foodListing: {
            include: {
              donor: {
                select: {
                  id: true,
                  name: true,
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
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
      prisma.foodListing.update({
        where: { id: claim.foodListingId },
        data: {
          status: 'DELIVERED',
        },
      }),
    ]);

    await logAuditEvent({
      actorId: session?.user?.id || null,
      action: 'QR_VERIFIED',
      entityType: 'CLAIM',
      entityId: claim.id,
      metadata: {
        foodListingId: claim.foodListingId,
        receiverId: claim.receiverId,
        driverId: claim.driverId,
      },
    });

    // Dispatch delivery completion notifications
    const listingTitle = claim.foodListing.title;
    const donorId = claim.foodListing.donor?.id;
    const receiverId = claim.receiverId;

    if (donorId) {
      await createNotification({
        userId: donorId,
        eventType: 'DELIVERY_COMPLETED',
        title: '🎉 Delivery Verified & Completed',
        message: `Your food donation "${listingTitle}" has been verified and delivered to ${claim.receiver?.name || 'the recipient'}!`,
        claimId: claim.id,
        foodListingId: claim.foodListingId,
      });
    }

    if (receiverId) {
      await createNotification({
        userId: receiverId,
        eventType: 'DELIVERY_COMPLETED',
        title: '✓ Delivery Completed',
        message: `Donation "${listingTitle}" intake verified. Enjoy serving your community!`,
        claimId: claim.id,
        foodListingId: claim.foodListingId,
      });
    }

    if (assignedDriverId) {
      await createNotification({
        userId: assignedDriverId,
        eventType: 'DELIVERY_COMPLETED',
        title: '⭐ Delivery Transfer Verified',
        message: `Drop-off verified for "${listingTitle}". Thank you for your volunteer courier service!`,
        claimId: claim.id,
        foodListingId: claim.foodListingId,
      });
    }

    try {
      revalidatePath('/donations');
      revalidatePath('/dashboard/receiver');
      revalidatePath('/dashboard/donor');
      revalidatePath('/dashboard/driver');
      revalidatePath('/dashboard');
      revalidatePath('/admin');
      revalidatePath('/');
    } catch {
      // Ignored outside Next.js request context
    }

    return {
      success: true,
      claim: updatedClaim,
    };
  } catch (err: any) {
    console.error('Failed to verify QR pickup token:', err);
    return {
      error: getSafeErrorMessage(err, 'An unexpected error occurred during QR verification.'),
    };
  }
}

export { verifyPickupQRCode as verifyDeliveryHandoverToken };

