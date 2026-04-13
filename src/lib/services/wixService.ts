/**
 * Wix Contacts REST API client using IST (Installation Secret Token).
 */
import axios from 'axios';
import type { WixField } from '@/types';

const WIX_BASE = 'https://www.wixapis.com';

function getHeaders(siteId?: string): Record<string, string> {
  return {
    Authorization: process.env.WIX_API_KEY!,
    'wix-site-id': siteId ?? process.env.WIX_SITE_ID!,
    'Content-Type': 'application/json',
  };
}

async function wixRequest<T = unknown>(
  method: string,
  path: string,
  payload?: unknown,
  siteId?: string,
): Promise<T> {
  try {
    const { data } = await axios<T>({
      method,
      url: `${WIX_BASE}${path}`,
      headers: getHeaders(siteId),
      data: payload,
    });
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500;
      const msg = (err.response?.data as { message?: string })?.message ?? err.message;
      throw new Error(`Wix API error ${status}: ${msg}`);
    }
    throw err;
  }
}

// ── Contact types ─────────────────────────────────────────────────────────────

interface WixContactInfo {
  name?: { first?: string; last?: string };
  emails?: Array<{ email: string; primary?: boolean }>;
  phones?: Array<{ phone: string; primary?: boolean }>;
  company?: string;
  jobTitle?: string;
  addresses?: Array<{ city?: string; country?: string; subdivision?: string }>;
}

interface WixContactResponse {
  contact?: { id: string; info?: WixContactInfo };
  id?: string;
  info?: WixContactInfo;
}

interface WixQueryResponse {
  contacts?: Array<{ id: string; info?: WixContactInfo }>;
}

// ── API methods ───────────────────────────────────────────────────────────────

export async function getContact(
  wixContactId: string,
  siteId?: string,
): Promise<WixContactResponse> {
  return wixRequest<WixContactResponse>('GET', `/contacts/v4/contacts/${wixContactId}`, undefined, siteId);
}

export async function searchContactByEmail(
  email: string,
  siteId?: string,
): Promise<{ id: string; info?: WixContactInfo } | null> {
  const data = await wixRequest<WixQueryResponse>(
    'POST',
    '/contacts/v4/contacts/query',
    { filter: { 'info.emails.email': { $eq: email } }, fieldsets: ['FULL'], paging: { limit: 1 } },
    siteId,
  );
  return data.contacts?.[0] ?? null;
}

export async function createContact(
  contactData: WixContactInfo,
  siteId?: string,
): Promise<WixContactResponse> {
  return wixRequest<WixContactResponse>('POST', '/contacts/v4/contacts', { info: contactData }, siteId);
}

export async function updateContact(
  wixContactId: string,
  contactData: WixContactInfo,
  siteId?: string,
): Promise<WixContactResponse> {
  return wixRequest<WixContactResponse>(
    'PATCH',
    `/contacts/v4/contacts/${wixContactId}`,
    { info: contactData },
    siteId,
  );
}

export async function upsertContactByEmail(
  email: string,
  contactData: WixContactInfo,
  siteId?: string,
): Promise<WixContactResponse> {
  const existing = await searchContactByEmail(email, siteId);
  if (existing) {
    return updateContact(existing.id, contactData, siteId);
  }
  return createContact(
    { ...contactData, emails: [{ email, primary: true }] },
    siteId,
  );
}

// ── Static field definitions ──────────────────────────────────────────────────

export function getWixFields(): WixField[] {
  return [
    { name: 'primaryInfo.email', label: 'Email', type: 'string' },
    { name: 'primaryInfo.phone', label: 'Phone', type: 'string' },
    { name: 'name.first', label: 'First Name', type: 'string' },
    { name: 'name.last', label: 'Last Name', type: 'string' },
    { name: 'company', label: 'Company', type: 'string' },
    { name: 'jobTitle', label: 'Job Title', type: 'string' },
    { name: 'addresses[0].city', label: 'City', type: 'string' },
    { name: 'addresses[0].country', label: 'Country', type: 'string' },
    { name: 'addresses[0].subdivision', label: 'State/Region', type: 'string' },
  ];
}

// ── Field extraction helpers ──────────────────────────────────────────────────

export function extractWixField(
  contact: Record<string, unknown>,
  fieldPath: string,
): string | null {
  const parts = fieldPath.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = (contact as any)?.info ?? contact;

  for (const part of parts) {
    if (val == null) return null;
    const arrMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrMatch) {
      val = val[arrMatch[1]]?.[parseInt(arrMatch[2], 10)];
    } else {
      val = val[part];
    }
  }
  return val != null ? String(val) : null;
}

export function applyTransform(value: string, transform: string): string {
  switch (transform) {
    case 'trim':      return value.trim();
    case 'lowercase': return value.toLowerCase();
    case 'uppercase': return value.toUpperCase();
    default:          return value;
  }
}
