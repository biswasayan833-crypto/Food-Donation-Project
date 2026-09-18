'use client';

import React from 'react';
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2, Info } from 'lucide-react';
import { FoodUrgencyResult, computeFoodUrgency } from '@/services/food-urgency.service';

interface UrgencyBadgeProps {
  urgency?: FoodUrgencyResult | null;
  listing?: any;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showTime?: boolean;
  showAction?: boolean;
  className?: string;
}

export function UrgencyBadge({
  urgency: propUrgency,
  listing,
  size = 'md',
  showScore = true,
  showTime = true,
  showAction = false,
  className = '',
}: UrgencyBadgeProps) {
  // Use provided urgency result or compute client-side as fallback
  const urgency =
    propUrgency || (listing ? computeFoodUrgency(listing, listing.claims?.[0]) : null);

  if (!urgency) {
    return null;
  }

  const { score, level, isExpired, isCompleted, timeRemainingDisplay, reasons, recommendedAction } =
    urgency;

  // Render Completed/Delivered state
  if (isCompleted) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        title="Food donation successfully delivered"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
        <span>Delivered</span>
      </span>
    );
  }

  // Render Expired state
  if (isExpired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 ${className}`}
        title={recommendedAction}
      >
        <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
        <span>Cutoff Exceeded</span>
      </span>
    );
  }

  // Active urgency badge styling
  const styleConfig = {
    CRITICAL: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200/90',
      dot: 'bg-rose-500',
      icon: AlertTriangle,
      iconColor: 'text-rose-600',
      pill: 'bg-rose-600 text-white',
    },
    HIGH: {
      bg: 'bg-orange-50 text-orange-800 border-orange-200/90',
      dot: 'bg-orange-500',
      icon: Clock,
      iconColor: 'text-orange-600',
      pill: 'bg-orange-600 text-white',
    },
    MEDIUM: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200/90',
      dot: 'bg-amber-500',
      icon: Clock,
      iconColor: 'text-amber-600',
      pill: 'bg-amber-600 text-white',
    },
    LOW: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      pill: 'bg-emerald-600 text-white',
    },
  }[level] || {
    bg: 'bg-slate-50 text-slate-800 border-slate-200',
    dot: 'bg-slate-500',
    icon: Clock,
    iconColor: 'text-slate-600',
    pill: 'bg-slate-700 text-white',
  };

  const Icon = styleConfig.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const tooltipText = [
    `Operational Urgency: ${score}/100 (${level})`,
    ...reasons,
    `Action: ${recommendedAction}`,
  ].join('\n• ');

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className={`inline-flex items-center rounded-full font-bold border shadow-2xs transition-all ${styleConfig.bg} ${sizeClasses} ${className}`}
        title={tooltipText}
      >
        <span className="flex h-2 w-2 relative shrink-0">
          {level === 'CRITICAL' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${styleConfig.dot}`} />
        </span>

        <span>{level}</span>

        {showScore && (
          <span className="text-[10px] font-mono opacity-80 border-l border-current/20 pl-1.5 ml-0.5">
            {score}/100
          </span>
        )}

        {showTime && timeRemainingDisplay && (
          <span className="text-[11px] font-medium opacity-90 border-l border-current/20 pl-1.5 ml-0.5">
            {timeRemainingDisplay}
          </span>
        )}
      </div>

      {showAction && recommendedAction && (
        <p className="text-[11px] font-medium text-slate-500 leading-tight">
          {recommendedAction}
        </p>
      )}
    </div>
  );
}
