'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  X,
  Truck,
  AlertCircle,
  Lock,
} from 'lucide-react';

interface ClaimModalProps {
  foodListingId: string;
  listingTitle: string;
  donorName: string;
  quantity: string;
  locationAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (claim: any) => void;
}

export function ClaimModal({
  foodListingId,
  listingTitle,
  donorName,
  quantity,
  locationAddress,
  isOpen,
  onClose,
  onSuccess,
}: ClaimModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isReceiver = session?.user?.role === 'RECEIVER' || session?.user?.role === 'ADMIN';

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push('/auth/signin?callbackUrl=/listings/' + foodListingId);
      return;
    }

    if (!isReceiver) {
      setError('Only registered Receivers and NGOs can claim food donations.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodListingId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim listing.');
      }

      onSuccess(data.claim);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Claim Food Donation</h2>
            <p className="text-xs text-slate-500">Reserve this surplus food for pickup & delivery</p>
          </div>
        </div>

        {/* Listing Summary Box */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Item
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {quantity}
            </span>
          </div>
          <p className="font-bold text-slate-800 text-sm">{listingTitle}</p>
          <p className="text-xs text-slate-600">
            <strong className="text-slate-700">Donor:</strong> {donorName}
          </p>
          <p className="text-xs text-slate-600">
            <strong className="text-slate-700">Location:</strong> {locationAddress}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!session ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed flex items-start gap-2.5">
              <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <div>
                <strong>Authentication Required:</strong> Please sign in with a Receiver account to reserve this donation.
              </div>
            </div>
            <button
              onClick={() => router.push('/auth/signin?callbackUrl=/listings/' + foodListingId)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
            >
              Sign In to Claim
            </button>
          </div>
        ) : (
          <form onSubmit={handleClaim} className="space-y-4">
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/60 text-xs text-emerald-800">
              Claiming reserves this surplus for distribution. The donor will be notified of your request.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Confirming...' : 'Confirm Claim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
