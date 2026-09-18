'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  MapPin,
  Phone,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Package,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  X,
  Award,
  Activity,
  Timer,
} from 'lucide-react';
import { CategoryBadge } from '@/components/CategoryBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { RecommendedReceivers } from '@/components/RecommendedReceivers';
import { RecommendedDrivers } from '@/components/RecommendedDrivers';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { LiveTrackingCard } from '@/components/LiveTrackingCard';
import TrustScoreCard from '@/components/TrustScoreCard';
import ReportIncidentModal from '@/components/ReportIncidentModal';

export default function DonorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingClaimId, setUpdatingClaimId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'CLAIMED' | 'DELIVERED'>('ALL');
  const [matchingListing, setMatchingListing] = useState<any | null>(null);
  const [dispatchingListing, setDispatchingListing] = useState<any | null>(null);
  const [trackingListing, setTrackingListing] = useState<any | null>(null);
  const [donorAnalytics, setDonorAnalytics] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchDonorData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [resListings, resAnalytics] = await Promise.all([
        fetch(`/api/listings?donorId=${encodeURIComponent(session.user.id)}&status=ALL`),
        fetch(`/api/analytics?range=30D`),
      ]);

      const data = await resListings.json();
      if (data.listings) {
        setListings(data.listings);
      }

      if (resAnalytics.ok) {
        const analyticsJson = await resAnalytics.json();
        setDonorAnalytics(analyticsJson.analytics);
      }
    } catch (err) {
      console.error('Failed to load donor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchDonorData();
    }
  }, [session?.user?.id]);

  const handleUpdateClaim = async (claimId: string, newStatus: string) => {
    setUpdatingClaimId(claimId);
    try {
      const res = await fetch('/api/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update claim status.');
      } else {
        await fetchDonorData();
      }
    } catch (err: any) {
      alert(err.message || 'Error updating claim.');
    } finally {
      setUpdatingClaimId(null);
    }
  };

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Donor Portal Sign In</h2>
        <p className="text-xs text-slate-500 mt-2 mb-8">
          Please sign in to access your active food listings and track claimed donations.
        </p>
        <Link
          href="/auth/signin?callbackUrl=/dashboard/donor"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-all"
        >
          <span>Sign In / Demo Donor Login</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Derived statistics
  const totalListings = listings.length;
  const activeListings = listings.filter((item) => item.status === 'AVAILABLE');
  const claimedListings = listings.filter((item) => item.status === 'CLAIMED');
  const deliveredListings = listings.filter((item) => item.status === 'DELIVERED');

  // Extract all claims for donor's listings
  const allClaimedItems: any[] = [];
  listings.forEach((listing) => {
    if (listing.claims && listing.claims.length > 0) {
      listing.claims.forEach((claim: any) => {
        allClaimedItems.push({
          ...claim,
          listing,
        });
      });
    }
  });

  const filteredListings =
    statusFilter === 'ALL'
      ? listings
      : listings.filter((item) => item.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Donor Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Building2 className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Donor Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Verified Donor
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Welcome back, <strong className="text-slate-800">{session?.user.name}</strong> •{' '}
              {session?.user.location || 'New York, NY'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/donations/create"
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Food Listing</span>
          </Link>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-3 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Report Dispute</span>
          </button>

          <button
            onClick={fetchDonorData}
            title="Refresh Listings"
            className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Donations
          </span>
          <p className="text-3xl font-black text-slate-900 mt-1">{totalListings}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Lifetime posted surplus</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Active / Available
          </span>
          <p className="text-3xl font-black text-emerald-600 mt-1">{activeListings.length}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Ready for NGO pickup</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Claimed Items
          </span>
          <p className="text-3xl font-black text-amber-600 mt-1">{claimedListings.length}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Reserved by charities</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Completed Deliveries
          </span>
          <p className="text-3xl font-black text-blue-600 mt-1">{deliveredListings.length}</p>
          <span className="text-[11px] text-blue-600 mt-0.5 block">Delivered & distributed</span>
        </div>
      </div>

      {/* Donor Personal Impact & Speed Card */}
      {donorAnalytics && (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-3xl p-6 text-white shadow-sm space-y-4 border border-emerald-700/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-6 h-6 text-emerald-300" />
              <div>
                <span className="text-xs font-black tracking-wide uppercase text-emerald-300">
                  Your Personal Donor Impact & Rescue Velocity
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {donorAnalytics.impactScore?.tier === 'EXCELLENT'
                    ? 'Outstanding Community Preservation'
                    : 'Verified Food Rescue Contributions'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-black/25 px-4 py-2 rounded-2xl border border-white/10 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-emerald-200/80 uppercase font-bold block">
                  Donor Impact Score
                </span>
                <span className="text-2xl font-black text-emerald-300">
                  {donorAnalytics.impactScore?.overallScore || 90}
                </span>
                <span className="text-xs text-white/60 font-semibold">/100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-emerald-200 block mb-0.5">Rescued Servings</span>
              <span className="text-2xl font-black text-white">
                {donorAnalytics.primaryKpis.rescuedServings?.toLocaleString() || '0'}
              </span>
              <span className="text-[10px] text-emerald-200/80 block mt-0.5">Meal portions saved</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-emerald-200 block mb-0.5">Rescue Success</span>
              <span className="text-2xl font-black text-emerald-300">
                {donorAnalytics.primaryKpis.rescueSuccessRate || '100%'}
              </span>
              <span className="text-[10px] text-emerald-200/80 block mt-0.5">Food preserved ratio</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-emerald-200 block mb-0.5">Avg Claim Speed</span>
              <span className="text-2xl font-black text-amber-300">
                {donorAnalytics.primaryKpis.avgClaimSpeed || '< 1 hour'}
              </span>
              <span className="text-[10px] text-emerald-200/80 block mt-0.5">Receiver pickup response</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-emerald-200 block mb-0.5">Completed Donors</span>
              <span className="text-2xl font-black text-sky-300">
                {donorAnalytics.primaryKpis.completedDonations || 0}
              </span>
              <span className="text-[10px] text-emerald-200/80 block mt-0.5">Handovers completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Donor Trust & Reputation Profile */}
      {session?.user?.id && (
        <TrustScoreCard userId={session.user.id} />
      )}

      {/* Section 1: Claimed Food Items & Real-Time Status Updates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
              <Truck className="w-4 h-4" />
              <span>Claimed Food Items & Fulfillment</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Status Updates on Claimed Food
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {allClaimedItems.length} Reserved
          </span>
        </div>

        {allClaimedItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/90 shadow-2xs">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Claimed Donations Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              When a local NGO or shelter reserves your posted food surplus, their pickup request and
              status updates will appear right here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {allClaimedItems.map((claim) => (
              <div
                key={claim.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 hover:border-amber-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryBadge foodType={claim.listing?.foodType} size="sm" />
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Claim #{claim.id.slice(-6)}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {claim.listing?.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quantity: <strong className="text-slate-800">{claim.listing?.quantity}</strong> • Pickup:{' '}
                      {claim.listing?.locationAddress}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        claim.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : claim.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {claim.status === 'PENDING' && '⏳ PENDING APPROVAL'}
                      {claim.status === 'APPROVED' && '🚚 APPROVED FOR PICKUP'}
                      {claim.status === 'COMPLETED' && '✓ COMPLETED / DELIVERED'}
                    </span>
                  </div>
                </div>

                {/* Receiver Info & Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5">Claimed By (Receiver)</span>
                    <p className="text-slate-900 font-bold">
                      {claim.receiver?.name || 'Registered Charity'}
                    </p>
                    <p className="text-slate-500">{claim.receiver?.location || 'New York, NY'}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5">Contact Phone</span>
                    <p className="text-slate-800 font-medium">
                      {claim.receiver?.phone || '+1 (555) 345-6789'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5">Claim Timestamp</span>
                    <p className="text-slate-700">
                      {new Date(claim.createdAt).toLocaleDateString()} at{' '}
                      {new Date(claim.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Donor Action Controls */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-3">
                  <div className="flex items-center gap-2">
                    {claim.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateClaim(claim.id, 'APPROVED')}
                        disabled={updatingClaimId === claim.id}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        {updatingClaimId === claim.id ? 'Updating...' : 'Approve Pickup Request'}
                      </button>
                    )}

                    {claim.status === 'APPROVED' && (
                      <button
                        onClick={() => handleUpdateClaim(claim.id, 'COMPLETED')}
                        disabled={updatingClaimId === claim.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        {updatingClaimId === claim.id ? 'Updating...' : 'Confirm Handover & Complete'}
                      </button>
                    )}

                    {claim.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Handover Confirmed • Delivered
                      </span>
                    )}

                    {claim.status !== 'COMPLETED' && (
                      <button
                        onClick={() => setDispatchingListing(claim.listing)}
                        className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        <span>{claim.driverId ? 'Courier Assigned' : 'Dispatch Courier'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setTrackingListing({ id: claim.foodListingId, title: claim.listing?.title || 'Claimed Food Item' })}
                      className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Live Tracking</span>
                    </button>
                  </div>

                  <Link
                    href={`/donations/${claim.foodListingId}`}
                    className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                  >
                    <span>View Public Listing</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Active Listings Posted by Donor */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              <Package className="w-4 h-4" />
              <span>Surplus Inventory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Food Listings
            </h2>
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['ALL', 'AVAILABLE', 'CLAIMED', 'DELIVERED'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === filterKey
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filterKey === 'ALL' ? 'All' : filterKey.charAt(0) + filterKey.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse p-4"
              />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs">
            <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Listings in this View</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Post fresh surplus food to start connecting with local food shelters.
            </p>
            <Link
              href="/donations/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Food Listing</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((item) => {
              const expiry = new Date(item.expiryTime);
              const now = new Date();
              const diffMs = expiry.getTime() - now.getTime();
              const diffHours = Math.round(diffMs / (1000 * 60 * 60));
              const isExpired = diffMs <= 0;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge foodType={item.foodType} size="sm" />
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'CLAIMED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.status}
                      </span>
                      <UrgencyBadge urgency={item.urgency} listing={item} size="sm" showScore={true} showTime={true} />
                    </div>

                    <Link
                      href={`/donations/${item.id}`}
                      className="font-bold text-slate-900 hover:text-emerald-600 text-base transition-colors"
                    >
                      {item.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Quantity: <strong className="text-slate-800">{item.quantity}</strong>
                      </span>
                      <span>
                        Location: <span className="text-slate-700">{item.locationAddress}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {isExpired
                          ? 'Expired'
                          : `Expires in ${diffHours > 0 ? diffHours : 0} hrs (${expiry.toLocaleDateString()})`}
                      </span>
                    </div>

                    {item.urgency?.recommendedAction && item.status === 'AVAILABLE' && (
                      <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 pt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Pickup Advice: {item.urgency.recommendedAction}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {item.status === 'AVAILABLE' && (
                      <button
                        onClick={() => setMatchingListing(item)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Smart Matches</span>
                      </button>
                    )}

                    {item.status === 'CLAIMED' && (
                      <>
                        <button
                          onClick={() => setDispatchingListing(item)}
                          className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5 text-sky-600" />
                          <span>Dispatch Courier</span>
                        </button>
                        <button
                          onClick={() => setTrackingListing(item)}
                          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/80 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5 text-purple-600" />
                          <span>Live Tracking</span>
                        </button>
                      </>
                    )}

                    <Link
                      href={`/donations/${item.id}`}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Smart Matching Modal */}
      {matchingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Intelligent Donation Matching
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Matches for &quot;{matchingListing.title}&quot;
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {matchingListing.quantity} • {matchingListing.locationAddress}
                </p>
              </div>
              <button
                onClick={() => setMatchingListing(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RecommendedReceivers
              listingId={matchingListing.id}
              onMatched={() => {
                fetchDonorData();
              }}
            />
          </div>
        </div>
      )}

      {/* Smart Volunteer Courier Dispatch Modal */}
      {dispatchingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                  Volunteer Courier Dispatch
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Couriers for &quot;{dispatchingListing.title}&quot;
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dispatchingListing.quantity} • {dispatchingListing.locationAddress}
                </p>
              </div>
              <button
                onClick={() => setDispatchingListing(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RecommendedDrivers
              listingId={dispatchingListing.id}
              onAssigned={() => {
                fetchDonorData();
              }}
            />
          </div>
        </div>
      )}

      {/* Live Delivery Tracking Modal */}
      {trackingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                  Real-Time Courier Telemetry
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Delivery Tracking: &quot;{trackingListing.title || 'Donation'}&quot;
                </h3>
              </div>
              <button
                onClick={() => setTrackingListing(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <LiveTrackingCard listingId={trackingListing.id} initialExpanded={true} />
          </div>
        </div>
      )}

      {/* Report Dispute Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => {
          fetchDonorData();
        }}
      />
    </div>
  );
}
