/**
 * DEBUG ONLY — remove before production deployment.
 * Shows which OAuth env vars the running server has loaded.
 * Never exposes secrets — only shows presence/prefix.
 */
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const clientId     = process.env.HUBSPOT_CLIENT_ID ?? '';
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET ?? '';
  const redirectUri  = process.env.HUBSPOT_REDIRECT_URI ?? '';
  const jwtSecret    = process.env.JWT_SECRET ?? '';
  const mongoUri     = process.env.MONGODB_URI ?? '';

  return NextResponse.json({
    HUBSPOT_CLIENT_ID:     clientId     ? clientId.slice(0, 8) + '...' : 'MISSING',
    HUBSPOT_CLIENT_SECRET: clientSecret ? clientSecret.slice(0, 8) + '...' : 'MISSING',
    HUBSPOT_REDIRECT_URI:  redirectUri  || 'MISSING',
    JWT_SECRET_SET:        jwtSecret    ? 'yes' : 'MISSING',
    MONGODB_URI_SET:       mongoUri     ? 'yes' : 'MISSING',
    NODE_ENV:              process.env.NODE_ENV,
  });
}
