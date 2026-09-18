'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Filter,
} from 'lucide-react';
import type { IncidentStatus } from '@/services/incident.service';

interface IncidentItem {
  id: string;
  category: string;
  title: string;
  description: string;
  evidenceUrl?: string | null;
  status: IncidentStatus;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  reporter?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
  reportedUser?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  } | null;
  resolvedBy?: {
    id: string;
    name: string;
  } | null;
  foodListing?: {
    id: string;
    title: string;
  } | null;
}

interface IncidentListProps {
  isAdmin?: boolean;
  className?: string;
}

export default function IncidentList({ isAdmin = false, className = '' }: IncidentListProps) {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Adjudication state for Admin
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [adjudicateStatus, setAdjudicateStatus] = useState<IncidentStatus>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [adjudicating, setAdjudicating] = useState(false);
  const [adjudicateError, setAdjudicateError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = isAdmin && statusFilter !== 'ALL'
        ? `/api/incidents?status=${statusFilter}`
        : '/api/incidents';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch incidents');
      }
      setIncidents(data.incidents || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleAdjudicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!resolutionNotes.trim()) {
      setAdjudicateError('Please provide resolution notes explaining the decision.');
      return;
    }

    try {
      setAdjudicating(true);
      setAdjudicateError(null);

      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: adjudicateStatus,
          resolutionNotes: resolutionNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update incident');
      }

      setSelectedIncident(null);
      setResolutionNotes('');
      fetchIncidents();
    } catch (err: any) {
      setAdjudicateError(err.message || 'Error updating incident');
    } finally {
      setAdjudicating(false);
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Open
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <ShieldAlert className="w-3 h-3" /> Under Review
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <XCircle className="w-3 h-3" /> Dismissed
          </span>
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter bar for Admin */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Filter by Status:
            {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">{incidents.length} total incidents</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
          <p className="text-xs">Loading incident records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Incidents on Record
          </p>
          <p className="text-xs text-slate-500 mt-1">
            All operations are running smoothly with zero unresolved disputes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(incident.status)}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {incident.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {isAdmin && incident.status !== 'RESOLVED' && incident.status !== 'DISMISSED' && (
                  <button
                    onClick={() => {
                      setSelectedIncident(incident);
                      setAdjudicateStatus('RESOLVED');
                      setResolutionNotes(incident.resolutionNotes || '');
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 transition-colors self-start sm:self-auto"
                  >
                    Adjudicate Dispute
                  </button>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {incident.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                {incident.description}
              </p>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                {incident.reporter && (
                  <span>
                    Reported by: <strong>{incident.reporter.name}</strong> ({incident.reporter.role})
                  </span>
                )}
                {incident.reportedUser && (
                  <span>
                    Target: <strong>{incident.reportedUser.name}</strong> ({incident.reportedUser.role})
                  </span>
                )}
                {incident.foodListing && (
                  <span>
                    Listing: <strong>{incident.foodListing.title}</strong>
                  </span>
                )}
                {incident.evidenceUrl && (
                  <a
                    href={incident.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View Attached Evidence
                  </a>
                )}
              </div>

              {/* Resolution Notes if available */}
              {incident.resolutionNotes && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolution Notes {incident.resolvedBy ? `by ${incident.resolvedBy.name}` : ''}</span>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    {incident.resolutionNotes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin Adjudication Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Adjudicate Incident #{selectedIncident.id.slice(-6)}
              </h3>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {selectedIncident.title}
              </p>
            </div>

            <form onSubmit={handleAdjudicateSubmit} className="p-5 space-y-4">
              {adjudicateError && (
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg text-xs">
                  {adjudicateError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Determination *
                </label>
                <select
                  value={adjudicateStatus}
                  onChange={(e) => setAdjudicateStatus(e.target.value as IncidentStatus)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="UNDER_REVIEW">Keep Under Review</option>
                  <option value="RESOLVED">Resolved (Action Taken / Settlement Finalized)</option>
                  <option value="DISMISSED">Dismissed (No Violation / Unsubstantiated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Rationale & Instructions *
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="Explain findings, outcome, and guidance for involved parties..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  disabled={adjudicating}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjudicating}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {adjudicating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Adjudication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
