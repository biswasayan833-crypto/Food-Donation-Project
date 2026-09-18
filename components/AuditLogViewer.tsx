'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        includeStats: 'true',
      });

      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entityType', entityFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs');
      }

      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Error loading audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, entityFilter]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    if (action.includes('ASSIGNED')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (action.includes('VERIFIED')) return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    if (action.includes('ADMIN')) return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30';
    if (action.includes('INCIDENT')) return 'bg-rose-500/10 text-rose-600 border-rose-500/30';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total System Events</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.totalLogs.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Past 24h Activity</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.last24hCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Append-Only Status</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Verified Immutable
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4" /> Filters:
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
          >
            <option value="">All Actions</option>
            <option value="DONATION_CREATED">Donation Created</option>
            <option value="CLAIM_CREATED">Claim Created</option>
            <option value="DRIVER_ASSIGNED">Driver Assigned</option>
            <option value="DRIVER_REASSIGNED">Driver Reassigned</option>
            <option value="DELIVERY_STATUS_CHANGED">Delivery Status Changed</option>
            <option value="QR_VERIFIED">QR Verified</option>
            <option value="INCIDENT_CREATED">Incident Created</option>
            <option value="INCIDENT_RESOLVED">Incident Resolved</option>
            <option value="ADMIN_ACTION">Admin Action</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
          >
            <option value="">All Entity Types</option>
            <option value="FOOD_LISTING">Food Listing</option>
            <option value="CLAIM">Claim</option>
            <option value="USER">User</option>
            <option value="INCIDENT">Incident</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
            <p className="text-xs">Querying audit trail...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-500 text-xs">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit logs found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[10px] border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.entityType}
                        </span>
                        {log.entityId && (
                          <span className="block font-mono text-[10px] text-slate-400">
                            #{log.entityId.slice(-8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.actor ? (
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {log.actor.name}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {log.actor.email} ({log.actor.role})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">System / Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === log.id ? null : log.id)
                            }
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                          >
                            {expandedId === log.id ? 'Hide Data' : 'View Payload'}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.metadata && (
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                        <td colSpan={5} className="px-4 py-3">
                          <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
