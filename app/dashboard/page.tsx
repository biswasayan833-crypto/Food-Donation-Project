'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Truck,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { CategoryBadge } from '@/components/CategoryBadge';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'myListings' | 'myClaims'>('myListings');
  const [listings, setListings] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingClaimId, setUpdatingClaimId] = useState<string | null>(null);

  const userRole = session?.user?.role || 'DONOR';

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/listings?status=ALL');
      const data = await res.json();
      if (data.listings) {
        setListings(data.listings);

        const allClaims: any[] = [];
        data.listings.forEach((item: any) => {
          if (item.claims && item.claims.length > 0) {
            item.claims.forEach((c: any) => {
              allClaims.push({ ...c, listing: item });
            });
          }
        });
        setClaims(allClaims);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
      if (session.user.role === 'RECEIVER') {
        setActiveTab('myClaims');
      }
    }
  }, [session]);

  const handleUpdateClaimStatus = async (claimId: string, newStatus: string) => {
    setUpdatingClaimId(claimId);
    try {
      const res = await fetch('/api/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update claim.');
      } else {
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error updating claim.');
    } finally {
      setUpdatingClaimId(null);
    }
  };

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-5">
          <LayoutDashboard className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Sign In to View Dashboard</h2>
        <p className="text-xs text-slate-500 mt-2 mb-8">
          Manage your food surplus listings and claim orders in one central hub.
        </p>
        <Link
          href="/auth/signin?callbackUrl=/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-md"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const myListings =
    userRole === 'ADMIN'
      ? listings
      : listings.filter((l) => l.donorId === session?.user?.id);

  const myClaims =
    userRole === 'ADMIN'
      ? claims
      : claims.filter((c) => c.receiverId === session?.user?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Dashboard Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            {session?.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {session?.user.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {session?.user.role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {session?.user.location || 'Location Not Set'} • {session?.user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userRole !== 'RECEIVER' && (
            <Link
              href="/donations/create"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Donation</span>
            </Link>
          )}

          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('myListings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'myListings'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Food Listings ({myListings.length})
        </button>

        <button
          onClick={() => setActiveTab('myClaims')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'myClaims'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Claims & Orders ({myClaims.length})
        </button>
      </div>

      {/* Tab 1: Listings Tab */}
      {activeTab === 'myListings' && (
        <div className="space-y-4">
          {myListings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Food Listings Yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Post your first surplus batch to connect with local charities.
              </p>
              <Link
                href="/donations/create"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md"
              >
                Post Food Surplus
              </Link>
            </div>
          ) : (
            myListings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CategoryBadge foodType={item.foodType} size="sm" />
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'CLAIMED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <Link
                    href={`/donations/${item.id}`}
                    className="font-bold text-slate-900 hover:text-emerald-600 text-sm sm:text-base transition-colors line-clamp-1"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quantity: <strong className="text-slate-700">{item.quantity}</strong> • Location:{' '}
                    {item.locationAddress}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/donations/${item.id}`}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                  >
                    View Listing
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Claims Tab */}
      {activeTab === 'myClaims' && (
        <div className="space-y-4">
          {myClaims.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Claims Yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                You haven't reserved any food donations yet.
              </p>
              <Link
                href="/donations"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md"
              >
                Browse Food to Claim
              </Link>
            </div>
          ) : (
            myClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Claim ID: {claim.id.slice(-8)}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">
                      {claim.listing?.title || 'Food Donation'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Receiver: <strong>{claim.receiver?.name || 'Registered Receiver'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        claim.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : claim.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {claim.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5">Location</span>
                    <p className="text-slate-800">{claim.listing?.locationAddress}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5">Quantity Reserved</span>
                    <p className="text-slate-800 font-bold">{claim.listing?.quantity}</p>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-3">
                  <div className="flex items-center gap-2">
                    {claim.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateClaimStatus(claim.id, 'APPROVED')}
                        disabled={updatingClaimId === claim.id}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                      >
                        {updatingClaimId === claim.id ? 'Updating...' : 'Approve Claim'}
                      </button>
                    )}

                    {claim.status === 'APPROVED' && (
                      <button
                        onClick={() => handleUpdateClaimStatus(claim.id, 'COMPLETED')}
                        disabled={updatingClaimId === claim.id}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        {updatingClaimId === claim.id ? 'Updating...' : 'Mark Completed (Delivered)'}
                      </button>
                    )}

                    {claim.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed & Delivered
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/donations/${claim.foodListingId}`}
                    className="text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors"
                  >
                    View Food Listing →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
