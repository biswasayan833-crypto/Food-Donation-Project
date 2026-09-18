'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeString, getSafeErrorMessage } from '@/lib/security';
import { logAuditEvent } from '@/services/audit.service';

export async function createFoodListing(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'You must be signed in to donate food.' };
  }

  if (session.user.role !== 'DONOR' && session.user.role !== 'ADMIN') {
    return { error: 'Only registered Donors and Administrators are authorized to list food donations.' };
  }

  const rawTitle = formData.get('title') as string;
  const rawDescription = formData.get('description') as string;
  const rawFoodType = formData.get('foodType') as string;
  const rawQuantity = formData.get('quantity') as string;
  const rawExpiryHours = parseInt((formData.get('expiryHours') as string) || '12', 10);
  const rawLocationAddress = formData.get('locationAddress') as string;

  const title = sanitizeString(rawTitle, 120);
  const description = rawDescription ? sanitizeString(rawDescription, 500) : null;
  const foodType = sanitizeString(rawFoodType, 30).toUpperCase();
  const quantity = sanitizeString(rawQuantity, 60);
  const locationAddress = sanitizeString(rawLocationAddress, 255);

  if (!title || !foodType || !quantity || !locationAddress) {
    return { error: 'Please fill in all mandatory fields.' };
  }

  const expiryHours = isNaN(rawExpiryHours) || rawExpiryHours < 1 ? 12 : Math.min(rawExpiryHours, 168);

  try {
    const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const listing = await prisma.foodListing.create({
      data: {
        title,
        description,
        quantity,
        foodType,
        expiryTime,
        locationAddress,
        status: 'AVAILABLE',
        donorId: session.user.id,
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

    revalidatePath('/');
    revalidatePath('/listings');
    revalidatePath('/dashboard');

    return { success: true, listingId: listing.id };
  } catch (err: any) {
    console.error('Error creating listing:', err);
    return { error: getSafeErrorMessage(err, 'Failed to create listing.') };
  }
}
