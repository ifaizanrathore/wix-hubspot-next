import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
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
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      SyncLog.find({ siteId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      SyncLog.countDocuments({ siteId }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
