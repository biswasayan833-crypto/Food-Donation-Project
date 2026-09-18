'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  Phone,
  Lock,
  Calendar,
  Layers,
  ChevronRight,
  ArrowRight,
  Thermometer,
  Snowflake,
  ExternalLink,
  Navigation,
  Share2,
} from 'lucide-react';
import { CategoryBadge } from '@/components/CategoryBadge';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { claimFoodDonation } from '@/app/actions/claimFoodActions';
import { useToast } from '@/components/Toast';
import { RecommendedReceivers } from '@/components/RecommendedReceivers';
import { RecommendedDrivers } from '@/components/RecommendedDrivers';
import { LiveTrackingCard } from '@/components/LiveTrackingCard';

const DEFAULT_FOOD_PHOTOS: Record<string, string> = {
  COOKED: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  VEG: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  RAW: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80',
  NON_VEG: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80',
};

export default function DonationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { showToast } = useToast();
  const listingId = params?.id as string;

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchListing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/listings?status=ALL');
      const data = await res.json();
      if (data.listings) {
        const found = data.listings.find((item: any) => item.id === listingId);
        setListing(found || null);
      }
    } catch (err) {
      console.error('Failed to load listing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  const handleClaim = () => {
    setErrorMessage('');
    setSuccessMessage('');

    startTransition(async () => {
      const res = await claimFoodDonation(listingId);

      if (res.error) {
        setErrorMessage(res.error);
        showToast(res.error, 'error');
      } else if (res.success) {
        showToast('Food donation reserved successfully! Status: PENDING', 'success');
        setSuccessMessage('You have successfully claimed this food donation! Status is now PENDING.');
        setListing((prev: any) => (prev ? { ...prev, status: 'CLAIMED' } : prev));
      }
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-semibold">Loading donation details & photo...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Food Listing Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
          This donation may have been removed or already delivered.
        </p>
        <Link
          href="/donations"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Available Donations</span>
        </Link>
      </div>
    );
  }

  const expiry = new Date(listing.expiryTime);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const isUrgent = diffHours > 0 && diffHours <= 6;
  const isExpired = diffMs <= 0;

  const isReceiver = session?.user?.role === 'RECEIVER' || session?.user?.role === 'ADMIN';
  const isDonor = session?.user?.role === 'DONOR';
  const isAuthorizedToMatch = session && (session.user.id === listing.donorId || session.user.role === 'ADMIN');

  const existingClaim = listing.claims && listing.claims.length > 0 ? listing.claims[0] : null;
  const isClaimedByCurrentReceiver = session && existingClaim && existingClaim.receiverId === session.user.id;

  const foodPhoto = listing.imageUrl || DEFAULT_FOOD_PHOTOS[listing.foodType] || DEFAULT_FOOD_PHOTOS.COOKED;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    listing.locationAddress
  )}`;

  return (
    <div className="pb-24 lg:pb-12">
      {/* 1. Full-Bleed Hero Banner Header */}
      <div className="relative w-full min-h-[380px] sm:min-h-[440px] bg-slate-950 overflow-hidden flex flex-col justify-between">
        {/* Background Food Photography */}
        <Image
          src={foodPhoto}
          alt={listing.title}
          fill
          priority
          unoptimized
          className="object-cover opacity-65"
        />

        {/* Multi-layer Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/50" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent to-slate-950/70" />

        {/* Top Navbar Back Navigation */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center justify-between">
            <Link
              href="/donations"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/15 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Donations</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Listing link copied to clipboard!', 'success');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer"
              title="Share listing"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Hero Title & Status Badges */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge foodType={listing.foodType} size="md" />

            {listing.temperatureControl && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white backdrop-blur-md border border-white/25 shadow-xs">
                {listing.temperatureControl === 'REFRIGERATED' ? (
                  <>
                    <Snowflake className="w-3.5 h-3.5 text-blue-300" />
                    <span>Chilled (1°C - 4°C)</span>
                  </>
                ) : listing.temperatureControl === 'FROZEN' ? (
                  <>
                    <Snowflake className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Deep Frozen (-18°C)</span>
                  </>
                ) : (
                  <>
                    <Thermometer className="w-3.5 h-3.5 text-amber-300" />
                    <span>Ambient Storage</span>
                  </>
                )}
              </span>
            )}

            {listing.safetyChecklistPassed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Safety Checklist Verified</span>
              </span>
            )}

            <UrgencyBadge urgency={listing.urgency} listing={listing} size="md" showScore={true} showTime={true} />

            <span
              className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                listing.status === 'AVAILABLE'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : listing.status === 'CLAIMED'
                  ? 'bg-amber-500 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {listing.status === 'AVAILABLE'
                ? '● READY FOR RESCUE'
                : listing.status === 'CLAIMED'
                ? '⏳ CLAIMED / IN LOGISTICS'
                : '✓ DELIVERED'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl drop-shadow-sm">
            {listing.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-300 pt-1">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>
                Donor: <strong className="text-white">{listing.donor?.name || 'Verified Food Donor'}</strong>
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Posted {new Date(listing.createdAt).toLocaleDateString()}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">{listing.quantity}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Details, Hygiene Notes & Map Preview */}
          <div className="lg:col-span-8 space-y-6">
            {/* AI Smart Match Recommended Receivers for Authorized Donors & Admins */}
            {isAuthorizedToMatch && listing.status === 'AVAILABLE' && (
              <RecommendedReceivers listingId={listingId} onMatched={fetchListing} />
            )}

            {/* Smart Volunteer Courier Dispatch for Authorized Donors & Admins */}
            {isAuthorizedToMatch && (listing.status === 'CLAIMED' || Boolean(existingClaim)) && (
              <RecommendedDrivers listingId={listingId} onAssigned={fetchListing} />
            )}

            {/* Live Delivery Telemetry & Milestones Tracking */}
            {session && (listing.status === 'CLAIMED' || Boolean(existingClaim)) && (
              <LiveTrackingCard listingId={listingId} />
            )}

            {/* Description & Handling Notes */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Food Description & Handling Notes
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {listing.description ||
                  'Prepared fresh and packaged according to food rescue safety standards. Suitable for immediate consumption or distribution by partner charities.'}
              </p>
            </div>

            {/* Interactive Map Preview Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pickup Location & Route Navigation
                </h3>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Map Preview Graphic */}
              <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-emerald-50 to-slate-200 opacity-80" />

                {/* Decorative Map Grid & Pin */}
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 animate-bounce">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm sm:text-base max-w-md">
                      {listing.locationAddress}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Coordinates verified for courier pickup and NGO intake
                    </p>
                  </div>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Driving Directions</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Donor Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Donor Contact & Verification
              </h3>
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Donor Name</span>
                  <p className="text-slate-900 font-bold text-sm">{listing.donor?.name}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Location Region</span>
                  <p className="text-slate-700 font-medium">{listing.donor?.location || 'New York, NY'}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Phone Number</span>
                  <p className="text-slate-700 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{listing.donor?.phone || '+1 (555) 234-5678'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quantity Summary & Desktop Claim Action */}
          <div className="lg:col-span-4 space-y-6 sticky top-24">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Available Quantity
                </span>
                <p className="text-3xl font-black text-slate-900 mt-0.5">{listing.quantity}</p>
              </div>

              {/* Expiry Pill */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  isUrgent
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">
                    {isExpired
                      ? 'Listing Expired'
                      : isUrgent
                      ? 'Urgent Pickup Required (< 6 hrs)'
                      : 'Safe Pickup Window'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-90">
                    {isExpired
                      ? 'Food has passed its freshness cutoff.'
                      : `Expires ${expiry.toLocaleDateString()} at ${expiry.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                  </p>
                </div>
              </div>

              {/* Preparation Timestamp Card */}
              {listing.prepTimestamp && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3 text-xs">
                  <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800">Preparation Timestamp</p>
                    <p className="text-slate-500 mt-0.5">
                      Prepared on {new Date(listing.prepTimestamp).toLocaleDateString()} at{' '}
                      {new Date(listing.prepTimestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Error or Success alerts */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Role-Based Claim Action Section */}
              <div className="pt-2 border-t border-slate-100">
                {authStatus === 'unauthenticated' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed flex items-start gap-2">
                      <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                      <div>
                        <strong>Receiver Access Required:</strong> Sign in with a registered NGO /
                        Receiver account to claim this food donation.
                      </div>
                    </div>
                    <Link
                      href={`/auth/signin?callbackUrl=/donations/${listingId}`}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <span>Sign In to Claim</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {authStatus === 'authenticated' && isDonor && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span>Logged In as Food Donor</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Food claiming is reserved for registered non-profit Receivers and charities.
                    </p>
                    <Link
                      href="/dashboard/donor"
                      className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700 hover:underline pt-1"
                    >
                      <span>Open Donor Dashboard</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {authStatus === 'authenticated' && isReceiver && (
                  <div>
                    {listing.status === 'AVAILABLE' ? (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleClaim}
                          disabled={isPending || isExpired}
                          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Reserving Food Donation...</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-4 h-4" />
                              <span>Claim Food Donation</span>
                            </>
                          )}
                        </button>
                        <p className="text-[11px] text-slate-400 text-center">
                          Reserves this surplus batch and generates QR pickup token.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          <span>Food Item Reserved (Claimed)</span>
                        </div>
                        <p className="text-xs text-amber-700">
                          {isClaimedByCurrentReceiver
                            ? 'You have claimed this donation. Please arrange pickup with the donor.'
                            : 'This donation has already been claimed by another registered charity.'}
                        </p>
                        <Link
                          href="/dashboard/receiver"
                          className="inline-flex items-center gap-1 font-bold text-amber-800 hover:underline text-xs pt-1"
                        >
                          <span>View in Receiver Dashboard</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Food Safety Guarantee */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Good Samaritan Act Protection</span>
                </div>
                <p className="leading-relaxed">
                  All food rescues follow verified hygiene standards ensuring safety for both donors
                  and recipient communities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mobile Sticky Bottom Claim Bar (Visible only on mobile/tablet) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 lg:hidden shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Available Quantity</p>
            <p className="text-base font-black text-slate-900">{listing.quantity}</p>
          </div>

          {authStatus === 'unauthenticated' ? (
            <Link
              href={`/auth/signin?callbackUrl=/donations/${listingId}`}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md"
            >
              Sign In to Claim
            </Link>
          ) : authStatus === 'authenticated' && isReceiver && listing.status === 'AVAILABLE' ? (
            <button
              type="button"
              onClick={handleClaim}
              disabled={isPending || isExpired}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <span>Reserving...</span>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  <span>Claim Now</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-500">
              {listing.status === 'AVAILABLE' ? 'Donor Account' : 'Claimed'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
