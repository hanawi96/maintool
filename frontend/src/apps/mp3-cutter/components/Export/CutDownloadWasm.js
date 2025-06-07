import React, { useState } from 'react';
import { Download, Scissors, Loader, AlertCircle, Save, Zap, WifiOff } from 'lucide-react';
import { formatTime } from '../../utils/timeFormatter';
import FormatPresets from './FormatSelector';
import { useFFmpegWasm } from '../../hooks/useFFmpegWasm';

const CutDownloadWasm = ({ 
  audioFile, 
  startTime, 
  endTime, 
  outputFormat, 
  fadeIn, 
  fadeOut,
  playbackRate = 1,
  onFormatChange,
  disabled = false 
}) => {
  // 🔥 **FFmpeg.wasm Hook**: Client-side audio processing
  const { 
    isLoaded,
    isLoading,
    progress,
    isProcessing,
    processingInfo,
    error: ffmpegError,
    cutAudio
  } = useFFmpegWasm();

  // 🆕 **NEW STATE**: Track processed file information for download
  const [processedFile, setProcessedFile] = useState(null);
  const [processingError, setProcessingError] = useState(null);

  // 🆕 **CUT FUNCTION**: Process audio entirely in browser
  const handleCutLocal = async () => {
    console.log('✂️ [CutDownloadWasm] Starting LOCAL processing...');
    
    // 🎯 Reset previous state
    setProcessingError(null);
    setProcessedFile(null);

    // 🎯 Validate inputs
    if (!audioFile) {
      setProcessingError('Please upload an audio file first');
      return;
    }

    if (startTime >= endTime) {
      setProcessingError('Please select a valid time range (start time must be less than end time)');
      return;
    }

    const duration = endTime - startTime;
    if (duration < 0.1) {
      setProcessingError('Selected audio segment is too short (minimum 0.1 seconds)');
      return;
    }

    if (!isLoaded) {
      setProcessingError('FFmpeg is still loading. Please wait...');
      return;
    }

    try {
      console.log('🎯 [CutDownloadWasm] Starting client-side processing...');
      
      // 🔥 **LOCAL PROCESSING**: All in browser, no network
      const result = await cutAudio(audioFile, {
        startTime,
        endTime,
        fadeIn: fadeIn || 0,
        fadeOut: fadeOut || 0,
        playbackRate,
        outputFormat: outputFormat || 'mp3',
        quality: 'high'
      });

      console.log('✅ [CutDownloadWasm] Local processing successful:', result);

      // 🆕 **SAVE PROCESSED FILE INFO**: Store info for later download
      const processedFileInfo = {
        blob: result.blob,
        url: result.url,
        size: result.size,
        format: result.format,
        playbackRate,
        outputFormat: outputFormat || 'mp3',
        processedAt: new Date().toISOString(),
        fileName: generateFileName()
      };

      setProcessedFile(processedFileInfo);

      // 🎉 **SUCCESS**: Ready for download
      console.log('🎉 [CutDownloadWasm] Processing completed - ready for download:', processedFileInfo);
      
    } catch (error) {
      console.error('❌ [CutDownloadWasm] Local processing failed:', error);
      setProcessingError(`Processing failed: ${error.message}`);
    }
  };

  // 🆕 **DOWNLOAD FUNCTION**: Download processed file
  const handleDownload = () => {
    if (!processedFile) {
      setProcessingError('No processed file available. Please cut audio first.');
      return;
    }

    console.log('📥 [CutDownloadWasm] Starting download...');

    try {
      // 🎯 **INSTANT DOWNLOAD**: File is already in memory
      const link = document.createElement('a');
      link.href = processedFile.url;
      link.download = processedFile.fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ [CutDownloadWasm] Download completed:', processedFile.fileName);
      
    } catch (downloadError) {
      console.error('❌ [CutDownloadWasm] Download failed:', downloadError);
      setProcessingError(`Download failed: ${downloadError.message}`);
    }
  };

  // Generate filename with timestamp and settings
  const generateFileName = () => {
    const speedSuffix = playbackRate !== 1 ? `_${playbackRate}x` : '';
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    return `cut_audio${speedSuffix}_${timestamp}.${outputFormat || 'mp3'}`;
  };

  // 🆕 **FFMPEG STATUS**: Show FFmpeg.wasm loading status
  const getFFmpegStatus = () => {
    if (isLoading) {
      return {
        icon: Loader,
        text: 'Loading FFmpeg...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    }
    
    if (ffmpegError) {
      return {
        icon: AlertCircle,
        text: 'FFmpeg Error',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      };
    }
    
    if (isLoaded) {
      return {
        icon: Zap,
        text: 'Client-side Processing Ready',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    }
    
    return {
      icon: WifiOff,
      text: 'FFmpeg Not Ready',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    };
  };

  // 🆕 **CUT BUTTON STATE**: Updated for local processing
  const getCutButtonState = () => {
    if (disabled || !audioFile) {
      return {
        variant: 'disabled',
        icon: Scissors,
        text: 'No Audio File',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }
    
    if (!isLoaded) {
      return {
        variant: 'loading',
        icon: Loader,
        text: isLoading ? 'Loading FFmpeg...' : 'FFmpeg Not Ready',
        className: 'bg-blue-300 text-blue-700 cursor-not-allowed'
      };
    }
    
    if (isProcessing) {
      return {
        variant: 'processing',
        icon: Loader,
        text: `Processing... ${progress}%`,
        className: 'bg-blue-500 text-white'
      };
    }
    
    if (processingError || ffmpegError) {
      return {
        variant: 'error',
        icon: AlertCircle,
        text: 'Try Again',
        className: 'bg-red-500 hover:bg-red-600 text-white'
      };
    }
    
    return {
      variant: 'ready',
      icon: Zap,
      text: 'Cut (Local)',
      className: 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white transform hover:scale-105'
    };
  };

  // 🆕 **DOWNLOAD BUTTON STATE**: State for download/save button
  const getDownloadButtonState = () => {
    if (!processedFile) {
      return {
        variant: 'disabled',
        icon: Save,
        text: 'Save (Cut First)',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }
    
    return {
      variant: 'ready',
      icon: Download,
      text: 'Save',
      className: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transform hover:scale-105'
    };
  };

  const ffmpegStatus = getFFmpegStatus();
  const cutButtonState = getCutButtonState();
  const downloadButtonState = getDownloadButtonState();
  const currentError = processingError || ffmpegError;

  return (
    <div className="space-y-3">
      {/* 🔥 **FFMPEG STATUS**: Show client-side processing status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ffmpegStatus.bgColor}`}>
        <ffmpegStatus.icon className={`w-4 h-4 ${ffmpegStatus.color} ${isLoading ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${ffmpegStatus.color}`}>
          {ffmpegStatus.text}
        </span>
        <span className="ml-auto text-xs text-gray-500">No Backend Needed</span>
      </div>

      {/* 🆕 **FORMAT PRESETS**: Above Cut button */}
      <FormatPresets
        selectedFormat={outputFormat}
        onFormatChange={onFormatChange}
      />

      {isProcessing && (
        <div className="space-y-2">
          {/* 🔥 **LOCAL PROGRESS BAR**: Real-time local processing */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-teal-500 h-3 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
              style={{ 
                width: `${Math.max(progress, 1)}%`,
                transition: 'width 0.3s ease-out'
              }}
            >
              {progress > 20 && (
                <span className="text-xs text-white font-medium">
                  {progress}%
                </span>
              )}
            </div>
          </div>
          
          {/* 🔥 **LOCAL INFO**: Processing details */}
          {processingInfo && (
            <div className="flex justify-between items-center text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{processingInfo.message || 'Processing locally...'}</span>
              </div>
              <span className="text-green-600 font-medium">Client-side</span>
            </div>
          )}
        </div>
      )}
      
      {currentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{currentError}</span>
          </div>
        </div>
      )}

      {/* 🆕 **CUT BUTTON**: Local processing button */}
      <button
        onClick={handleCutLocal}
        disabled={disabled || !audioFile || isProcessing || !isLoaded}
        className={`
          w-full py-3 px-6 rounded-lg font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-200 ease-in-out
          shadow-lg hover:shadow-xl
          ${cutButtonState.className}
        `}
      >
        <cutButtonState.icon 
          className={`w-5 h-5 ${isProcessing || isLoading ? 'animate-spin' : ''}`} 
        />
        {cutButtonState.text}
      </button>

      {/* 🆕 **DOWNLOAD/SAVE BUTTON**: Instant download */}
      <button
        onClick={handleDownload}
        disabled={!processedFile}
        className={`
          w-full py-2.5 px-6 rounded-lg font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-200 ease-in-out
          shadow-md hover:shadow-lg
          ${downloadButtonState.className}
        `}
      >
        <downloadButtonState.icon className="w-4 h-4" />
        {downloadButtonState.text}
      </button>

      {/* 🆕 **ENHANCED INFO DISPLAY**: Show current settings */}
      {audioFile && startTime !== undefined && endTime !== undefined && startTime < endTime && (
        <div className="text-xs text-gray-600 text-center space-y-1">
          <div>
            Cut: {formatTime(startTime)} → {formatTime(endTime)}
          </div>
          <div>
            Duration: {formatTime(endTime - startTime)} | 
            Format: {outputFormat?.toUpperCase() || 'MP3'}
            {playbackRate !== 1 && (
              <span> | Speed: {playbackRate}x</span>
            )}
            {(fadeIn > 0 || fadeOut > 0) && (
              <span> | Fade: {fadeIn > 0 ? `In ${fadeIn}s` : ''}
              {fadeIn > 0 && fadeOut > 0 ? ', ' : ''}
              {fadeOut > 0 ? `Out ${fadeOut}s` : ''}</span>
            )}
          </div>
          
          {/* 🆕 **PROCESSED FILE STATUS**: Show status of processed file */}
          {processedFile && (
            <div className="text-green-700 bg-green-50 rounded px-2 py-1 mt-2">
              ✅ Ready to download: {(processedFile.size / 1024 / 1024).toFixed(2)} MB
              {processedFile.playbackRate !== 1 && ` at ${processedFile.playbackRate}x speed`}
              <span className="font-semibold"> ({processedFile.format?.toUpperCase()}) • LOCAL</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CutDownloadWasm; 