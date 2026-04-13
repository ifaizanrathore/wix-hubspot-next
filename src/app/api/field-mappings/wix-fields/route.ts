import { NextResponse } from 'next/server';
import { getWixFields } from '@/lib/services/wixService';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ fields: getWixFields() });
}
