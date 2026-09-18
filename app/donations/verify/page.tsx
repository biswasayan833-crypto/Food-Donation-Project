'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Truck,
  Building2,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { verifyPickupQRCode, VerificationResult } from '@/app/actions/verificationActions';
import { useToast } from '@/components/Toast';

export default function VerifyDonationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [result, setResult] = useState<VerificationResult | null>(null);
  const scannerRef = useRef<any>(null);

  const handleVerify = (token: string) => {
    if (!token || token.trim().length < 5) {
      showToast('Please enter a valid pickup verification token.', 'error');
      return;
    }

    startTransition(async () => {
      // Stop scanner if running
      if (scannerRef.current && cameraActive) {
        try {
          await scannerRef.current.stop();
          setCameraActive(false);
        } catch (e) {
          // ignore cleanup error
        }
      }

      const res = await verifyPickupQRCode(token.trim());
      setResult(res);

      if (res.error) {
        showToast(res.error, 'error');
      } else if (res.success) {
        showToast('Pickup verified! Delivery marked as completed.', 'success');
      }
    });
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {}
      }

      const scanner = new Html5Qrcode('qr-reader-region');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Code detected
          handleVerify(decodedText);
        },
        () => {
          // QR scan frame error / no qr in frame (normal)
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError(
        err.message || 'Unable to access camera. Please check camera permissions or use Manual Entry.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {}
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <QrCode className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Pickup & Handover Verification
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Scanner
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Scan recipient QR code or enter secret token to verify physical transfer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session?.user.role === 'VOLUNTEER' && (
            <Link
              href="/dashboard/driver"
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Courier Workspace</span>
            </Link>
          )}
        </div>
      </div>

      {/* Verification Result Banner */}
      {result?.success && result.claim && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Verification Successful • Transfer Completed
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {result.claim.foodListing.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Quantity: <strong className="text-slate-800">{result.claim.foodListing.quantity}</strong> • Category: {result.claim.foodListing.foodType}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setManualCode('');
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              Scan Next Item
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Donor (Source)</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{result.claim.foodListing.donor.name}</p>
              <p className="text-xs text-slate-500 truncate">{result.claim.foodListing.locationAddress}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Recipient (NGO / Charity)</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{result.claim.receiver.name}</p>
              <p className="text-xs text-slate-500">{result.claim.receiver.location || 'New York, NY'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-200 text-xs text-slate-600">
            <span className="font-medium">
              Verified at: <strong>{result.claim.deliveredAt ? new Date(result.claim.deliveredAt).toLocaleString() : 'Just now'}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/receiver"
                className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 transition-colors"
              >
                Receiver Dashboard
              </Link>
              <Link
                href="/dashboard/donor"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
              >
                Donor Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {result?.error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-800 text-sm font-semibold">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{result.error}</span>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-xs underline hover:text-rose-950 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Verification Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Tab Selection */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => {
              setActiveTab('scan');
              setResult(null);
            }}
            className={`flex-1 py-3.5 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'scan'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera QR Scanner</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
              setResult(null);
            }}
            className={`flex-1 py-3.5 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Manual Token Entry</span>
          </button>
        </div>

        {/* Tab 1: Camera Scanner */}
        {activeTab === 'scan' && (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="max-w-md mx-auto">
              {/* Camera Container */}
              <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-slate-800 shadow-inner flex flex-col items-center justify-center text-white">
                <div id="qr-reader-region" className="w-full h-full" />

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xs text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-200">Camera Inactive</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                        Click below to enable your camera and scan the recipient QR code
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={startCamera}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Camera Scanner</span>
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Camera Access Note:</p>
                    <p className="text-[11px] mt-0.5">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="mt-1 font-bold text-amber-900 underline text-[11px] cursor-pointer"
                    >
                      Switch to Manual Token Entry
                    </button>
                  </div>
                </div>
              )}

              {cameraActive && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Turn Off Camera
                  </button>
                  <p className="text-xs text-slate-500 animate-pulse">
                    Align QR code within viewfinder to verify...
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 text-slate-500 text-xs">
              <p>
                💡 <strong>How it works:</strong> The receiver displays their unique QR code from their Receiver Dashboard. Point your camera to scan and authenticate the handoff.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Entry */}
        {activeTab === 'manual' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(manualCode);
            }}
            className="p-6 sm:p-8 space-y-6"
          >
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Enter QR Secret Token *
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={isPending}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g., FOOD-RESCUE-DEMO-7A8B9C"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-300 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 uppercase"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Paste or type the alphanumeric secret code displayed underneath the QR code on the receiver's screen.
              </p>
            </div>

            {/* Quick Test Token Button */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="text-xs">
                <span className="font-bold text-slate-700">⚡ Test with Seed Token:</span>
                <p className="text-[11px] text-slate-500">Demo active claim token in database</p>
              </div>
              <button
                type="button"
                onClick={() => setManualCode('FOOD-RESCUE-DEMO-7A8B9C')}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
              >
                FOOD-RESCUE-DEMO-7A8B9C
              </button>
            </div>

            <button
              type="submit"
              disabled={isPending || !manualCode.trim()}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Token...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Complete Transfer</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
