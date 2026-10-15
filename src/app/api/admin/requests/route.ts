import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import {
  getAllSigningRequestsAdmin,
  deleteSigningRequestAdmin,
} from '@/lib/server/auth-store';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  const requests = getAllSigningRequestsAdmin();
  return NextResponse.json({ success: true, requests });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('id');
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const deleted = deleteSigningRequestAdmin(requestId);
    if (!deleted) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Agreement record deleted.' });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to delete record.' }, { status: 500 });
  }
}
