'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  UtensilsCrossed,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Sparkles,
  Truck,
  ChevronDown,
  HeartHandshake,
} from 'lucide-react';
import {
  staggerContainer,
  fadeInUp,
  buttonPressMotion,
  floatSlowMotion,
  cinematicEase,
} from '@/lib/motion';

interface HeroSectionProps {
  initialMeals: number;
  initialDonors: number;
  initialReceivers: number;
  initialSuccessfulRescues: number;
}

export function HeroSection({
  initialMeals,
  initialDonors,
  initialReceivers,
  initialSuccessfulRescues,
}: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  // Smooth counter animation hook
  const useAnimatedCounter = (target: number, durationMs: number = 1600) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (shouldReduceMotion) {
        setCount(target);
        return;
      }

      let startTime: number | null = null;
      let animationFrame: number;

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / durationMs, 1);
        // Ease-out cubic formula
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOut * target));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        } else {
          setCount(target);
        }
      };

      animationFrame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animationFrame);
    }, [target, durationMs, shouldReduceMotion]);

    return count;
  };

  const animatedMeals = useAnimatedCounter(initialMeals);
  const animatedDonors = useAnimatedCounter(initialDonors);
  const animatedReceivers = useAnimatedCounter(initialReceivers);
  const animatedRescues = useAnimatedCounter(initialSuccessfulRescues);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/80 via-slate-50 to-white pt-16 pb-20 lg:pt-24 lg:pb-32">
        {/* Cinematic Ambient Glow Blobs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-gradient-to-tr from-emerald-300/25 to-teal-200/25 blur-3xl -z-0 pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[250px] bg-sky-200/20 blur-3xl -z-0 pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading & CTAs */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              {/* Floating Pill Badge */}
              <motion.div variants={fadeInUp} className="inline-block">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300/80 text-emerald-800 text-xs font-bold tracking-wide shadow-xs backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>Zero Hunger & Zero Waste Initiative</span>
                </div>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]"
              >
                Turn Surplus Food Into{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700">
                  Community Plates
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={fadeInUp}
                className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed"
              >
                Connect restaurants, bakeries, corporate cafeterias, and grocery stores with nearby
                NGOs, shelters, and food kitchens in real-time. Rescue fresh food before it goes to
                waste with intelligent dispatch.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={fadeInUp}
                className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                  <Link
                    href="/donations/create"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Donate Surplus Food</span>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                  <Link
                    href="/donations"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-xs hover:border-emerald-400 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Browse Available Food</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                variants={fadeInUp}
                className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 flex-wrap"
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Good Samaritan Protected</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Real-time GPS Tracking</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>QR Verified Handover</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column: Hero Visual Card with Parallax Float */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: cinematicEase }}
              className="lg:col-span-5 relative"
            >
              <motion.div
                animate={!shouldReduceMotion ? { y: [0, -8, 0] } : undefined}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mx-auto max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-200/90 glow-emerald"
              >
                <div className="relative h-64 rounded-2xl overflow-hidden mb-4 group">
                  <img
                    src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80"
                    alt="Volunteers sharing food"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                  {/* Pulsing Live Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-xs text-white text-[11px] font-bold shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>LIVE MISSION</span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="font-bold text-base">Evening Bread & Meal Rescue</p>
                    <p className="text-xs text-slate-200 mt-0.5 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Dispatched to 3 local community shelters</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-950">Successful Rescues</p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          {initialSuccessfulRescues.toLocaleString()} verified community deliveries
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      Verified
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                        <Truck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Average Pickup Speed</p>
                        <p className="text-[11px] text-slate-500 font-medium">From listing to courier collection</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-800 bg-slate-200/70 px-2.5 py-1 rounded-md">
                      42 Minutes
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Smooth Scroll Indicator */}
          <div className="pt-12 text-center hidden sm:block">
            <motion.a
              href="#impact-section"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex flex-col items-center text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <span>Explore Platform Impact</span>
              <ChevronDown className="w-4 h-4 mt-1" />
            </motion.a>
          </div>
        </div>
      </section>

      {/* Live Impact Counters Section */}
      <section id="impact-section" className="bg-slate-900 text-white py-14 border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/60 shadow-xs hover:border-emerald-500/40 transition-colors"
            >
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                {animatedMeals.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Food Servings Saved</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/60 shadow-xs hover:border-teal-500/40 transition-colors"
            >
              <p className="text-3xl sm:text-4xl font-black text-teal-300 tracking-tight">
                {animatedRescues.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Successful Rescues</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/60 shadow-xs hover:border-amber-500/40 transition-colors"
            >
              <p className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                {animatedDonors.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Food Donors</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/60 shadow-xs hover:border-cyan-500/40 transition-colors"
            >
              <p className="text-3xl sm:text-4xl font-black text-cyan-300 tracking-tight">
                {animatedReceivers.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">NGO Partners</p>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
