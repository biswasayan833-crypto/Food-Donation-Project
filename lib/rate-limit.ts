/**
 * Serverless-Compatible Rate Limiting Engine
 *
 * Backed by Neon PostgreSQL (RateLimit table).
 * Works across distributed Vercel serverless instances with zero in-memory desync.
 */

import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface RateLimitResult {
  success: boolean;
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
  retryAfterSeconds?: number;
}

/**
 * Check and increment rate limit consumption for a specified key.
 *
 * @param key Unique rate limiting identifier (e.g. "auth:192.168.1.1" or "claim:usr_123")
 * @param limitOrOptions Maximum allowed events within the window OR options object
 * @param windowSecondsArg Window length in seconds (if limit passed as number)
 */
export async function checkRateLimit(
  key: string,
  limitOrOptions: number | { limit: number; windowSeconds: number },
  windowSecondsArg?: number
): Promise<RateLimitResult> {
  const limit = typeof limitOrOptions === 'number' ? limitOrOptions : (limitOrOptions?.limit || 10);
  const windowSeconds = typeof limitOrOptions === 'object' && limitOrOptions?.windowSeconds
    ? limitOrOptions.windowSeconds
    : (windowSecondsArg || 60);

  const now = new Date();

  // 1. Clean expired records probabilistically (5% chance on execution)
  if (Math.random() < 0.05) {
    prisma.rateLimit
      .deleteMany({
        where: { expireAt: { lt: now } },
      })
      .catch((err) => console.error('[RateLimit Prune Warning]', err));
  }

  try {
    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (existing && existing.expireAt > now) {
      if (existing.points >= limit) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((existing.expireAt.getTime() - now.getTime()) / 1000)
        );
        return {
          success: false,
          allowed: false,
          remaining: 0,
          resetAt: existing.expireAt,
          retryAfterSeconds,
        };
      }

      const updated = await prisma.rateLimit.update({
        where: { key },
        data: { points: { increment: 1 } },
      });

      return {
        success: true,
        allowed: true,
        remaining: Math.max(0, limit - updated.points),
        resetAt: existing.expireAt,
      };
    }

    // Window has expired or key is brand new
    const expireAt = new Date(now.getTime() + windowSeconds * 1000);
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, points: 1, expireAt },
      update: { points: 1, expireAt },
    });

    return {
      success: true,
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: expireAt,
    };
  } catch (error) {
    // If rate limit database check fails, fail open gracefully to prevent blocking legitimate users
    console.error('[RateLimit Error] Failed to evaluate rate limit:', error);
    return {
      success: true,
      allowed: true,
      remaining: 1,
      resetAt: new Date(now.getTime() + windowSeconds * 1000),
    };
  }
}

/**
 * Extract client IP address from Next.js request headers safely.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
