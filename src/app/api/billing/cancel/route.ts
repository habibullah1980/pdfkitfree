import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { cancelUserSubscription } from '@/lib/server/auth-store';

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const updatedSub = cancelUserSubscription(session.user.id);
    return NextResponse.json({
      success: true,
      subscription: updatedSub,
      message: 'Subscription has been canceled and will terminate at the end of the current billing cycle.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to cancel subscription.' }, { status: 500 });
  }
}
