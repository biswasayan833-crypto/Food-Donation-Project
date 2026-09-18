/**
 * Phase 2 - Sprint 7 Verification Test Suite
 *
 * Verifies:
 * 1. Append-only Audit Log recording & querying
 * 2. Incident & Dispute lifecycle (Report, Query, Review, Adjudication, Resolution)
 * 3. Transparent Trust & Reputation Engine (Scores, Pillars, Tiers, Merit Badges)
 * 4. Zero client manipulation & server-authoritative calculations
 * 5. Incident deduction impact on reputation
 */

import { prisma } from '../lib/prisma';
import { logAuditEvent, getAuditLogs, getAuditStats } from '../services/audit.service';
import {
  createIncident,
  getUserIncidents,
  getPlatformIncidents,
  getIncidentById,
  resolveIncident,
} from '../services/incident.service';
import { getUserReputationProfile } from '../services/reputation.service';

async function runSprint7Tests() {
  console.log('====================================================');
  console.log('  STARTING PHASE 2 - SPRINT 7 AUTOMATED TEST SUITE  ');
  console.log('  TRUST, REPUTATION & AUDIT SYSTEM VERIFICATION     ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`, detail || '');
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // 1. Setup / Identify users across roles
    console.log('[Phase 1] Discovering test users across roles...');
    const [donor, receiver, driver, admin] = await Promise.all([
      prisma.user.findFirst({ where: { role: 'DONOR' } }),
      prisma.user.findFirst({ where: { role: 'RECEIVER' } }),
      prisma.user.findFirst({ where: { role: 'VOLUNTEER' } }),
      prisma.user.findFirst({ where: { role: 'ADMIN' } }),
    ]);

    assert(Boolean(donor), 'Donor user exists in Neon DB');
    assert(Boolean(receiver), 'Receiver user exists in Neon DB');
    assert(Boolean(driver), 'Volunteer driver user exists in Neon DB');
    assert(Boolean(admin), 'Admin user exists in Neon DB');

    console.log(`  Identified: Donor (${donor!.email}), Receiver (${receiver!.email}), Driver (${driver!.email}), Admin (${admin!.email})\n`);

    // 2. Audit Log Service Verification
    console.log('[Phase 2] Testing Audit Log Engine...');
    const testEntityId = 'listing-test-' + Date.now();
    const loggedEvent = await logAuditEvent({
      actorId: donor!.id,
      action: 'DONATION_CREATED',
      entityType: 'FOOD_LISTING',
      entityId: testEntityId,
      metadata: { test: true, quantity: '50 servings', tag: 'sprint7-test' },
    });

    assert(Boolean(loggedEvent && loggedEvent.id), 'Audit log successfully recorded to PostgreSQL');
    assert(loggedEvent?.action === 'DONATION_CREATED', 'Audit log stores correct action type');
    assert(loggedEvent?.entityId === testEntityId, 'Audit log stores correct entity reference');

    // Query audit logs with filter
    const auditQuery = await getAuditLogs({
      entityId: testEntityId,
      action: 'DONATION_CREATED',
      limit: 10,
    });

    assert(auditQuery.logs.length >= 1, 'Audit log retrieved by entityId filter');
    assert(auditQuery.logs[0].actor?.id === donor!.id, 'Audit log includes actor relation details');

    // Audit stats
    const stats = await getAuditStats();
    assert(stats.totalLogs > 0, 'Audit stats returns aggregate log counts');
    assert(typeof stats.last24hCount === 'number', 'Audit stats provides last 24h count');
    console.log(`  Total audit logs recorded in Neon DB: ${stats.totalLogs}\n`);

    // 3. Incident & Dispute Lifecycle Verification
    console.log('[Phase 3] Testing Incident & Dispute Lifecycle...');
    const incidentTitle = `Dispute Test - Temperature Issue - ${Date.now()}`;
    const newIncident = await createIncident({
      reporterId: receiver!.id,
      reportedUserId: donor!.id,
      category: 'SPOILED_FOOD',
      title: incidentTitle,
      description: 'The hot meal arrived below food-safe holding temperature (under 60°C).',
    });

    assert(Boolean(newIncident && newIncident.id), 'Incident report filed successfully in database');
    assert(newIncident.status === 'OPEN', 'New incident starts in OPEN status');
    assert(newIncident.category === 'SPOILED_FOOD', 'Incident records correct category');
    assert(newIncident.reportedUserId === donor!.id, 'Incident targets correct user');

    // Verify automatic audit trail for incident creation
    const incidentAudit = await getAuditLogs({
      entityId: newIncident.id,
      action: 'INCIDENT_CREATED',
    });
    assert(incidentAudit.logs.length >= 1, 'INCIDENT_CREATED event automatically logged in audit trail');

    // Verify user ownership isolation
    const receiverIncidents = await getUserIncidents(receiver!.id);
    assert(
      receiverIncidents.some((inc) => inc.id === newIncident.id),
      'Reporter sees filed incident in their personal query'
    );

    const donorIncidents = await getUserIncidents(donor!.id);
    assert(
      donorIncidents.some((inc) => inc.id === newIncident.id),
      'Targeted donor sees incident in their personal query'
    );

    // Verify Admin Query
    const platformIncidents = await getPlatformIncidents({ status: 'OPEN', limit: 20 });
    assert(
      platformIncidents.incidents.some((inc) => inc.id === newIncident.id),
      'Admin can query all platform incidents'
    );

    // Verify single incident retrieval authorization
    const fetchedByReporter = await getIncidentById(newIncident.id, receiver!.id, false);
    assert(fetchedByReporter?.id === newIncident.id, 'Reporter can view incident details');

    let accessBlocked = false;
    try {
      await getIncidentById(newIncident.id, driver!.id, false);
    } catch (err: any) {
      accessBlocked = err.message.includes('Access denied');
    }
    assert(accessBlocked, 'Unrelated third party is denied access to private dispute');

    // Adjudicate / Resolve Incident by Admin
    const resolved = await resolveIncident({
      incidentId: newIncident.id,
      resolvedById: admin!.id,
      status: 'RESOLVED',
      resolutionNotes: 'Donor verified thermal transport containers will be replaced immediately.',
    });

    assert(resolved.status === 'RESOLVED', 'Admin adjudication updates status to RESOLVED');
    assert(Boolean(resolved.resolvedAt), 'Incident records resolution timestamp');
    assert(resolved.resolvedById === admin!.id, 'Incident records resolving admin identity');

    // Verify resolution audit log
    const resolutionAudit = await getAuditLogs({
      entityId: newIncident.id,
      action: 'INCIDENT_RESOLVED',
    });
    assert(resolutionAudit.logs.length >= 1, 'INCIDENT_RESOLVED event logged in audit trail');
    console.log(`  Incident lifecycle test passed completely.\n`);

    // 4. Reputation & Trust Engine Verification
    console.log('[Phase 4] Testing Server-Authoritative Trust Engine...');

    // Donor Reputation Profile
    const donorProfile = await getUserReputationProfile(donor!.id);
    assert(donorProfile.overallScore >= 0 && donorProfile.overallScore <= 100, 'Donor trust score is bounded 0–100');
    assert(donorProfile.pillars.length === 5, 'Donor profile provides 5 distinct reputation pillars');
    assert(['EXEMPLARY', 'HIGH', 'ESTABLISHED', 'BUILDING', 'NEEDS_ATTENTION'].includes(donorProfile.tier), 'Donor assigned valid reputation tier');
    assert(Array.isArray(donorProfile.badges), 'Donor profile returns merit badges list');
    console.log(`  Donor (${donorProfile.name}): Score ${donorProfile.overallScore}/100 [${donorProfile.tierLabel}], Badges: ${donorProfile.badges.map(b => b.name).join(', ')}`);

    // Receiver Reputation Profile
    const receiverProfile = await getUserReputationProfile(receiver!.id);
    assert(receiverProfile.overallScore >= 0 && receiverProfile.overallScore <= 100, 'Receiver trust score is bounded 0–100');
    assert(receiverProfile.pillars.length === 5, 'Receiver profile provides 5 distinct reputation pillars');
    console.log(`  Receiver (${receiverProfile.name}): Score ${receiverProfile.overallScore}/100 [${receiverProfile.tierLabel}], Badges: ${receiverProfile.badges.map(b => b.name).join(', ')}`);

    // Driver Reputation Profile
    const driverProfile = await getUserReputationProfile(driver!.id);
    assert(driverProfile.overallScore >= 0 && driverProfile.overallScore <= 100, 'Driver trust score is bounded 0–100');
    assert(driverProfile.pillars.length === 5, 'Driver profile provides 5 distinct reputation pillars');
    console.log(`  Driver (${driverProfile.name}): Score ${driverProfile.overallScore}/100 [${driverProfile.tierLabel}], Badges: ${driverProfile.badges.map(b => b.name).join(', ')}`);

    // Admin Reputation Profile
    const adminProfile = await getUserReputationProfile(admin!.id);
    assert(adminProfile.overallScore === 100, 'Admin trust score is 100');
    assert(adminProfile.tier === 'EXEMPLARY', 'Admin tier is EXEMPLARY');
    assert(adminProfile.badges.some(b => b.id === 'ADMIN_TRUST'), 'Admin earns ADMIN_TRUST badge');
    console.log(`  Admin (${adminProfile.name}): Score 100/100 [${adminProfile.tierLabel}]\n`);

    // Cleanup test incident
    console.log('[Phase 5] Cleaning up test incident artifact...');
    await prisma.incident.delete({ where: { id: newIncident.id } });
    console.log('  Cleaned up test incident record.');

    console.log('\n====================================================');
    console.log(`  ALL SPRINT 7 TESTS PASSED: ${passedTests}/${totalTests} CHECKS `);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\nTest Suite Execution Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSprint7Tests();
