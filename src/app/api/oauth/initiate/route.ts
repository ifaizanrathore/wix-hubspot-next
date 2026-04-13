import { NextRequest, NextResponse } from 'next/server';

const SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.schemas.contacts.read',
].join(' ');

export async function GET(req: NextRequest): Promise<NextResponse> {
  const siteId =
    req.headers.get('x-site-id') ??
    req.nextUrl.searchParams.get('siteId') ??
    process.env.WIX_SITE_ID!;

  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
    scope: SCOPES,
    state: siteId,
    response_type: 'code',
  });

  return NextResponse.redirect(
    `https://app.hubspot.com/oauth/authorize?${params.toString()}`,
  );
}
