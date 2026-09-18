'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Search,
  MapPin,
  Clock,
  UtensilsCrossed,
  PlusCircle,
  RefreshCw,
  ChevronRight,
  Building2,
  Leaf,
  Drumstick,
  Sparkles,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { CategoryBadge } from '@/components/CategoryBadge';
import { DonationFeedSkeleton } from '@/components/DonationCardSkeleton';
import { UrgencyBadge } from '@/components/UrgencyBadge';

export interface DonationItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  quantity: string;
  expiryTime: string | Date;
  foodType: string; // VEG, NON_VEG, RAW, COOKED
  temperatureControl?: 'ROOM_TEMP' | 'REFRIGERATED' | 'FROZEN' | string | null;
  safetyChecklistPassed?: boolean | null;
  prepTimestamp?: string | Date | null;
  status: string;
  locationAddress: string;
  donorId?: string;
  createdAt?: string | Date;
  urgency?: any;
  donor?: {
    id: string;
    name: string;
    role?: string;
    location?: string | null;
    phone?: string | null;
  } | null;
}

const DEFAULT_FOOD_PHOTOS: Record<string, string> = {
  COOKED: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  VEG: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  RAW: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80',
  NON_VEG: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80',
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

export default function AvailableDonationsPage() {
  const [listings, setListings] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [foodTypeFilter, setFoodTypeFilter] = useState<'ALL' | 'VEG' | 'NON_VEG' | 'RAW' | 'COOKED'>('ALL');
  const [locationSearch, setLocationSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'URGENT' | 'TODAY' | 'EXTENDED'>('ALL');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [sortBy, setSortBy] = useState<'URGENCY' | 'NEWEST' | 'QUANTITY'>('URGENCY');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/listings?status=AVAILABLE');
      const data = await res.json();
      if (data.listings) {
        setListings(data.listings);
      }
    } catch (err) {
      console.error('Failed to load available donations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Filter listings on client based on foodType, location, urgency, and keyword
  const filteredListings = useMemo(() => {
    const now = Date.now();

    const filtered = listings.filter((item) => {
      // 1. Food Type (Veg / Non-Veg / etc.)
      if (foodTypeFilter !== 'ALL' && item.foodType !== foodTypeFilter) {
        return false;
      }

      // 2. Location filter
      if (locationSearch.trim()) {
        const query = locationSearch.toLowerCase().trim();
        const loc = (item.locationAddress || '').toLowerCase();
        const donorLoc = (item.donor?.location || '').toLowerCase();
        if (!loc.includes(query) && !donorLoc.includes(query)) {
          return false;
        }
      }

      // 3. Expiry Urgency
      const expiryMs = new Date(item.expiryTime).getTime();
      const diffHours = (expiryMs - now) / (1000 * 60 * 60);

      if (urgencyFilter === 'URGENT') {
        if (diffHours > 6 || diffHours <= 0) return false;
      } else if (urgencyFilter === 'TODAY') {
        if (diffHours > 24 || diffHours <= 0) return false;
      } else if (urgencyFilter === 'EXTENDED') {
        if (diffHours <= 24) return false;
      }

      // 4. Keyword Search
      if (keywordSearch.trim()) {
        const query = keywordSearch.toLowerCase().trim();
        const title = (item.title || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        if (!title.includes(query) && !desc.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Sort listings
    const sorted = [...filtered];
    if (sortBy === 'URGENCY') {
      sorted.sort((a, b) => (b.urgency?.score ?? 0) - (a.urgency?.score ?? 0));
    } else if (sortBy === 'NEWEST') {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } else if (sortBy === 'QUANTITY') {
      sorted.sort((a, b) => {
        const qA = parseFloat(a.quantity) || 0;
        const qB = parseFloat(b.quantity) || 0;
        return qB - qA;
      });
    }

    return sorted;
  }, [listings, foodTypeFilter, locationSearch, urgencyFilter, keywordSearch, sortBy]);

  const resetFilters = () => {
    setFoodTypeFilter('ALL');
    setLocationSearch('');
    setUrgencyFilter('ALL');
    setKeywordSearch('');
  };

  const getTempBadge = (temp?: string | null) => {
    if (temp === 'REFRIGERATED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/80 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
          <Snowflake className="w-3 h-3" />
          <span>Chilled</span>
        </span>
      );
    }
    if (temp === 'FROZEN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/80 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
          <Snowflake className="w-3 h-3" />
          <span>Frozen</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/80 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
        <Thermometer className="w-3 h-3" />
        <span>Ambient</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Food Discovery & Rescue</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Available Food Donations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Browse verified fresh surplus ready for immediate pickup by community shelters, charities,
            and authorized volunteers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/donations/create"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Donation</span>
          </Link>

          <button
            onClick={fetchListings}
            title="Refresh Available Food"
            className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Controls Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        {/* Search Inputs (Keyword & Location) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              placeholder="Search by food title, bread, rice, soup, fruit..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Location Search */}
          <div className="sm:col-span-5 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Filter by location (e.g. Broadway, New York, Brooklyn)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Food Type Chips & Urgency Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          {/* Food Type Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Food Type:
            </span>

            <button
              onClick={() => setFoodTypeFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                foodTypeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Types
            </button>

            <button
              onClick={() => setFoodTypeFilter('VEG')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                foodTypeFilter === 'VEG'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50/70 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Veg Only</span>
            </button>

            <button
              onClick={() => setFoodTypeFilter('NON_VEG')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                foodTypeFilter === 'NON_VEG'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50/70 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Drumstick className="w-3.5 h-3.5" />
              <span>Non-Veg Only</span>
            </button>

            <button
              onClick={() => setFoodTypeFilter('RAW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                foodTypeFilter === 'RAW'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50/70 text-blue-800 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              Raw / Produce
            </button>

            <button
              onClick={() => setFoodTypeFilter('COOKED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                foodTypeFilter === 'COOKED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50/70 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Cooked Meals
            </button>
          </div>

          {/* Expiry Urgency Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Urgency:
            </span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Expiries</option>
              <option value="URGENT">⚡ Urgent (&lt; 6 hrs)</option>
              <option value="TODAY">🕒 Today (&lt; 24 hrs)</option>
              <option value="EXTENDED">📅 Extended (24+ hrs)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="URGENCY">⚡ Operational Urgency</option>
              <option value="NEWEST">🕒 Newest First</option>
              <option value="QUANTITY">📦 Highest Quantity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-800">{filteredListings.length}</strong> available food{' '}
          {filteredListings.length === 1 ? 'donation' : 'donations'}
        </span>

        {(foodTypeFilter !== 'ALL' || locationSearch || urgencyFilter !== 'ALL' || keywordSearch) && (
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Feed Content */}
      {loading ? (
        <DonationFeedSkeleton count={6} />
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 max-w-xl mx-auto shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Matching Donations</h3>
          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
            We couldn't find any available food donations matching your filters. Try clearing your
            search or selecting another category.
          </p>
          <button
            onClick={resetFilters}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredListings.map((item) => {
            const expiry = new Date(item.expiryTime);
            const now = new Date();
            const diffMs = expiry.getTime() - now.getTime();
            const diffHours = Math.round(diffMs / (1000 * 60 * 60));
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            const isUrgent = diffHours > 0 && diffHours <= 6;
            const isExpired = diffMs <= 0;

            let expiryLabel = '';
            if (isExpired) {
              expiryLabel = 'Expired';
            } else if (diffHours < 1) {
              const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
              expiryLabel = `${mins}m left`;
            } else if (diffHours < 24) {
              expiryLabel = `${diffHours}h left`;
            } else {
              expiryLabel = `${diffDays}d left`;
            }

            const foodPhoto = item.imageUrl || DEFAULT_FOOD_PHOTOS[item.foodType] || DEFAULT_FOOD_PHOTOS.COOKED;

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                {/* Visual Full-Bleed Photo Header */}
                <div>
                  <div className="relative w-full aspect-16/10 bg-slate-900 overflow-hidden">
                    <Image
                      src={foodPhoto}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    {/* Dark gradient vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/30" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CategoryBadge foodType={item.foodType} size="sm" />
                        {getTempBadge(item.temperatureControl)}
                      </div>

                      <UrgencyBadge urgency={item.urgency} listing={item} size="sm" showScore={true} showTime={false} />
                    </div>

                    {/* Bottom Photo Overlay Info */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10">
                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold backdrop-blur-md text-[11px] ${
                          isUrgent ? 'bg-rose-600/90 text-white' : 'bg-black/60 text-emerald-300'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{expiryLabel}</span>
                      </div>

                      <div className="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md font-bold text-white text-[11px]">
                        {item.quantity}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    {/* Donor organization / name */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700 truncate">
                          {item.donor?.name || 'Verified Donor'}
                        </span>
                      </div>

                      {item.safetyChecklistPassed && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0"
                          title="4-point food safety checklist verified"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Safe</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <Link
                      href={`/donations/${item.id}`}
                      className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors line-clamp-1 block"
                    >
                      {item.title}
                    </Link>

                    {/* Description preview */}
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Pickup Location */}
                    <div className="flex items-start gap-1.5 text-xs text-slate-500 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 text-slate-600 font-medium">
                        {item.locationAddress}
                      </span>
                    </div>

                    {item.urgency?.recommendedAction && item.urgency.score >= 50 && (
                      <p className="text-[11px] font-semibold text-rose-700 bg-rose-50/90 px-2.5 py-1 rounded-xl border border-rose-200/80 leading-tight">
                        ⚡ {item.urgency.recommendedAction}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <Link
                    href={`/donations/${item.id}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 group-hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md"
                  >
                    <span>View Details & Claim</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
