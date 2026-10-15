import { NextResponse } from 'next/server';
import { getPlansConfig } from '@/lib/server/auth-store';

export async function GET() {
  const plans = getPlansConfig();
  return NextResponse.json({ success: true, plans });
}
