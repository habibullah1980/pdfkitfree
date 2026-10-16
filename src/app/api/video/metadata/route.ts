import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { probeVideoFile, isFfmpegAvailable } from '@/lib/server/ffmpeg-service';

export async function POST(req: NextRequest) {
  if (!isFfmpegAvailable()) {
    return NextResponse.json(
      { error: 'FFmpeg processing engine is currently unavailable on the server.' },
      { status: 503 }
    );
  }

  const tempDir = path.join(os.tmpdir(), `pdfkit-meta-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided.' }, { status: 400 });
    }

    const ext = path.extname(file.name) || '.mp4';
    const tempFilePath = path.join(tempDir, `input${ext}`);
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));

    const metadata = await probeVideoFile(tempFilePath);

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error probing video metadata:', error);
    return NextResponse.json(
      { error: `Failed to inspect video: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors
    }
  }
}
