import React from 'react';
import Link from 'next/link';
import {
  HeartHandshake,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Heart,
  Sparkles,
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1 & 2: Platform Identity & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-white">
                  Share<span className="text-emerald-400">Plate</span>
                </span>
                <span className="text-[10px] text-slate-400 -mt-1 font-medium tracking-wide">
                  FOOD RESCUE NETWORK
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Empowering food businesses, restaurants, caterers, and supermarkets to eliminate food
              waste by connecting edible surplus with local shelters, food banks, and soup kitchens in
              real-time.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Good Samaritan Act Protected
              </div>
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/donations"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Browse Available Food
                </Link>
              </li>
              <li>
                <Link
                  href="/donations/create"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  List Food Surplus
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Partner Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/signup"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Register as NGO / Donor
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Food Safety & Guidelines */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Safety & Standards
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Temperature Control Check
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Safe Packaging Seals
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Allergen Labeling Mandate
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                OTP Verified Handover
              </li>
            </ul>
          </div>

          {/* Col 5: Contact & Emergency Dispatch */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              24/7 Rescue Dispatch
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>+1 (800) 555-FOOD</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>dispatch@shareplate.org</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>New York City Metro Area</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} SharePlate Food Rescue Network. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-1 text-slate-400">
              Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> for
              zero hunger and zero waste.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
