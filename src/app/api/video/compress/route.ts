import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { compressVideoWithFfmpeg, isFfmpegAvailable } from '@/lib/server/ffmpeg-service';

export async function POST(req: NextRequest) {
  if (!isFfmpegAvailable()) {
    return NextResponse.json(
      { error: 'FFmpeg processing engine is currently unavailable on the server.' },
      { status: 503 }
    );
  }

  const tempDir = path.join(os.tmpdir(), `pdfkit-transcode-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const preset = (formData.get('preset') as string) || 'balanced';
    const resolution = (formData.get('resolution') as string) || 'original';
    const outputFormat = ((formData.get('outputFormat') as string) || 'mp4') as 'mp4' | 'webm';

    if (!file) {
      return NextResponse.json({ error: 'No video file provided.' }, { status: 400 });
    }

    const inputExt = path.extname(file.name) || '.mp4';
    const inputFilePath = path.join(tempDir, `input${inputExt}`);
    const outputFilePath = path.join(tempDir, `output.${outputFormat}`);

    // Stream uploaded bytes to disk
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(inputFilePath, Buffer.from(arrayBuffer));

    // Determine target parameters from presets
    let crf = 24; // balanced
    let targetBitrateKbps = 1800;

    if (preset === 'small') {
      crf = 28;
      targetBitrateKbps = 900;
    } else if (preset === 'high') {
      crf = 20;
      targetBitrateKbps = 3200;
    }

    let targetHeight: number | undefined;
    if (resolution === '1080p') targetHeight = 1080;
    else if (resolution === '720p') targetHeight = 720;
    else if (resolution === '480p') targetHeight = 480;
    else if (resolution === '360p') targetHeight = 360;

    // Execute FFmpeg compression
    await compressVideoWithFfmpeg({
      inputPath: inputFilePath,
      outputPath: outputFilePath,
      targetHeight,
      targetBitrateKbps,
      crf,
      outputFormat,
    });

    if (!fs.existsSync(outputFilePath)) {
      throw new Error('Compressed output was not created.');
    }

    const outputBuffer = fs.readFileSync(outputFilePath);
    const mimeType = outputFormat === 'webm' ? 'video/webm' : 'video/mp4';

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="compressed-${path.basename(file.name, inputExt)}.${outputFormat}"`,
        'X-Original-Size': String(file.size),
        'X-Compressed-Size': String(outputBuffer.length),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Video server transcode error:', error);
    return NextResponse.json(
      { error: `Compression error: ${error.message || 'Processing failed'}` },
      { status: 500 }
    );
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
}
