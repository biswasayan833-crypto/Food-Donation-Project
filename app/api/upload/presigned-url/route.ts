import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPresignedUploadUrl } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be signed in to upload food photos.' },
        { status: 401 }
      );
    }

    const { filename, fileType } = await req.json();

    if (!filename || !fileType) {
      return NextResponse.json(
        { error: 'filename and fileType are required parameters.' },
        { status: 400 }
      );
    }

    // Validate fileType
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload JPEG, PNG, or WebP images.' },
        { status: 400 }
      );
    }

    const result = await getPresignedUploadUrl(filename, fileType);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate presigned upload URL.' },
      { status: 500 }
    );
  }
}
