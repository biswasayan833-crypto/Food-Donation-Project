import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'shareplate-food-donations';

export const isAWSConfigured = () => {
  return Boolean(
    accessKeyId &&
      secretAccessKey &&
      !accessKeyId.includes('demo-') &&
      !secretAccessKey.includes('demo-')
  );
};

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId || 'dummy',
    secretAccessKey: secretAccessKey || 'dummy',
  },
});

export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  isSimulated: boolean;
}

export async function getPresignedUploadUrl(
  filename: string,
  fileType: string
): Promise<PresignedUrlResult> {
  const ext = filename.split('.').pop() || 'jpg';
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const uniqueId = crypto.randomUUID();
  const key = `food-donations/${Date.now()}-${uniqueId}.${cleanExt}`;

  // If real AWS credentials are provided
  if (isAWSConfigured()) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      publicUrl,
      key,
      isSimulated: false,
    };
  }

  // Development simulation mode: when running locally with demo credentials
  // The client will upload to our local multipart fallback endpoint or use simulated publicUrl
  const localUploadUrl = `/api/upload/local?key=${encodeURIComponent(key)}`;
  const publicUrl = `/api/upload/local?key=${encodeURIComponent(key)}`;

  return {
    uploadUrl: localUploadUrl,
    publicUrl,
    key,
    isSimulated: true,
  };
}
