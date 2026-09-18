'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UtensilsCrossed,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Building2,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  PackageCheck,
  Calendar,
  QrCode,
  Copy,
  Check,
  X,
  ShieldCheck,
  Award,
  Sparkles,
  HeartHandshake,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { CategoryBadge } from '@/components/CategoryBadge';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { useToast } from '@/components/Toast';
import { LiveTrackingCard } from '@/components/LiveTrackingCard';
import TrustScoreCard from '@/components/TrustScoreCard';
import ReportIncidentModal from '@/components/ReportIncidentModal';

export default function ReceiverDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingClaimId, setUpdatingClaimId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED'>('ALL');
  const [selectedQRClaim, setSelectedQRClaim] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedTrackingClaimId, setSelectedTrackingClaimId] = useState<string | null>(null);
  const [receiverAnalytics, setReceiverAnalytics] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchReceiverData = async () => {
    setLoading(true);
    try {
      const [resListings, resAnalytics] = await Promise.all([
        fetch('/api/listings?status=ALL'),
        fetch('/api/analytics?range=30D'),
      ]);

      const data = await resListings.json();
      if (data.listings) {
        const myClaims: any[] = [];
        data.listings.forEach((listing: any) => {
          if (listing.claims && listing.claims.length > 0) {
            listing.claims.forEach((claim: any) => {
              // Only include claims by this receiver (or all if admin)
              if (!session?.user?.id || claim.receiverId === session.user.id || session.user.role === 'ADMIN') {
                myClaims.push({
                  ...claim,
                  foodListing: listing,
                });
              }
            });
          }
        });
        setClaims(myClaims);
      }

      if (resAnalytics.ok) {
        const analyticsJson = await resAnalytics.json();
        setReceiverAnalytics(analyticsJson.analytics);
      }
    } catch (err) {
      console.error('Failed to load receiver claims:', err);
      showToast('Failed to load claimed donations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchReceiverData();
    }
  }, [session]);

  const handleMarkAsCompleted = async (claimId: string, itemTitle: string) => {
    setUpdatingClaimId(claimId);
    try {
      const res = await fetch('/api/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          status: 'COMPLETED',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update claim status.', 'error');
      } else {
        showToast(`"${itemTitle}" marked as Received & Completed!`, 'success');
        await fetchReceiverData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error marking donation as completed.', 'error');
    } finally {
      setUpdatingClaimId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(true);
    showToast('Pickup QR token copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading your claims...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Receiver Portal Sign In</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-8">
          Sign in to track your claimed surplus items, coordinate pickups, and mark donations as received.
        </p>
        <Link
          href="/auth/signin?callbackUrl=/dashboard/receiver"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition-all"
        >
          <span>Sign In / Demo NGO Login</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Summary Metrics
  const totalClaims = claims.length;
  const pendingClaims = claims.filter((c) => c.status === 'PENDING').length;
  const approvedClaims = claims.filter((c) => c.status === 'APPROVED').length;
  const completedClaims = claims.filter((c) => c.status === 'COMPLETED').length;

  const filteredClaims =
    statusFilter === 'ALL'
      ? claims
      : claims.filter((c) => c.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Users className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Receiver Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                NGO / Community Receiver
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Welcome back, <strong className="text-slate-800">{session?.user?.name}</strong> •{' '}
              {session?.user?.location || 'New York, NY'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/donations"
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Browse Available Food</span>
          </Link>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-3 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Report Dispute</span>
          </button>

          <button
            onClick={fetchReceiverData}
            title="Refresh Claims"
            className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Claimed
          </span>
          <p className="text-3xl font-black text-slate-900 mt-1">{totalClaims}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Lifetime reserved batches</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Pending Approval
          </span>
          <p className="text-3xl font-black text-amber-600 mt-1">{pendingClaims}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Awaiting donor review</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Ready for Pickup
          </span>
          <p className="text-3xl font-black text-blue-600 mt-1">{approvedClaims}</p>
          <span className="text-[11px] text-blue-600 mt-0.5 block">Approved by donors</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Received & Served
          </span>
          <p className="text-3xl font-black text-emerald-600 mt-1">{completedClaims}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Delivered to community</span>
        </div>
      </div>

      {/* Receiver Community Impact & Intake Efficiency Card */}
      {receiverAnalytics && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-sm space-y-4 border border-blue-700/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-700/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-6 h-6 text-blue-300" />
              <div>
                <span className="text-xs font-black tracking-wide uppercase text-blue-300">
                  Community Intake & Response Velocity
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Verified Receiver Relief Performance
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-black/25 px-4 py-2 rounded-2xl border border-white/10 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-blue-200/80 uppercase font-bold block">
                  Intake Impact Score
                </span>
                <span className="text-2xl font-black text-blue-300">
                  {receiverAnalytics.impactScore?.overallScore || 88}
                </span>
                <span className="text-xs text-white/60 font-semibold">/100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-blue-200 block mb-0.5">Meals Secured</span>
              <span className="text-2xl font-black text-white">
                {receiverAnalytics.primaryKpis.mealsSecured?.toLocaleString() || '0'}
              </span>
              <span className="text-[10px] text-blue-200/80 block mt-0.5">Portions distributed</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-blue-200 block mb-0.5">Completed Rescues</span>
              <span className="text-2xl font-black text-emerald-300">
                {receiverAnalytics.primaryKpis.completedDeliveries || 0}
              </span>
              <span className="text-[10px] text-blue-200/80 block mt-0.5">Verified handovers</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-blue-200 block mb-0.5">Avg Response Speed</span>
              <span className="text-2xl font-black text-amber-300">
                {receiverAnalytics.primaryKpis.avgPickupSpeed || '< 45 min'}
              </span>
              <span className="text-[10px] text-blue-200/80 block mt-0.5">Pickup coordination</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-blue-200 block mb-0.5">Rescue Success</span>
              <span className="text-2xl font-black text-sky-300">
                {receiverAnalytics.primaryKpis.rescueRate || '100%'}
              </span>
              <span className="text-[10px] text-blue-200/80 block mt-0.5">Completed claim ratio</span>
            </div>
          </div>
        </div>
      )}

      {/* Receiver Trust & Reputation Profile */}
      {session?.user?.id && (
        <TrustScoreCard userId={session.user.id} />
      )}

      {/* Claim List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <Truck className="w-4 h-4" />
              <span>Rescue Orders & Delivery Milestones</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Claimed Food Items
            </h2>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['ALL', 'PENDING', 'APPROVED', 'COMPLETED'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {key === 'ALL' ? 'All Claims' : key.charAt(0) + key.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-white rounded-3xl border border-slate-200 animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Claimed Donations in this View</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
              Explore available food surplus from local bakeries and restaurants to reserve meals for
              your shelter or food kitchen.
            </p>
            <Link
              href="/donations"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition-colors"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Browse Available Food</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredClaims.map((claim) => {
              const listing = claim.foodListing;
              const donor = listing?.donor;

              return (
                <div
                  key={claim.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs hover:border-blue-300 transition-all space-y-5"
                >
                  {/* Top Bar: Title, Category, and Claim Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <CategoryBadge foodType={listing?.foodType} size="sm" />
                        <UrgencyBadge urgency={listing?.urgency} listing={listing} size="sm" showScore={true} showTime={true} />
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Claim #{claim.id.slice(-6)}
                        </span>
                      </div>
                      <Link
                        href={`/donations/${listing?.id}`}
                        className="text-lg font-bold text-slate-900 hover:text-emerald-700 transition-colors block"
                      >
                        {listing?.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Reserved Quantity: <strong className="text-slate-800">{listing?.quantity}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {claim.deliveryStatus && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            claim.deliveryStatus === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : claim.deliveryStatus === 'IN_TRANSIT'
                              ? 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse'
                              : claim.deliveryStatus === 'PICKED_UP'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                              : claim.deliveryStatus === 'PICKUP_STARTED'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                              : claim.deliveryStatus === 'DRIVER_ASSIGNED'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {claim.deliveryStatus === 'DELIVERED' && '✓ Courier Delivered'}
                          {claim.deliveryStatus === 'IN_TRANSIT' && '⚡ In Transit with Courier'}
                          {claim.deliveryStatus === 'PICKED_UP' && '📦 Food Picked Up by Courier'}
                          {claim.deliveryStatus === 'PICKUP_STARTED' && '🚚 Courier En Route to Donor'}
                          {claim.deliveryStatus === 'DRIVER_ASSIGNED' && '👤 Volunteer Courier Assigned'}
                          {claim.deliveryStatus === 'UNASSIGNED' && '⏳ Waiting Courier Assignment'}
                        </span>
                      )}

                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                          claim.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : claim.status === 'APPROVED'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {claim.status === 'PENDING' && '⏳ PENDING DONOR APPROVAL'}
                        {claim.status === 'APPROVED' && '🚚 APPROVED FOR PICKUP'}
                        {claim.status === 'COMPLETED' && '✓ RECEIVED & COMPLETED'}
                      </span>
                    </div>
                  </div>

                  {/* Donor Contact & Pickup Information Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                    {/* Location */}
                    <div>
                      <span className="font-bold text-slate-500 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Pickup Location Address
                      </span>
                      <p className="text-slate-900 font-semibold">{listing?.locationAddress}</p>
                    </div>

                    {/* Donor Details */}
                    <div>
                      <span className="font-bold text-slate-500 block mb-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        Donor Name
                      </span>
                      <p className="text-slate-900 font-bold">{donor?.name || 'Verified Food Donor'}</p>
                      <p className="text-slate-500">{donor?.location || 'New York, NY'}</p>
                    </div>

                    {/* Donor Phone / Contact */}
                    <div>
                      <span className="font-bold text-slate-500 block mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-purple-600" />
                        Donor Contact Phone
                      </span>
                      {donor?.phone ? (
                        <a
                          href={`tel:${donor.phone}`}
                          className="text-blue-600 hover:text-blue-800 font-bold hover:underline inline-block"
                        >
                          {donor.phone}
                        </a>
                      ) : (
                        <p className="text-slate-700 font-medium">+1 (555) 234-5678</p>
                      )}
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Call for dock & gate coordination
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Show QR Code button */}
                      <button
                        type="button"
                        onClick={() => setSelectedQRClaim(claim)}
                        className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-2xs"
                      >
                        <QrCode className="w-4 h-4 text-blue-600" />
                        <span>Show Pickup QR Code</span>
                      </button>

                      {/* Live Tracking Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedTrackingClaimId(selectedTrackingClaimId === claim.id ? null : claim.id)}
                        className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-200 cursor-pointer shadow-2xs"
                      >
                        <Truck className="w-4 h-4 text-purple-600" />
                        <span>{selectedTrackingClaimId === claim.id ? 'Hide Live Tracking' : 'Live Delivery Tracking'}</span>
                      </button>

                      {claim.status !== 'COMPLETED' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsCompleted(claim.id, listing?.title)}
                          disabled={updatingClaimId === claim.id}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {updatingClaimId === claim.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Updating Status...</span>
                            </>
                          ) : (
                            <>
                              <PackageCheck className="w-4 h-4" />
                              <span>Mark as Received / Completed</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold ml-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Received & Distributed</span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/donations/${listing?.id}`}
                      className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    >
                      <span>View Full Listing</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Embedded Live Tracking Telemetry */}
                  {selectedTrackingClaimId === claim.id && (
                    <div className="pt-3 border-t border-slate-100">
                      <LiveTrackingCard listingId={claim.foodListingId || listing?.id} initialExpanded={true} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scannable Pickup QR Code Modal */}
      {selectedQRClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Pickup Verification QR
                  </h3>
                  <p className="text-xs text-slate-500">
                    Handover authentication token
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedQRClaim(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Food Summary */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
              <p className="font-bold text-slate-900 truncate">
                {selectedQRClaim.foodListing?.title}
              </p>
              <p className="text-slate-500 mt-0.5">
                From: <strong>{selectedQRClaim.foodListing?.donor?.name}</strong> • Quantity: {selectedQRClaim.foodListing?.quantity}
              </p>
            </div>

            {/* Render Scannable QR Code */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 flex flex-col items-center justify-center space-y-3 shadow-inner">
              <QRCodeSVG
                value={selectedQRClaim.qrCodeSecret || `FOOD-RESCUE-${selectedQRClaim.id}`}
                size={220}
                level="H"
                includeMargin
                className="rounded-xl shadow-xs"
              />
              <p className="text-[11px] font-semibold text-slate-500 text-center max-w-[240px]">
                Present to volunteer driver or donor upon physical handover
              </p>
            </div>

            {/* Secret Alphanumeric Token with 1-Click Copy */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Alphanumeric Secret Token
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-800 truncate border border-slate-200">
                  {selectedQRClaim.qrCodeSecret || `FOOD-RESCUE-${selectedQRClaim.id}`}
                </code>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCode(
                      selectedQRClaim.qrCodeSecret || `FOOD-RESCUE-${selectedQRClaim.id}`
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <Link
                href="/donations/verify"
                target="_blank"
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1"
              >
                <span>Open Scanner Engine</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedQRClaim(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Dispute Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => {
          fetchReceiverData();
        }}
      />
    </div>
  );
}
