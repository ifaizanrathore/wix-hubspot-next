import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ContactMapping from '@/lib/models/ContactMapping';
import SyncLog from '@/lib/models/SyncLog';

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

    const [totalMappings, totalLogs, successLogs, errorLogs, lastSync] = await Promise.all([
      ContactMapping.countDocuments({ siteId }),
      SyncLog.countDocuments({ siteId }),
      SyncLog.countDocuments({ siteId, status: 'success' }),
      SyncLog.countDocuments({ siteId, status: 'error' }),
      SyncLog.findOne({ siteId, status: 'success' })
        .sort({ createdAt: -1 })
        .select('createdAt source action'),
    ]);

    return NextResponse.json({ totalMappings, totalLogs, successLogs, errorLogs, lastSync });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
