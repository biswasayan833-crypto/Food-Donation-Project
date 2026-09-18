/**
 * FoodRescue Platform - Type Definitions
 */

// ==========================================
// 1. User Roles & Authentication
// ==========================================
export type UserRole = 'DONOR' | 'NGO' | 'VOLUNTEER' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  organizationName?: string; // For NGOs and Donors
  avatar?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// 2. Donation Status Finite State Machine (FSM)
// ==========================================
export type DonationStatus =
  | 'AVAILABLE'   // Created by Donor, visible to NGOs
  | 'CLAIMED'     // Claimed by an NGO
  | 'EN_ROUTE'    // Volunteer or NGO assigned and on their way to pick up
  | 'COLLECTED'   // Food picked up from donor
  | 'DELIVERED'   // Successfully handed over to beneficiary / NGO facility
  | 'EXPIRED';    // Shelf-life exceeded before claim/collection

/**
 * Finite State Machine Valid Transitions
 * Maps each state to the array of permissible next states.
 */
export const DONATION_STATUS_TRANSITIONS: Record<DonationStatus, readonly DonationStatus[]> = {
  AVAILABLE: ['CLAIMED', 'EXPIRED'],
  CLAIMED: ['EN_ROUTE', 'AVAILABLE', 'EXPIRED'], // Can revert back to AVAILABLE if claim is cancelled
  EN_ROUTE: ['COLLECTED', 'CLAIMED', 'EXPIRED'],
  COLLECTED: ['DELIVERED'],
  DELIVERED: [], // Terminal state
  EXPIRED: [],   // Terminal state
} as const;

/**
 * Validates whether a state transition is legal according to the FSM rules.
 */
export function isValidDonationStatusTransition(
  currentStatus: DonationStatus,
  nextStatus: DonationStatus
): boolean {
  const allowedNextStatuses = DONATION_STATUS_TRANSITIONS[currentStatus];
  return allowedNextStatuses.includes(nextStatus);
}

// ==========================================
// 3. Donation & Food Item Interfaces
// ==========================================
export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  zipCode?: string;
}

export type FoodType = 'COOKED' | 'RAW' | 'PACKAGED' | 'BAKERY' | 'PRODUCE' | 'OTHER';

export interface FoodDonation {
  id: string;
  donorId: string;
  title: string;
  description: string;
  foodType: FoodType;
  quantity: number;
  unit: 'KGS' | 'SERVINGS' | 'ITEMS' | 'BOXES';
  expiryDate: Date;
  preparedAt?: Date;
  status: DonationStatus;
  pickupLocation: GeoLocation;
  claimedByNgoId?: string;
  assignedVolunteerId?: string;
  imageUrl?: string;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// 4. Standard API Response Interfaces
// ==========================================
export interface ApiResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  errors?: ApiErrorDetail[];
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

// ==========================================
// 5. Socket.IO Real-Time Event Interfaces
// ==========================================
export interface ServerToClientEvents {
  'donation:created': (donation: FoodDonation) => void;
  'donation:status_changed': (data: {
    donationId: string;
    previousStatus: DonationStatus;
    newStatus: DonationStatus;
    updatedBy: { id: string; role: UserRole };
    timestamp: string;
  }) => void;
  'donation:claimed': (data: { donationId: string; ngoId: string }) => void;
  'volunteer:location_update': (data: {
    volunteerId: string;
    donationId: string;
    location: GeoLocation;
  }) => void;
  'notification:broadcast': (notification: {
    title: string;
    message: string;
    type: 'INFO' | 'ALERT' | 'SUCCESS';
    timestamp: string;
  }) => void;
}

export interface ClientToServerEvents {
  'join:room': (roomId: string) => void;
  'leave:room': (roomId: string) => void;
  'volunteer:update_location': (data: {
    donationId: string;
    location: GeoLocation;
  }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
  role?: UserRole;
}
