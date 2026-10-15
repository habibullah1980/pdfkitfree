import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import {
  getAiConversationsByUser,
  getAiConversationById,
  deleteAiConversation,
  deleteAllAiConversationsForUser,
} from '@/lib/server/auth-store';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const conv = getAiConversationById(session.user.id, id);
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, conversation: conv });
    }

    const conversations = getAiConversationsByUser(session.user.id);
    return NextResponse.json({ success: true, conversations });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to retrieve conversations.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      const deletedCount = deleteAllAiConversationsForUser(session.user.id);
      return NextResponse.json({
        success: true,
        message: `Deleted all ${deletedCount} chat history records.`,
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Conversation ID required.' }, { status: 400 });
    }

    const success = deleteAiConversation(session.user.id, id);
    if (!success) {
      return NextResponse.json({ error: 'Conversation not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Conversation deleted successfully.' });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to delete conversation.' }, { status: 500 });
  }
}
