import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Installation from '@/lib/models/Installation';
import { exchangeCodeForTokens, getTokenInfo } from '@/lib/services/hubspotService';
import { encrypt } from '@/lib/services/tokenService';

const FRONTEND = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const siteId = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${FRONTEND}/?oauth=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !siteId) {
    return NextResponse.redirect(`${FRONTEND}/?oauth=error&reason=missing_params`);
  }

  try {
    await connectDB();
    const tokens = await exchangeCodeForTokens(code);
    const tokenInfo = await getTokenInfo(tokens.access_token);

    await Installation.findOneAndUpdate(
      { siteId },
      {
        siteId,
        hubspotPortalId: String(tokenInfo.hub_id),
        encryptedAccessToken: encrypt(tokens.access_token),
        encryptedRefreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scopes: tokens.scope.split(' '),
        isConnected: true,
        connectedAt: new Date(),
        disconnectedAt: null,
      },
      { upsert: true, new: true },
    );

    console.log(`[OAuth] Connected HubSpot portal ${tokenInfo.hub_id} for site ${siteId}`);
    return NextResponse.redirect(`${FRONTEND}/?oauth=success`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'server_error';
    console.error('[OAuth] Callback error:', msg);
    return NextResponse.redirect(`${FRONTEND}/?oauth=error&reason=server_error`);
  }
}
