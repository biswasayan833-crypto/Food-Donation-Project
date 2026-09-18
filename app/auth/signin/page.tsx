'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HeartHandshake,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Building2,
  Users,
  ShieldCheck,
  Truck,
} from 'lucide-react';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error || 'Invalid email or password.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/40">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 mb-4">
          <HeartHandshake className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Sign In to SharePlate
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your food donation & rescue operations
        </p>
      </div>

      {/* Quick Demo Logins Box */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
          ⚡ Quick Demo Accounts (1-Click Fill)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleQuickDemo('donor@freshbites.com')}
            className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Donor</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('ngo@feedhope.org')}
            className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 transition-all shadow-xs flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>NGO</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('volunteer@foodrescue.org')}
            className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-white hover:bg-amber-50 text-amber-800 border border-slate-200 hover:border-amber-300 transition-all shadow-xs flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Volunteer</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('admin@foodrescue.org')}
            className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-white hover:bg-purple-50 text-purple-700 border border-slate-200 hover:border-purple-300 transition-all shadow-xs flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Signing In...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-600">
          Don't have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-50">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-slate-200 text-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading sign in...</p>
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}
