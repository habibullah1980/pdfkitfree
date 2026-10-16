import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

function resolveFfmpegPath(): string | null {
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const platform = `${process.platform}-${process.arch}`;

  const searchLocations = [
    path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', platform, binaryName),
    path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'win32-x64', binaryName),
    path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'linux-x64', binaryName),
    path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'darwin-x64', binaryName),
    path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'darwin-arm64', binaryName),
  ];

  for (const loc of searchLocations) {
    if (fs.existsSync(loc)) return loc;
  }

  // Also check if available on system PATH
  return null;
}

function resolveFfprobePath(): string | null {
  const binaryName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  const platform = process.platform;
  const arch = process.arch;

  const searchLocations = [
    path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', platform, arch, binaryName),
    path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', binaryName),
    path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', 'linux', 'x64', binaryName),
    path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', 'darwin', 'x64', binaryName),
  ];

  for (const loc of searchLocations) {
    if (fs.existsSync(loc)) return loc;
  }

  return null;
}

const ffmpegPath = resolveFfmpegPath();
const ffprobePath = resolveFfprobePath();

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  formatName: string;
  videoCodec: string;
  audioCodec?: string;
  bitrate?: number;
  fileSize: number;
  isBrowserPlayable: boolean;
  engine: 'browser-native' | 'ffmpeg-worker';
}

export function isFfmpegAvailable(): boolean {
  return !!ffmpegPath && !!ffprobePath && fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath);
}

export function getFfmpegPath(): string {
  if (!ffmpegPath) throw new Error('FFmpeg binary is not available on this server.');
  return ffmpegPath;
}

export function getFfprobePath(): string {
  if (!ffprobePath) throw new Error('FFprobe binary is not available on this server.');
  return ffprobePath;
}

/**
 * Inspect video container and streams using ffprobe.
 */
export async function probeVideoFile(filePath: string): Promise<VideoMetadata> {
  const probePath = getFfprobePath();

  const { stdout } = await execFileAsync(probePath, [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const parsed = JSON.parse(stdout);
  const format = parsed.format || {};
  const streams = parsed.streams || [];

  const videoStream = streams.find((s: Record<string, unknown>) => s.codec_type === 'video');
  const audioStream = streams.find((s: Record<string, unknown>) => s.codec_type === 'audio');

  const durationSec = parseFloat(format.duration || videoStream?.duration || '0') || 0;
  const width = parseInt(videoStream?.width || '0', 10) || 0;
  const height = parseInt(videoStream?.height || '0', 10) || 0;
  const formatName = (format.format_name || path.extname(filePath).replace('.', '')).toLowerCase();
  const videoCodec = (videoStream?.codec_name || 'unknown').toLowerCase();
  const audioCodec = audioStream?.codec_name?.toLowerCase();
  const bitrate = parseInt(format.bit_rate || videoStream?.bit_rate || '0', 10) || undefined;
  const stats = fs.statSync(filePath);

  // Modern browsers natively decode H.264 (avc1), VP8, VP9, and AV1 in MP4 and WebM containers.
  // Others (H.265/HEVC, ProRes, MPEG4, WMV, FLV, MPEG2, 3GP) require FFmpeg fallback.
  const isMp4OrWebm = formatName.includes('mp4') || formatName.includes('webm') || formatName.includes('quicktime');
  const isCommonBrowserCodec = ['h264', 'avc1', 'vp8', 'vp9', 'av1'].includes(videoCodec);
  const isBrowserPlayable = isMp4OrWebm && isCommonBrowserCodec;

  return {
    duration: durationSec,
    width,
    height,
    formatName,
    videoCodec,
    audioCodec,
    bitrate,
    fileSize: stats.size,
    isBrowserPlayable,
    engine: isBrowserPlayable ? 'browser-native' : 'ffmpeg-worker',
  };
}

export interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  targetWidth?: number;
  targetHeight?: number;
  targetBitrateKbps?: number;
  crf?: number; // 18-35 (lower = higher quality)
  outputFormat?: 'mp4' | 'webm';
  onProgress?: (percent: number) => void;
}

/**
 * Transcode and compress video using FFmpeg.
 * Converts any arbitrary input container/codec into high-compatibility, compressed H.264 MP4 (or VP9 WebM).
 */
export async function compressVideoWithFfmpeg(options: TranscodeOptions): Promise<void> {
  const binary = getFfmpegPath();
  const {
    inputPath,
    outputPath,
    targetWidth,
    targetHeight,
    targetBitrateKbps = 1500,
    crf = 24,
    outputFormat = 'mp4',
  } = options;

  const args: string[] = ['-y', '-i', inputPath];

  // Video filter for resolution scaling with aspect ratio preserved and even dimensions
  if (targetWidth && targetHeight) {
    args.push(
      '-vf',
      `scale=w=${targetWidth}:h=${targetHeight}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`
    );
  } else if (targetHeight) {
    args.push('-vf', `scale=-2:${targetHeight}`);
  }

  if (outputFormat === 'mp4') {
    // Highly compatible H.264 + AAC output
    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', String(crf),
      '-b:v', `${targetBitrateKbps}k`,
      '-maxrate', `${Math.round(targetBitrateKbps * 1.5)}k`,
      '-bufsize', `${Math.round(targetBitrateKbps * 2)}k`,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart'
    );
  } else {
    // VP9 + Opus WebM
    args.push(
      '-c:v', 'libvpx-vp9',
      '-b:v', `${targetBitrateKbps}k`,
      '-crf', String(crf),
      '-c:a', 'libopus',
      '-b:a', '128k'
    );
  }

  args.push(outputPath);

  await execFileAsync(binary, args);
}
