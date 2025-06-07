import React, { useState } from 'react';
import { Download, Scissors, Loader, AlertCircle } from 'lucide-react';
import { audioApi } from '../../services/audioApi';
import { formatTime } from '../../utils/timeFormatter';

const CutDownload = ({ 
  audioFile, 
  startTime, 
  endTime, 
  outputFormat, 
  fadeIn, 
  fadeOut,
  disabled = false 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleCutAndExport = async () => {
    console.log('✂️ [CutDownload] Starting cut and export process...');
    
    // 🎯 Reset previous errors
    setProcessingError(null);
    setProcessingProgress(0);

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
      console.log('🎯 [CutDownload] Validated inputs, starting cut operation...');
      
      const cutParams = {
        fileId: audioFile.filename,
        startTime,
        endTime,
        outputFormat: outputFormat || 'mp3',
        fadeIn: fadeIn || 0,
        fadeOut: fadeOut || 0,
        quality: 'high'
      };

      console.log('📊 [CutDownload] Cut parameters:', cutParams);
      setProcessingProgress(25);

      const result = await audioApi.cutAudioByFileId(cutParams);
      setProcessingProgress(75);

      console.log('✅ [CutDownload] Cut operation successful:', result);

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

      try {
        const downloadUrl = audioApi.getDownloadUrl(outputFile);
        console.log('📥 [CutDownload] Triggering download:', downloadUrl);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `cut_audio_${Date.now()}.${outputFormat || 'mp3'}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setProcessingProgress(100);

        const successInfo = {
          duration: result.data?.output?.duration || result.output?.duration || duration,
          fileSize: result.data?.output?.size || result.output?.size,
          filename: outputFile
        };

        const successMessage = [
          'Audio cut successfully!',
          `Duration: ${formatTime(successInfo.duration)}`,
          successInfo.fileSize ? 
            `Size: ${(successInfo.fileSize / 1024 / 1024).toFixed(2)} MB` : ''
        ].filter(Boolean).join('\n');

        alert(successMessage);
        
        console.log('🎉 [CutDownload] Cut and download completed successfully:', successInfo);
        
      } catch (downloadError) {
        console.error('❌ [CutDownload] Download failed:', downloadError);
        throw new Error(`Download failed: ${downloadError.message}`);
      }
      
    } catch (error) {
      console.error('❌ [CutDownload] Cut operation failed:', error);
      
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

  const getButtonState = () => {
    if (disabled || !audioFile) {
      return {
        variant: 'disabled',
        icon: Download,
        text: 'No Audio File',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }
    
    if (isProcessing) {
      return {
        variant: 'processing',
        icon: Loader,
        text: `Processing... ${processingProgress}%`,
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
    
    return {
      variant: 'ready',
      icon: Scissors,
      text: 'Cut & Download',
      className: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transform hover:scale-105'
    };
  };

  const buttonState = getButtonState();
  const IconComponent = buttonState.icon;

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

      <button
        onClick={handleCutAndExport}
        disabled={disabled || !audioFile || isProcessing}
        className={`
          w-full py-3 px-6 rounded-lg font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-200 ease-in-out
          shadow-lg hover:shadow-xl
          ${buttonState.className}
        `}
      >
        <IconComponent 
          className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} 
        />
        {buttonState.text}
      </button>
      
      {/* 🎯 Cut Info Display */}
      {audioFile && startTime !== undefined && endTime !== undefined && startTime < endTime && (
        <div className="text-xs text-gray-600 text-center space-y-1">
          <div>
            Cut: {formatTime(startTime)} → {formatTime(endTime)}
          </div>
          <div>
            Duration: {formatTime(endTime - startTime)} | 
            Format: {outputFormat?.toUpperCase() || 'MP3'}
            {(fadeIn > 0 || fadeOut > 0) && (
              <span> | Fade: {fadeIn > 0 ? `In ${fadeIn}s` : ''}
              {fadeIn > 0 && fadeOut > 0 ? ', ' : ''}
              {fadeOut > 0 ? `Out ${fadeOut}s` : ''}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CutDownload;