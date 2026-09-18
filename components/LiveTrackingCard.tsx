'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Navigation,
  RefreshCw,
  Sparkles,
  Info,
  Package,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { TrackingDataResult, DeliveryStatus } from '@/services/delivery-tracking.service';

interface LiveTrackingCardProps {
  listingId: string;
  compact?: boolean;
  initialExpanded?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

const STAGES: Array<{ key: DeliveryStatus; label: string; short: string }> = [
  { key: 'DRIVER_ASSIGNED', label: 'Courier Designated', short: 'Assigned' },
  { key: 'PICKUP_STARTED', label: 'En Route to Pickup', short: 'En Route' },
  { key: 'PICKED_UP', label: 'Food Collected', short: 'Collected' },
  { key: 'IN_TRANSIT', label: 'In Transit to Shelter', short: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered & Served', short: 'Delivered' },
];

export function LiveTrackingCard({
  listingId,
  compact = false,
  onStatusChange,
}: LiveTrackingCardProps) {
  const [data, setData] = useState<TrackingDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async (isManual: boolean = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/tracking`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to load live tracking data.');
      } else if (json.data) {
        setData(json.data);
        if (onStatusChange) {
          onStatusChange(json.data.deliveryStatus);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching delivery tracking.');
    } finally {
      setLoading(false);
    }
  };

  // Adaptive polling: polls every 6s, pauses when tab is hidden, stops when DELIVERED
  useEffect(() => {
    if (!listingId) return;

    fetchTracking();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && data?.deliveryStatus !== 'DELIVERED') {
        fetchTracking(false);
      }
    }, 6000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchTracking(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [listingId, data?.deliveryStatus]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded-lg" />
        <div className="h-16 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 text-center space-y-2 text-xs">
        <div className="flex items-center justify-center gap-2 text-amber-800 font-bold">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Tracking Data Unavailable</span>
        </div>
        <p className="text-amber-700 max-w-sm mx-auto">{error || 'No active tracking claim found.'}</p>
        <button
          onClick={() => fetchTracking(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 font-bold hover:bg-amber-50 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const getStageIndex = (status: DeliveryStatus) => {
    switch (status) {
      case 'DRIVER_ASSIGNED':
        return 0;
      case 'PICKUP_STARTED':
        return 1;
      case 'PICKED_UP':
        return 2;
      case 'IN_TRANSIT':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return -1;
    }
  };

  const activeIndex = getStageIndex(data.deliveryStatus);
  const isDelivered = data.deliveryStatus === 'DELIVERED';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-sky-600/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Live Delivery Tracking
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time multi-stage transfer status & GPS dispatch updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {data.urgency && (
            <div
              className={`text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                data.urgency.level === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : data.urgency.level === 'HIGH'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Priority: {data.urgency.level} ({data.urgency.timeRemainingDisplay})</span>
            </div>
          )}

          <button
            onClick={() => fetchTracking(true)}
            title="Refresh tracking status"
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <div className="py-3">
        <div className="relative flex items-center justify-between">
          {/* Background Track */}
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full z-0" />
          <motion.div
            className="absolute top-1/2 left-4 -translate-y-1/2 h-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full z-0"
            initial={false}
            animate={{
              width: `${Math.max(
                0,
                Math.min(100, (activeIndex / (STAGES.length - 1)) * 100)
              )}%`,
            }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {STAGES.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <motion.div
                key={stage.key}
                className="relative z-10 flex flex-col items-center group cursor-default"
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {isCurrent && (
                  <motion.div
                    animate={{ scale: [1, 1.4, 1.8], opacity: [0.7, 0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                    className="absolute -inset-1 rounded-2xl border-2 border-sky-400 pointer-events-none"
                  />
                )}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center border-2 transition-all shadow-2xs ${
                    isCompleted
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : isCurrent
                      ? 'bg-white border-sky-600 text-sky-600 ring-4 ring-sky-100'
                      : 'bg-white border-slate-200 text-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-[11px] mt-2 font-bold tracking-tight whitespace-nowrap hidden sm:block ${
                    isCurrent
                      ? 'text-sky-700 font-black'
                      : isCompleted
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {stage.short}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Current Operational Status Summary Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={data.deliveryStatus}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isDelivered
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
              : data.deliveryStatus === 'IN_TRANSIT'
              ? 'bg-purple-50/90 border-purple-200 text-purple-950'
              : 'bg-sky-50/80 border-sky-200 text-sky-950'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                Current Status
              </span>
              <span className="font-black text-sm text-slate-900">
                {STAGES.find((s) => s.key === data.deliveryStatus)?.label || data.deliveryStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 text-slate-600 pt-0.5">
              {data.driver && (
                <span>
                  Courier: <strong className="text-slate-800">{data.driver.name}</strong>
                </span>
              )}
              {data.location && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                    <Navigation className="w-3 h-3 text-sky-600" />
                    {data.location.distanceToDestinationKm} km to drop-off (~{data.location.estimatedRemainingMinutes} min ETA)
                  </span>
                </>
              )}
            </div>
          </div>

          {data.location?.updatedAt && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                GPS active: {new Date(data.location.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Milestone Timestamps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Courier Assigned</span>
          <span className="font-bold text-slate-800">
            {data.timestamps.assignedAt
              ? new Date(data.timestamps.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Pickup Started</span>
          <span className="font-bold text-slate-800">
            {data.timestamps.pickupStartedAt
              ? new Date(data.timestamps.pickupStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Food Collected</span>
          <span className="font-bold text-slate-800">
            {data.timestamps.pickedUpAt
              ? new Date(data.timestamps.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Delivered</span>
          <span className="font-bold text-slate-800">
            {data.timestamps.deliveredAt
              ? new Date(data.timestamps.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </span>
        </div>
      </div>

      {/* Operational Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-600">Operational Logistical Indicator: </strong>
          Delivery tracking milestones and freshness urgency ratings are computed strictly for dispatch coordination
          and logistical scheduling. They do not constitute an independent clinical or statutory food safety inspection.
        </div>
      </div>
    </div>
  );
}
