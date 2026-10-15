import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { DocumentStorageService } from '@/lib/server/storage-service';
import { getSigningRequestsByUserId } from '@/lib/server/auth-store';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No document file provided.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF documents are supported for secure signing storage.' }, { status: 400 });
    }

    // 50 MB file limit check
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Document exceeds 50 MB limit.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await DocumentStorageService.uploadPrivateDocument(
      session.user.id,
      file.name,
      buffer,
      file.type || 'application/pdf'
    );

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || 'Failed to upload document to hosted storage.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      storagePath: uploadResult.path,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Storage error' }, { status: 500 });
  }
}

// GET: Retrieve temporary secure download link for authorized user's document
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Storage path is required.' }, { status: 400 });
  }

  // Cross-user ownership verification
  if (!path.startsWith(`${session.user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden: Access to another user\'s document is prohibited.' }, { status: 403 });
  }

  // Verify that document actually exists in user's signing records
  const userRequests = getSigningRequestsByUserId(session.user.id);
  const hasRecord = userRequests.some((r) => r.storagePath === path || path.includes(r.id));
  if (!hasRecord && !path.startsWith(`${session.user.id}/`)) {
    return NextResponse.json({ error: 'Document record not found in user account.' }, { status: 404 });
  }

  const signedUrlResult = await DocumentStorageService.createSignedDownloadUrl(session.user.id, path, 600); // 10 minutes validity
  if (signedUrlResult.error || !signedUrlResult.signedUrl) {
    return NextResponse.json({ error: signedUrlResult.error || 'Failed to generate download link.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, downloadUrl: signedUrlResult.signedUrl });
}
