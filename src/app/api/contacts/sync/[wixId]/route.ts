import { NextRequest, NextResponse } from 'next/server';
import { syncWixToHubSpot } from '@/lib/services/syncService';

function getSiteId(req: NextRequest): string {
  return (
    req.headers.get('x-site-id') ??
    req.nextUrl.searchParams.get('siteId') ??
    process.env.WIX_SITE_ID!
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ wixId: string }> },
): Promise<NextResponse> {
  try {
    const siteId = getSiteId(req);
    const { wixId } = await params;
    const result = await syncWixToHubSpot(siteId, wixId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
