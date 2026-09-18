'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Package,
  MapPin,
  Phone,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Thermometer,
  Snowflake,
  Navigation,
  Sparkles,
  Radio,
  Award,
  Timer,
  Activity,
} from 'lucide-react';
import { CategoryBadge } from '@/components/CategoryBadge';
import { useToast } from '@/components/Toast';
import {
  acceptDeliveryTask,
  startPickupTask,
  confirmPickupTask,
  startTransportTask,
} from '@/app/actions/driverActions';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { LiveTrackingCard } from '@/components/LiveTrackingCard';
import TrustScoreCard from '@/components/TrustScoreCard';
import ReportIncidentModal from '@/components/ReportIncidentModal';

export default function DriverDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'feed' | 'active' | 'completed'>('feed');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionClaimId, setActionClaimId] = useState<string | null>(null);
  const [sharingGps, setSharingGps] = useState(false);
  const [expandedTrackingClaimId, setExpandedTrackingClaimId] = useState<string | null>(null);
  const [driverAnalytics, setDriverAnalytics] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const [resDeliveries, resAnalytics] = await Promise.all([
        fetch('/api/driver/deliveries'),
        fetch('/api/analytics?range=30D'),
      ]);

      if (!resDeliveries.ok) {
        if (resDeliveries.status === 403 || resDeliveries.status === 401) {
          setData(null);
          return;
        }
        throw new Error('Failed to load courier feed.');
      }
      const json = await resDeliveries.json();
      setData(json);

      if (resAnalytics.ok) {
        const jsonAnalytics = await resAnalytics.json();
        setDriverAnalytics(jsonAnalytics.analytics);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error loading deliveries.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'VOLUNTEER' || session?.user?.role === 'ADMIN') {
      fetchDeliveries();
    } else if (session) {
      setLoading(false);
    }
  }, [session]);

  const handleBroadcastGps = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setSharingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/driver/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading || null,
              speed: pos.coords.speed || null,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error || 'Failed to update GPS telemetry.');
          }
          showToast(`📍 Live GPS Broadcasted! (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`, 'success');
          await fetchDeliveries();
        } catch (err: any) {
          showToast(err.message || 'Error updating location.', 'error');
        } finally {
          setSharingGps(false);
        }
      },
      (err) => {
        setSharingGps(false);
        showToast(`GPS Error: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAcceptDelivery = (claimId: string, itemTitle: string) => {
    setActionClaimId(claimId);
    startTransition(async () => {
      const res = await acceptDeliveryTask(claimId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Accepted delivery for "${itemTitle}"! Added to Active Tasks.`, 'success');
        setActiveTab('active');
        await fetchDeliveries();
      }
      setActionClaimId(null);
    });
  };

  const handleStartPickup = (claimId: string, itemTitle: string) => {
    setActionClaimId(claimId);
    startTransition(async () => {
      const res = await startPickupTask(claimId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Pickup started for "${itemTitle}"! En route to donor.`, 'success');
        await fetchDeliveries();
      }
      setActionClaimId(null);
    });
  };

  const handleConfirmPickup = (claimId: string, itemTitle: string) => {
    setActionClaimId(claimId);
    startTransition(async () => {
      const res = await confirmPickupTask(claimId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Food pickup confirmed for "${itemTitle}"! Ready for transport.`, 'success');
        await fetchDeliveries();
      }
      setActionClaimId(null);
    });
  };

  const handleStartTransport = (claimId: string, itemTitle: string) => {
    setActionClaimId(claimId);
    startTransition(async () => {
      const res = await startTransportTask(claimId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Transport started for "${itemTitle}"! Status is now In Transit.`, 'success');
        await fetchDeliveries();
      }
      setActionClaimId(null);
    });
  };

  const getMapLink = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const renderTempBadge = (temp?: string) => {
    switch (temp) {
      case 'REFRIGERATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Snowflake className="w-3 h-3 text-blue-600" />
            Refrigerated (1°C - 4°C)
          </span>
        );
      case 'FROZEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Snowflake className="w-3 h-3 text-indigo-600" />
            Deep Frozen (-18°C)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Thermometer className="w-3 h-3 text-amber-600" />
            Room Temp
          </span>
        );
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading Courier Workspace...</p>
      </div>
    );
  }

  // Authorization gate
  if (
    authStatus === 'unauthenticated' ||
    !session ||
    (session.user.role !== 'VOLUNTEER' && session.user.role !== 'ADMIN')
  ) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Truck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Volunteer Courier Access</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-8">
          The delivery logistics workspace is reserved for registered volunteer couriers and drivers.
          You can test using our 1-click Demo Volunteer Courier account.
        </p>
        <Link
          href="/auth/signin?callbackUrl=/dashboard/driver"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all"
        >
          <span>Sign In as Volunteer (1-Click Demo)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const unassigned = data?.unassigned || [];
  const activeTasks = data?.activeTasks || [];
  const completedTasks = data?.completedTasks || [];
  const stats = data?.stats || {
    availableCount: 0,
    myActiveCount: 0,
    myCompletedCount: 0,
    platformCompletedCount: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Driver Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Truck className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Courier Delivery Workspace
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Eco-Courier Driver
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Volunteer: <strong className="text-slate-800">{session?.user?.name}</strong> •{' '}
              {session?.user?.location || 'New York, NY'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleBroadcastGps}
            disabled={sharingGps}
            title="Broadcast current GPS telemetry to active donors and receivers"
            className="px-4 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Radio className={`w-4 h-4 text-amber-600 ${sharingGps ? 'animate-ping' : ''}`} />
            <span>{sharingGps ? 'Broadcasting...' : 'Share Live GPS'}</span>
          </button>

          <Link
            href="/donations/verify"
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Pickup QR Code</span>
          </Link>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-3 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Report Dispute</span>
          </button>

          <button
            onClick={fetchDeliveries}
            title="Refresh Deliveries"
            className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Available Pickup Jobs
          </span>
          <p className="text-3xl font-black text-amber-600 mt-1">{stats.availableCount}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Waiting for transport</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-2xs">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
            My Active Deliveries
          </span>
          <p className="text-3xl font-black text-purple-600 mt-1">{stats.myActiveCount}</p>
          <span className="text-[11px] text-purple-600 mt-0.5 block">Assigned / In Transit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            My Completed Drop-Offs
          </span>
          <p className="text-3xl font-black text-emerald-600 mt-1">{stats.myCompletedCount}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Delivered successfully</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Platform Courier Rescues
          </span>
          <p className="text-3xl font-black text-slate-900 mt-1">{stats.platformCompletedCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Total community transfers</span>
        </div>
      </div>

      {/* Driver Courier Efficiency & Reliability Card */}
      {driverAnalytics && (
        <div className="bg-gradient-to-r from-amber-900 to-orange-950 rounded-3xl p-6 text-white shadow-sm space-y-4 border border-amber-700/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-700/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-6 h-6 text-amber-300" />
              <div>
                <span className="text-xs font-black tracking-wide uppercase text-amber-300">
                  Volunteer Courier Analytics & Reliability
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Transport Efficiency Telemetry
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-black/25 px-4 py-2 rounded-2xl border border-white/10 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-amber-200/80 uppercase font-bold block">
                  Courier Score
                </span>
                <span className="text-2xl font-black text-amber-300">
                  {driverAnalytics.impactScore?.overallScore || 92}
                </span>
                <span className="text-xs text-white/60 font-semibold">/100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-amber-200 block mb-0.5">Verified Drop-Offs</span>
              <span className="text-2xl font-black text-white">
                {driverAnalytics.primaryKpis.completedDeliveries || 0}
              </span>
              <span className="text-[10px] text-amber-200/80 block mt-0.5">Completed runs</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-amber-200 block mb-0.5">Avg Delivery Time</span>
              <span className="text-2xl font-black text-amber-300">
                {driverAnalytics.primaryKpis.avgDeliveryTime || '< 30 min'}
              </span>
              <span className="text-[10px] text-amber-200/80 block mt-0.5">Transit duration</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-amber-200 block mb-0.5">Food Rescued</span>
              <span className="text-2xl font-black text-emerald-300">
                {driverAnalytics.primaryKpis.servingsTransported?.toLocaleString() || '0'}
              </span>
              <span className="text-[10px] text-amber-200/80 block mt-0.5">Servings transported</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
              <span className="text-xs text-amber-200 block mb-0.5">Reliability Rate</span>
              <span className="text-2xl font-black text-sky-300">
                {driverAnalytics.primaryKpis.reliabilityScore || '100%'}
              </span>
              <span className="text-[10px] text-amber-200/80 block mt-0.5">Fulfillment score</span>
            </div>
          </div>
        </div>
      )}

      {/* Driver Trust & Reputation Profile */}
      {session?.user?.id && (
        <TrustScoreCard userId={session.user.id} />
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('feed')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'feed'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Available Jobs Feed</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-mono">
            {unassigned.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>My Active Tasks</span>
          {activeTasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 font-mono">
              {activeTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Delivery History</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-mono">
            {completedTasks.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Available Jobs Feed */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Real-Time Rescue Delivery Feed
            </h2>
            <p className="text-xs text-slate-500">
              Pick up surplus from donors and transport to community recipients
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 bg-white rounded-3xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : unassigned.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">All Delivery Tasks Claimed!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No unassigned deliveries currently waiting. When NGOs reserve donations requiring courier assistance, they will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {unassigned.map((claim: any) => {
                const listing = claim.foodListing;
                const donor = listing?.donor;
                const receiver = claim.receiver;

                return (
                  <div
                    key={claim.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs hover:border-amber-300 transition-all space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <CategoryBadge foodType={listing?.foodType} size="sm" />
                          {renderTempBadge(listing?.temperatureControl)}
                          <UrgencyBadge urgency={listing?.urgency} listing={listing} size="sm" showScore={true} showTime={true} />
                          <span className="text-xs font-mono font-bold text-slate-400">
                            Task #{claim.id.slice(-6)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{listing?.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Payload Quantity: <strong className="text-slate-800">{listing?.quantity}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionClaimId === claim.id || isPending}
                          onClick={() => handleAcceptDelivery(claim.id, listing?.title)}
                          className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {actionClaimId === claim.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                              <span>Assigning Courier...</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-4 h-4" />
                              <span>Accept Delivery Job</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Route Coordination Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                      {/* Step A: Pickup */}
                      <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            1. Pickup Location (Donor)
                          </span>
                          <a
                            href={getMapLink(listing?.locationAddress)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>Open Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-slate-900 font-semibold">{listing?.locationAddress}</p>
                        <p className="text-slate-600">
                          Contact: <strong>{donor?.name}</strong> •{' '}
                          {donor?.phone ? (
                            <a href={`tel:${donor.phone}`} className="text-blue-600 hover:underline font-bold">
                              {donor.phone}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </p>
                      </div>

                      {/* Step B: Drop-off */}
                      <div className="space-y-1.5 md:pl-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            2. Destination (Receiver NGO)
                          </span>
                          <a
                            href={getMapLink(receiver?.location || 'New York, NY')}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>Open Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-slate-900 font-semibold">{receiver?.location || 'Community Drop-off Site'}</p>
                        <p className="text-slate-600">
                          Recipient: <strong>{receiver?.name}</strong> •{' '}
                          {receiver?.phone ? (
                            <a href={`tel:${receiver.phone}`} className="text-blue-600 hover:underline font-bold">
                              {receiver.phone}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Active Tasks */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Assigned Transport Deliveries
            </h2>
            <p className="text-xs text-slate-500">
              Active routes assigned to you. Mark in-transit and scan QR to verify delivery.
            </p>
          </div>

          {activeTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Active Deliveries Assigned</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm mx-auto">
                Check the Available Jobs Feed to pick up surplus food runs and assist local food rescues.
              </p>
              <button
                onClick={() => setActiveTab('feed')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Browse Available Jobs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {activeTasks.map((claim: any) => {
                const listing = claim.foodListing;
                const donor = listing?.donor;
                const receiver = claim.receiver;

                return (
                  <div
                    key={claim.id}
                    className="bg-white rounded-3xl border-2 border-purple-200 p-6 sm:p-7 shadow-sm space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {claim.deliveryStatus === 'DRIVER_ASSIGNED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              ✓ DRIVER ASSIGNED • READY TO PICKUP
                            </span>
                          )}
                          {claim.deliveryStatus === 'PICKUP_STARTED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              🚚 EN ROUTE TO DONOR (PICKUP STARTED)
                            </span>
                          )}
                          {claim.deliveryStatus === 'PICKED_UP' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                              📦 FOOD PICKED UP • READY FOR TRANSIT
                            </span>
                          )}
                          {claim.deliveryStatus === 'IN_TRANSIT' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
                              ⚡ IN TRANSIT TO RECIPIENT
                            </span>
                          )}
                          {['DELIVERED', 'COMPLETED'].includes(claim.deliveryStatus) && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ DELIVERED & VERIFIED
                            </span>
                          )}
                          {renderTempBadge(listing?.temperatureControl)}
                          <UrgencyBadge urgency={listing?.urgency} listing={listing} size="sm" showScore={true} showTime={true} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">{listing?.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Quantity: <strong className="text-slate-800">{listing?.quantity}</strong>
                        </p>
                        {listing?.urgency?.level === 'CRITICAL' && (
                          <div className="mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>CRITICAL: Pickup recommended ASAP ({listing.urgency.timeRemainingDisplay})</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons based on deliveryStatus */}
                      <div className="flex flex-wrap items-center gap-2">
                        {claim.deliveryStatus === 'DRIVER_ASSIGNED' && (
                          <button
                            type="button"
                            disabled={actionClaimId === claim.id || isPending}
                            onClick={() => handleStartPickup(claim.id, listing?.title)}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {actionClaimId === claim.id ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Starting Pickup...</span>
                              </>
                            ) : (
                              <>
                                <Navigation className="w-4 h-4" />
                                <span>Start Pickup (En Route)</span>
                              </>
                            )}
                          </button>
                        )}

                        {claim.deliveryStatus === 'PICKUP_STARTED' && (
                          <button
                            type="button"
                            disabled={actionClaimId === claim.id || isPending}
                            onClick={() => handleConfirmPickup(claim.id, listing?.title)}
                            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {actionClaimId === claim.id ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Confirming...</span>
                              </>
                            ) : (
                              <>
                                <Package className="w-4 h-4" />
                                <span>Confirm Food Picked Up</span>
                              </>
                            )}
                          </button>
                        )}

                        {claim.deliveryStatus === 'PICKED_UP' && (
                          <button
                            type="button"
                            disabled={actionClaimId === claim.id || isPending}
                            onClick={() => handleStartTransport(claim.id, listing?.title)}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {actionClaimId === claim.id ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Starting Transport...</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-4 h-4" />
                                <span>Start Delivery (In Transit)</span>
                              </>
                            )}
                          </button>
                        )}

                        {claim.deliveryStatus === 'IN_TRANSIT' && (
                          <Link
                            href="/donations/verify"
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Scan QR Code at Handover</span>
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedTrackingClaimId(expandedTrackingClaimId === claim.id ? null : claim.id)}
                          className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          {expandedTrackingClaimId === claim.id ? 'Hide Telemetry' : '🚚 Live Telemetry'}
                        </button>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                      {/* Pickup */}
                      <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700 uppercase flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Pickup Address
                          </span>
                          <a
                            href={getMapLink(listing?.locationAddress)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                          >
                            <span>Map Navigation</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-slate-900 font-semibold">{listing?.locationAddress}</p>
                        <p className="text-slate-600">
                          Donor: <strong>{donor?.name}</strong> •{' '}
                          {donor?.phone && (
                            <a href={`tel:${donor.phone}`} className="text-blue-600 font-bold hover:underline">
                              {donor.phone}
                            </a>
                          )}
                        </p>
                      </div>

                      {/* Dropoff */}
                      <div className="space-y-1.5 md:pl-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700 uppercase flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            Drop-Off Address
                          </span>
                          <a
                            href={getMapLink(receiver?.location || 'New York, NY')}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                          >
                            <span>Map Navigation</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-slate-900 font-semibold">{receiver?.location || 'New York, NY'}</p>
                        <p className="text-slate-600">
                          Recipient: <strong>{receiver?.name}</strong> •{' '}
                          {receiver?.phone && (
                            <a href={`tel:${receiver.phone}`} className="text-blue-600 font-bold hover:underline">
                              {receiver.phone}
                            </a>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Embedded Live Tracking Telemetry Card */}
                    {expandedTrackingClaimId === claim.id && (
                      <div className="pt-2 border-t border-slate-100">
                        <LiveTrackingCard listingId={claim.foodListingId || listing?.id} initialExpanded={true} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Delivery History */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Completed Transport Rescues
            </h2>
            <p className="text-xs text-slate-500">
              Verified food donations safely delivered by you
            </p>
          </div>

          {completedTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Completed Runs Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once you complete deliveries and scan recipient QR tokens, your verified track record will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {completedTasks.map((claim: any) => {
                const listing = claim.foodListing;
                return (
                  <div
                    key={claim.id}
                    className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Verified & Delivered
                        </span>
                        <CategoryBadge foodType={listing?.foodType} size="sm" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{listing?.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Delivered from <strong>{listing?.donor?.name}</strong> to{' '}
                        <strong>{claim.receiver?.name}</strong> • {listing?.quantity}
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs text-slate-500">
                      <span className="block font-medium">Delivered at:</span>
                      <strong className="text-slate-800">
                        {claim.deliveredAt ? new Date(claim.deliveredAt).toLocaleString() : 'Earlier'}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Report Dispute Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => {
          fetchDeliveries();
        }}
      />
    </div>
  );
}
