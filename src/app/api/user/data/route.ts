import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, clearSessionCookie } from '@/lib/server/session';
import {
  findUserById,
  getSigningRequestsByUserId,
  getAiConversationsByUser,
  softDeleteUserAdmin,
  deleteAllAiConversationsForUser,
} from '@/lib/server/auth-store';

// GET: Export all account data (GDPR / Privacy portability)
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const signingRecords = getSigningRequestsByUserId(user.id);
    const aiConversations = getAiConversationsByUser(user.id);

    const exportData = {
      userProfile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneConfig?.verified || false,
        mfaEnabled: user.mfa?.enabled || false,
      },
      subscription: user.subscription,
      usage: user.usage,
      signingHistory: signingRecords,
      aiHistory: aiConversations,
      privacyDisclosure: {
        zeroFileStorageGuarantee: 'Client-side PDF and video conversions are processed exclusively in your web browser. pdfkitfree does not store document binaries.',
        locationCollection: 'Country-level estimate recorded exclusively from network routing headers for DDoS defense. No device GPS collected.',
        retentionPolicy: 'Operational audit records rotate every 90 days.',
      },
      exportedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, exportData });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Export failed.' }, { status: 500 });
  }
}

// DELETE: Right to Erasure / Delete Account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { confirmation } = body;

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { error: 'Please confirm deletion by typing "DELETE MY ACCOUNT".' },
        { status: 400 }
      );
    }

    // Delete user's AI conversations
    deleteAllAiConversationsForUser(session.user.id);

    // Soft delete the user record
    softDeleteUserAdmin(
      'Self-Service Privacy Workflow',
      session.user.id,
      'User requested account closure and data erasure under privacy policy'
    );

    // Clear session cookie
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Your account and associated history have been deleted.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Deletion failed.' }, { status: 500 });
  }
}
