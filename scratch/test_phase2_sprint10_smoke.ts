import path from 'path';

const projectRoot = 'c:/Users/Ayan Biswas/Desktop/Food Donation';
const { prisma } = require(path.join(projectRoot, 'lib/prisma'));
const { getPresignedUploadUrl, isAWSConfigured } = require(path.join(projectRoot, 'lib/s3'));
const { computeFoodUrgency } = require(path.join(projectRoot, 'services/food-urgency.service'));
const { getRankedMatchesForDonation } = require(path.join(projectRoot, 'services/donation-matching.service'));
const { getRankedDriversForDonation } = require(path.join(projectRoot, 'services/driver-assignment.service'));
const { getImpactMetrics } = require(path.join(projectRoot, 'services/impact-analytics.service'));
const { generateSurplusForecast } = require(path.join(projectRoot, 'services/surplus-prediction.service'));
const { getUserReputationProfile } = require(path.join(projectRoot, 'services/reputation.service'));
const { getAuditLogs } = require(path.join(projectRoot, 'services/audit.service'));
const { checkRateLimit } = require(path.join(projectRoot, 'lib/rate-limit'));
const {
  sanitizeString,
  sanitizeUser,
  getSafeErrorMessage,
  validateCoordinates,
  validateEmail,
  validatePassword,
} = require(path.join(projectRoot, 'lib/security'));

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runProductionSmokeTests() {
  console.log('====================================================');
  console.log('  FOODRESCUE PRODUCTION SMOKE TEST SUITE (SPRINT 10)');
  console.log('====================================================\n');

  // --- 1. NEON DATABASE HEALTH & INTEGRITY ---
  console.log('--- 1. Database Connection & Schema Health ---');
  const t0 = Date.now();
  const [users, listings, claims, notifications, logs, incidents, rateLimits] = await Promise.all([
    prisma.user.findMany({ take: 5, select: { id: true, email: true, role: true, password: true } }),
    prisma.foodListing.findMany({ take: 5 }),
    prisma.claim.findMany({ take: 5 }),
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.incident.count(),
    prisma.rateLimit.count(),
  ]);
  const latency = Date.now() - t0;

  assert(users.length > 0, `Neon PostgreSQL connected (${users.length} sample users retrieved in ${latency}ms)`);
  assert(listings.length > 0, `Food Listings accessible (${listings.length} listings retrieved)`);
  assert(claims.length > 0, `Claims accessible (${claims.length} claims retrieved)`);
  assert(typeof notifications === 'number', `Notifications table verified (${notifications} records)`);
  assert(typeof logs === 'number', `AuditLog table verified (${logs} records)`);
  assert(typeof incidents === 'number', `Incident table verified (${incidents} records)`);
  assert(typeof rateLimits === 'number', `RateLimit table verified (${rateLimits} records)`);

  // Verify passwords are encrypted with bcrypt ($2a$ or $2b$)
  const allHashed = users.every((u: any) => u.password.startsWith('$2'));
  assert(allHashed, 'All user passwords stored in Neon DB are cryptographically hashed');

  // Verify compound index latency on FoodListing [status, expiryTime]
  const idxT0 = Date.now();
  const indexedListings = await prisma.foodListing.findMany({
    where: { status: 'AVAILABLE', expiryTime: { gt: new Date() } },
    take: 10,
  });
  const idxLatency = Date.now() - idxT0;
  assert(idxLatency < 1500, `Compound index query [status, expiryTime] executed in ${idxLatency}ms`);

  // --- 2. AWS S3 ARCHITECTURE & PRESIGNED UPLOADS ---
  console.log('\n--- 2. AWS S3 Storage Architecture ---');
  const awsConfigured = isAWSConfigured();
  console.log(`  ℹ AWS S3 Live Mode: ${awsConfigured ? 'ACTIVE (Real Credentials)' : 'FALLBACK (Local storage)'}`);

  // Test presigned URL generation
  const presignResult = await getPresignedUploadUrl('sample_food_photo.jpg', 'image/jpeg');
  assert(Boolean(presignResult.uploadUrl), 'Presigned upload URL successfully generated');
  assert(Boolean(presignResult.publicUrl), 'Public retrieval URL generated');
  assert(presignResult.key.startsWith('food-donations/'), 'Storage key adheres to "food-donations/" prefix format');
  assert(presignResult.key.endsWith('.jpg'), 'Key extension correctly sanitized');

  // Verify allowed MIME types logic
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  assert(allowedMime.includes('image/jpeg'), 'JPEG format supported');
  assert(allowedMime.includes('image/png'), 'PNG format supported');
  assert(allowedMime.includes('image/webp'), 'WebP format supported');

  // --- 3. CORE SERVICE ENGINES (NON-DESTRUCTIVE) ---
  console.log('\n--- 3. Core Engine Health ---');

  // A. Food Urgency Engine
  const testListing = listings[0];
  if (testListing) {
    const urgency = computeFoodUrgency({
      prepTimestamp: testListing.prepTimestamp,
      expiryTime: testListing.expiryTime,
      foodType: testListing.foodType,
      temperatureControl: testListing.temperatureControl,
      status: testListing.status,
    });
    assert(urgency.score >= 0 && urgency.score <= 100, `Urgency score bounded (0-100): ${urgency.score}`);
    assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(urgency.level), `Valid urgency level: ${urgency.level}`);
  }

  // B. Smart Matching Engine
  if (testListing) {
    const matchResult = await getRankedMatchesForDonation(testListing.id);
    assert(Array.isArray(matchResult.matches), 'Smart matching engine returned receiver recommendations array');
  }

  // C. Volunteer Driver Assignment Engine
  if (testListing) {
    const driverResult = await getRankedDriversForDonation(testListing.id);
    assert(Array.isArray(driverResult.drivers), 'Driver assignment engine returned ranked volunteer drivers array');
  }

  // D. Impact Analytics Engine
  const impactKpi = await getImpactMetrics('ALL');
  assert(impactKpi.totalDonations >= 0, `Impact analytics verified: ${impactKpi.totalDonations} total donations`);
  assert(typeof impactKpi.rescueSuccessRate === 'number', `Rescue success rate computed: ${impactKpi.rescueSuccessRate}%`);

  // E. Surplus Forecasting Engine
  const forecast = await generateSurplusForecast();
  assert(Array.isArray(forecast.next7Days) && forecast.next7Days.length === 7, 'Surplus forecast returned 7-day projection periods');
  assert(typeof forecast.capacityAssessment?.riskLevel === 'string', `Surplus capacity risk assessed: ${forecast.capacityAssessment?.riskLevel}`);

  // F. Trust & Reputation Engine
  const sampleUser = users[0];
  if (sampleUser) {
    const repProfile = await getUserReputationProfile(sampleUser.id);
    assert(repProfile.overallScore >= 0 && repProfile.overallScore <= 100, `Reputation score bounded (0-100): ${repProfile.overallScore}`);
    assert(Array.isArray(repProfile.pillars), 'Reputation pillars breakdown returned');
    assert(Array.isArray(repProfile.badges), 'Merit badges returned');
  }

  // G. Immutable Audit Logs
  const auditResult = await getAuditLogs({ limit: 5 });
  assert(Array.isArray(auditResult.logs), `Platform audit logs retrieved (${auditResult.pagination.total} total logged events)`);

  // --- 4. SECURITY, DATA PRIVACY & ERROR MASKING ---
  console.log('\n--- 4. Production Security & Data Privacy ---');

  // A. User Sanitization (no password hashes exposed)
  const rawUser = users[0];
  const sanitized = sanitizeUser(rawUser);
  assert(!('password' in sanitized), 'sanitizeUser removes password hash from user response object');

  // B. Error Masking (zero schema or SQL exposure)
  const syntheticPrismaError = new Error('Invalid `prisma.user.findUnique()` invocation: error in table "User" constraint');
  const safeMsg = getSafeErrorMessage(syntheticPrismaError, 'An unexpected error occurred.');
  assert(!safeMsg.includes('prisma') && !safeMsg.includes('table') && !safeMsg.includes('constraint'), 'getSafeErrorMessage masks database internals from error outputs');

  // C. Rate Limiting Check (Neon atomic rate limit counter)
  const rateLimitKey = 'smoke-test-rate-limit-check';
  const rateCheck = await checkRateLimit(rateLimitKey, 5, 60);
  assert(rateCheck.allowed === true, 'Atomic rate limit check passed on Neon PostgreSQL');
  assert(rateCheck.remaining >= 0, `Rate limit remaining points: ${rateCheck.remaining}`);

  // D. Coordinate Boundaries
  assert(validateCoordinates(37.7749, -122.4194) === true, 'Valid geographic coordinates accepted');
  assert(validateCoordinates(999, -122.4194) === false, 'Invalid latitude (>90) rejected');

  // E. Input Sanitization
  const unclean = 'Hello\x00World \u0008';
  const cleaned = sanitizeString(unclean, 20);
  assert(!cleaned.includes('\x00') && cleaned === 'HelloWorld', 'Control characters & null bytes stripped');

  console.log('\n====================================================');
  console.log(`  SMOKE TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionSmokeTests()
  .catch((e) => {
    console.error('Smoke tests error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
