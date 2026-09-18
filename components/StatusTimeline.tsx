import React from 'react';
import { CheckCircle2, Clock, Package, Truck, Award } from 'lucide-react';

interface StatusTimelineProps {
  currentStatus: 'AVAILABLE' | 'CLAIMED' | 'REQUESTED' | 'APPROVED' | 'PICKED_UP' | 'DELIVERED';
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const steps = [
    { key: 'AVAILABLE', label: 'Surplus Listed', icon: Package },
    { key: 'CLAIMED', label: 'Claimed by NGO', icon: Clock },
    { key: 'PICKED_UP', label: 'Picked Up', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered & Served', icon: Award },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 0;
      case 'REQUESTED':
      case 'APPROVED':
      case 'CLAIMED':
        return 1;
      case 'PICKED_UP':
        return 2;
      case 'DELIVERED':
      case 'COMPLETED':
        return 3;
      default:
        return 0;
    }
  };

  const activeIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-white border-emerald-600 text-emerald-600 ring-4 ring-emerald-100'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`text-xs mt-2 font-medium tracking-tight whitespace-nowrap ${
                  isCurrent
                    ? 'text-emerald-700 font-bold'
                    : isCompleted
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
