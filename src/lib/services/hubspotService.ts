/**
 * HubSpot API client — all calls server-side only.
 * Handles automatic token refresh. Tokens never reach the browser.
 */
import axios from 'axios';
import { connectDB } from '@/lib/db';
import Installation from '@/lib/models/Installation';
import { encrypt, decrypt } from './tokenService';
import type { HubSpotProperty } from '@/types';

const HS_BASE = 'https://api.hubapi.com';
const TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getInstallation(siteId: string) {
  await connectDB();
  const inst = await Installation.findOne({ siteId, isConnected: true });
  if (!inst) {
    const err = new Error('HubSpot not connected for this site');
    (err as NodeJS.ErrnoException).code = '401';
    throw err;
  }
  return inst;
}

async function getAccessToken(siteId: string): Promise<string> {
  const inst = await getInstallation(siteId);

  const isExpired =
    !inst.tokenExpiresAt ||
    inst.tokenExpiresAt < new Date(Date.now() + BUFFER_MS);

  if (isExpired) {
    return refreshToken(siteId, inst.encryptedRefreshToken!);
  }

  return decrypt(inst.encryptedAccessToken!);
}

async function refreshToken(siteId: string, encRefresh: string): Promise<string> {
  const refreshToken = decrypt(encRefresh);

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  const { data } = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  await Installation.findOneAndUpdate(
    { siteId },
    {
      encryptedAccessToken: encrypt(data.access_token as string),
      encryptedRefreshToken: encrypt(data.refresh_token as string),
      tokenExpiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
    },
  );

  return data.access_token as string;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function hsRequest<T = unknown>(
  siteId: string,
  method: string,
  path: string,
  payload?: unknown,
): Promise<T> {
  const token = await getAccessToken(siteId);

  try {
    const { data } = await axios<T>({
      method,
      url: `${HS_BASE}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      const msg = (err.response?.data as { message?: string })?.message ?? err.message;
      const error = new Error(`HubSpot API error ${status}: ${msg}`);
      (error as NodeJS.ErrnoException).code = String(status);
      throw error;
    }
    throw err;
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

interface HsContact {
  id: string;
  properties: Record<string, string>;
}

interface HsSearchResult {
  results: HsContact[];
}

export async function getContact(
  siteId: string,
  hubspotContactId: string,
  properties: string[] = [],
): Promise<HsContact> {
  const qs = properties.length ? `?properties=${properties.join(',')}` : '';
  return hsRequest<HsContact>(siteId, 'GET', `/crm/v3/objects/contacts/${hubspotContactId}${qs}`);
}

export async function searchContactByEmail(
  siteId: string,
  email: string,
): Promise<HsContact | null> {
  const result = await hsRequest<HsSearchResult>(siteId, 'POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['email', 'firstname', 'lastname', 'phone', 'hs_object_id'],
    limit: 1,
  });
  return result.results?.[0] ?? null;
}

export async function createContact(
  siteId: string,
  properties: Record<string, string>,
): Promise<HsContact> {
  return hsRequest<HsContact>(siteId, 'POST', '/crm/v3/objects/contacts', { properties });
}

export async function updateContact(
  siteId: string,
  hubspotContactId: string,
  properties: Record<string, string>,
): Promise<HsContact> {
  return hsRequest<HsContact>(siteId, 'PATCH', `/crm/v3/objects/contacts/${hubspotContactId}`, { properties });
}

export async function upsertContactByEmail(
  siteId: string,
  email: string,
  properties: Record<string, string>,
): Promise<HsContact> {
  const existing = await searchContactByEmail(siteId, email);
  if (existing) {
    return updateContact(siteId, existing.id, properties);
  }
  return createContact(siteId, { ...properties, email });
}

// ── Properties ────────────────────────────────────────────────────────────────

interface HsPropertiesResponse {
  results: Array<{ name: string; label: string; type: string; fieldType: string }>;
}

export async function getContactProperties(siteId: string): Promise<HubSpotProperty[]> {
  const data = await hsRequest<HsPropertiesResponse>(siteId, 'GET', '/crm/v3/properties/contacts');
  return (data.results ?? []).map((p) => ({
    name: p.name,
    label: p.label,
    type: p.type,
    fieldType: p.fieldType,
  }));
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface TokenInfo {
  hub_id: number;
  hub_domain: string;
  scopes: string[];
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
    redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
    code,
  });

  const { data } = await axios.post<TokenResponse>(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function getTokenInfo(accessToken: string): Promise<TokenInfo> {
  const { data } = await axios.get<TokenInfo>(`${HS_BASE}/oauth/v1/access-tokens/${accessToken}`);
  return data;
}
