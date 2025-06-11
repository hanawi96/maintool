import React, { useState, useEffect } from 'react';
import { Scissors, Loader, AlertCircle, Save, Copy, Check } from 'lucide-react';
import { audioApi } from '../../services/audioApi';
import { formatTimeUnified } from '../../utils/timeFormatter';
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
  isInverted = false,
  onFormatChange,
  disabled = false 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  
  // 🆕 **NEW STATE**: Track processed file information for download
  const [processedFile, setProcessedFile] = useState(null);
  
  // 🔗 **COPY LINK STATE**: Track copy link functionality
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

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

  // 🔍 **DEBUG FORMAT CHANGES**: Log khi format thay đổi
  useEffect(() => {
    console.log('🎯 [CutDownload] Format changed:', {
      newFormat: outputFormat,
      hasProcessedFile: !!processedFile,
      processedFormat: processedFile?.outputFormat,
      willNeedRecut: processedFile && processedFile.outputFormat !== outputFormat
    });
    
    if (processedFile && processedFile.outputFormat !== outputFormat) {
      console.log('⚠️ [CutDownload] Format mismatch detected - user will need to recut or switch back');
    }
  }, [outputFormat, processedFile]);

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

    // 🚫 **NO ACTIVE REGIONS CHECK**: Validate invert mode before other checks
    if (isInverted && audioFile?.duration) {
      // 🎯 **TOTAL DURATION CHECK**: Check total duration of active regions
      const active1Duration = startTime; // 0 → startTime
      const active2Duration = Math.max(0, audioFile.duration - endTime); // endTime → duration
      const totalActiveRegionDuration = active1Duration + active2Duration;
      
      if (totalActiveRegionDuration < 0.1) {
        const error = 'Please select a cut length greater than 0.1 seconds.';
        setProcessingError(error);
        return;
      }
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
      
      // 🔧 **CRITICAL**: Đảm bảo playbackRate được truyền đúng và thêm invert mode
      const cutParams = {
        fileId: audioFile.filename,
        startTime,
        endTime,
        outputFormat: outputFormat || 'mp3',
        fadeIn: fadeIn || 0,
        fadeOut: fadeOut || 0,
        playbackRate: playbackRate, // 🚨 **KEY FIX**: Truyền đúng speed setting
        isInverted: isInverted, // 🆕 **INVERT MODE**: Pass invert mode to backend
        quality: 'high',
        sessionId // 🆕 **WEBSOCKET SESSION**: Include sessionId for progress tracking
      };

      console.log('📊 [CutDownload] CUT-ONLY parameters with SPEED, FORMAT, INVERT MODE and WebSocket:', {
        ...cutParams,
        speedApplied: playbackRate !== 1 ? `${playbackRate}x speed` : 'normal speed',
        formatSelected: outputFormat,
        invertMode: isInverted ? 'INVERT (cut outside region + concatenate)' : 'NORMAL (cut inside region)',
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

  // 🔗 **COPY LINK FUNCTION**: Copy download link to clipboard
  const handleCopyLink = async () => {
    if (!processedFile) return;

    try {
      const downloadUrl = audioApi.getDownloadUrl(processedFile.filename);
      // 🔧 **FIX URL**: Use downloadUrl directly since it already contains full URL
      const fullUrl = downloadUrl; // downloadUrl already contains full URL from audioApi
      
      await navigator.clipboard.writeText(fullUrl);
      setCopyLinkSuccess(true);
      
      // Reset copy success state after 2 seconds
      setTimeout(() => setCopyLinkSuccess(false), 2000);
      
      console.log('🔗 [CopyLink] Download link copied to clipboard:', fullUrl);
    } catch (error) {
      console.error('❌ [CopyLink] Failed to copy link:', error);
      setProcessingError('Failed to copy link to clipboard');
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

    // 🚫 **NO ACTIVE REGIONS**: Check for no active regions in invert mode
    if (isInverted && audioFile?.duration) {
      // 🎯 **TOTAL DURATION CHECK**: Check total duration of active regions
      const active1Duration = startTime; // 0 → startTime
      const active2Duration = Math.max(0, audioFile.duration - endTime); // endTime → duration
      const totalActiveRegionDuration = active1Duration + active2Duration;
      
      if (totalActiveRegionDuration < 0.1) {
        return {
          variant: 'disabled',
          icon: AlertCircle,
          text: 'No Active Regions',
          className: 'bg-orange-300 text-orange-700 cursor-not-allowed'
        };
      }
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

  // 🆕 **DOWNLOAD BUTTON STATE**: State for download/save button WITH FORMAT COMPATIBILITY
  const getDownloadButtonState = () => {
    

    // 🚫 **NO PROCESSED FILE**: Chưa có file nào được xử lý
    if (!processedFile) {
      
      return {
        variant: 'disabled',
        icon: Save,
        text: 'Save',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }

    // 🔍 **FORMAT COMPATIBILITY CHECK**: Kiểm tra format có khớp không
    const isFormatMatch = processedFile.outputFormat === outputFormat;
    
    if (!isFormatMatch) {
      
      return {
        variant: 'disabled',
        icon: Save,
        text: `Save (${processedFile.outputFormat?.toUpperCase()})`,
        className: 'bg-yellow-200 text-yellow-700 cursor-not-allowed border-2 border-yellow-400',
        tooltip: `Switch back to ${processedFile.outputFormat?.toUpperCase()} format to download existing file`
      };
    }


    return {
      variant: 'ready',
      icon: Save,
      text: `Save ${outputFormat?.toUpperCase()}`,
      className: 'bg-green-500 hover:bg-green-600 text-white transform hover:scale-105 shadow-md hover:shadow-lg'
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
            <div>Duration: {formatTimeUnified(isInverted ? 
              (() => {
                // 🧠 **SMART DURATION CALCULATION**: Calculate total active regions duration
                const active1Duration = startTime; // 0 → startTime
                const active2Duration = Math.max(0, audioFile.duration - endTime); // endTime → duration
                const totalActiveRegionDuration = active1Duration + active2Duration;
                
                return totalActiveRegionDuration >= 0.1 ? totalActiveRegionDuration : 0;
              })() : 
              (endTime - startTime) // 🎯 **NORMAL MODE**: Original calculation
            )}</div>
            <div>Speed: {playbackRate !== 1 ? `${playbackRate}x` : 'Normal'}</div>
            <div>Format: {outputFormat?.toUpperCase() || 'MP3'}</div>
            <div>Mode: {isInverted ? 'Invert (Remove)' : 'Normal (Keep)'}</div>
          </div>
        </div>
      )}

      {/* 🚫 **NO ACTIVE REGIONS WARNING**: Show warning when no active regions in invert mode */}
      {audioFile && isInverted && (() => {
        // 🎯 **TOTAL DURATION CHECK**: Check total duration of active regions
        const active1Duration = startTime; // 0 → startTime
        const active2Duration = Math.max(0, audioFile.duration - endTime); // endTime → duration
        const totalActiveRegionDuration = active1Duration + active2Duration;
        
        return totalActiveRegionDuration < 0.1;
      })() && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Cut Length Too Short</span>
          </div>
          <p className="text-orange-600 text-sm mt-1">
            Please select a cut length greater than 0.1 seconds.
          </p>
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
            transition-all duration-0 disabled:cursor-not-allowed
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
            transition-all duration-0 disabled:cursor-not-allowed
            ${downloadButtonState.className}
          `}
          title={downloadButtonState.tooltip || `Download processed ${outputFormat?.toUpperCase()} file`}
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

      {/* ✅ **SUCCESS DISPLAY**: With copy link functionality */}
      {processedFile && !processingError && processedFile.outputFormat === outputFormat && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Save className="w-4 h-4" />
            <span className="font-medium">Ready to Download</span>
          </div>
          
          <div className="text-green-600 text-sm space-y-1 mb-3">
            <div>✅ Duration: {formatTimeUnified(processedFile.duration)}</div>
            <div>✅ Speed: {processedFile.playbackRate !== 1 ? `${processedFile.playbackRate}x` : 'Normal'}</div>
            <div>✅ Format: {processedFile.outputFormat?.toUpperCase()}</div>
            {processedFile.fileSize && (
              <div>✅ Size: {(processedFile.fileSize / 1024 / 1024).toFixed(2)} MB</div>
            )}
          </div>

          {/* 🔗 **COPY LINK SECTION**: Share download link */}
          <div className="border-t border-green-200 pt-3">
            <div className="text-green-700 text-xs font-medium mb-2">Share Download Link:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={audioApi.getDownloadUrl(processedFile.filename)}
                readOnly
                className="flex-1 px-3 py-2 text-xs bg-white border border-green-200 rounded-md text-slate-600 font-mono"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={handleCopyLink}
                className={`
                  px-3 py-2 rounded-md text-xs font-medium transition-all duration-0 flex items-center gap-1
                  ${copyLinkSuccess 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }
                `}
              >
                {copyLinkSuccess ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CutDownload;