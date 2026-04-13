import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Installation from '@/lib/models/Installation';

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
    const inst = await Installation.findOne({ siteId });

    if (!inst?.isConnected) {
      return NextResponse.json({ connected: false });
    }

    // Never return tokens to the browser
    return NextResponse.json({
      connected: true,
      hubspotPortalId: inst.hubspotPortalId,
      scopes: inst.scopes,
      connectedAt: inst.connectedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Disconnect
  try {
    await connectDB();
    const siteId = getSiteId(req);
    await Installation.findOneAndUpdate(
      { siteId },
      {
        isConnected: false,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
        disconnectedAt: new Date(),
      },
    );
    console.log(`[OAuth] Disconnected site ${siteId}`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
