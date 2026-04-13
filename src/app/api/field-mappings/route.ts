import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FieldMapping from '@/lib/models/FieldMapping';
import type { FieldMappingRow } from '@/types';

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
    const mappings = await FieldMapping.find({ siteId, isActive: true });
    return NextResponse.json({ mappings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    const siteId = getSiteId(req);
    const body = (await req.json()) as { mappings?: FieldMappingRow[] };
    const { mappings } = body;

    if (!Array.isArray(mappings)) {
      return NextResponse.json({ error: 'mappings must be an array' }, { status: 400 });
    }

    // Validate — no duplicate HubSpot properties
    const seen = new Set<string>();
    for (const m of mappings) {
      if (!m.wixField || !m.hubspotProperty) {
        return NextResponse.json(
          { error: 'Each mapping requires wixField and hubspotProperty' },
          { status: 400 },
        );
      }
      if (seen.has(m.hubspotProperty)) {
        return NextResponse.json(
          { error: `Duplicate HubSpot property: ${m.hubspotProperty}` },
          { status: 400 },
        );
      }
      seen.add(m.hubspotProperty);
    }

    await FieldMapping.deleteMany({ siteId });
    const docs = mappings.map((m) => ({
      siteId,
      wixField: m.wixField,
      hubspotProperty: m.hubspotProperty,
      syncDirection: m.syncDirection ?? 'bidirectional',
      transform: m.transform ?? 'none',
      isActive: true,
    }));

    const saved = await FieldMapping.insertMany(docs);
    console.log(`[FieldMappings] Saved ${saved.length} mappings for site ${siteId}`);
    return NextResponse.json({ saved: saved.length, mappings: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
