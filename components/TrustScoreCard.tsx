'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Award,
  HeartHandshake,
  Truck,
  CheckCircle2,
  Trophy,
  ShieldAlert,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import type { UserReputationProfile, TrustBadge } from '@/services/reputation.service';

interface TrustScoreCardProps {
  userId?: string;
  initialProfile?: UserReputationProfile | null;
  className?: string;
  compact?: boolean;
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  VERIFIED_MEMBER: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
  RELIABLE_DONOR: <Award className="w-4 h-4 text-emerald-600" />,
  COMMITTED_RECEIVER: <HeartHandshake className="w-4 h-4 text-blue-500" />,
  TOP_COURIER: <Truck className="w-4 h-4 text-amber-500" />,
  ZERO_INCIDENTS: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  IMPACT_CHAMPION: <Trophy className="w-4 h-4 text-amber-500" />,
  ADMIN_TRUST: <ShieldAlert className="w-4 h-4 text-purple-500" />,
};

export default function TrustScoreCard({
  userId,
  initialProfile = null,
  className = '',
  compact = false,
}: TrustScoreCardProps) {
  const [profile, setProfile] = useState<UserReputationProfile | null>(initialProfile);
  const [loading, setLoading] = useState<boolean>(!initialProfile && Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reputation/${userId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch trust profile');
      }
      setProfile(data.profile);
    } catch (err: any) {
      setError(err.message || 'Unable to compute trust score');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialProfile && userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={`p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`p-5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error || 'Trust score unavailable'}</p>
          </div>
          {userId && (
            <button
              onClick={fetchProfile}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const getTierColors = (tier: string) => {
    switch (tier) {
      case 'EXEMPLARY':
        return {
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          gauge: '#10b981',
          gradient: 'from-emerald-500 to-teal-600',
        };
      case 'HIGH':
        return {
          badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          gauge: '#3b82f6',
          gradient: 'from-blue-500 to-cyan-600',
        };
      case 'ESTABLISHED':
        return {
          badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          gauge: '#6366f1',
          gradient: 'from-indigo-500 to-violet-600',
        };
      case 'BUILDING':
        return {
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          gauge: '#f59e0b',
          gradient: 'from-amber-500 to-orange-500',
        };
      default:
        return {
          badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          gauge: '#ef4444',
          gradient: 'from-rose-500 to-red-600',
        };
    }
  };

  const colors = getTierColors(profile.tier);
  const strokeDashoffset = 283 - (283 * profile.overallScore) / 100;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke={colors.gauge}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-800 dark:text-white">
            {profile.overallScore}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Trust Score
            </span>
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${colors.badge}`}>
              {profile.tierLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {profile.stats.completionRate}% fulfillment • {profile.badges.length} badges
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Trust & Reputation Profile
            </h3>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${colors.badge}`}>
              {profile.tierLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Server-verified rating calculated from Neon PostgreSQL transaction records
          </p>
        </div>

        {/* Circular Progress Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke={colors.gauge}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray="283"
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                {profile.overallScore}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase">/100</span>
            </div>
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Reliability Rating
            </span>
            <span className="text-xs text-slate-500">
              {profile.stats.completionRate}% completion rate
            </span>
          </div>
        </div>
      </div>

      {/* 5 Pillars Breakdown */}
      <div className="mt-5">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
          Reputation Pillars
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profile.pillars.map((pillar, idx) => {
            const percent = Math.round((pillar.score / pillar.maxScore) * 100);
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {pillar.name}
                  </span>
                  <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                    {pillar.score} / {pillar.maxScore} pts
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verifiable Merit Badges */}
      {profile.badges.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Earned Trust Badges
          </h4>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-2xs hover:border-emerald-500/50 transition-colors"
              >
                {BADGE_ICONS[badge.id] || <Award className="w-4 h-4 text-emerald-500" />}
                <span>{badge.name}</span>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg z-20 pointer-events-none text-center">
                  {badge.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incident Status Banner */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          {profile.stats.incidentCount === 0 ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" /> 0 disputes on record
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <AlertCircle className="w-4 h-4" /> {profile.stats.incidentCount} active/settled dispute(s)
            </span>
          )}
          <span>•</span>
          <span>{profile.stats.accountAgeDays} days registered</span>
        </div>

        {userId && (
          <button
            onClick={fetchProfile}
            className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            title="Recalculate live trust score"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate</span>
          </button>
        )}
      </div>
    </div>
  );
}
