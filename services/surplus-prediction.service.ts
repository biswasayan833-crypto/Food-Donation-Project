/**
 * Predictive Food Surplus Engine
 *
 * Deterministic mathematical forecasting based on historical Neon PostgreSQL data.
 * Computes:
 * - 7-day & 30-day moving averages (with recency weighting)
 * - Day-of-week seasonality coefficients
 * - Trend velocity
 * - Projected surplus (volume & servings) for next 24 hours & 7 days
 * - High-risk surplus periods
 * - Community intake capacity vs surplus balance
 * - Capacity Risk Level (LOW, MEDIUM, HIGH, CRITICAL)
 * - Statistical confidence rating (LOW, MEDIUM, HIGH)
 */

import { prisma } from '@/lib/prisma';
import { parseQuantityToServings } from '@/services/donation-matching.service';

export interface DailyHistoricalData {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  donationsCount: number;
  servingsCount: number;
}

export interface DayOfWeekFactor {
  dayOfWeek: number;
  dayName: string;
  historicalCount: number;
  avgDonations: number;
  factor: number; // multiplier relative to mean (1.0 = baseline)
}

export interface ForecastPeriod {
  date: string;
  dayOfWeek: string;
  expectedDonations: number;
  expectedServings: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SurplusRiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0 - 100
  predictedDailySurplusServings: number;
  receiverIntakeCapacityServings: number;
  volunteerFleetCapacityServings: number;
  effectiveCapacityServings: number;
  capacityRatio: number; // effectiveCapacity / predictedSurplus
  activeReceiversCount: number;
  activeCouriersCount: number;
  recommendedAction: string;
  disclaimer: string;
}

export interface SurplusForecastResult {
  next24h: {
    expectedDonations: number;
    expectedServings: number;
    dayOfWeek: string;
    seasonalMultiplier: number;
  };
  next7Days: ForecastPeriod[];
  totalExpected7DaysServings: number;
  totalExpected7DaysDonations: number;
  movingAverage7Day: number;
  movingAverage30Day: number;
  trendVelocityPercent: number; // e.g. +12.5% or -5.2%
  trendDirection: 'INCREASING' | 'STABLE' | 'DECREASING';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceReason: string;
  highRiskSurplusDays: string[];
  capacityAssessment: SurplusRiskAssessment;
  generatedAt: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OPERATIONAL_DISCLAIMER = 'Operational forecast — not a guarantee. Based on historical rescue patterns.';

/**
 * Extracts daily aggregated donations and servings over historical window.
 */
export async function getHistoricalDailySeries(
  daysLookback: number = 60,
  referenceNow: Date = new Date()
): Promise<DailyHistoricalData[]> {
  const startDate = new Date(referenceNow.getTime() - daysLookback * 24 * 60 * 60 * 1000);
  startDate.setUTCHours(0, 0, 0, 0);

  const listings = await prisma.foodListing.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: referenceNow,
      },
    },
    select: {
      createdAt: true,
      quantity: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Map into daily buckets counting backwards from referenceNow
  const dailyMap: Record<string, DailyHistoricalData> = {};
  for (let i = daysLookback; i >= 0; i--) {
    const d = new Date(referenceNow.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = {
      date: key,
      dayOfWeek: d.getUTCDay(),
      donationsCount: 0,
      servingsCount: 0,
    };
  }

  listings.forEach((l) => {
    const key = l.createdAt.toISOString().split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].donationsCount += 1;
      dailyMap[key].servingsCount += parseQuantityToServings(l.quantity);
    }
  });

  return Object.values(dailyMap);
}

/**
 * Computes Day-of-Week seasonality factors.
 */
export function calculateDayOfWeekFactors(series: DailyHistoricalData[]): DayOfWeekFactor[] {
  const totalsByDow: { count: number; donations: number }[] = Array.from({ length: 7 }, () => ({
    count: 0,
    donations: 0,
  }));

  let totalDonations = 0;
  series.forEach((d) => {
    totalsByDow[d.dayOfWeek].count++;
    totalsByDow[d.dayOfWeek].donations += d.donationsCount;
    totalDonations += d.donationsCount;
  });

  const overallDailyMean = series.length > 0 ? totalDonations / series.length : 1;

  return totalsByDow.map((item, dow) => {
    const avg = item.count > 0 ? item.donations / item.count : 0;
    const factor = overallDailyMean > 0 ? Math.round((avg / overallDailyMean) * 100) / 100 : 1.0;
    // Dampen extreme factors when data is sparse (clamp to [0.5, 2.0])
    const clampedFactor = Math.max(0.5, Math.min(2.0, factor || 1.0));

    return {
      dayOfWeek: dow,
      dayName: DAY_NAMES[dow],
      historicalCount: item.count,
      avgDonations: Math.round(avg * 10) / 10,
      factor: clampedFactor,
    };
  });
}

/**
 * Computes deterministic moving averages and trend velocity.
 */
export function calculateTrendsAndAverages(series: DailyHistoricalData[]): {
  sma7: number;
  sma30: number;
  servingsPerDonation: number;
  trendVelocityPercent: number;
  trendDirection: 'INCREASING' | 'STABLE' | 'DECREASING';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceReason: string;
} {
  const n = series.length;
  if (n === 0) {
    return {
      sma7: 1,
      sma30: 1,
      servingsPerDonation: 25,
      trendVelocityPercent: 0,
      trendDirection: 'STABLE',
      confidence: 'LOW',
      confidenceReason: 'Insufficient historical donation data for confident forecasting.',
    };
  }

  // Last 7 days and prior 7 days
  const last7 = series.slice(Math.max(0, n - 7));
  const prior7 = series.slice(Math.max(0, n - 14), Math.max(0, n - 7));
  const last30 = series.slice(Math.max(0, n - 30));

  const sumDonationsLast7 = last7.reduce((acc, d) => acc + d.donationsCount, 0);
  const sumServingsLast7 = last7.reduce((acc, d) => acc + d.servingsCount, 0);
  const sumDonationsPrior7 = prior7.reduce((acc, d) => acc + d.donationsCount, 0);
  const sumDonationsLast30 = last30.reduce((acc, d) => acc + d.donationsCount, 0);

  const sma7 = Math.round((sumDonationsLast7 / Math.max(1, last7.length)) * 10) / 10;
  const sma30 = Math.round((sumDonationsLast30 / Math.max(1, last30.length)) * 10) / 10;

  const totalDonations = series.reduce((acc, d) => acc + d.donationsCount, 0);
  const totalServings = series.reduce((acc, d) => acc + d.servingsCount, 0);
  const servingsPerDonation = totalDonations > 0
    ? Math.max(10, Math.round(totalServings / totalDonations))
    : 25;

  // Trend Velocity
  let trendVelocityPercent = 0;
  if (sumDonationsPrior7 > 0) {
    trendVelocityPercent = Math.round(((sumDonationsLast7 - sumDonationsPrior7) / sumDonationsPrior7) * 1000) / 10;
  } else if (sumDonationsLast7 > 0) {
    trendVelocityPercent = 100;
  }

  let trendDirection: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
  if (trendVelocityPercent >= 10) trendDirection = 'INCREASING';
  else if (trendVelocityPercent <= -10) trendDirection = 'DECREASING';

  // Statistical Confidence Assessment
  let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let confidenceReason = '';

  const activeDataDays = series.filter((d) => d.donationsCount > 0).length;
  if (activeDataDays < 5) {
    confidence = 'LOW';
    confidenceReason = `Sparse sample: only ${activeDataDays} active surplus days recorded.`;
  } else if (activeDataDays <= 20) {
    confidence = 'MEDIUM';
    confidenceReason = `Moderate sample: ${activeDataDays} active surplus days observed over ${n} days.`;
  } else {
    // Check variance / coefficient of variation
    const mean = sumDonationsLast30 / Math.max(1, last30.length);
    const variance = last30.reduce((acc, d) => acc + Math.pow(d.donationsCount - mean, 2), 0) / Math.max(1, last30.length);
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 1.0;

    if (cv <= 0.6) {
      confidence = 'HIGH';
      confidenceReason = `Robust sample with stable daily variance (${activeDataDays} active days, CV: ${Math.round(cv * 100) / 100}).`;
    } else {
      confidence = 'MEDIUM';
      confidenceReason = `Sufficient sample (${activeDataDays} days) with moderate variance (CV: ${Math.round(cv * 100) / 100}).`;
    }
  }

  return {
    sma7,
    sma30,
    servingsPerDonation,
    trendVelocityPercent,
    trendDirection,
    confidence,
    confidenceReason,
  };
}

/**
 * Assesses platform capacity (receivers & couriers) against predicted surplus volume.
 */
export async function assessSurplusCapacityRisk(
  predictedDailySurplusServings: number
): Promise<SurplusRiskAssessment> {
  // Fetch active receivers and their capacities
  const receivers = await prisma.user.findMany({
    where: {
      role: 'RECEIVER',
      isAvailable: true,
    },
    select: { dailyCapacity: true },
  });

  const receiverCapacity = receivers.reduce((sum, r) => sum + (r.dailyCapacity || 100), 0);

  // Fetch active couriers
  const couriers = await prisma.user.findMany({
    where: {
      role: 'VOLUNTEER',
      isAvailable: true,
    },
    select: { id: true },
  });

  // Volunteer fleet capacity: ~40 servings per courier run
  const volunteerCapacity = couriers.length * 40;

  // Effective capacity is the operational bottleneck
  // (both receiver intake and transport couriers are required)
  const effectiveCapacity = volunteerCapacity > 0
    ? Math.min(receiverCapacity, volunteerCapacity * 1.5)
    : receiverCapacity;

  const targetSurplus = Math.max(10, predictedDailySurplusServings);
  const capacityRatio = effectiveCapacity > 0
    ? Math.round((effectiveCapacity / targetSurplus) * 100) / 100
    : 0;

  let riskLevel: SurplusRiskAssessment['riskLevel'] = 'LOW';
  let riskScore = 15;
  let recommendedAction = 'Platform capacity is healthy. Receivers and couriers are well positioned.';

  if (capacityRatio < 0.7 || effectiveCapacity === 0) {
    riskLevel = 'CRITICAL';
    riskScore = 95;
    recommendedAction = 'URGENT: Predicted surplus exceeds rescue capacity. Mobilize inactive volunteer couriers and alert nearby high-capacity receivers immediately.';
  } else if (capacityRatio < 1.0) {
    riskLevel = 'HIGH';
    riskScore = 75;
    recommendedAction = 'Tight bandwidth: Predicted surplus exceeds volunteer transport capacity. Dispatch priority alerts to on-call drivers.';
  } else if (capacityRatio < 1.5) {
    riskLevel = 'MEDIUM';
    riskScore = 45;
    recommendedAction = 'Moderate load: Platform capacity can handle expected surplus, but unassigned deliveries should be monitored closely.';
  }

  return {
    riskLevel,
    riskScore,
    predictedDailySurplusServings,
    receiverIntakeCapacityServings: receiverCapacity,
    volunteerFleetCapacityServings: volunteerCapacity,
    effectiveCapacityServings: Math.round(effectiveCapacity),
    capacityRatio,
    activeReceiversCount: receivers.length,
    activeCouriersCount: couriers.length,
    recommendedAction,
    disclaimer: OPERATIONAL_DISCLAIMER,
  };
}

/**
 * Generates the full Predictive Food Surplus Forecast.
 */
export async function generateSurplusForecast(
  referenceNow: Date = new Date()
): Promise<SurplusForecastResult> {
  const series = await getHistoricalDailySeries(60, referenceNow);
  const dowFactors = calculateDayOfWeekFactors(series);
  const trends = calculateTrendsAndAverages(series);

  // Baseline daily expected donations: blend 7-day SMA (70%) and 30-day SMA (30%)
  const baseline = trends.sma7 * 0.7 + trends.sma30 * 0.3;
  // Trend velocity adjustment (dampened to 30% of velocity)
  const velocityMultiplier = 1 + (trends.trendVelocityPercent / 100) * 0.3;

  // Next 24 hours (tomorrow)
  const tomorrow = new Date(referenceNow.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDow = tomorrow.getDay();
  const tomorrowFactor = dowFactors[tomorrowDow]?.factor || 1.0;

  const rawExpected24h = Math.max(1, baseline * tomorrowFactor * velocityMultiplier);
  const expectedDonations24h = Math.round(rawExpected24h * 10) / 10;
  const expectedServings24h = Math.round(expectedDonations24h * trends.servingsPerDonation);

  // Next 7 Days projections
  const next7Days: ForecastPeriod[] = [];
  let total7DaysServings = 0;
  let total7DaysDonations = 0;

  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date(referenceNow.getTime() + i * 24 * 60 * 60 * 1000);
    const dow = forecastDate.getDay();
    const factor = dowFactors[dow]?.factor || 1.0;

    const dayDonations = Math.max(1, Math.round(baseline * factor * velocityMultiplier * 10) / 10);
    const dayServings = Math.round(dayDonations * trends.servingsPerDonation);

    next7Days.push({
      date: forecastDate.toISOString().split('T')[0],
      dayOfWeek: DAY_NAMES[dow],
      expectedDonations: dayDonations,
      expectedServings: dayServings,
      confidence: trends.confidence,
    });

    total7DaysDonations += dayDonations;
    total7DaysServings += dayServings;
  }

  // Identify High Risk Surplus Days (days where factor >= 1.25)
  const highRiskSurplusDays = dowFactors
    .filter((f) => f.factor >= 1.25)
    .map((f) => `${f.dayName} (+${Math.round((f.factor - 1) * 100)}% peak)`);

  // Assess Capacity & Risk
  const capacityAssessment = await assessSurplusCapacityRisk(expectedServings24h);

  return {
    next24h: {
      expectedDonations: expectedDonations24h,
      expectedServings: expectedServings24h,
      dayOfWeek: DAY_NAMES[tomorrowDow],
      seasonalMultiplier: tomorrowFactor,
    },
    next7Days,
    totalExpected7DaysDonations: Math.round(total7DaysDonations * 10) / 10,
    totalExpected7DaysServings: total7DaysServings,
    movingAverage7Day: trends.sma7,
    movingAverage30Day: trends.sma30,
    trendVelocityPercent: trends.trendVelocityPercent,
    trendDirection: trends.trendDirection,
    confidence: trends.confidence,
    confidenceReason: trends.confidenceReason,
    highRiskSurplusDays,
    capacityAssessment,
    generatedAt: referenceNow.toISOString(),
  };
}
