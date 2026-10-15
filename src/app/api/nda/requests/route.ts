import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import {
  getSigningRequestsByUserId,
  createSigningRequest,
  deleteSigningRequest,
} from '@/lib/server/auth-store';

// GET: Retrieve authenticated user's signing requests / history
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in to view your signing history.' },
      { status: 401 }
    );
  }

  const requests = getSigningRequestsByUserId(session.user.id);
  return NextResponse.json({ success: true, requests });
}

// POST: Record a new signing request / signed document entry
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in to save agreements to your signing history.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      title,
      documentType,
      status = 'signed',
      disclosingParty,
      receivingParty,
      fileName,
      fileSize = 0,
      pageCount = 1,
    } = body;

    if (!title || !fileName) {
      return NextResponse.json({ error: 'Title and filename are required.' }, { status: 400 });
    }

    const newRecord = createSigningRequest(session.user.id, {
      title,
      documentType: documentType === 'generated' ? 'generated' : 'uploaded',
      status: status === 'draft' ? 'draft' : status === 'pending' ? 'pending' : 'signed',
      disclosingParty,
      receivingParty,
      fileName,
      fileSize: Number(fileSize),
      pageCount: Number(pageCount),
    });

    return NextResponse.json({ success: true, request: newRecord });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to save signing record.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a signing request by ID
export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Agreement ID is required.' }, { status: 400 });
    }

    const deleted = deleteSigningRequest(session.user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Agreement record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Agreement deleted from history.' });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to delete agreement.' },
      { status: 500 }
    );
  }
}
