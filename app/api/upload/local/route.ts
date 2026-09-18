import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSafeErrorMessage } from '@/lib/security';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to upload files.' },
        { status: 401 }
      );
    }

    // Rate Limiting: 15 uploads per minute per user
    const rateLimit = await checkRateLimit(`upload:${session.user.id}`, 15, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded. Please wait before uploading again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get('key') || `food-donations/${Date.now()}.jpg`;

    // Path traversal defense & alphanumeric sanitization
    const rawFilename = path.basename(rawKey);
    const ext = path.extname(rawFilename).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file extension '${ext}'. Only ${ALLOWED_EXTENSIONS.join(', ')} images are permitted.` },
        { status: 400 }
      );
    }

    const safeBase = rawFilename.replace(ext, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    const cleanFilename = `${safeBase}-${Date.now()}${ext}`;

    const buffer = Buffer.from(await req.arrayBuffer());

    // File size guard
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of 5MB (received ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).` },
        { status: 413 }
      );
    }

    if (buffer.length < 10) {
      return NextResponse.json(
        { error: 'File is empty or corrupted.' },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, cleanFilename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${cleanFilename}`;
    return NextResponse.json({ success: true, publicUrl });
  } catch (error: any) {
    console.error('Local upload error:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to save local upload.') },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Key required.' }, { status: 400 });
    }

    const cleanFilename = path.basename(key);
    const ext = path.extname(cleanFilename).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file format.' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', cleanFilename);

    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.avif': 'image/avif',
      };
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeMap[ext] || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If not found, return sample image
    return NextResponse.redirect(
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Failed to retrieve file.') },
      { status: 500 }
    );
  }
}
