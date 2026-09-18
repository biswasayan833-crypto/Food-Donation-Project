'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CategoryBadge } from './CategoryBadge';
import { cinematicEase } from '@/lib/motion';

export interface FoodListingItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  quantity: string;
  expiryTime: string | Date;
  foodType: string;
  status: string;
  locationAddress: string;
  donorId?: string;
  donor?: {
    id: string;
    name: string;
    role?: string;
    location?: string | null;
    phone?: string | null;
  } | null;
}

interface FoodCardProps {
  listing: FoodListingItem;
}

export function FoodCard({ listing }: FoodCardProps) {
  const expiry = new Date(listing.expiryTime);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = diffMs <= 0;
  const isUrgent = !isExpired && diffHours <= 6;

  let expiryDisplay = '';
  if (isExpired) {
    expiryDisplay = 'Expired';
  } else if (diffHours < 1) {
    const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    expiryDisplay = `${mins}m left`;
  } else if (diffHours < 24) {
    expiryDisplay = `${diffHours}h left`;
  } else {
    expiryDisplay = `${diffDays}d left`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25, ease: cinematicEase }}
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-emerald-300/80 transition-all duration-300 overflow-hidden flex flex-col group relative"
    >
      {/* Top Banner with Badges & Image */}
      <div className="relative h-52 w-full bg-slate-900 p-4 flex flex-col justify-between overflow-hidden">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            unoptimized
            className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-slate-700/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/25" />

        {/* Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <CategoryBadge foodType={listing.foodType} size="sm" />

          {listing.status === 'AVAILABLE' ? (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-xs ${
                isUrgent
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600/90 text-white'
              }`}
            >
              {isUrgent ? '⚡ Urgent' : 'Available'}
            </span>
          ) : listing.status === 'CLAIMED' ? (
            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-sm">
              Claimed
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-sm">
              Delivered
            </span>
          )}
        </div>

        {/* Bottom stats inside banner */}
        <div className="relative z-10 flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md font-semibold border border-white/10">
            <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>{expiryDisplay}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md font-black text-emerald-300 border border-white/10">
            {listing.quantity}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Donor info */}
          <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-500">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">
              {listing.donor?.name || 'Verified Donor'}
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/donations/${listing.id}`}
            className="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors line-clamp-1 block"
          >
            {listing.title}
          </Link>

          {/* Description */}
          {listing.description && (
            <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>

        {/* Footer Area of Card */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[140px] font-medium">
              {listing.locationAddress}
            </span>
          </div>

          <Link
            href={`/donations/${listing.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl"
          >
            <span>{listing.status === 'AVAILABLE' ? 'Claim' : 'View'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
