'use client';

import React from 'react';

export function DonationCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col animate-pulse">
      {/* Image Skeleton */}
      <div className="relative w-full aspect-16/10 bg-slate-200">
        <div className="absolute top-3 left-3 w-20 h-6 rounded-full bg-slate-300" />
        <div className="absolute top-3 right-3 w-28 h-6 rounded-full bg-slate-300" />
        <div className="absolute bottom-3 left-3 w-32 h-6 rounded-full bg-slate-300" />
      </div>

      {/* Content Skeleton */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Title */}
          <div className="h-5 bg-slate-200 rounded-lg w-4/5" />
          <div className="h-4 bg-slate-100 rounded-lg w-3/5" />

          {/* Quantity & Expiry tags */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-6 w-24 bg-slate-200 rounded-md" />
            <div className="h-6 w-20 bg-slate-200 rounded-md" />
          </div>
        </div>

        {/* Location & Donor info */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-1/4" />
          </div>
          <div className="h-10 bg-slate-200 rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
}

export function DonationFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <DonationCardSkeleton key={i} />
      ))}
    </div>
  );
}
