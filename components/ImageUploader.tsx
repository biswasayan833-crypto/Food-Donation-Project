'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  onRemove,
  disabled = false,
}: ImageUploaderProps) {
  const { showToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    // 1. Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid image file (JPEG, PNG, or WebP).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file size must be less than 10 MB.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setProgressStatus('Requesting secure S3 Presigned URL...');

    try {
      // 2. Request Presigned URL from Next.js server
      const presignRes = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json();
        throw new Error(errJson.error || 'Failed to authorize S3 upload.');
      }

      const { uploadUrl, publicUrl, isSimulated } = await presignRes.json();

      setUploadProgress(40);
      setProgressStatus(
        isSimulated ? 'Uploading food photo to storage...' : 'Streaming direct to AWS S3 Bucket...'
      );

      // 3. Client Direct Upload to AWS S3 via HTTP PUT
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('S3 Direct Upload failed. Check bucket CORS and network.');
      }

      setUploadProgress(100);
      setProgressStatus('Photo uploaded successfully!');
      showToast('Food photo uploaded to S3 successfully!', 'success');

      // Update parent form with public S3 URL
      onChange(publicUrl);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      showToast(err.message || 'Image upload failed. Please try again.', 'error');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setProgressStatus('');
      }, 600);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
      />

      {value ? (
        /* Image Preview Card */
        <div className="relative rounded-3xl overflow-hidden border-2 border-emerald-200 bg-slate-900 group shadow-sm">
          <div className="relative w-full aspect-video sm:aspect-21/9 max-h-[320px]">
            <Image
              src={value}
              alt="Food Donation Photo"
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
          </div>

          {/* Floating Details & Actions Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Photo Attached</span>
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline-block">
                AWS S3 / Direct Storage
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => {
                  if (onRemove) onRemove();
                  onChange('');
                }}
                className="p-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-600 text-white transition-all cursor-pointer"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Drag and Drop Zone */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !uploading) fileInputRef.current?.click();
          }}
          className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-slate-50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            /* Upload Progress State */
            <div className="w-full max-w-sm mx-auto space-y-3 py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{progressStatus}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{uploadProgress}% completed</p>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            /* Idle Drag Drop Prompt */
            <>
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Drag and drop food photo here, or <span className="text-emerald-600 underline">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload directly to AWS S3 • Supports JPEG, PNG, WebP up to 10MB
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                  📸 High-res food photo
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                  ⚡ Client-direct presigned S3 PUT
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                  🛡️ Anti-tamper sanitized key
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
