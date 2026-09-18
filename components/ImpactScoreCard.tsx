'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { ImpactScoreResult } from '@/services/impact-analytics.service';
import { cinematicEase } from '@/lib/motion';

interface ImpactScoreCardProps {
  scoreData: ImpactScoreResult;
  title?: string;
  subtitle?: string;
}

export function ImpactScoreCard({
  scoreData,
  title = 'Platform Impact & Health Score',
  subtitle = 'Transparent, multi-factor operational performance measurement',
}: ImpactScoreCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { overallScore, tier, components } = scoreData;

  const tierColors: Record<
    ImpactScoreResult['tier'],
    { bg: string; text: string; border: string; label: string; strokeColor: string }
  > = {
    EXCELLENT: {
      bg: 'bg-emerald-50 text-emerald-800',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      label: 'Excellent Impact',
      strokeColor: '#10b981',
    },
    HIGH: {
      bg: 'bg-blue-50 text-blue-800',
      text: 'text-blue-700',
      border: 'border-blue-300',
      label: 'High Performance',
      strokeColor: '#3b82f6',
    },
    DEVELOPING: {
      bg: 'bg-amber-50 text-amber-800',
      text: 'text-amber-700',
      border: 'border-amber-300',
      label: 'Developing Impact',
      strokeColor: '#f59e0b',
    },
    NEEDS_ATTENTION: {
      bg: 'bg-rose-50 text-rose-800',
      text: 'text-rose-700',
      border: 'border-rose-300',
      label: 'Needs Attention',
      strokeColor: '#f43f5e',
    },
  };

  const currentTier = tierColors[tier] || tierColors.DEVELOPING;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: cinematicEase }}
      className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentTier.bg} ${currentTier.border}`}
            >
              {currentTier.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Score Display & Animated Circular Gauge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight"
            >
              {overallScore}
            </motion.span>
            <span className="text-sm font-bold text-slate-400">/100</span>
            <span className="block text-[11px] font-semibold text-slate-500">Weighted Score</span>
          </div>

          {/* SVG Animated Circular Progress Gauge */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                stroke={currentTier.strokeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                initial={{ strokeDasharray: '0, 100' }}
                animate={{ strokeDasharray: `${overallScore}, 100` }}
                transition={{ duration: 1.2, ease: cinematicEase }}
              />
            </svg>
            <Award
              className={`w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${currentTier.text}`}
            />
          </div>
        </div>
      </div>

      {/* Component Pillars Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
        {components.map((comp, idx) => (
          <motion.div
            key={comp.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between hover:border-purple-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 truncate" title={comp.name}>
                  {comp.name}
                </span>
                <span className="text-[10px] text-slate-400 font-bold shrink-0">
                  {Math.round(comp.weight * 100)}% wt
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-black text-slate-900">{Math.round(comp.rawScore)}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-purple-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(100, Math.max(0, comp.rawScore))}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + idx * 0.05, ease: cinematicEase }}
                />
              </div>
              <span className="text-[10px] font-bold text-purple-700 mt-1 block text-right">
                +{comp.weightedScore} pts
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expandable Explanation Breakdown */}
      <div className="border-t border-slate-100 pt-3">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between text-xs font-bold text-purple-700 hover:text-purple-800 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {showBreakdown ? 'Hide transparent calculation breakdown' : 'View how this score is computed'}
            </span>
          </span>
          {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: cinematicEase }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs text-slate-700 space-y-3">
                <p className="font-medium text-slate-600">
                  The platform score is an auditable mathematical aggregate weighted across 5 pillars
                  derived from verified Neon PostgreSQL database records:
                </p>
                <div className="space-y-2">
                  {components.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <div>
                        <strong className="text-slate-900">{c.name}</strong> ({Math.round(c.weight * 100)}%):{' '}
                        <span className="text-slate-600">{c.description}</span>
                        <div className="text-[11px] text-purple-800 font-semibold mt-0.5">
                          Raw performance: {c.rawScore}/100 → Contributes {c.weightedScore} points to overall score.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
