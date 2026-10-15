import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { getPlansConfig, updatePlanConfigAdmin, PlanTier } from '@/lib/server/auth-store';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  const plans = getPlansConfig();
  return NextResponse.json({ success: true, plans });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { planId, updates } = body;

    if (!planId || !['free', 'pro', 'business'].includes(planId)) {
      return NextResponse.json({ error: 'Valid plan ID required.' }, { status: 400 });
    }

    const updated = updatePlanConfigAdmin(
      session.user.name || 'habibullah',
      planId as PlanTier,
      updates
    );

    return NextResponse.json({
      success: true,
      plan: updated,
      message: `Plan ${planId.toUpperCase()} configuration successfully updated.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to update plan.' }, { status: 500 });
  }
}
