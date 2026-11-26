import { NextResponse } from 'next/server';
import { getPlansConfig } from '@/lib/server/auth-store';


// Reads live data from the database on every request (never prerendered at build time).
export const dynamic = 'force-dynamic';

export async function GET() {
  const plans = await getPlansConfig();
  return NextResponse.json({ success: true, plans });
}
