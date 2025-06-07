import React, { useState, useEffect } from 'react';
import { Download, Scissors, Loader, AlertCircle, Save } from 'lucide-react';
import { audioApi } from '../../services/audioApi';
import { formatTime } from '../../utils/timeFormatter';
import { useWebSocketProgress } from '../../hooks/useCutProgress';
import FormatPresets from './FormatSelector';
import ProgressIndicator from './ProgressIndicator';

const CutDownload = ({ 
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  
  // 🆕 **NEW STATE**: Track processed file information for download
  const [processedFile, setProcessedFile] = useState(null);

  // 🔌 **WEBSOCKET PROGRESS**: Hook để nhận real-time progress
  const {
    progress,
    startProgressSession,
    clearProgress
  } = useWebSocketProgress();

  // 🎨 **AUTO CLEAR COMPLETED PROGRESS**: Tự động clear progress sau khi fade-out hoàn tất
  useEffect(() => {
    if (progress && progress.stage === 'completed') {
      // Tổng thời gian: 2s hiển thị + 1.5s fade-out = 3.5s
      const totalTimeout = setTimeout(() => {
        console.log('🧹 [CutDownload] Auto-clearing completed progress after fade-out');
        clearProgress();
      }, 3500); // 2s hiển thị + 1.5s fade-out
      
      return () => clearTimeout(totalTimeout);
    }
  }, [progress, clearProgress]);

  // 🆕 **CUT ONLY FUNCTION**: Cut audio với speed nhưng KHÔNG auto download
  const handleCutOnly = async () => {
    console.log('✂️ [CutDownload] Starting CUT-ONLY process with WebSocket progress...');
    
    // 🎯 Reset previous state
    setProcessingError(null);
    setProcessedFile(null); // Clear previous processed file
    clearProgress(); // Clear previous WebSocket progress

    // 🎯 Validate inputs
    if (!audioFile?.filename) {
      const error = 'Please upload an audio file first';
      setProcessingError(error);
      return;
    }

    if (startTime >= endTime) {
      const error = 'Please select a valid time range (start time must be less than end time)';
      setProcessingError(error);
      return;
    }

    const duration = endTime - startTime;
    if (duration < 0.1) {
      const error = 'Selected audio segment is too short (minimum 0.1 seconds)';
      setProcessingError(error);
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🎯 [CutDownload] Validated inputs, starting CUT-ONLY operation with WebSocket...');
      
      // 🆕 **GENERATE SESSION ID**: Tạo unique session ID cho WebSocket tracking
      const sessionId = `cut-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      console.log('📊 [CutDownload] Generated sessionId for WebSocket:', sessionId);

      // 🔌 **START WEBSOCKET SESSION**: Bắt đầu tracking progress qua WebSocket
      const sessionStarted = startProgressSession(sessionId);
      if (!sessionStarted) {
        console.warn('⚠️ [CutDownload] WebSocket session failed to start, continuing without real-time progress');
      }
      
      // 🔧 **CRITICAL**: Đảm bảo playbackRate được truyền đúng
      const cutParams = {
        fileId: audioFile.filename,
        startTime,
        endTime,
        outputFormat: outputFormat || 'mp3',
        fadeIn: fadeIn || 0,
        fadeOut: fadeOut || 0,
        playbackRate: playbackRate, // 🚨 **KEY FIX**: Truyền đúng speed setting
        quality: 'high',
        sessionId // 🆕 **WEBSOCKET SESSION**: Include sessionId for progress tracking
      };

      console.log('📊 [CutDownload] CUT-ONLY parameters with SPEED, FORMAT and WebSocket:', {
        ...cutParams,
        speedApplied: playbackRate !== 1 ? `${playbackRate}x speed` : 'normal speed',
        formatSelected: outputFormat,
        websocketEnabled: sessionStarted
      });

      const result = await audioApi.cutAudioByFileId(cutParams);

      console.log('✅ [CutDownload] CUT-ONLY operation successful:', result);

      if (!result || !result.success) {
        throw new Error(result?.error || 'Cut operation failed - invalid response');
      }

      const outputFile = result.data?.output?.filename || result.output?.filename || result.data?.outputFile;
      if (!outputFile) {
        console.error('❌ [CutDownload] Missing output file in response:', result);
        throw new Error('No output file received from server');
      }

      console.log('📁 [CutDownload] Output file determined:', outputFile);

      // 🆕 **SAVE PROCESSED FILE INFO**: Store info for later download
      const processedFileInfo = {
        filename: outputFile,
        duration: result.data?.output?.duration || result.output?.duration || duration,
        fileSize: result.data?.output?.size || result.output?.size,
        playbackRate: cutParams.playbackRate,
        outputFormat: cutParams.outputFormat,
        processedAt: new Date().toISOString(),
        sessionId // 🆕 **TRACK SESSION**: Include sessionId for reference
      };

      setProcessedFile(processedFileInfo);

      // 🎉 **SUCCESS - NO ALERT**: Silent success, just ready for download
      console.log('🎉 [CutDownload] CUT-ONLY completed successfully - ready for download:', processedFileInfo);
      
    } catch (error) {
      console.error('❌ [CutDownload] CUT-ONLY operation failed:', error);
      
      let userError = error.message;
      
      if (error.message.includes('Network error')) {
        userError = 'Cannot connect to server. Please check if the backend is running and try again.';
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        userError = 'Audio file is too large to process.';
      } else if (error.message.includes('400') || error.message.includes('Invalid')) {
        userError = 'Invalid audio parameters. Please check your selection and try again.';
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        userError = 'Audio file not found on server. Please upload the file again.';
      } else if (error.message.includes('500') || error.message.includes('processing failed')) {
        userError = 'Server error during audio processing. Please try again or use a different audio file.';
      }
      
      setProcessingError(userError);
      
    } finally {
      setIsProcessing(false);
    }
  };

  // 🆕 **DOWNLOAD FUNCTION**: Download processed file
  const handleDownload = async () => {
    if (!processedFile) {
      const error = 'No processed file available. Please cut audio first.';
      setProcessingError(error);
      return;
    }

    console.log('📥 [CutDownload] Starting download for processed file:', processedFile);

    try {
      const downloadUrl = audioApi.getDownloadUrl(processedFile.filename);
      console.log('📥 [CutDownload] Triggering download:', downloadUrl);
      
      // 🎯 **ENHANCED DOWNLOAD**: Better filename với speed info và format
      const speedSuffix = processedFile.playbackRate !== 1 ? `_${processedFile.playbackRate}x` : '';
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const downloadFilename = `cut_audio${speedSuffix}_${timestamp}.${processedFile.outputFormat || 'mp3'}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFilename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ [CutDownload] Download triggered successfully:', {
        filename: downloadFilename,
        originalFile: processedFile.filename,
        speed: processedFile.playbackRate !== 1 ? `${processedFile.playbackRate}x` : 'normal',
        format: processedFile.outputFormat
      });

      // 🎉 **DOWNLOAD SUCCESS - NO ALERT**: Silent download success
      console.log('📥 [CutDownload] Download completed silently');
      
    } catch (downloadError) {
      console.error('❌ [CutDownload] Download failed:', downloadError);
      const error = `Download failed: ${downloadError.message}`;
      setProcessingError(error);
    }
  };

  // 🆕 **CUT BUTTON STATE**: Updated logic for cut-only button
  const getCutButtonState = () => {
    if (disabled || !audioFile) {
      return {
        variant: 'disabled',
        icon: Scissors,
        text: 'No Audio File',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }
    
    if (isProcessing) {
      return {
        variant: 'processing',
        icon: Loader,
        text: 'Cutting...',
        className: 'bg-blue-500 text-white'
      };
    }

    return {
      variant: 'ready',
      icon: Scissors,
      text: 'Cut Audio',
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transform hover:scale-105'
    };
  };

  // 🆕 **DOWNLOAD BUTTON STATE**: State for download/save button
  const getDownloadButtonState = () => {
    if (!processedFile) {
      return {
        variant: 'disabled',
        icon: Save,
        text: 'Save',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }

    return {
      variant: 'ready',
      icon: Save,
      text: 'Save',
      className: 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white transform hover:scale-105'
    };
  };

  const cutButtonState = getCutButtonState();
  const downloadButtonState = getDownloadButtonState();

  return (
    <div className="space-y-4">
      {/* 🎛️ **FORMAT SELECTOR**: Format selection */}
      <FormatPresets 
        selectedFormat={outputFormat}
        onFormatChange={onFormatChange}
      />

      {/* 🎯 **PROCESSING INFO**: Hiển thị thông tin processing */}
      {audioFile && (
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>Duration: {formatTime(endTime - startTime)}</div>
            <div>Speed: {playbackRate !== 1 ? `${playbackRate}x` : 'Normal'}</div>
            <div>Format: {outputFormat?.toUpperCase() || 'MP3'}</div>
            <div>Quality: High</div>
          </div>
        </div>
      )}

      {/* 🔌 **WEBSOCKET PROGRESS**: Hiển thị tiến trình real-time */}
      <ProgressIndicator 
        progress={progress}
        className="mb-4"
      />

      {/* 🎯 **ACTION BUTTONS**: Cut và Download buttons */}
      <div className="flex gap-3">
        {/* 🆕 **CUT BUTTON**: Cut-only button (replaces "Cut & Download") */}
        <button
          onClick={handleCutOnly}
          disabled={cutButtonState.variant === 'disabled' || isProcessing}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
            transition-all duration-200 disabled:cursor-not-allowed
            ${cutButtonState.className}
          `}
        >
          <cutButtonState.icon 
            className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} 
          />
          {cutButtonState.text}
        </button>

        {/* 🆕 **DOWNLOAD/SAVE BUTTON**: Replaces speed-only button */}
        <button
          onClick={handleDownload}
          disabled={downloadButtonState.variant === 'disabled'}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
            transition-all duration-200 disabled:cursor-not-allowed
            ${downloadButtonState.className}
          `}
        >
          <downloadButtonState.icon className="w-4 h-4" />
          {downloadButtonState.text}
        </button>
      </div>

      {/* ❌ **ERROR DISPLAY**: Hiển thị lỗi nếu có */}
      {processingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{processingError}</p>
        </div>
      )}

      {/* ✅ **SUCCESS DISPLAY**: Hiển thị thông tin file đã xử lý */}
      {processedFile && !processingError && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Save className="w-4 h-4" />
            <span className="font-medium">Ready to Download</span>
          </div>
          <div className="text-green-600 text-sm space-y-1">
            <div>✅ Duration: {formatTime(processedFile.duration)}</div>
            <div>✅ Speed: {processedFile.playbackRate !== 1 ? `${processedFile.playbackRate}x` : 'Normal'}</div>
            <div>✅ Format: {processedFile.outputFormat?.toUpperCase()}</div>
            {processedFile.fileSize && (
              <div>✅ Ready to download: {(processedFile.fileSize / 1024 / 1024).toFixed(2)} MB</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CutDownload;