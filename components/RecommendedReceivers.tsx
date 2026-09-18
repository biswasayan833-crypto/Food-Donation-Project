'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MapPin,
  Utensils,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Building2,
  ExternalLink,
  ShieldCheck,
  Check,
  RefreshCw,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { ReceiverRecommendation } from '@/services/donation-matching.service';
import { useToast } from '@/components/Toast';

interface RecommendedReceiversProps {
  listingId: string;
  onMatched?: () => void;
  compact?: boolean;
}

export function RecommendedReceivers({
  listingId,
  onMatched,
  compact = false,
}: RecommendedReceiversProps) {
  const { showToast } = useToast();

  const [matches, setMatches] = useState<ReceiverRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(true);
  const [viewingReceiver, setViewingReceiver] = useState<ReceiverRecommendation | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/matches`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch matches.');
      } else if (data.data && data.data.matches) {
        setMatches(data.data.matches);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading recommended receivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchMatches();
    }
  }, [listingId]);

  const handleSelectReceiver = async (receiver: ReceiverRecommendation) => {
    const receiverId = receiver.receiver.id;
    setAssigningId(receiverId);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${listingId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Failed to assign receiver.';
        setError(msg);
        showToast(msg, 'error');
      } else {
        const successText = `Matched with ${receiver.receiver.name}! Claim created.`;
        setSuccessMessage(successText);
        showToast(successText, 'success');
        if (onMatched) {
          onMatched();
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Error assigning receiver.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-6 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-rose-900">Matching Service Unavailable</h4>
        <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchMatches}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Search</span>
        </button>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-emerald-950">Donation Successfully Matched!</h3>
        <p className="text-sm text-emerald-800 max-w-md mx-auto">{successMessage}</p>
        <p className="text-xs text-slate-500">
          The receiver has been reserved and a secure QR pickup code has been generated.
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Info className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-900">No Eligible Receivers Found Nearby</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          We couldn&apos;t find an active shelter or NGO within your service radius that accepts this food
          category and has capacity right now. Your listing remains active on the public discovery feed.
        </p>
        <button
          onClick={fetchMatches}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-scan Area</span>
        </button>
      </div>
    );
  }

  const topMatch = matches[0];
  const alternativeMatches = matches.slice(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Recommended Receivers
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                AI Smart Match
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by distance, food compatibility, capacity, urgency, and workload.
            </p>
          </div>
        </div>

        <button
          onClick={fetchMatches}
          title="Re-run matching algorithm"
          className="self-start sm:self-auto p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Top / Primary Recommended Receiver Card */}
      <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50/50 via-white to-white rounded-3xl border-2 border-emerald-500/30 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Top badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-emerald-100">
          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            Top Match Recommendation
          </span>

          {/* Big Match Score Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-sm font-black tracking-wide">{topMatch.score}% Match</span>
          </div>
        </div>

        {/* Receiver Name & Quick Metadata */}
        <div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {topMatch.receiver.name}
          </h4>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{topMatch.receiver.location || 'Local Community Facility'}</span>
          </p>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] text-slate-400 font-medium">Distance</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{topMatch.distanceKm.toFixed(1)} km away</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] text-slate-400 font-medium">Food Category</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <Utensils className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Compatible</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] text-slate-400 font-medium">Intake Capacity</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{topMatch.receiver.dailyCapacity} servings</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] text-slate-400 font-medium">Status</span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Accepting Now</span>
            </span>
          </div>
        </div>

        {/* Explainable Reasons ("Why recommended?") */}
        <div className="bg-white/80 rounded-2xl p-4 border border-slate-200/70 space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Why recommended?
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topMatch.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-[10px]">
                  ✓
                </span>
                <span>{reason.replace(/^✓\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            onClick={() => setViewingReceiver(topMatch)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View Receiver Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleSelectReceiver(topMatch)}
            disabled={assigningId === topMatch.receiver.id}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {assigningId === topMatch.receiver.id ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <span>Select & Match Receiver</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alternative Recommendations Accordion */}
      {alternativeMatches.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
          >
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Alternative Recommended Receivers ({alternativeMatches.length})
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Other nearby facilities evaluated and scored by the matching engine.
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAlternatives && (
            <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 divide-y divide-slate-100 space-y-4">
              {alternativeMatches.map((alt) => (
                <div
                  key={alt.receiver.id}
                  className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{alt.receiver.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                        {alt.score}% Match
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{alt.distanceKm.toFixed(1)} km</span>
                      </span>
                      <span>•</span>
                      <span>Capacity: {alt.receiver.dailyCapacity} servings</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium">Accepts category</span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {alt.reasons.slice(0, 3).join(' • ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={() => setViewingReceiver(alt)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleSelectReceiver(alt)}
                      disabled={assigningId === alt.receiver.id}
                      className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {assigningId === alt.receiver.id ? 'Assigning...' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Receiver Detail Modal */}
      {viewingReceiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {viewingReceiver.score}% AI Match Score
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {viewingReceiver.receiver.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingReceiver.receiver.location || 'Local Community Facility'}
                </p>
              </div>
              <button
                onClick={() => setViewingReceiver(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Calculated Distance:</span>
                <strong className="text-slate-900">{viewingReceiver.distanceKm.toFixed(2)} km</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service Radius:</span>
                <strong className="text-slate-900">{viewingReceiver.receiver.serviceRadiusKm} km</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Daily Intake Capacity:</span>
                <strong className="text-slate-900">{viewingReceiver.receiver.dailyCapacity} servings</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Accepted Food Types:</span>
                <strong className="text-slate-900">
                  {viewingReceiver.receiver.acceptedCategories.join(', ')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Workload:</span>
                <strong className="text-slate-900">
                  {viewingReceiver.workload.activeClaimsCount} active claim(s) (
                  {viewingReceiver.workload.workloadLevel})
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Explainable Match Breakdown:
              </span>
              <ul className="space-y-1.5">
                {viewingReceiver.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{r.replace(/^✓\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setViewingReceiver(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingReceiver(null);
                  handleSelectReceiver(viewingReceiver);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Select & Assign Receiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
