'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  HeartHandshake,
  UtensilsCrossed,
  PlusCircle,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  ShieldCheck,
  Building2,
  ChevronDown,
  QrCode,
  Truck,
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'DONOR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Donor
          </span>
        );
      case 'RECEIVER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            NGO Receiver
          </span>
        );
      case 'VOLUNTEER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            Volunteer Courier
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  const getDashboardUrl = () => {
    if (!session) return '/dashboard';
    if (session.user.role === 'DONOR') return '/dashboard/donor';
    if (session.user.role === 'RECEIVER') return '/dashboard/receiver';
    if (session.user.role === 'VOLUNTEER') return '/dashboard/driver';
    if (session.user.role === 'ADMIN') return '/admin';
    return '/dashboard';
  };

  const getDashboardLabel = () => {
    if (!session) return 'Dashboard';
    if (session.user.role === 'DONOR') return 'Donor Dashboard';
    if (session.user.role === 'RECEIVER') return 'Receiver Dashboard';
    if (session.user.role === 'VOLUNTEER') return 'Courier Workspace';
    if (session.user.role === 'ADMIN') return 'Admin Overview';
    return 'Dashboard';
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Share<span className="text-emerald-600">Plate</span>
                </span>
                <span className="text-[10px] text-slate-500 -mt-1 font-medium tracking-wide">
                  FOOD RESCUE NETWORK
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1 pl-8">
              <Link
                href="/donations"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/donations') || isActive('/listings')
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                Browse Food
              </Link>

              <Link
                href="/donations/create"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/donations/create') || isActive('/donate')
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Donate Food
              </Link>

              <Link
                href="/donations/verify"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/donations/verify')
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <QrCode className="w-4 h-4" />
                Verify QR
              </Link>

              {session && (
                <Link
                  href={getDashboardUrl()}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive(getDashboardUrl())
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {getDashboardLabel()}
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Right Side / Auth */}
          <div className="hidden md:flex items-center space-x-3">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            ) : session ? (
              <div className="flex items-center space-x-2">
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-3 p-1.5 pr-3 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
                      {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">
                      {session.user.name}
                    </p>
                    <p className="text-slate-500 text-[11px] truncate max-w-[120px]">
                      {session.user.location || session.user.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 py-2 z-50 origin-top-right overflow-hidden"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Signed in as
                        </p>
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mb-1.5">
                          {session.user.email}
                        </p>
                        <div className="mt-1">{getRoleBadge(session.user.role)}</div>
                      </div>

                      <div className="py-1">
                        <Link
                          href={getDashboardUrl()}
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                        >
                          {session.user.role === 'ADMIN' ? (
                            <ShieldCheck className="w-4 h-4 mr-2.5 text-purple-600" />
                          ) : (
                            <LayoutDashboard className="w-4 h-4 mr-2.5 text-slate-400" />
                          )}
                          {getDashboardLabel()}
                        </Link>
                        {session.user.role === 'DONOR' && (
                          <Link
                            href="/donations/create"
                            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                          >
                            <PlusCircle className="w-4 h-4 mr-2.5 text-slate-400" />
                            New Food Donation
                          </Link>
                        )}
                        <Link
                          href="/donations"
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                        >
                          <UtensilsCrossed className="w-4 h-4 mr-2.5 text-slate-400" />
                          Available Food
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => signOut({ callbackUrl: '/' })}
                          className="w-full flex items-center px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium"
                        >
                          <LogOut className="w-4 h-4 mr-2.5 text-rose-500" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Join Platform
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Header Right: Notification Bell & Hamburger */}
        <div className="flex md:hidden items-center space-x-1.5">
          <NotificationBell />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-3 overflow-hidden"
          >
            <div className="space-y-1">
              <Link
                href="/donations"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  isActive('/donations') || isActive('/listings')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Browse Food Donations
              </Link>
              <Link
                href="/donations/create"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  isActive('/donations/create') || isActive('/donate')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Donate Food
              </Link>
              <Link
                href="/donations/verify"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  isActive('/donations/verify')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Verify QR Pickup
              </Link>
              {session && (
                <Link
                  href={getDashboardUrl()}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium ${
                    isActive(getDashboardUrl())
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {getDashboardLabel()}
                </Link>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3">
              {session ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-lg">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                        {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{session.user.name}</p>
                      <p className="text-xs text-slate-500">{session.user.email}</p>
                      <div className="mt-1">{getRoleBadge(session.user.role)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
