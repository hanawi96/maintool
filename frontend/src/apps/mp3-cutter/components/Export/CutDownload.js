import React, { useState } from 'react';
import { Download, Scissors, Loader, AlertCircle, Save } from 'lucide-react';
import { audioApi } from '../../services/audioApi';
import { formatTime } from '../../utils/timeFormatter';

const CutDownload = ({ 
  audioFile, 
  startTime, 
  endTime, 
  outputFormat, 
  fadeIn, 
  fadeOut,
  playbackRate = 1,
  disabled = false 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // 🆕 **NEW STATE**: Track processed file information for download
  const [processedFile, setProcessedFile] = useState(null);

  // 🆕 **CUT ONLY FUNCTION**: Cut audio với speed nhưng KHÔNG auto download
  const handleCutOnly = async () => {
    console.log('✂️ [CutDownload] Starting CUT-ONLY process (no auto download)...');
    
    // 🎯 Reset previous state
    setProcessingError(null);
    setProcessingProgress(0);
    setProcessedFile(null); // Clear previous processed file

    // 🎯 Validate inputs
    if (!audioFile?.filename) {
      const error = 'Please upload an audio file first';
      setProcessingError(error);
      alert(error);
      return;
    }

    if (startTime >= endTime) {
      const error = 'Please select a valid time range (start time must be less than end time)';
      setProcessingError(error);
      alert(error);
      return;
    }

    const duration = endTime - startTime;
    if (duration < 0.1) {
      const error = 'Selected audio segment is too short (minimum 0.1 seconds)';
      setProcessingError(error);
      alert(error);
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(10);

    try {
      console.log('🎯 [CutDownload] Validated inputs, starting CUT-ONLY operation...');
      
      // 🔧 **CRITICAL**: Đảm bảo playbackRate được truyền đúng
      const cutParams = {
        fileId: audioFile.filename,
        startTime,
        endTime,
        outputFormat: outputFormat || 'mp3',
        fadeIn: fadeIn || 0,
        fadeOut: fadeOut || 0,
        playbackRate: playbackRate, // 🚨 **KEY FIX**: Truyền đúng speed setting
        quality: 'high'
      };

      console.log('📊 [CutDownload] CUT-ONLY parameters with SPEED:', {
        ...cutParams,
        speedApplied: playbackRate !== 1 ? `${playbackRate}x speed` : 'normal speed'
      });
      setProcessingProgress(25);

      const result = await audioApi.cutAudioByFileId(cutParams);
      setProcessingProgress(75);

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
      setProcessingProgress(90);

      // 🆕 **SAVE PROCESSED FILE INFO**: Store info for later download
      const processedFileInfo = {
        filename: outputFile,
        duration: result.data?.output?.duration || result.output?.duration || duration,
        fileSize: result.data?.output?.size || result.output?.size,
        playbackRate: cutParams.playbackRate,
        outputFormat: cutParams.outputFormat,
        processedAt: new Date().toISOString()
      };

      setProcessedFile(processedFileInfo);
      setProcessingProgress(100);

      // 🎉 **SUCCESS MESSAGE**: Show success without auto download
      const successMessage = [
        'Audio cut successfully!',
        `Duration: ${formatTime(processedFileInfo.duration)}`,
        processedFileInfo.playbackRate !== 1 ? `Speed: ${processedFileInfo.playbackRate}x` : '',
        processedFileInfo.fileSize ? 
          `Size: ${(processedFileInfo.fileSize / 1024 / 1024).toFixed(2)} MB` : '',
        '', // Empty line
        'Click "Save" button to download'
      ].filter(Boolean).join('\n');

      alert(successMessage);
      
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
      alert(`Error: ${userError}`);
      
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingProgress(0), 2000);
    }
  };

  // 🆕 **DOWNLOAD FUNCTION**: Download processed file
  const handleDownload = async () => {
    if (!processedFile) {
      const error = 'No processed file available. Please cut audio first.';
      setProcessingError(error);
      alert(error);
      return;
    }

    console.log('📥 [CutDownload] Starting download for processed file:', processedFile);

    try {
      const downloadUrl = audioApi.getDownloadUrl(processedFile.filename);
      console.log('📥 [CutDownload] Triggering download:', downloadUrl);
      
      // 🎯 **ENHANCED DOWNLOAD**: Better filename với speed info
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
        speed: processedFile.playbackRate !== 1 ? `${processedFile.playbackRate}x` : 'normal'
      });

      // 🎉 **DOWNLOAD SUCCESS MESSAGE**
      const downloadMessage = [
        'Download started!',
        `File: ${downloadFilename}`,
        processedFile.playbackRate !== 1 ? `Speed: ${processedFile.playbackRate}x` : ''
      ].filter(Boolean).join('\n');

      alert(downloadMessage);
      
    } catch (downloadError) {
      console.error('❌ [CutDownload] Download failed:', downloadError);
      const error = `Download failed: ${downloadError.message}`;
      setProcessingError(error);
      alert(`Error: ${error}`);
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
        text: `Cutting... ${processingProgress}%`,
        className: 'bg-blue-500 text-white'
      };
    }
    
    if (processingError) {
      return {
        variant: 'error',
        icon: AlertCircle,
        text: 'Try Again',
        className: 'bg-red-500 hover:bg-red-600 text-white'
      };
    }
    
    // 🆕 **SPEED AWARE BUTTON**: Show speed in button text
    const speedText = playbackRate !== 1 ? ` (${playbackRate}x)` : '';
    
    return {
      variant: 'ready',
      icon: Scissors,
      text: `Cut${speedText}`,
      className: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transform hover:scale-105'
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
    
    const speedText = processedFile.playbackRate !== 1 ? ` (${processedFile.playbackRate}x)` : '';
    
    return {
      variant: 'ready',
      icon: Download,
      text: `Save${speedText}`,
      className: 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white transform hover:scale-105'
    };
  };

  const cutButtonState = getCutButtonState();
  const downloadButtonState = getDownloadButtonState();

  return (
    <div className="space-y-3">
      {isProcessing && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
      )}
      
      {processingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{processingError}</span>
          </div>
        </div>
      )}

      {/* 🆕 **CUT BUTTON**: Cut-only button (replaces "Cut & Download") */}
      <button
        onClick={handleCutOnly}
        disabled={disabled || !audioFile || isProcessing}
        className={`
          w-full py-3 px-6 rounded-lg font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-200 ease-in-out
          shadow-lg hover:shadow-xl
          ${cutButtonState.className}
        `}
      >
        <cutButtonState.icon 
          className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} 
        />
        {cutButtonState.text}
      </button>

      {/* 🆕 **DOWNLOAD/SAVE BUTTON**: Replaces speed-only button */}
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

      {/* 🆕 **ENHANCED INFO DISPLAY**: Show current settings and processed file info */}
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
              ✅ Ready to download: {(processedFile.fileSize / 1024 / 1024).toFixed(2)} MB
              {processedFile.playbackRate !== 1 && ` at ${processedFile.playbackRate}x speed`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CutDownload;