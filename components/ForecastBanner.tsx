'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SurplusForecastResult } from '@/services/surplus-prediction.service';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Info,
  Calendar,
  Truck,
  Users,
  Sparkles,
} from 'lucide-react';
import { cinematicEase } from '@/lib/motion';

interface ForecastBannerProps {
  forecast: SurplusForecastResult;
}

export function ForecastBanner({ forecast }: ForecastBannerProps) {
  const { next24h, capacityAssessment, confidence, confidenceReason, trendVelocityPercent, trendDirection } =
    forecast;

  const riskStyles: Record<
    string,
    {
      bg: string;
      border: string;
      badge: string;
      badgeText: string;
      title: string;
      icon: React.ReactNode;
      glowClass: string;
    }
  > = {
    LOW: {
      bg: 'bg-emerald-950/75',
      border: 'border-emerald-700/60',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      badgeText: 'LOW SURPLUS RISK',
      title: 'Adequate Community Rescue Capacity',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      glowClass: 'glow-emerald',
    },
    MEDIUM: {
      bg: 'bg-amber-950/75',
      border: 'border-amber-700/60',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      badgeText: 'MODERATE SURPLUS RISK',
      title: 'Balanced Intake & Courier Bandwidth',
      icon: <Info className="w-5 h-5 text-amber-400" />,
      glowClass: 'glow-amber',
    },
    HIGH: {
      bg: 'bg-orange-950/75',
      border: 'border-orange-700/60',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      badgeText: 'HIGH SURPLUS RISK',
      title: 'Approaching Transport Capacity Deficit',
      icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
      glowClass: 'glow-amber',
    },
    CRITICAL: {
      bg: 'bg-rose-950/75',
      border: 'border-rose-700/60',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      badgeText: 'CRITICAL CAPACITY RISK',
      title: 'Imminent Surplus Exceeding Platform Bandwidth',
      icon: <AlertOctagon className="w-5 h-5 text-rose-400" />,
      glowClass: 'glow-rose',
    },
  };

  const currentRisk = riskStyles[capacityAssessment.riskLevel] || riskStyles.MEDIUM;

  const confidenceBadge: Record<string, string> = {
    HIGH: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    MEDIUM: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    LOW: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: cinematicEase }}
      className={`rounded-3xl p-6 text-white shadow-md space-y-5 border ${currentRisk.bg} ${currentRisk.border} ${currentRisk.glowClass}`}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10 shrink-0 shadow-inner">{currentRisk.icon}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black tracking-wider uppercase text-amber-300">
                🔮 Predictive Food Surplus & Capacity Engine
              </span>
              <motion.span
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentRisk.badge}`}
              >
                {currentRisk.badgeText}
              </motion.span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  confidenceBadge[confidence] || confidenceBadge.MEDIUM
                }`}
              >
                {confidence} CONFIDENCE
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {currentRisk.title}
            </h3>
          </div>
        </div>

        {/* Trend velocity indicator */}
        <div className="flex items-center gap-2 text-xs bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-xs">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300">Trend Velocity:</span>
          <strong
            className={
              trendVelocityPercent > 0
                ? 'text-emerald-400'
                : trendVelocityPercent < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }
          >
            {trendVelocityPercent > 0 ? `+${trendVelocityPercent}%` : `${trendVelocityPercent}%`}
          </strong>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Expected Tomorrow */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>Tomorrow ({next24h.dayOfWeek})</span>
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300">
            ~{next24h.expectedDonations} <span className="text-xs font-semibold text-white/70">listings</span>
          </p>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            Est. ~{next24h.expectedServings.toLocaleString()} meal servings
          </span>
        </motion.div>

        {/* 7-Day Total Forecast */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-400/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>Next 7-Day Surplus</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-300">
            ~{forecast.totalExpected7DaysDonations}{' '}
            <span className="text-xs font-semibold text-white/70">total</span>
          </p>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            Est. ~{forecast.totalExpected7DaysServings.toLocaleString()} servings
          </span>
        </motion.div>

        {/* Receiver Capacity */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>Receiver Intake Bandwidth</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">
            {capacityAssessment.receiverIntakeCapacityServings.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-white/70">servings/day</span>
          </p>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            {capacityAssessment.activeReceiversCount} active verified receivers
          </span>
        </motion.div>

        {/* Courier Fleet Bandwidth */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>Volunteer Fleet Capacity</span>
            <Truck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-300">
            {capacityAssessment.volunteerFleetCapacityServings.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-white/70">servings/run</span>
          </p>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            {capacityAssessment.activeCouriersCount} ready volunteer drivers
          </span>
        </motion.div>
      </div>

      {/* Recommended Action & Capacity Ratio */}
      <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 backdrop-blur-xs">
        <div className="space-y-1">
          <span className="font-bold text-amber-200">Recommended Operational Action:</span>
          <p className="text-slate-200">{capacityAssessment.recommendedAction}</p>
        </div>

        <div className="shrink-0 flex items-center gap-3 bg-black/25 px-3.5 py-2 rounded-xl border border-white/10 text-right">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Capacity Ratio
            </span>
            <strong
              className={`text-sm font-black ${
                capacityAssessment.capacityRatio >= 1.5
                  ? 'text-emerald-400'
                  : capacityAssessment.capacityRatio >= 1.0
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {capacityAssessment.capacityRatio}x
            </strong>
          </div>
          <span className="text-[10px] text-slate-400 max-w-[120px] text-left leading-tight">
            Active capacity vs predicted daily surplus
          </span>
        </div>
      </div>

      {/* Required Disclaimer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/10">
        <span className="italic">{capacityAssessment.disclaimer}</span>
        <span>{confidenceReason}</span>
      </div>
    </motion.div>
  );
}
