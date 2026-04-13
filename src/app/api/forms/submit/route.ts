import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Installation from '@/lib/models/Installation';
import { syncFormSubmission } from '@/lib/services/syncService';
import type { FormSubmissionPayload } from '@/types';

function getSiteId(req: NextRequest): string {
  return (
    req.headers.get('x-site-id') ??
    req.nextUrl.searchParams.get('siteId') ??
    process.env.WIX_SITE_ID!
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const siteId = getSiteId(req);

    const inst = await Installation.findOne({ siteId, isConnected: true });
    if (!inst) return NextResponse.json({ error: 'HubSpot not connected' }, { status: 401 });

    const payload = (await req.json()) as FormSubmissionPayload;

    if (!payload.email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const result = await syncFormSubmission(siteId, payload);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    console.error('[Forms] Submit error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
