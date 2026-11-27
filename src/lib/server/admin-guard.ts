import { NextResponse } from 'next/server';
import { getServerSession } from './session';

/** Returns the signed-in super admin, or a 403 response for everyone else. */
export async function requireSuperAdmin() {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return { session: null, denied: NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 }) };
  }
  return { session, denied: null };
}
