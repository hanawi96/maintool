import { useState, useEffect, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const useFFmpegWasm = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingInfo, setProcessingInfo] = useState(null);
  const [error, setError] = useState(null);

  const ffmpegRef = useRef(null);

  // Initialize FFmpeg.wasm
  const initFFmpeg = useCallback(async () => {
    if (ffmpegRef.current || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔧 [FFmpegWasm] Initializing FFmpeg.wasm...');
      
      const ffmpeg = new FFmpeg();
      
      // Real-time progress tracking
      ffmpeg.on('progress', ({ progress: progressValue, time }) => {
        const percent = Math.round(progressValue * 100);
        setProgress(percent);
        setProcessingInfo({
          percent,
          currentTime: time,
          status: 'processing',
          message: `Processing... ${percent}%`
        });
        console.log(`🎬 [FFmpegWasm] Progress: ${percent}%`);
      });

      ffmpeg.on('log', ({ message }) => {
        console.log('📝 [FFmpegWasm] Log:', message);
      });

      // Load FFmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegRef.current = ffmpeg;
      setIsLoaded(true);
      console.log('✅ [FFmpegWasm] FFmpeg.wasm loaded successfully!');

    } catch (err) {
      console.error('❌ [FFmpegWasm] Failed to load:', err);
      setError(`Failed to load FFmpeg: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-initialize on mount
  useEffect(() => {
    initFFmpeg();
  }, [initFFmpeg]);

  // Cut audio with fade effects and speed change
  const cutAudio = useCallback(async (file, options = {}) => {
    if (!ffmpegRef.current) {
      throw new Error('FFmpeg not loaded. Please wait or reload the page.');
    }

    const {
      startTime = 0,
      endTime,
      fadeIn = 0,
      fadeOut = 0,
      playbackRate = 1,
      outputFormat = 'mp3',
      quality = 'high'
    } = options;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setProcessingInfo({
      status: 'starting',
      message: 'Preparing audio processing...'
    });

    try {
      const ffmpeg = ffmpegRef.current;
      
      console.log('✂️ [FFmpegWasm] Starting cut operation:', {
        fileName: file.name,
        startTime,
        endTime,
        fadeIn,
        fadeOut,
        playbackRate,
        outputFormat
      });

      // Write input file to FFmpeg virtual filesystem
      const inputName = 'input.' + file.name.split('.').pop();
      const outputName = `output.${outputFormat}`;
      
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      console.log('📁 [FFmpegWasm] Input file written to virtual FS');

      // Build FFmpeg command
      const args = ['-i', inputName];
      
      // Seek to start time
      if (startTime > 0) {
        args.push('-ss', startTime.toString());
      }
      
      // Set duration
      if (endTime && endTime > startTime) {
        args.push('-t', (endTime - startTime).toString());
      }

      // Build audio filters
      const filters = [];
      
      // Speed/tempo filter
      if (playbackRate !== 1) {
        let currentRate = playbackRate;
        
        if (currentRate >= 0.5 && currentRate <= 2.0) {
          filters.push(`atempo=${currentRate.toFixed(3)}`);
        } else if (currentRate > 2.0) {
          while (currentRate > 2.0) {
            filters.push('atempo=2');
            currentRate /= 2;
          }
          if (currentRate > 1.01) {
            filters.push(`atempo=${currentRate.toFixed(3)}`);
          }
        } else if (currentRate < 0.5) {
          while (currentRate < 0.5) {
            filters.push('atempo=0.5');
            currentRate *= 2;
          }
          if (currentRate < 0.99) {
            filters.push(`atempo=${currentRate.toFixed(3)}`);
          }
        }
      }

      // Fade effects
      if (fadeIn > 0) {
        filters.push(`afade=t=in:st=0:d=${fadeIn}`);
      }
      
      if (fadeOut > 0 && endTime) {
        const duration = endTime - startTime;
        const fadeOutStart = Math.max(0, duration - fadeOut);
        filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOut}`);
      }

      // Apply filters
      if (filters.length > 0) {
        args.push('-af', filters.join(','));
      }

      // Quality settings
      if (outputFormat === 'mp3') {
        args.push('-codec:a', 'libmp3lame');
        args.push('-b:a', quality === 'high' ? '320k' : quality === 'medium' ? '192k' : '128k');
      }

      args.push(outputName);

      console.log('🎬 [FFmpegWasm] Executing command:', args.join(' '));

      // Execute FFmpeg command
      await ffmpeg.exec(args);

      // Read output file
      const outputData = await ffmpeg.readFile(outputName);
      
      // Create blob and download URL
      const outputBlob = new Blob([outputData], { 
        type: outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav' 
      });
      
      const downloadUrl = URL.createObjectURL(outputBlob);

      // Cleanup virtual filesystem
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setProgress(100);
      setProcessingInfo({
        status: 'completed',
        message: 'Processing completed!',
        percent: 100
      });

      console.log('✅ [FFmpegWasm] Cut operation completed successfully');

      return {
        blob: outputBlob,
        url: downloadUrl,
        size: outputBlob.size,
        format: outputFormat
      };

    } catch (err) {
      console.error('❌ [FFmpegWasm] Cut operation failed:', err);
      setError(`Processing failed: ${err.message}`);
      throw err;
    } finally {
      setIsProcessing(false);
      // Reset progress after 3 seconds
      setTimeout(() => {
        setProgress(0);
        setProcessingInfo(null);
      }, 3000);
    }
  }, []);

  return {
    isLoaded,
    isLoading,
    progress,
    isProcessing,
    processingInfo,
    error,
    cutAudio,
    initFFmpeg
  };
}; 