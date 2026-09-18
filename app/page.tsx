import React from 'react';
import Link from 'next/link';
import {
  HeartHandshake,
  UtensilsCrossed,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Leaf,
  Layers,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { parseQuantityToServings } from '@/services/donation-matching.service';
import { FoodCard, FoodListingItem } from '@/components/FoodCard';
import { HeroSection } from '@/components/HeroSection';

export const revalidate = 0; // Dynamic data

export default async function HomePage() {
  // Fetch real platform metrics & latest listings directly from Neon PostgreSQL
  let listings: any[] = [];
  let totalDonors = 0;
  let totalReceivers = 0;
  let successfulRescues = 0;
  let foodServingsSaved = 0;

  try {
    const [recentListings, allListings, donorsCount, receiversCount] = await Promise.all([
      prisma.foodListing.findMany({
        where: { status: 'AVAILABLE' },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              role: true,
              location: true,
              phone: true,
            },
          },
        },
      }),
      prisma.foodListing.findMany({
        select: {
          quantity: true,
          status: true,
          claims: {
            select: { status: true, deliveryStatus: true },
          },
        },
      }),
      prisma.user.count({ where: { role: 'DONOR' } }),
      prisma.user.count({ where: { role: 'RECEIVER' } }),
    ]);

    listings = recentListings;
    totalDonors = donorsCount;
    totalReceivers = receiversCount;

    let totalCompletedServings = 0;
    allListings.forEach((item) => {
      const servings = parseQuantityToServings(item.quantity);
      const isCompleted =
        item.status === 'COMPLETED' ||
        item.status === 'DELIVERED' ||
        item.claims.some((c) => c.status === 'COMPLETED' || c.deliveryStatus === 'DELIVERED');

      if (isCompleted) {
        successfulRescues++;
        totalCompletedServings += servings;
      }
    });

    // Report actual verified rescued servings if completed rescues exist;
    // otherwise report total active servings mobilized across all posted listings
    foodServingsSaved = totalCompletedServings > 0
      ? totalCompletedServings
      : allListings.reduce((acc, item) => acc + parseQuantityToServings(item.quantity), 0);
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Cinematic Hero & Animated Impact Counters */}
      <HeroSection
        initialMeals={foodServingsSaved}
        initialDonors={totalDonors}
        initialReceivers={totalReceivers}
        initialSuccessfulRescues={successfulRescues}
      />

      {/* Featured Available Food Listings */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Active Surplus Donations
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Ready for Pickup Right Now
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Verified high-quality surplus meals, baked goods, and produce
              </p>
            </div>

            <Link
              href="/donations"
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 group"
            >
              <span>Explore All Listings</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No active listings at this moment</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Be the first to list surplus food or check back soon as restaurants post after shifts.
              </p>
              <Link
                href="/donations/create"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-md"
              >
                Donate Food
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((item) => (
                <FoodCard key={item.id} listing={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
              Simple 3-Step Process
            </h2>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              How Food Rescue Works
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              From business surplus to community tables in three seamless, secure steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative bg-slate-50 rounded-3xl p-8 border border-slate-200/80 flex flex-col items-start hover:border-emerald-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Post In Under 60 Seconds</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Donors specify food type, quantity, dietary flags, and pickup window. Our platform
                immediately alerts nearby verified food banks and shelters.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-slate-50 rounded-3xl p-8 border border-slate-200/80 flex flex-col items-start hover:border-blue-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">NGO Claims & Reserves</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Local charities review dietary details, reserve the batch, and generate a secure
                4-digit verification OTP for safe and accountable handover.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-slate-50 rounded-3xl p-8 border border-slate-200/80 flex flex-col items-start hover:border-teal-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 font-black text-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Fast Pickup & Distribution</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Volunteers collect the food safely using insulated transport and serve wholesome
                meals to vulnerable community members within hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to make an immediate impact today?
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto">
            Whether you are a food business looking to cut waste or an NGO fighting hunger, join our
            verified network now.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-sm shadow-xl transition-all"
            >
              Join SharePlate Network
            </Link>
            <Link
              href="/listings"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-700/60 hover:bg-emerald-700 text-white font-bold text-sm border border-emerald-500/40 transition-all"
            >
              Browse Food Surplus
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
