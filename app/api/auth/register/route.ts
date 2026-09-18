import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  validateEmail,
  validatePassword,
  sanitizeString,
  getSafeErrorMessage,
} from '@/lib/security';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 1. Abuse Protection: Rate limit registration by client IP (5 attempts per minute)
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(`auth:register:${clientIp}`, 5, 60);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, password, role, location, city, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required.' },
        { status: 400 }
      );
    }

    // 2. Email validation
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // 3. Password complexity validation (minimum 8 characters)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400 }
      );
    }

    // 4. Role Escalation Prevention: reject ADMIN registration
    const cleanRole = role.toString().toUpperCase().trim();
    const ALLOWED_SELF_ROLES = ['DONOR', 'RECEIVER', 'VOLUNTEER'];

    if (!ALLOWED_SELF_ROLES.includes(cleanRole)) {
      return NextResponse.json(
        { error: 'Invalid registration role. Self-registration as administrator is not permitted.' },
        { status: 403 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: sanitizeString(name, 100),
        email: cleanEmail,
        password: hashedPassword,
        role: cleanRole,
        location: sanitizeString(location || city || 'New York, NY', 150),
        phone: phone ? sanitizeString(phone, 30) : null,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration failed:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Registration failed.') },
      { status: 500 }
    );
  }
}
