'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  message: string;
  claimId: string | null;
  foodListingId: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  // Adaptive polling: polls every 25s, pauses when tab is hidden
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchNotifications();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'DRIVER_ASSIGNED':
        return <Truck className="w-4 h-4 text-sky-600" />;
      case 'PICKUP_STARTED':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'FOOD_PICKED_UP':
        return <Package className="w-4 h-4 text-indigo-600" />;
      case 'DELIVERY_STARTED':
        return <Truck className="w-4 h-4 text-purple-600" />;
      case 'DELIVERY_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'URGENT_DELIVERY':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="View notifications"
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <motion.div
          animate={
            unreadCount > 0
              ? { rotate: [0, -12, 12, -8, 8, -4, 4, 0] }
              : { rotate: 0 }
          }
          transition={{
            repeat: unreadCount > 0 ? Infinity : 0,
            repeatDelay: 6,
            duration: 0.8,
            ease: 'easeInOut',
          }}
        >
          <Bell className="w-5 h-5" />
        </motion.div>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 origin-top-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">All Caught Up!</p>
                  <p className="text-[11px] text-slate-400">No recent notifications.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const targetUrl = n.foodListingId
                    ? `/donations/${n.foodListingId}`
                    : '/dashboard';

                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                        !n.isRead ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                        {getEventIcon(n.eventType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <Link
                            href={targetUrl}
                            onClick={() => {
                              if (!n.isRead) handleMarkAsRead(n.id);
                              setIsOpen(false);
                            }}
                            className="text-xs font-bold text-slate-900 hover:text-emerald-600 truncate block transition-colors"
                          >
                            {n.title}
                          </Link>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5 line-clamp-2">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                          <Link
                            href={targetUrl}
                            onClick={() => {
                              if (!n.isRead) handleMarkAsRead(n.id);
                              setIsOpen(false);
                            }}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>View delivery details</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>

                          {!n.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              title="Mark as read"
                              className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer font-medium"
                            >
                              <Check className="w-3 h-3" />
                              <span>Read</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
