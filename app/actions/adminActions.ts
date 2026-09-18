'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/services/audit.service';
import { getSafeErrorMessage, validateId } from '@/lib/security';

const ALLOWED_ADMIN_ROLES = ['ADMIN', 'DONOR', 'RECEIVER', 'VOLUNTEER'];
const ALLOWED_LISTING_STATUSES = ['AVAILABLE', 'CLAIMED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'ADMIN') {
    throw new Error('Forbidden. Admin authorization required.');
  }
  return session;
}

export async function deleteListingByAdmin(listingId: string) {
  if (!listingId || typeof listingId !== 'string') {
    return { error: 'Invalid listing identifier.' };
  }

  try {
    const session = await verifyAdmin();

    await prisma.foodListing.delete({
      where: { id: listingId.trim() },
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'FOOD_LISTING',
      entityId: listingId,
      metadata: { operation: 'DELETE_LISTING' },
    });

    revalidatePath('/admin');
    revalidatePath('/donations');
    revalidatePath('/listings');
    revalidatePath('/');

    return { success: true };
  } catch (err: any) {
    return { error: getSafeErrorMessage(err, 'Failed to delete listing.') };
  }
}

export async function updateListingStatusByAdmin(listingId: string, status: string) {
  if (!listingId || typeof listingId !== 'string') {
    return { error: 'Invalid listing identifier.' };
  }

  const normalizedStatus = status?.toUpperCase()?.trim();
  if (!ALLOWED_LISTING_STATUSES.includes(normalizedStatus)) {
    return { error: `Invalid listing status. Allowed: ${ALLOWED_LISTING_STATUSES.join(', ')}` };
  }

  try {
    const session = await verifyAdmin();

    await prisma.foodListing.update({
      where: { id: listingId.trim() },
      data: { status: normalizedStatus },
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'FOOD_LISTING',
      entityId: listingId,
      metadata: { operation: 'UPDATE_LISTING_STATUS', newStatus: normalizedStatus },
    });

    revalidatePath('/admin');
    revalidatePath('/donations');
    revalidatePath('/listings');
    revalidatePath('/');

    return { success: true };
  } catch (err: any) {
    return { error: getSafeErrorMessage(err, 'Failed to update listing status.') };
  }
}

export async function deleteUserByAdmin(userId: string) {
  if (!userId || typeof userId !== 'string') {
    return { error: 'Invalid user identifier.' };
  }

  try {
    const session = await verifyAdmin();

    if (userId.trim() === session.user.id) {
      return { error: 'You cannot delete your own active admin account.' };
    }

    await prisma.user.delete({
      where: { id: userId.trim() },
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'USER',
      entityId: userId,
      metadata: { operation: 'DELETE_USER' },
    });

    revalidatePath('/admin');

    return { success: true };
  } catch (err: any) {
    return { error: getSafeErrorMessage(err, 'Failed to delete user.') };
  }
}

export async function updateUserRoleByAdmin(userId: string, role: string) {
  if (!userId || typeof userId !== 'string') {
    return { error: 'Invalid user identifier.' };
  }

  const normalizedRole = role?.toUpperCase()?.trim();
  if (!ALLOWED_ADMIN_ROLES.includes(normalizedRole)) {
    return { error: `Invalid user role. Allowed: ${ALLOWED_ADMIN_ROLES.join(', ')}` };
  }

  try {
    const session = await verifyAdmin();

    await prisma.user.update({
      where: { id: userId.trim() },
      data: { role: normalizedRole },
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'USER',
      entityId: userId,
      metadata: { operation: 'UPDATE_USER_ROLE', newRole: normalizedRole },
    });

    revalidatePath('/admin');

    return { success: true };
  } catch (err: any) {
    return { error: getSafeErrorMessage(err, 'Failed to update user role.') };
  }
}
