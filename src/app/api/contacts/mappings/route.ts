import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ContactMapping from '@/lib/models/ContactMapping';
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

    const inst = await Installation.findOne({ siteId, isConnected: true });
    if (!inst) return NextResponse.json({ error: 'HubSpot not connected' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [mappings, total] = await Promise.all([
      ContactMapping.find({ siteId }).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      ContactMapping.countDocuments({ siteId }),
    ]);

    return NextResponse.json({ mappings, total, page, limit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
