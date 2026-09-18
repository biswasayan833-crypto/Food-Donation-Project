'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyTimeseriesPoint } from '@/services/impact-analytics.service';
import { BarChart3, Calendar } from 'lucide-react';
import { cinematicEase } from '@/lib/motion';

interface AnalyticsTrendsChartProps {
  timeseries: DailyTimeseriesPoint[];
  title?: string;
  subtitle?: string;
}

export function AnalyticsTrendsChart({
  timeseries,
  title = 'Surplus & Rescue Activity Trends',
  subtitle = 'Daily food surplus postings and verified rescued servings',
}: AnalyticsTrendsChartProps) {
  const [activePoint, setActivePoint] = useState<DailyTimeseriesPoint | null>(null);

  if (!timeseries || timeseries.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 text-center text-slate-500 text-xs">
        No historical trend data available for this range.
      </div>
    );
  }

  // Calculate maximums for scaling
  const maxDonations = Math.max(1, ...timeseries.map((d) => d.donationsCount));

  // Chart dimensions in SVG coordinates
  const height = 180;
  const paddingX = 15;
  const paddingTop = 20;
  const paddingBottom = 30;
  const innerHeight = height - paddingTop - paddingBottom;
  const totalWidth = 600;
  const innerWidth = totalWidth - paddingX * 2;
  const barWidth = Math.max(4, Math.min(16, (innerWidth / timeseries.length) * 0.7));
  const stepX = innerWidth / Math.max(1, timeseries.length - 1 || 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: cinematicEase }}
      className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-purple-500 inline-block" />
            <span className="text-slate-600">Surplus Listings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
            <span className="text-slate-600">Completed Rescues</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalWidth} ${height}`}
          className="w-full h-48 sm:h-56 select-none"
          preserveAspectRatio="none"
        >
          {/* Background Grid Lines */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={totalWidth - paddingX}
            y2={paddingTop}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingTop + innerHeight / 2}
            x2={totalWidth - paddingX}
            y2={paddingTop + innerHeight / 2}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingTop + innerHeight}
            x2={totalWidth - paddingX}
            y2={paddingTop + innerHeight}
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Render Bars with smooth animated rise */}
          {timeseries.map((d, idx) => {
            const cx = paddingX + idx * stepX;
            const donationHeight = (d.donationsCount / maxDonations) * innerHeight;
            const completedHeight = (d.completedCount / maxDonations) * innerHeight;

            return (
              <g
                key={d.date}
                className="cursor-pointer group"
                onMouseEnter={() => setActivePoint(d)}
                onClick={() => setActivePoint(d)}
              >
                {/* Hit area */}
                <rect
                  x={cx - stepX / 2}
                  y={0}
                  width={stepX}
                  height={height}
                  fill="transparent"
                />

                {/* Donation bar */}
                <motion.rect
                  x={cx - barWidth / 2}
                  y={paddingTop + innerHeight - Math.max(2, donationHeight)}
                  width={barWidth}
                  height={Math.max(2, donationHeight)}
                  rx={2}
                  initial={{ height: 0, y: paddingTop + innerHeight }}
                  animate={{
                    height: Math.max(2, donationHeight),
                    y: paddingTop + innerHeight - Math.max(2, donationHeight),
                  }}
                  transition={{ duration: 0.6, delay: idx * 0.015, ease: cinematicEase }}
                  className="fill-purple-300 group-hover:fill-purple-500 transition-colors"
                />

                {/* Completed bar */}
                {d.completedCount > 0 && (
                  <motion.rect
                    x={cx - barWidth / 2 + 1}
                    y={paddingTop + innerHeight - Math.max(2, completedHeight)}
                    width={Math.max(2, barWidth - 2)}
                    height={Math.max(2, completedHeight)}
                    rx={2}
                    initial={{ height: 0, y: paddingTop + innerHeight }}
                    animate={{
                      height: Math.max(2, completedHeight),
                      y: paddingTop + innerHeight - Math.max(2, completedHeight),
                    }}
                    transition={{ duration: 0.7, delay: 0.1 + idx * 0.015, ease: cinematicEase }}
                    className="fill-emerald-500 group-hover:fill-emerald-600 transition-colors"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Date Labels on X Axis */}
        <div className="flex justify-between text-[10px] text-slate-400 px-3 pt-1 border-t border-slate-100">
          <span>{timeseries[0]?.date}</span>
          {timeseries.length > 2 && (
            <span>{timeseries[Math.floor(timeseries.length / 2)]?.date}</span>
          )}
          <span>{timeseries[timeseries.length - 1]?.date}</span>
        </div>
      </div>

      {/* Active Day Detail Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePoint ? activePoint.date : 'placeholder'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">
              {activePoint ? activePoint.date : 'Hover or tap on any bar above for day breakdown'}
            </span>
          </div>

          {activePoint ? (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-purple-700 font-semibold">
                Donations posted: <strong>{activePoint.donationsCount}</strong>
              </span>
              <span className="text-emerald-700 font-semibold">
                Completed rescues: <strong>{activePoint.completedCount}</strong>
              </span>
              <span className="text-slate-700 font-semibold">
                Rescued: <strong>{activePoint.rescuedServings} servings</strong>
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px]">
              Showing activity across {timeseries.length} days
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
