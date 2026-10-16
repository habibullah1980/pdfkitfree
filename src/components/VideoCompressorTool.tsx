'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Upload, 
  Film, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Loader2, 
  Cpu, 
  Sliders, 
  FileVideo,
  Server,
  Info
} from 'lucide-react';

type CompressionPreset = 'small' | 'balanced' | 'high';
type ResolutionPreset = 'original' | '1080p' | '720p' | '480p' | '360p';
type OutputFormat = 'mp4' | 'webm';

interface DetectedMetadata {
  duration: number;
  width: number;
  height: number;
  formatName?: string;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  isBrowserPlayable: boolean;
  engine: 'browser-native' | 'ffmpeg-worker';
}

export function VideoCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Metadata & inspection state
  const [isReadingMetadata, setIsReadingMetadata] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<DetectedMetadata | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [processingEngine, setProcessingEngine] = useState<'browser-native' | 'ffmpeg-worker'>('browser-native');

  // Settings
  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  const [resolution, setResolution] = useState<ResolutionPreset>('original');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp4');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [compressedMime, setCompressedMime] = useState<string>('video/mp4');

  // References
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup object URLs on unmount or file reset
  const cleanupUrls = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (compressedUrl) {
      URL.revokeObjectURL(compressedUrl);
    }
  }, [videoUrl, compressedUrl]);

  useEffect(() => {
    return () => {
      cleanupUrls();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [cleanupUrls]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return 'Detecting...';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. Robust File Selection & Multi-Stage Metadata Inspection
  const handleSelectFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setIsReadingMetadata(true);
    setMetadata(null);
    setDuration(0);
    setDimensions({ width: 0, height: 0 });

    // Validate video container or MIME
    const isVideo =
      selectedFile.type.startsWith('video/') ||
      /\.(mp4|mov|webm|mkv|avi|m4v|wmv|flv|mpeg|mpg|3gp|ts|mts)$/i.test(selectedFile.name);

    if (!isVideo) {
      setIsReadingMetadata(false);
      setErrorMessage(
        'Unsupported file format. Please upload a video file (MP4, MOV, WebM, MKV, AVI, WMV, FLV, MPEG, 3GP, TS).'
      );
      return;
    }

    cleanupUrls();
    setCompressedBlob(null);
    setCompressedUrl(null);
    setProgress(0);

    const localUrl = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setVideoUrl(localUrl);

    // Multi-stage inspection: Try HTML5 video element first.
    let resolvedDuration = 0;
    let resolvedWidth = 0;
    let resolvedHeight = 0;
    let browserPlaybackOk = false;

    try {
      const probeVideo = document.createElement('video');
      probeVideo.preload = 'metadata';
      probeVideo.src = localUrl;

      const loadedPromise = new Promise<boolean>((resolve) => {
        probeVideo.onloadedmetadata = () => {
          if (probeVideo.duration > 0 && probeVideo.videoWidth > 0) {
            resolvedDuration = probeVideo.duration;
            resolvedWidth = probeVideo.videoWidth;
            resolvedHeight = probeVideo.videoHeight;
            browserPlaybackOk = true;
            resolve(true);
          } else {
            resolve(false);
          }
        };
        probeVideo.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 2500); // Max 2.5s probe timeout
      });

      await loadedPromise;
    } catch {
      browserPlaybackOk = false;
    }

    if (browserPlaybackOk && resolvedWidth > 0 && resolvedHeight > 0) {
      setDuration(resolvedDuration);
      setDimensions({ width: resolvedWidth, height: resolvedHeight });
      setProcessingEngine('browser-native');
      setMetadata({
        duration: resolvedDuration,
        width: resolvedWidth,
        height: resolvedHeight,
        isBrowserPlayable: true,
        engine: 'browser-native',
      });
      setIsReadingMetadata(false);
      return;
    }

    // Browser cannot natively decode container or codec (e.g. MKV, AVI, ProRes, HEVC, MPEG-4).
    // Automatically fallback to our server-side FFmpeg worker engine for exact metadata inspection.
    try {
      setProcessingStatus('Inspecting media container with FFmpeg worker...');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/video/metadata', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.metadata) {
        throw new Error(data.error || 'Failed to inspect media stream.');
      }

      const meta = data.metadata;
      setDuration(meta.duration || 0);
      setDimensions({ width: meta.width || 1280, height: meta.height || 720 });
      setProcessingEngine('ffmpeg-worker');
      setMetadata(meta);
      setIsReadingMetadata(false);
    } catch (err: unknown) {
      const error = err as Error;
      setIsReadingMetadata(false);
      setErrorMessage(
        `Unable to extract video metadata: ${error.message || 'Corrupt or unsupported container'}. Please verify the file integrity.`
      );
    }
  };

  // Compute Target Bitrate & Settings based on preset and resolution
  const computedSettings = useMemo(() => {
    if (!dimensions.width || !dimensions.height) {
      return { targetBitrate: 1800000, outWidth: 1280, outHeight: 720, estSize: 0, estReduction: 50 };
    }

    let outWidth = dimensions.width;
    let outHeight = dimensions.height;
    const aspect = dimensions.width / dimensions.height;

    if (resolution === '1080p' && outHeight > 1080) {
      outHeight = 1080;
      outWidth = Math.round(1080 * aspect);
    } else if (resolution === '720p' && outHeight > 720) {
      outHeight = 720;
      outWidth = Math.round(720 * aspect);
    } else if (resolution === '480p' && outHeight > 480) {
      outHeight = 480;
      outWidth = Math.round(480 * aspect);
    } else if (resolution === '360p' && outHeight > 360) {
      outHeight = 360;
      outWidth = Math.round(360 * aspect);
    }

    // Ensure even dimensions for video encoders
    outWidth = outWidth % 2 === 0 ? outWidth : outWidth - 1;
    outHeight = outHeight % 2 === 0 ? outHeight : outHeight - 1;

    // Base bitrate by resolution
    let baseBps = 1800000; // 1.8 Mbps default
    if (outHeight <= 360) baseBps = 500000;
    else if (outHeight <= 480) baseBps = 850000;
    else if (outHeight <= 720) baseBps = 1600000;
    else if (outHeight <= 1080) baseBps = 2800000;
    else baseBps = 4500000;

    // Apply preset multiplier
    let mult = 1.0;
    if (preset === 'small') mult = 0.55;
    else if (preset === 'balanced') mult = 0.95;
    else if (preset === 'high') mult = 1.6;

    const targetBitrate = Math.round(baseBps * mult);
    const estSizeBytes = duration > 0 ? Math.round(((targetBitrate + 128000) / 8) * duration) : Math.round((file?.size || 1000000) * 0.5);
    const estReduction = file ? Math.max(10, Math.min(85, Math.round(((file.size - estSizeBytes) / file.size) * 100))) : 45;

    return {
      targetBitrate,
      outWidth,
      outHeight,
      estSize: estSizeBytes,
      estReduction,
    };
  }, [dimensions, resolution, preset, duration, file]);

  // 2. Dual-Engine Video Compression Execution
  const handleCompressVideo = async () => {
    if (!file || !videoUrl) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgress(0);

    // If video cannot be natively rendered by the browser's video element, dispatch to the FFmpeg worker
    if (processingEngine === 'ffmpeg-worker' || !metadata?.isBrowserPlayable) {
      await handleServerWorkerCompression();
    } else {
      await handleBrowserNativeCompression();
    }
  };

  // Server-Side FFmpeg Worker Execution
  const handleServerWorkerCompression = async () => {
    if (!file) return;
    setProcessingStatus('Uploading to secure FFmpeg worker for multi-codec compression...');
    setProgress(15);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('preset', preset);
      formData.append('resolution', resolution);
      formData.append('outputFormat', outputFormat);

      setProgress(35);
      setProcessingStatus('FFmpeg is transcoding and compressing audio/video streams...');

      const response = await fetch('/api/video/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Worker transcode failed with HTTP status ${response.status}`);
      }

      setProgress(85);
      setProcessingStatus('Receiving optimized video package...');

      const blob = await response.blob();
      const mime = outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
      const typedBlob = new Blob([blob], { type: mime });

      const downloadUrl = URL.createObjectURL(typedBlob);
      setCompressedBlob(typedBlob);
      setCompressedUrl(downloadUrl);
      setCompressedMime(mime);
      setProgress(100);
      setProcessingStatus('Compression complete!');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Server FFmpeg transcode error:', error);
      setErrorMessage(`Compression error: ${error.message || 'Worker processing failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Browser-Native Canvas + MediaRecorder Execution
  const handleBrowserNativeCompression = async () => {
    if (!file || !videoUrl) return;
    setProcessingStatus('Initializing browser media engine...');

    try {
      const vid = processingVideoRef.current;
      const canvas = canvasRef.current;
      if (!vid || !canvas) {
        throw new Error('Video elements could not be initialized.');
      }

      const { outWidth, outHeight, targetBitrate } = computedSettings;
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      vid.src = videoUrl;
      vid.muted = false;
      vid.currentTime = 0;

      await new Promise<void>((resolve, reject) => {
        vid.onloadeddata = () => resolve();
        vid.onerror = () => reject(new Error('Failed to load video into browser sandbox.'));
      });

      const canvasStream = canvas.captureStream(30);

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaElementSource(vid);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          const gain = audioCtx.createGain();
          gain.gain.value = 0;
          source.connect(gain);
          gain.connect(audioCtx.destination);

          const audioTracks = dest.stream.getAudioTracks();
          if (audioTracks.length > 0) {
            canvasStream.addTrack(audioTracks[0]);
          }
        }
      } catch (audioErr) {
        console.warn('Audio capture note:', audioErr);
      }

      let selectedMime = 'video/webm;codecs=vp8,opus';
      if (outputFormat === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
        selectedMime = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
      } else if (outputFormat === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
        selectedMime = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        selectedMime = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        selectedMime = 'video/webm';
      }

      setCompressedMime(selectedMime);

      const recorder = new MediaRecorder(canvasStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: targetBitrate,
        audioBitsPerSecond: 96000,
      });
      mediaRecorderRef.current = recorder;

      const recordedChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      const completionPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          if (recordedChunks.length === 0) {
            reject(new Error('No compressed video data was captured.'));
            return;
          }
          const blob = new Blob(recordedChunks, { type: selectedMime });
          resolve(blob);
        };
        recorder.onerror = (e) => reject(e);
      });

      recorder.start(250);
      vid.playbackRate = 1.0;
      await vid.play();

      setProcessingStatus('Compressing video frames in browser memory...');

      const renderFrame = () => {
        if (vid.paused || vid.ended) return;
        ctx.drawImage(vid, 0, 0, outWidth, outHeight);

        const current = vid.currentTime;
        const total = vid.duration || 1;
        const p = Math.min(99, Math.round((current / total) * 100));
        setProgress(p);

        animFrameRef.current = requestAnimationFrame(renderFrame);
      };
      animFrameRef.current = requestAnimationFrame(renderFrame);

      await new Promise<void>((resolve) => {
        vid.onended = () => resolve();
        const maxTimeout = (vid.duration * 1.5 + 5) * 1000;
        setTimeout(() => {
          if (!vid.ended) {
            vid.pause();
            resolve();
          }
        }, maxTimeout);
      });

      if (recorder.state !== 'inactive') {
        recorder.stop();
      }

      setProcessingStatus('Finalizing compressed container...');
      const outputBlob = await completionPromise;

      const outUrl = URL.createObjectURL(outputBlob);
      setCompressedBlob(outputBlob);
      setCompressedUrl(outUrl);
      setProgress(100);
      setProcessingStatus('Compression complete!');
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Browser compression failed, redirecting to FFmpeg worker:', error);
      // Auto-fallback to FFmpeg server worker if browser MediaRecorder stalls or fails
      await handleServerWorkerCompression();
    } finally {
      setIsProcessing(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  };

  const resetAll = () => {
    cleanupUrls();
    setFile(null);
    setVideoUrl(null);
    setMetadata(null);
    setDuration(0);
    setDimensions({ width: 0, height: 0 });
    setCompressedBlob(null);
    setCompressedUrl(null);
    setProgress(0);
    setIsProcessing(false);
    setIsReadingMetadata(false);
    setErrorMessage(null);
  };

  const actualReduction = useMemo(() => {
    if (!file || !compressedBlob) return 0;
    const diff = file.size - compressedBlob.size;
    if (diff <= 0) return 0;
    return Math.round((diff / file.size) * 100);
  }, [file, compressedBlob]);

  const downloadFilename = useMemo(() => {
    if (!file) return 'compressed-video.mp4';
    const base = file.name.replace(/\.[^/.]+$/, '');
    const ext = compressedMime.includes('webm') ? 'webm' : 'mp4';
    return `compressed-${base}.${ext}`;
  }, [file, compressedMime]);

  return (
    <div className="space-y-8">
      {/* Hidden processing video & canvas elements for browser playback */}
      <video ref={processingVideoRef} playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. UPLOAD ZONE */}
      {/* ============================================================ */}
      {!file && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              handleSelectFile(e.dataTransfer.files[0]);
            }
          }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-10 sm:p-16 text-center transition hover:border-brand-400 hover:bg-brand-50/70"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            <Film className="h-8 w-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Upload Video to Compress
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            Drag and drop your video file here, or select from your computer. Supports MP4, MOV, WebM, MKV, AVI, M4V, WMV, FLV, MPEG, 3GP, and TS with dual client-side &amp; FFmpeg worker processing.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Choose Video File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.3gp,.ts,.mts"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleSelectFile(e.target.files[0]);
                }
              }}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 text-teal-800">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              Standard Web Videos (H.264 / VP8 / VP9): 100% Client-Side In-Browser
            </span>
            <span className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 text-indigo-800">
              <Server className="h-3.5 w-3.5 text-indigo-600" />
              Advanced Codecs (HEVC, MKV, AVI, ProRes): Accelerated FFmpeg Worker
            </span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. COMPRESSION WORKSPACE & CONTROLS */}
      {/* ============================================================ */}
      {file && (
        <div className="space-y-6">
          {/* File Information Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-slate-200 text-brand-600">
                <FileVideo className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {file.name}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>Size: <strong className="text-slate-700">{formatFileSize(file.size)}</strong></span>
                  <span>•</span>
                  <span>Duration: <strong className="text-slate-700">{isReadingMetadata ? 'Reading...' : formatDuration(duration)}</strong></span>
                  <span>•</span>
                  <span>
                    Resolution: <strong className="text-slate-700">{isReadingMetadata ? 'Reading...' : (dimensions.width > 0 ? `${dimensions.width}x${dimensions.height}` : 'Extracting...')}</strong>
                  </span>
                  <span>•</span>
                  <span className="uppercase font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {metadata?.videoCodec ? `${metadata.videoCodec} (${metadata.formatName?.split(',')[0]})` : file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Choose Another Video</span>
            </button>
          </div>

          {/* Engine & Privacy Disclosure Pill */}
          <div className="flex items-center gap-2 p-3 rounded-lg border text-xs bg-slate-50 border-slate-200 text-slate-700">
            {processingEngine === 'browser-native' ? (
              <>
                <ShieldCheck className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <span>
                  <strong>Browser-Native Sandbox Mode:</strong> Video is decoded and compressed 100% locally in your browser RAM without leaving your computer.
                </span>
              </>
            ) : (
              <>
                <Info className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span>
                  <strong>FFmpeg Engine Mode:</strong> Container or codec ({metadata?.videoCodec || 'unsupported native format'}) requires FFmpeg transcoding. Temporary processing occurs on our dedicated worker and is wiped immediately after conversion.
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Video Preview */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-black overflow-hidden relative shadow-sm aspect-video flex items-center justify-center">
                {isReadingMetadata ? (
                  <div className="flex flex-col items-center gap-3 text-slate-300 p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
                    <p className="text-sm font-medium">Reading video information &amp; stream codecs...</p>
                  </div>
                ) : metadata?.isBrowserPlayable || compressedUrl ? (
                  <video
                    ref={previewVideoRef}
                    src={compressedUrl || videoUrl || undefined}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-300 p-6 text-center">
                    <FileVideo className="h-10 w-10 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Non-Web Preview Format ({metadata?.videoCodec?.toUpperCase() || 'CODEC'})</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        This codec cannot be played back directly by your browser window, but will be converted into high-compatibility MP4/WebM upon compression.
                      </p>
                    </div>
                  </div>
                )}

                {compressedUrl && (
                  <div className="absolute top-3 left-3 bg-teal-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md backdrop-blur-xs shadow">
                    Compressed Preview
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>{compressedUrl ? 'Viewing compressed result' : 'Original video stream'}</span>
                <span className="font-mono">
                  {compressedUrl
                    ? `${computedSettings.outWidth}x${computedSettings.outHeight}`
                    : (dimensions.width > 0 ? `${dimensions.width}x${dimensions.height}` : 'Pending...')}
                </span>
              </div>
            </div>

            {/* Right: Compression Controls & Live Estimates */}
            <div className="lg:col-span-6 space-y-6">
              {/* Presets */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-brand-600" />
                    <span>Compression Presets</span>
                  </h3>
                  <span className="text-xs text-slate-500">Choose optimization target</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'small',
                      label: 'Small File',
                      desc: 'Maximum reduction (~60-80% smaller). Best for Discord, Slack, and email.',
                    },
                    {
                      id: 'balanced',
                      label: 'Balanced',
                      desc: 'Recommended (~40-60% smaller). Excellent quality & moderate size.',
                    },
                    {
                      id: 'high',
                      label: 'High Quality',
                      desc: 'Light compression (~20-40% smaller). Preserves sharp details.',
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setPreset(p.id as CompressionPreset)}
                      className={`flex flex-col text-left p-3 rounded-lg border text-xs transition ${
                        preset === p.id
                          ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`font-bold ${preset === p.id ? 'text-brand-900' : 'text-slate-800'}`}>
                        {p.label}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 leading-tight line-clamp-3">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Resolution Selector */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Output Resolution
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'original', label: dimensions.width > 0 ? `Match Original (${dimensions.width}x${dimensions.height})` : 'Match Original' },
                      { id: '1080p', label: '1080p (FHD)' },
                      { id: '720p', label: '720p (HD)' },
                      { id: '480p', label: '480p (SD)' },
                      { id: '360p', label: '360p (Mobile)' },
                    ].map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setResolution(res.id as ResolutionPreset)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium border transition ${
                          resolution === res.id
                            ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output Format Selector */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Output Container Format
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setOutputFormat('mp4')}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold border transition ${
                        outputFormat === 'mp4'
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      MP4 (Universal H.264 + AAC)
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setOutputFormat('webm')}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold border transition ${
                        outputFormat === 'webm'
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      WebM (VP9 + Opus)
                    </button>
                  </div>
                </div>

                {/* Live Estimation Card */}
                <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-900 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      Estimated Compression Settings:
                    </span>
                    <span className="font-bold text-teal-700">~{computedSettings.estReduction}% Reduction</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="bg-white/80 p-2 rounded border border-teal-100">
                      <span className="text-slate-500 block">Target Bitrate:</span>
                      <strong className="text-slate-900 font-mono">
                        {Math.round(computedSettings.targetBitrate / 1000)} kbps
                      </strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded border border-teal-100">
                      <span className="text-slate-500 block">Est. Size:</span>
                      <strong className="text-teal-800 font-mono">
                        ~{formatFileSize(computedSettings.estSize)}
                      </strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded border border-teal-100">
                      <span className="text-slate-500 block">Export Res:</span>
                      <strong className="text-slate-900 font-mono">
                        {computedSettings.outWidth}x{computedSettings.outHeight}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Action Button & Processing Progress */}
                {!compressedBlob && (
                  <div>
                    {isProcessing ? (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                            {processingStatus}
                          </span>
                          <span className="font-mono text-brand-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-brand-600 h-2.5 rounded-full transition-all duration-200"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 text-center">
                          Please keep this tab open while processing video frames.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isReadingMetadata}
                        onClick={handleCompressVideo}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-3.5 px-4 text-sm font-bold text-white shadow hover:bg-brand-700 transition disabled:opacity-50"
                      >
                        <Cpu className="h-4 w-4" />
                        <span>Compress Video Now</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* 3. COMPLETED RESULT CARD */}
              {/* ============================================================ */}
              {compressedBlob && compressedUrl && (
                <div className="rounded-xl border border-teal-300 bg-teal-50/70 p-6 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2.5 text-teal-900">
                    <CheckCircle className="h-6 w-6 text-teal-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-base font-bold">Video Compressed Successfully!</h4>
                      <p className="text-xs text-teal-700">
                        {processingEngine === 'browser-native'
                          ? 'Processed entirely in your browser memory.'
                          : 'Processed securely via accelerated FFmpeg worker.'}
                      </p>
                    </div>
                  </div>

                  {/* Size comparison */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-white border border-teal-200 text-center">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Original</span>
                      <strong className="text-xs sm:text-sm text-slate-700">
                        {formatFileSize(file.size)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Compressed</span>
                      <strong className="text-xs sm:text-sm text-teal-700 font-bold">
                        {formatFileSize(compressedBlob.size)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Saved</span>
                      <span className="inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-xs font-bold">
                        -{actualReduction}%
                      </span>
                    </div>
                  </div>

                  {/* Download button */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href={compressedUrl}
                      download={downloadFilename}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 py-3 px-5 text-sm font-bold text-white shadow hover:bg-teal-700 transition"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Compressed Video</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setCompressedBlob(null);
                        setCompressedUrl(null);
                        setProgress(0);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white py-3 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span>Change Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
