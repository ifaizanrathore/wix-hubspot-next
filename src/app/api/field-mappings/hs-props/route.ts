import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Installation from '@/lib/models/Installation';
import { getContactProperties } from '@/lib/services/hubspotService';

function getSiteId(req: NextRequest): string {
  return (
    req.headers.get('x-site-id') ??
    req.nextUrl.searchParams.get('siteId') ??
    process.env.WIX_SITE_ID!
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const siteId = getSiteId(req);

    const inst = await Installation.findOne({ siteId, isConnected: true });
    if (!inst) {
      return NextResponse.json({ error: 'HubSpot not connected' }, { status: 401 });
    }

    const properties = await getContactProperties(siteId);
    return NextResponse.json({ properties });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
