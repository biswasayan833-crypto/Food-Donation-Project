'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/services/audit.service';
import { sanitizeString, sanitizeUrl, getSafeErrorMessage } from '@/lib/security';

export interface CreateDonationResult {
  success?: boolean;
  listingId?: string;
  error?: string;
}

export async function createFoodDonation(
  prevState: any,
  formData: FormData
): Promise<CreateDonationResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { error: 'You must be signed in to donate food.' };
  }

  if (session.user.role !== 'DONOR' && session.user.role !== 'ADMIN') {
    return { error: 'Only registered Donors and Administrators are authorized to list food donations.' };
  }

  const rawTitle = (formData.get('title') as string)?.trim();
  const category = (formData.get('category') as string)?.trim().toUpperCase();
  const quantityValue = (formData.get('quantityValue') as string)?.trim();
  const quantityUnit = (formData.get('quantityUnit') as string)?.trim() || 'servings';
  const customQuantity = (formData.get('quantity') as string)?.trim();
  const expiryTimeInput = (formData.get('expiryTime') as string)?.trim();
  const rawLocationAddress = (formData.get('locationAddress') as string)?.trim();
  const rawSpecialInstructions = (formData.get('specialInstructions') as string)?.trim();
  const rawImageUrl = (formData.get('imageUrl') as string)?.trim() || null;

  // Food Safety Fields
  const temperatureControl = ((formData.get('temperatureControl') as string)?.trim().toUpperCase() || 'ROOM_TEMP');
  const prepTimestampInput = (formData.get('prepTimestamp') as string)?.trim();
  const safetyChecklistPassed = formData.get('safetyChecklistPassed') === 'true';

  // Combine quantity if separate value & unit provided
  const rawQuantity = customQuantity || (quantityValue ? `${quantityValue} ${quantityUnit}` : '');

  // Sanitize text inputs and validate bounds
  const title = sanitizeString(rawTitle, 120);
  const locationAddress = sanitizeString(rawLocationAddress, 255);
  const specialInstructions = rawSpecialInstructions ? sanitizeString(rawSpecialInstructions, 500) : null;
  const quantity = sanitizeString(rawQuantity, 60);
  const imageUrl = rawImageUrl ? sanitizeUrl(rawImageUrl) : null;

  // Form Validation
  if (!title || title.length < 3) {
    return { error: 'Please enter a valid food title (at least 3 characters).' };
  }

  const validCategories = ['COOKED', 'RAW', 'VEG', 'NON_VEG'];
  if (!category || !validCategories.includes(category)) {
    return { error: 'Please select a valid food category (Cooked, Raw, Veg, or Non-Veg).' };
  }

  const validTemperatures = ['ROOM_TEMP', 'REFRIGERATED', 'FROZEN'];
  if (!validTemperatures.includes(temperatureControl)) {
    return { error: 'Please select a valid temperature control method (Room Temp, Refrigerated, or Frozen).' };
  }

  if (!safetyChecklistPassed) {
    return { error: 'Food safety compliance acknowledgment is mandatory. All safety checks must be confirmed.' };
  }

  let prepTimestamp = new Date();
  if (prepTimestampInput) {
    const parsedPrep = new Date(prepTimestampInput);
    if (!isNaN(parsedPrep.getTime())) {
      if (parsedPrep.getTime() > Date.now() + 5 * 60 * 1000) {
        return { error: 'Preparation time cannot be set in the future.' };
      }
      prepTimestamp = parsedPrep;
    }
  }

  if (!quantity) {
    return { error: 'Please specify the quantity (e.g. 25 servings or 10 kg).' };
  }

  if (!expiryTimeInput) {
    return { error: 'Please specify a valid pickup expiry date & time.' };
  }

  const expiryTime = new Date(expiryTimeInput);
  if (isNaN(expiryTime.getTime())) {
    return { error: 'Invalid date/time format for expiry.' };
  }

  if (expiryTime.getTime() <= Date.now()) {
    return { error: 'Expiry time must be in the future.' };
  }

  if (!locationAddress || locationAddress.length < 5) {
    return { error: 'Please provide a complete pickup address.' };
  }

  try {
    const listing = await prisma.foodListing.create({
      data: {
        title,
        description: specialInstructions || null,
        quantity,
        foodType: category,
        imageUrl,
        temperatureControl,
        prepTimestamp,
        safetyChecklistPassed: true,
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

    revalidatePath('/donations');
    revalidatePath('/dashboard/donor');
    revalidatePath('/dashboard');
    revalidatePath('/listings');
    revalidatePath('/');

    return {
      success: true,
      listingId: listing.id,
    };
  } catch (err: any) {
    console.error('Failed to create food donation:', err);
    return {
      error: getSafeErrorMessage(err, 'An unexpected error occurred while saving the food donation.'),
    };
  }
}
