/**
 * HubSpot OAuth callback — http://localhost:3001/oauth/callback
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Installation from '@/lib/models/Installation';
import { exchangeCodeForTokens, getTokenInfo } from '@/lib/services/hubspotService';
import { encrypt } from '@/lib/services/tokenService';

const FRONTEND = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code   = searchParams.get('code');
  const siteId = searchParams.get('state');
  const error  = searchParams.get('error');

  console.log('[OAuth Callback] code present:', !!code, '| siteId:', siteId, '| error:', error);
  console.log('[OAuth Callback] REDIRECT_URI env:', process.env.HUBSPOT_REDIRECT_URI);
  console.log('[OAuth Callback] CLIENT_ID env:', process.env.HUBSPOT_CLIENT_ID);

  if (error) {
    console.error('[OAuth Callback] HubSpot returned error:', error);
    return NextResponse.redirect(
      `${FRONTEND}/?oauth=error&reason=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !siteId) {
    console.error('[OAuth Callback] Missing code or siteId');
    return NextResponse.redirect(`${FRONTEND}/?oauth=error&reason=missing_params`);
  }

  try {
    await connectDB();
    console.log('[OAuth Callback] DB connected, exchanging code...');

    const tokens = await exchangeCodeForTokens(code);
    console.log('[OAuth Callback] Tokens received, scope:', tokens.scope);

    const tokenInfo = await getTokenInfo(tokens.access_token);
    console.log('[OAuth Callback] Portal ID:', tokenInfo.hub_id);

    await Installation.findOneAndUpdate(
      { siteId },
      {
        siteId,
        hubspotPortalId: String(tokenInfo.hub_id),
        encryptedAccessToken:  encrypt(tokens.access_token),
        encryptedRefreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        isConnected:  true,
        connectedAt:  new Date(),
        disconnectedAt: null,
      },
      { upsert: true, new: true },
    );

    console.log(`[OAuth] ✓ Connected portal ${tokenInfo.hub_id} for site ${siteId}`);
    return NextResponse.redirect(`${FRONTEND}/?oauth=success`);

  } catch (err: unknown) {
    // Extract the deepest error detail possible
    let reason = 'server_error';
    if (err instanceof Error) {
      reason = err.message;
      const axErr = err as Error & {
        response?: { status?: number; data?: unknown };
      };
      if (axErr.response) {
        const detail = JSON.stringify(axErr.response.data);
        console.error('[OAuth] HubSpot HTTP error', axErr.response.status, detail);
        reason = detail;
      } else {
        console.error('[OAuth] Error:', err.message, err.stack);
      }
    }
    return NextResponse.redirect(
      `${FRONTEND}/?oauth=error&reason=${encodeURIComponent(reason)}`,
    );
  }
}
