/**
 * Core sync engine — bi-directional Wix ↔ HubSpot contact sync.
 *
 * Loop prevention strategy:
 *  1. Every sync stamps ContactMapping.lastSyncSource + lastSyncAt
 *  2. Incoming webhook for the same contact checks if last sync was from the
 *     opposite direction within DEDUP_WINDOW_MS → if so, it's an echo → skip
 *  3. Idempotency: compare current values before writing
 */
import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '@/lib/db';
import ContactMapping from '@/lib/models/ContactMapping';
import FieldMapping from '@/lib/models/FieldMapping';
import SyncLog from '@/lib/models/SyncLog';
import * as hubspot from './hubspotService';
import * as wix from './wixService';
import type { SyncSource, SyncAction, SyncResult, FormSubmissionPayload } from '@/types';

const DEDUP_WINDOW_MS = 60_000; // 60 seconds

// ── Loop prevention ───────────────────────────────────────────────────────────

async function isEchoEvent(
  siteId: string,
  query: Record<string, string>,
  incomingSource: SyncSource,
): Promise<boolean> {
  const mapping = await ContactMapping.findOne({ siteId, ...query });
  if (!mapping || mapping.lastSyncSource !== incomingSource) return false;
  const age = Date.now() - (mapping.lastSyncAt?.getTime() ?? 0);
  return age < DEDUP_WINDOW_MS;
}

async function markSynced(
  siteId: string,
  wixContactId: string,
  hubspotContactId: string,
  source: SyncSource,
  syncId: string,
): Promise<void> {
  await ContactMapping.findOneAndUpdate(
    { siteId, wixContactId },
    { hubspotContactId, lastSyncSource: source, lastSyncId: syncId, lastSyncAt: new Date() },
    { upsert: true, new: true },
  );
}

// ── Field mapping helpers ─────────────────────────────────────────────────────

async function buildHubSpotProps(
  siteId: string,
  wixContact: Record<string, unknown>,
): Promise<Record<string, string>> {
  const mappings = await FieldMapping.find({ siteId, isActive: true });
  const props: Record<string, string> = {};

  for (const m of mappings) {
    if (m.syncDirection === 'hubspot_to_wix') continue;
    const raw = wix.extractWixField(wixContact, m.wixField);
    if (raw == null) continue;
    props[m.hubspotProperty] = wix.applyTransform(raw, m.transform);
  }
  return props;
}

async function buildWixInfo(
  siteId: string,
  hsProps: Record<string, string>,
): Promise<Record<string, unknown>> {
  const mappings = await FieldMapping.find({ siteId, isActive: true });
  const info: Record<string, unknown> = {};

  function setPath(obj: Record<string, unknown>, path: string, value: string): void {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  for (const m of mappings) {
    if (m.syncDirection === 'wix_to_hubspot') continue;
    const raw = hsProps[m.hubspotProperty];
    if (raw == null) continue;
    setPath(info, m.wixField, wix.applyTransform(raw, m.transform));
  }
  return info;
}

function propsIdentical(
  incoming: Record<string, string>,
  existing: Record<string, string>,
): boolean {
  return Object.keys(incoming).every(
    (k) => String(incoming[k]) === String(existing[k] ?? ''),
  );
}

// ── Wix → HubSpot ─────────────────────────────────────────────────────────────

export async function syncWixToHubSpot(
  siteId: string,
  wixContactId: string,
): Promise<SyncResult> {
  await connectDB();
  const syncId = uuidv4();

  const echo = await isEchoEvent(siteId, { wixContactId }, 'hubspot');
  if (echo) {
    await log(siteId, syncId, 'wix', 'skip', wixContactId, null, 'skipped', 'Echo dedup');
    return { skipped: true, reason: 'echo' };
  }

  const wixResp = await wix.getContact(wixContactId, siteId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wixContact = (wixResp as any).contact ?? wixResp;
  const email = wix.extractWixField(wixContact as Record<string, unknown>, 'primaryInfo.email');

  if (!email) {
    await log(siteId, syncId, 'wix', 'skip', wixContactId, null, 'skipped', 'No email');
    return { skipped: true, reason: 'no_email' };
  }

  const hsProps = await buildHubSpotProps(siteId, wixContact as Record<string, unknown>);
  if (Object.keys(hsProps).length === 0) {
    await log(siteId, syncId, 'wix', 'skip', wixContactId, null, 'skipped', 'No mapped fields');
    return { skipped: true, reason: 'no_mapped_fields' };
  }

  const existingMapping = await ContactMapping.findOne({ siteId, wixContactId });
  let hsContactId = existingMapping?.hubspotContactId;
  let action: SyncAction = 'update';

  if (hsContactId) {
    try {
      const current = await hubspot.getContact(siteId, hsContactId, Object.keys(hsProps));
      if (propsIdentical(hsProps, current.properties)) {
        await log(siteId, syncId, 'wix', 'skip', wixContactId, hsContactId, 'skipped', 'Identical values');
        return { skipped: true, reason: 'identical' };
      }
    } catch { /* contact deleted in HS — fall through to upsert */ }
    await hubspot.updateContact(siteId, hsContactId, hsProps);
  } else {
    const result = await hubspot.upsertContactByEmail(siteId, email, hsProps);
    hsContactId = result.id;
    action = 'create';
  }

  await markSynced(siteId, wixContactId, hsContactId, 'wix', syncId);
  await log(siteId, syncId, 'wix', action, wixContactId, hsContactId, 'success',
    `Synced ${Object.keys(hsProps).length} fields`);

  return { syncId, wixContactId, hubspotContactId: hsContactId, action };
}

// ── HubSpot → Wix ─────────────────────────────────────────────────────────────

export async function syncHubSpotToWix(
  siteId: string,
  hubspotContactId: string,
  hsProperties: Record<string, string>,
): Promise<SyncResult> {
  await connectDB();
  const syncId = uuidv4();

  const echo = await isEchoEvent(siteId, { hubspotContactId }, 'wix');
  if (echo) {
    await log(siteId, syncId, 'hubspot', 'skip', null, hubspotContactId, 'skipped', 'Echo dedup');
    return { skipped: true, reason: 'echo' };
  }

  const email = hsProperties.email;
  if (!email) {
    await log(siteId, syncId, 'hubspot', 'skip', null, hubspotContactId, 'skipped', 'No email');
    return { skipped: true, reason: 'no_email' };
  }

  const wixInfo = await buildWixInfo(siteId, hsProperties);
  if (Object.keys(wixInfo).length === 0) {
    await log(siteId, syncId, 'hubspot', 'skip', null, hubspotContactId, 'skipped', 'No mapped fields');
    return { skipped: true, reason: 'no_mapped_fields' };
  }

  const existingMapping = await ContactMapping.findOne({ siteId, hubspotContactId });
  let wixContactId = existingMapping?.wixContactId;
  let action: SyncAction = 'update';

  if (wixContactId) {
    await wix.updateContact(wixContactId, wixInfo, siteId);
  } else {
    const result = await wix.upsertContactByEmail(email, wixInfo, siteId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wixContactId = (result as any).contact?.id ?? (result as any).id;
    action = 'create';
  }

  if (wixContactId) {
    await markSynced(siteId, wixContactId, hubspotContactId, 'hubspot', syncId);
  }
  await log(siteId, syncId, 'hubspot', action, wixContactId ?? null, hubspotContactId, 'success',
    `Synced ${Object.keys(wixInfo).length} fields`);

  return { syncId, wixContactId, hubspotContactId, action };
}

// ── Form submission → HubSpot ─────────────────────────────────────────────────

export async function syncFormSubmission(
  siteId: string,
  payload: FormSubmissionPayload,
): Promise<SyncResult> {
  await connectDB();
  const syncId = uuidv4();

  const { email, firstName, lastName, phone,
    utmSource, utmMedium, utmCampaign, utmTerm, utmContent,
    customFields = {} } = payload;

  if (!email) throw new Error('email is required');

  const hsProps: Record<string, string> = {
    email,
    ...(firstName ? { firstname: firstName } : {}),
    ...(lastName ? { lastname: lastName } : {}),
    ...(phone ? { phone } : {}),
    ...(utmSource ? { utm_source: utmSource, hs_analytics_source: utmSource } : {}),
    ...(utmMedium ? { utm_medium: utmMedium, hs_analytics_source_data_1: utmMedium } : {}),
    ...(utmCampaign ? { utm_campaign: utmCampaign, hs_analytics_source_data_2: utmCampaign } : {}),
    ...(utmTerm ? { utm_term: utmTerm } : {}),
    ...(utmContent ? { utm_content: utmContent } : {}),
    hs_lead_status: 'NEW',
    ...customFields,
  };

  const result = await hubspot.upsertContactByEmail(siteId, email, hsProps);
  const hsContactId = result.id;

  let wixContactId: string | null = null;
  try {
    const existing = await wix.searchContactByEmail(email, siteId);
    if (existing) {
      wixContactId = existing.id;
    } else {
      const created = await wix.createContact({
        name: { first: firstName, last: lastName },
        emails: [{ email, primary: true }],
        ...(phone ? { phones: [{ phone, primary: true }] } : {}),
      }, siteId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wixContactId = (created as any).contact?.id ?? (created as any).id;
    }
    if (wixContactId) {
      await markSynced(siteId, wixContactId, hsContactId, 'form', syncId);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.warn('[syncFormSubmission] Wix upsert failed:', msg);
  }

  await log(siteId, syncId, 'form', 'create', wixContactId, hsContactId, 'success',
    `Form submission — UTM: ${utmSource ?? 'none'}`);

  return { syncId, hubspotContactId: hsContactId, wixContactId };
}

// ── Logging ───────────────────────────────────────────────────────────────────

async function log(
  siteId: string,
  syncId: string,
  source: SyncSource,
  action: SyncAction,
  wixContactId: string | null,
  hubspotContactId: string | null,
  status: 'success' | 'error' | 'skipped',
  detail: string,
): Promise<void> {
  try {
    await SyncLog.create({ siteId, syncId, source, action, wixContactId, hubspotContactId, status, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[syncService] log error:', msg);
  }
}
