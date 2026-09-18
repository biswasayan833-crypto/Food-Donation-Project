'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  PlusCircle,
  Clock,
  MapPin,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  Leaf,
  Drumstick,
  Apple,
  Utensils,
  Thermometer,
  ShieldCheck,
  CheckSquare,
  Square,
  Snowflake,
} from 'lucide-react';
import { createFoodDonation } from '@/app/actions/donationActions';
import { useToast } from '@/components/Toast';
import { ImageUploader } from '@/components/ImageUploader';

export default function CreateDonationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<'COOKED' | 'RAW' | 'VEG' | 'NON_VEG'>('COOKED');
  const [quantityValue, setQuantityValue] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('servings');
  const [expiryTime, setExpiryTime] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Food Safety States
  const [temperatureControl, setTemperatureControl] = useState<'ROOM_TEMP' | 'REFRIGERATED' | 'FROZEN'>('ROOM_TEMP');
  const [prepTimestamp, setPrepTimestamp] = useState('');
  const [checkStorage, setCheckStorage] = useState(false);
  const [checkPackaging, setCheckPackaging] = useState(false);
  const [checkTimestamp, setCheckTimestamp] = useState(false);
  const [checkAllergens, setCheckAllergens] = useState(false);

  const allSafetyChecked = checkStorage && checkPackaging && checkTimestamp && checkAllergens;

  // UI feedback states
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Compute default expiry time & default prep timestamp
  useEffect(() => {
    const defaultDate = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const year = defaultDate.getFullYear();
    const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const day = String(defaultDate.getDate()).padStart(2, '0');
    const hours = String(defaultDate.getHours()).padStart(2, '0');
    const minutes = String(defaultDate.getMinutes()).padStart(2, '0');
    setExpiryTime(`${year}-${month}-${day}T${hours}:${minutes}`);

    const defaultPrep = new Date(Date.now() - 60 * 60 * 1000);
    const pYear = defaultPrep.getFullYear();
    const pMonth = String(defaultPrep.getMonth() + 1).padStart(2, '0');
    const pDay = String(defaultPrep.getDate()).padStart(2, '0');
    const pHours = String(defaultPrep.getHours()).padStart(2, '0');
    const pMinutes = String(defaultPrep.getMinutes()).padStart(2, '0');
    setPrepTimestamp(`${pYear}-${pMonth}-${pDay}T${pHours}:${pMinutes}`);
  }, []);

  // Autofill location from user profile
  useEffect(() => {
    if (session?.user?.location) {
      setLocationAddress((prev) => prev || session.user.location || '');
    }
  }, [session]);

  const setQuickExpiry = (hoursFromNow: number) => {
    const targetDate = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    setExpiryTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const setQuickPrep = (hoursAgo: number) => {
    const targetDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    setPrepTimestamp(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleApplyPreset = (preset: 'cooked' | 'veg' | 'raw' | 'non_veg') => {
    setCheckStorage(true);
    setCheckPackaging(true);
    setCheckTimestamp(true);
    setCheckAllergens(true);

    if (preset === 'cooked') {
      setTitle('Fresh Warm Vegetarian Lasagna Trays');
      setImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80');
      setCategory('COOKED');
      setTemperatureControl('REFRIGERATED');
      setQuantityValue('35');
      setQuantityUnit('servings');
      setQuickPrep(2);
      setQuickExpiry(6);
      setLocationAddress(locationAddress || '452 Grand Avenue, Rear Kitchen Bay, New York, NY');
      setSpecialInstructions('Kept hot above 65°C in covered catering pans. Needs pickup before 8 PM.');
    } else if (preset === 'veg') {
      setTitle('Artisan Multigrain Baguettes & Croissants');
      setImageUrl('https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80');
      setCategory('VEG');
      setTemperatureControl('ROOM_TEMP');
      setQuantityValue('16');
      setQuantityUnit('kg');
      setQuickPrep(3);
      setQuickExpiry(18);
      setLocationAddress(locationAddress || '120 Broadway Tower, Bakery Level, New York, NY');
      setSpecialInstructions('Baked fresh this morning, sealed in food-grade delivery boxes.');
    } else if (preset === 'raw') {
      setTitle('Farm Fresh Gala Apples & Valencia Oranges');
      setImageUrl('https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80');
      setCategory('RAW');
      setTemperatureControl('ROOM_TEMP');
      setQuantityValue('30');
      setQuantityUnit('kg');
      setQuickPrep(12);
      setQuickExpiry(72);
      setLocationAddress(locationAddress || '88 Green Market Pavilion, New York, NY');
      setSpecialInstructions('Surplus orchard crates. Perfectly crisp and ready for community delivery.');
    } else {
      setTitle('Grilled Lemon Herb Chicken with Roasted Potatoes');
      setImageUrl('https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1200&q=80');
      setCategory('NON_VEG');
      setTemperatureControl('REFRIGERATED');
      setQuantityValue('40');
      setQuantityUnit('servings');
      setQuickPrep(1);
      setQuickExpiry(8);
      setLocationAddress(locationAddress || '120 Broadway Tower, Dock 3, New York, NY');
      setSpecialInstructions('Prepared for corporate event. Kept strictly refrigerated in cold storage.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Client-side quick checks
    if (!title.trim()) {
      setErrorMessage('Please provide a descriptive food title.');
      return;
    }

    if (!quantityValue.trim() || isNaN(Number(quantityValue)) || Number(quantityValue) <= 0) {
      setErrorMessage('Please enter a valid positive quantity number.');
      return;
    }

    if (!prepTimestamp) {
      setErrorMessage('Please specify when this food was prepared.');
      return;
    }

    if (new Date(prepTimestamp).getTime() > Date.now() + 5 * 60 * 1000) {
      setErrorMessage('Preparation time cannot be set in the future.');
      return;
    }

    if (!expiryTime) {
      setErrorMessage('Please specify an expiry date and time.');
      return;
    }

    if (new Date(expiryTime).getTime() <= Date.now()) {
      setErrorMessage('Expiry date and time must be in the future.');
      return;
    }

    if (!locationAddress.trim()) {
      setErrorMessage('Please provide the pickup address.');
      return;
    }

    if (!allSafetyChecked) {
      setErrorMessage('Food safety compliance is mandatory. Please acknowledge all 4 safety checklist items before submitting.');
      showToast('Please confirm all 4 food safety compliance checks.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('imageUrl', imageUrl.trim());
    formData.append('category', category);
    formData.append('temperatureControl', temperatureControl);
    formData.append('prepTimestamp', prepTimestamp);
    formData.append('safetyChecklistPassed', 'true');
    formData.append('quantityValue', quantityValue.trim());
    formData.append('quantityUnit', quantityUnit);
    formData.append('expiryTime', expiryTime);
    formData.append('locationAddress', locationAddress.trim());
    formData.append('specialInstructions', specialInstructions.trim());

    startTransition(async () => {
      const res = await createFoodDonation(null, formData);

      if (res.error) {
        setErrorMessage(res.error);
        showToast(res.error, 'error');
      } else if (res.success && res.listingId) {
        showToast(`"${title}" listed with verified food safety compliance!`, 'success');
        setSuccessMessage('Food donation listed successfully! Redirecting to Donor Dashboard...');
        setTimeout(() => {
          router.push('/dashboard/donor');
          router.refresh();
        }, 1000);
      }
    });
  };

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Sign In to Post Surplus Food</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-8">
          Please log in as a registered Food Donor to create and manage food listings.
        </p>
        <Link
          href="/auth/signin?callbackUrl=/donations/create"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-all"
        >
          <span>Sign In / Quick Demo Login</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const categoryCards = [
    {
      id: 'COOKED',
      label: 'Cooked Meals',
      desc: 'Prepared hot or cold meals',
      icon: Utensils,
      activeColor: 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-400/40',
      iconColor: 'text-amber-600',
    },
    {
      id: 'VEG',
      label: 'Vegetarian',
      desc: 'Plant-based or bakery items',
      icon: Leaf,
      activeColor: 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-400/40',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'RAW',
      label: 'Raw / Produce',
      desc: 'Fruits, veggies, grains & pantry',
      icon: Apple,
      activeColor: 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-400/40',
      iconColor: 'text-blue-600',
    },
    {
      id: 'NON_VEG',
      label: 'Non-Vegetarian',
      desc: 'Contains poultry, meat, or seafood',
      icon: Drumstick,
      activeColor: 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-400/40',
      iconColor: 'text-rose-600',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Breadcrumb navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/donor"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Donor Dashboard</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <PlusCircle className="w-4 h-4" />
            <span>Surplus Food Rescue</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Create Food Listing
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
            List surplus food to connect instantly with local verified charities, shelters, and food
            banks. Every donation eliminates waste and nourishes the community.
          </p>
        </div>
      </div>

      {/* Quick Prefill Presets Bar */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Quick-Fill Presets for Instant Testing:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'cooked', label: '🍲 Cooked Meals (35 servings)' },
              { key: 'veg', label: '🥖 Fresh Bakery (16 kg)' },
              { key: 'raw', label: '🍎 Raw Produce (30 kg)' },
              { key: 'non_veg', label: '🍗 Non-Veg (40 meals)' },
            ].map((preset) => (
              <motion.button
                key={preset.key}
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleApplyPreset(preset.key as any)}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-all shadow-2xs cursor-pointer"
              >
                {preset.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Donation Creation Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8"
      >
        {/* 1. Food Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Food Title *
          </label>
          <div className="relative">
            <UtensilsCrossed className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              disabled={isPending}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Warm Mediterranean Rice Bowls & Roasted Veggies"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-60"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Provide a clear, descriptive title of the surplus food item.
          </p>
        </div>

        {/* 2. Food Photo (AWS S3 Direct Upload) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Food Photo (AWS S3 Direct Upload)
          </label>
          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            onRemove={() => setImageUrl('')}
            disabled={isPending}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Photos build trust with recipient NGOs and increase claim speed by over 3x.
          </p>
        </div>

        {/* 3. Category Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Food Category *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoryCards.map((card) => {
              const Icon = card.icon;
              const isSelected = category === card.id;

              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => setCategory(card.id as any)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                    isSelected
                      ? card.activeColor
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600'
                          : 'border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{card.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{card.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Temperature Control Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Temperature Control Requirements *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'ROOM_TEMP',
                label: 'Room Temperature',
                desc: 'Ambient storage (18°C - 22°C), dry bakery/pantry goods',
                icon: Thermometer,
                color: 'text-amber-600',
                border: 'border-amber-500 bg-amber-50/40',
              },
              {
                id: 'REFRIGERATED',
                label: 'Refrigerated Storage',
                desc: 'Chilled meals kept strictly at 1°C - 4°C in cold holding',
                icon: Snowflake,
                color: 'text-blue-600',
                border: 'border-blue-500 bg-blue-50/40',
              },
              {
                id: 'FROZEN',
                label: 'Deep Frozen',
                desc: 'Maintained frozen solid at or below -18°C',
                icon: Snowflake,
                color: 'text-indigo-600',
                border: 'border-indigo-500 bg-indigo-50/40',
              },
            ].map((temp) => {
              const Icon = temp.icon;
              const isSelected = temperatureControl === temp.id;

              return (
                <button
                  key={temp.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => setTemperatureControl(temp.id as any)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? `${temp.border} shadow-xs`
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${temp.color}`} />
                      <span className="font-bold text-sm text-slate-900">{temp.label}</span>
                    </div>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600'
                          : 'border-slate-300'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">{temp.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Quantity & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Quantity Amount *
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="1"
                step="any"
                required
                disabled={isPending}
                value={quantityValue}
                onChange={(e) => setQuantityValue(e.target.value)}
                placeholder="e.g., 25"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Unit *
            </label>
            <select
              disabled={isPending}
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              <option value="servings">servings / meals</option>
              <option value="kg">kg (kilograms)</option>
              <option value="boxes">boxes / crates</option>
              <option value="packs">packs / bags</option>
              <option value="liters">liters</option>
            </select>
          </div>
        </div>

        {/* 5. Timing Guardrails: Preparation Time & Expiry Cutoff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prep Timestamp */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Preparation Time *
              </label>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>Presets:</span>
                {[
                  { label: 'Now', hours: 0 },
                  { label: '1h ago', hours: 1 },
                  { label: '3h ago', hours: 3 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    disabled={isPending}
                    onClick={() => setQuickPrep(btn.hours)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="datetime-local"
                required
                disabled={isPending}
                value={prepTimestamp}
                onChange={(e) => setPrepTimestamp(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Exact time food was cooked, baked, or harvested.
            </p>
          </div>

          {/* Expiry Cutoff */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pickup Expiry Window *
              </label>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Presets:</span>
                {[
                  { label: '+4h', hours: 4 },
                  { label: '+8h', hours: 8 },
                  { label: '+24h', hours: 24 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    disabled={isPending}
                    onClick={() => setQuickExpiry(btn.hours)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 text-[11px] font-semibold transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="datetime-local"
                required
                disabled={isPending}
                value={expiryTime}
                onChange={(e) => setExpiryTime(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Final cutoff timestamp for safe pickup and distribution.
            </p>
          </div>
        </div>

        {/* 6. Pickup Address */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Pickup Address *
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              disabled={isPending}
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g., 452 Grand Avenue, Suite 101, New York, NY"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* 7. Special Instructions */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Special Instructions & Allergen Disclosures
          </label>
          <div className="relative">
            <textarea
              rows={2}
              disabled={isPending}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g., Ring buzzer B-2 at back alley delivery dock. Allergen note: Contains dairy, tree nuts free. Bring insulated carrier bags."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* 8. MANDATORY FOOD SAFETY COMPLIANCE CHECKLIST */}
        {(() => {
          const checkedCount = [checkStorage, checkPackaging, checkTimestamp, checkAllergens].filter(Boolean).length;
          return (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm tracking-tight">
                      Mandatory Food Safety Compliance Checklist
                    </h3>
                    <p className="text-xs text-slate-500">
                      All 4 safety guardrails must be acknowledged prior to publication
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      allSafetyChecked
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {allSafetyChecked ? '✓ 4 of 4 Verified' : `${checkedCount} of 4 Checked`}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setCheckStorage(true);
                      setCheckPackaging(true);
                      setCheckTimestamp(true);
                      setCheckAllergens(true);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline ml-1 cursor-pointer"
                  >
                    Acknowledge All
                  </button>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-600 rounded-full"
                  initial={false}
                  animate={{ width: `${(checkedCount / 4) * 100}%` }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'storage',
                    checked: checkStorage,
                    onChange: () => setCheckStorage(!checkStorage),
                    title: 'Proper Temperature & Storage Protocol',
                    desc: 'Food has been prepared, chilled, and held strictly under required thermal conditions without temperature abuse.',
                  },
                  {
                    id: 'packaging',
                    checked: checkPackaging,
                    onChange: () => setCheckPackaging(!checkPackaging),
                    title: 'Clean Food-Grade Packaging',
                    desc: 'Surplus items are sealed in new or sanitized food-grade containers and protected against biological and chemical contaminants.',
                  },
                  {
                    id: 'timestamp',
                    checked: checkTimestamp,
                    onChange: () => setCheckTimestamp(!checkTimestamp),
                    title: 'Authentic Preparation & Freshness Timestamp',
                    desc: 'Preparation time and pickup expiration cutoff are accurately stated and strictly within safe human consumption windows.',
                  },
                  {
                    id: 'allergens',
                    checked: checkAllergens,
                    onChange: () => setCheckAllergens(!checkAllergens),
                    title: 'Allergen & Handling Transparency',
                    desc: 'Key allergens (dairy, nuts, gluten, seafood) and special handling instructions are truthfully disclosed to protect recipients.',
                  },
                ].map((item) => (
                  <motion.label
                    key={item.id}
                    whileHover={{ scale: 1.008 }}
                    whileTap={{ scale: 0.995 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      item.checked
                        ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-200/50'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={item.onChange}
                      className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </motion.label>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Submit button with loading state */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <Link
            href="/dashboard/donor"
            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>

          <motion.button
            type="submit"
            whileHover={allSafetyChecked && !isPending ? { scale: 1.02 } : {}}
            whileTap={allSafetyChecked && !isPending ? { scale: 0.98 } : {}}
            disabled={isPending || !allSafetyChecked}
            title={!allSafetyChecked ? 'Please confirm all 4 safety checklist items to publish' : ''}
            className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing Food Listing...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Publish Food Listing</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
