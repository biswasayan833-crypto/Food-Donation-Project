'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  ArrowRight,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import { DriverRecommendation, DriverAssignmentResult } from '@/services/driver-assignment.service';
import { useToast } from '@/components/Toast';

interface RecommendedDriversProps {
  listingId: string;
  onAssigned?: (driverId: string) => void;
  compact?: boolean;
}

export function RecommendedDrivers({
  listingId,
  onAssigned,
  compact = false,
}: RecommendedDriversProps) {
  const { showToast } = useToast();

  const [assignmentData, setAssignmentData] = useState<DriverAssignmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [confirmReassign, setConfirmReassign] = useState<DriverRecommendation | null>(null);
  const [assignedDriverInfo, setAssignedDriverInfo] = useState<{ id: string; name: string } | null>(null);

  const fetchDriverRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/drivers`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to fetch courier recommendations.');
      } else if (json.data) {
        setAssignmentData(json.data);
        if (json.data.currentDriverId) {
          const current = json.data.drivers.find(
            (d: DriverRecommendation) => d.driver.id === json.data.currentDriverId
          );
          if (current) {
            setAssignedDriverInfo({ id: current.driver.id, name: current.driver.name });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading driver recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchDriverRecommendations();
    }
  }, [listingId]);

  const handleAssignDriver = async (driver: DriverRecommendation, allowReassign: boolean = false) => {
    setAssigningId(driver.driver.id);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${listingId}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.driver.id,
          allowReassign,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json.error || 'Failed to assign courier.';
        setError(msg);
        showToast(msg, 'error');
      } else {
        const successMsg = `Successfully assigned ${driver.driver.name} as volunteer courier!`;
        showToast(successMsg, 'success');
        setAssignedDriverInfo({ id: driver.driver.id, name: driver.driver.name });
        setConfirmReassign(null);
        if (onAssigned) {
          onAssigned(driver.driver.id);
        }
        fetchDriverRecommendations();
      }
    } catch (err: any) {
      const msg = err.message || 'Error assigning courier.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-52 bg-slate-200 rounded-lg" />
          <div className="h-6 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-36 bg-slate-100 rounded-2xl" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-rose-900">Courier Matching Unavailable</h4>
        <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchDriverRecommendations}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Search</span>
        </button>
      </div>
    );
  }

  const drivers = assignmentData?.drivers || [];
  const topDriver = drivers[0] || null;
  const alternativeDrivers = drivers.slice(1);
  const currentAssignedId = assignmentData?.currentDriverId;

  if (drivers.length === 0) {
    return (
      <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Truck className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-amber-950">No Volunteer Couriers Nearby</h4>
        <p className="text-xs text-amber-800 max-w-md mx-auto">
          No active volunteer couriers are currently available within range of this pickup address.
          Receivers can pick up directly, or a courier will be assigned once available.
        </p>
        <button
          onClick={fetchDriverRecommendations}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-900 text-xs font-semibold hover:bg-amber-50 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Couriers</span>
        </button>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Recommended Volunteer Couriers
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                Sprint 4 Smart Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ranked by 7 operational factors: distance, workload, ETA, and pickup priority.
            </p>
          </div>
        </div>

        {/* Urgency Priority Pill */}
        {assignmentData?.urgency && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div
              className={`text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                assignmentData.urgency.level === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : assignmentData.urgency.level === 'HIGH'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Priority: {assignmentData.urgency.level}</span>
            </div>
            <button
              onClick={fetchDriverRecommendations}
              title="Refresh courier recommendations"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Currently Assigned Notice */}
      {currentAssignedId && assignedDriverInfo && (
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Courier <strong className="font-bold">{assignedDriverInfo.name}</strong> is currently designated for this delivery.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Assigned
          </span>
        </div>
      )}

      {/* TOP RECOMMENDATION CARD */}
      {topDriver && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/50 via-white to-indigo-50/30 border-2 border-sky-300/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-600 text-white shadow-2xs">
                  ★ Best Courier Match
                </span>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${getScoreColor(
                    topDriver.score
                  )}`}
                >
                  {topDriver.score}/100 Match
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 pt-1">
                {topDriver.driver.name}
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" />
                  {topDriver.distanceKm} km away
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  ~{topDriver.estimatedTravelMinutes} min transit
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-amber-500" />
                  {topDriver.activeWorkload === 0
                    ? 'Available now (0 active runs)'
                    : `${topDriver.activeWorkload} active delivery`}
                </span>
              </div>
            </div>

            {/* Action button */}
            <div className="sm:text-right shrink-0">
              {currentAssignedId === topDriver.driver.id ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Assigned
                </span>
              ) : (
                <button
                  disabled={assigningId === topDriver.driver.id}
                  onClick={() => {
                    if (currentAssignedId) {
                      setConfirmReassign(topDriver);
                    } else {
                      handleAssignDriver(topDriver, false);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {assigningId === topDriver.driver.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5" />
                      <span>{currentAssignedId ? 'Reassign Courier' : 'Assign Courier'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Reasons pills */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
            {topDriver.reasons.map((reason, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-slate-700 inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-sky-500 shrink-0" />
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ALTERNATIVE COURIERS (ACCORDION) */}
      {alternativeDrivers.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer border border-slate-200/80"
          >
            <span className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-500" />
              <span>Other Eligible Couriers ({alternativeDrivers.length})</span>
            </span>
            {showAlternatives ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showAlternatives && (
            <div className="space-y-2.5 animate-in fade-in-50 duration-200">
              {alternativeDrivers.map((driver) => (
                <div
                  key={driver.driver.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{driver.driver.name}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getScoreColor(
                          driver.score
                        )}`}
                      >
                        {driver.score}/100
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                      <span>{driver.distanceKm} km away</span>
                      <span>•</span>
                      <span>~{driver.estimatedTravelMinutes} min</span>
                      <span>•</span>
                      <span>
                        {driver.activeWorkload === 0 ? '0 runs' : `${driver.activeWorkload} active`}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {currentAssignedId === driver.driver.id ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                      </span>
                    ) : (
                      <button
                        disabled={assigningId === driver.driver.id}
                        onClick={() => {
                          if (currentAssignedId) {
                            setConfirmReassign(driver);
                          } else {
                            handleAssignDriver(driver, false);
                          }
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 text-sky-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {assigningId === driver.driver.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        <span>Assign</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safety & Operational Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-600">Operational Dispatch Disclaimer: </strong>
          Courier recommendations and freshness urgency ratings are computed strictly for dispatch
          coordination and logistical scheduling. They do not constitute an independent clinical or
          statutory food safety inspection. Always follow standard food safety and temperature guidelines.
        </div>
      </div>

      {/* REASSIGNMENT CONFIRMATION MODAL */}
      {confirmReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                <h4 className="font-black text-slate-900 text-base">Reassign Courier Delivery?</h4>
              </div>
              <button
                onClick={() => setConfirmReassign(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This donation already has an assigned courier. Are you sure you want to reassign this pickup
              to <strong className="text-slate-900">{confirmReassign.driver.name}</strong>?
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Distance:</strong> {confirmReassign.distanceKm} km
              </div>
              <div>
                <strong>Estimated Transit:</strong> ~{confirmReassign.estimatedTravelMinutes} min
              </div>
              <div>
                <strong>Workload:</strong> {confirmReassign.activeWorkload} active jobs
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmReassign(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={assigningId === confirmReassign.driver.id}
                onClick={() => handleAssignDriver(confirmReassign, true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {assigningId === confirmReassign.driver.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Truck className="w-3.5 h-3.5" />
                )}
                <span>Confirm Reassignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
