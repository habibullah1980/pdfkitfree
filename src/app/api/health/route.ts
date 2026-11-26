import { NextResponse } from 'next/server';
import { getPlatformSettingsAdmin } from '@/lib/server/auth-store';


// Reads live data from the database on every request (never prerendered at build time).
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let settings;

  try {
    settings = await getPlatformSettingsAdmin();
  } catch {
    dbStatus = 'degraded';
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus === 'healthy' ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      neonLakebasePostgres: process.env.DATABASE_URL ? 'connected (Lakebase Postgres)' : 'local_store',
      auth: 'operational',
      clientProcessingEngine: 'operational (in-browser sandbox)',
      aiAssistant: process.env.AI_API_KEY ? 'live_provider' : 'local_deterministic',
      emailDelivery: process.env.RESEND_API_KEY ? 'resend_live' : 'sandboxed_mode',
      smsDelivery: process.env.TWILIO_AUTH_TOKEN ? 'twilio_live' : 'sandboxed_mode',
    },
    maintenanceMode: settings?.maintenanceMode || false,
    latencyMs: responseTimeMs,
  });
}
