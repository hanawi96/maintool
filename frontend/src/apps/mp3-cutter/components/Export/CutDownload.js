import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Scissors, Loader, AlertCircle, Save, Copy, Check, CheckCircle } from 'lucide-react';
import { audioApi } from '../../services/audioApi';
import { formatTimeUnified } from '../../utils/timeFormatter';
import { useWebSocketProgress } from '../../hooks/useCutProgress';
import FormatPresets from './FormatSelector';

// Toast Notification Component with Portal
const Toast = ({ show, onClose, type = 'success', title, message }) => {
  useEffect(() => {
    if (show) {
      console.log('🍞 Toast showing:', { type, title, message });
      const timer = setTimeout(() => {
        console.log('🍞 Toast auto-closing after 2s');
        onClose();
      }, 2000); // Auto-close after 2s
      return () => clearTimeout(timer);
    }
  }, [show, onClose, type, title, message]);

  if (!show) return null;

  // Use Portal to render outside parent containers
  return createPortal(
    <div className="fixed top-6 right-6 z-[9999] pointer-events-none">
      <div className={`
        w-72 rounded-lg shadow-2xl p-3 pointer-events-auto backdrop-blur-sm
        ${type === 'success' 
          ? 'bg-green-500 text-white' 
          : type === 'error' 
          ? 'bg-red-500 text-white' 
          : 'bg-blue-500 text-white'
        }
        transform transition-all duration-300 ease-out
        ${show ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        hover:scale-[1.02]
      `}>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            {type === 'success' && <CheckCircle className="w-5 h-5" />}
            {type === 'error' && <AlertCircle className="w-5 h-5" />}
          </div>
          <p className="text-sm font-medium">
            {title}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CutDownload = ({
  audioFile,
  startTime,
  endTime,
  outputFormat,
  fadeIn,
  fadeOut,
  playbackRate = 1,
  pitch = 0,
  volume = 1, // 🎯 Add volume prop
  equalizer = null, // 🎚️ Add equalizer prop
  isInverted = false,
  normalizeVolume = false,
  onNormalizeVolumeChange,
  onFormatChange,
  disabled = false,
  // 🆕 Region props for total duration calculation
  regions = [],
  activeRegionId = null,
  // 🆕 Enhanced handlers for getting current values per region
  getCurrentFadeValues = null,
  getCurrentVolumeValues = null,
  getCurrentSpeedValues = null,
  getCurrentPitchValues = null
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [processedFile, setProcessedFile] = useState(null);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });

  // WebSocket progress
  const { progress, startProgressSession, clearProgress } = useWebSocketProgress();

  // Show toast notification
  const showToast = useCallback((type, title, message = '') => {
    console.log('🚀 showToast called:', { type, title, message, timestamp: new Date().toISOString() });
    setToast({ show: true, type, title, message });
  }, []);

  // Hide toast notification
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  // --- Helpers ---
  const activeRegionDuration = useMemo(() => {
    if (!audioFile) return 0;
    
    // 🆕 Calculate total duration of all active regions (main selection + regions)
    let totalDuration = 0;
    
    // Add main selection duration if it exists and has positive duration
    if (startTime < endTime && endTime > startTime) {
      if (isInverted) {
        // For inverted: duration = everything except the selected part
        const d1 = startTime;
        const d2 = Math.max(0, audioFile.duration - endTime);
        totalDuration += d1 + d2;
      } else {
        // For normal: duration = selected part
        totalDuration += endTime - startTime;
      }
    }
    
    // Add all regions duration
    if (regions && regions.length > 0) {
      regions.forEach(region => {
        if (region.start < region.end) {
          totalDuration += region.end - region.start;
        }
      });
    }
    
    return totalDuration;
  }, [audioFile, startTime, endTime, isInverted, regions]);

  // Button States
  const cutButtonState = useMemo(() => {
    if (disabled || !audioFile) return {
      icon: Scissors, text: 'No Audio File', className: 'bg-gray-300 text-gray-500 cursor-not-allowed', disabled: true
    };
    if (isInverted && audioFile.duration && activeRegionDuration < 0.1)
      return {
        icon: AlertCircle, text: 'No Active Regions', className: 'bg-orange-300 text-orange-700 cursor-not-allowed', disabled: true
      };    if (isProcessing) {
      const progressPercent = progress?.percent;
      const hasValidPercent = progressPercent !== undefined && progressPercent !== null && !isNaN(progressPercent);
      
      return {
        icon: Loader, 
        text: hasValidPercent ? `Cutting... ${Math.round(progressPercent)}%` : 'Cutting...', 
        className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white cursor-not-allowed', 
        disabled: true, 
        spin: true
      };
    }
    return {
      icon: Scissors, text: 'Cut Audio',
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white',
      disabled: false
    };
  }, [audioFile, disabled, isInverted, activeRegionDuration, isProcessing, progress]);

  // --- Actions ---
  const handleCutOnly = useCallback(async () => {
    setProcessingError(null);
    setProcessedFile(null);
    clearProgress();

    if (!audioFile?.filename)
      return setProcessingError('Please upload an audio file first');
    if (isInverted && audioFile.duration && activeRegionDuration < 0.1)
      return setProcessingError('Please select a cut length greater than 0.1 seconds.');
    if (startTime >= endTime)
      return setProcessingError('Please select a valid time range (start < end)');
    if (!isInverted && (endTime - startTime) < 0.1)
      return setProcessingError('Selected audio segment is too short (minimum 0.1 seconds)');

    setIsProcessing(true);
    
    try {
      const sessionId = `cut-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      console.log('🎯 Generated sessionId:', sessionId);
      
      const sessionStarted = startProgressSession(sessionId);
      console.log('🎯 Progress session started:', sessionStarted);

      const cutParams = {
        fileId: audioFile.filename,
        startTime, endTime,
        outputFormat: outputFormat || 'mp3',
        fadeIn: fadeIn || 0, fadeOut: fadeOut || 0,
        playbackRate,
        pitch,
        volume, // 🎯 Add volume parameter
        equalizer, // 🎚️ Add equalizer parameter
        isInverted,
        normalizeVolume,
        quality: 'high',
        sessionId, // 🎯 Add sessionId to params
        // 🆕 Add regions with enhanced effects
        regions: regions.map(region => {
          return {
            id: region.id,
            name: region.name || `Region ${regions.indexOf(region) + 1}`,
            start: region.start,
            end: region.end,
            volume: region.volume !== undefined ? region.volume : 1.0,
            playbackRate: region.playbackRate !== undefined ? region.playbackRate : 1.0,
            pitch: region.pitch !== undefined ? region.pitch : 0.0,
            fadeIn: region.fadeIn || 0,
            fadeOut: region.fadeOut || 0
          };
        }),
        mainSelection: (startTime < endTime) ? {
          start: startTime,
          end: endTime,
          volume: volume,
          playbackRate: playbackRate,
          pitch: pitch,
          fadeIn: fadeIn || 0,
          fadeOut: fadeOut || 0
        } : null
      };

      console.log('🚀 Calling cutAudioByFileId with sessionId:', cutParams.sessionId);

      // 🔍 DETAILED FRONTEND LOG - Parameters being sent to backend
      console.log('\n🚀 FRONTEND TO BACKEND - DETAILED PARAMETERS:');
      console.log('📤 Sending to Backend:', {
        timestamp: new Date().toISOString(),
        audioFile: {
          filename: audioFile.filename,
          originalName: audioFile.originalName,
          duration: audioFile.duration,
          size: audioFile.size
        },
        cutParameters: {
          fileId: cutParams.fileId,
          startTime: cutParams.startTime,
          endTime: cutParams.endTime,
          expectedDuration: cutParams.endTime - cutParams.startTime,
          volume: cutParams.volume,
          playbackRate: cutParams.playbackRate,
          pitch: cutParams.pitch,
          fadeIn: cutParams.fadeIn,
          fadeOut: cutParams.fadeOut,
          equalizer: cutParams.equalizer,
          isInverted: cutParams.isInverted,
          normalizeVolume: cutParams.normalizeVolume,
          outputFormat: cutParams.outputFormat,
          quality: cutParams.quality
        },
        regions: cutParams.regions,
        mainSelection: cutParams.mainSelection,
        calculations: {
          originalDuration: audioFile.duration,
          selectedDuration: cutParams.endTime - cutParams.startTime,
          expectedOutputDuration: (cutParams.endTime - cutParams.startTime) / cutParams.playbackRate,
          pitchEffect: cutParams.pitch !== 0 ? `${cutParams.pitch} semitones` : 'No pitch change',
          speedEffect: cutParams.playbackRate !== 1 ? `${cutParams.playbackRate}x speed` : 'Normal speed',
          volumeEffect: cutParams.volume !== 1 ? `${Math.round(cutParams.volume * 100)}% volume` : 'Original volume'
        }
      });

      // 🎯 Debug log for volume parameter
      console.log('🔊 Frontend Volume Debug:', {
        volume: volume,
        volumeType: typeof volume,
        volumePercent: `${Math.round(volume * 100)}%`,
        noteToUser: volume !== 1 ? 'Volume adjustment will be applied to exported audio' : 'No volume adjustment (100%)'
      });

      // 🎚️ Debug log for equalizer parameter
      if (equalizer) {
        console.log('🎚️ Frontend Equalizer Debug:', {
          equalizer: equalizer,
          isArray: Array.isArray(equalizer),
          length: equalizer?.length,
          hasAdjustments: equalizer?.some(v => v !== 0),
          noteToUser: 'Equalizer settings will be applied to exported audio'
        });
      }

      const result = await audioApi.cutAudioByFileId(cutParams);

      // 🔍 DETAILED FRONTEND LOG - Response received from backend
      console.log('\n📥 BACKEND TO FRONTEND - DETAILED RESPONSE:');
      console.log('📤 Received from Backend:', {
        success: result?.success,
        error: result?.error
      });

      if (!result?.success)
        throw new Error(result?.error || 'Cut operation failed - invalid response');
      const outputFile = result.data?.output?.filename || result.output?.filename || result.data?.outputFile;
      if (!outputFile)
        throw new Error('No output file received from server');

      const processedFileData = {
        filename: outputFile,
        duration: result.data?.output?.duration || result.output?.duration || (endTime - startTime),
        fileSize: result.data?.output?.size || result.output?.size,
        playbackRate: cutParams.playbackRate,
        pitch: cutParams.pitch,
        outputFormat: cutParams.outputFormat,
        processedAt: new Date().toISOString(),
      };

      // 🔍 FINAL FRONTEND LOG - Processed file data
      console.log('\n✅ FRONTEND FINAL RESULT:', {
        timestamp: new Date().toISOString(),
        processedFile: processedFileData,
        originalRequest: {
          startTime: cutParams.startTime,
          endTime: cutParams.endTime,
          expectedDuration: cutParams.endTime - cutParams.startTime,
          playbackRate: cutParams.playbackRate,
          pitch: cutParams.pitch
        },
        durationAnalysis: {
          originalSelection: cutParams.endTime - cutParams.startTime,
          expectedWithSpeed: (cutParams.endTime - cutParams.startTime) / cutParams.playbackRate,
          actualReceived: processedFileData.duration,
          speedAdjusted: cutParams.playbackRate !== 1,
          pitchAdjusted: cutParams.pitch !== 0,
          durationCorrect: Math.abs(processedFileData.duration - ((cutParams.endTime - cutParams.startTime) / cutParams.playbackRate)) < 0.1
        }
      });

      setProcessedFile(processedFileData);
      
      // Show success toast notification
      console.log('✅ Audio processing completed, showing success toast:', { 
        processedFileData, 
        willShowToast: true 
      });
      showToast('success', 'Audio Cut Successfully!');

    } catch (error) {
      // Handle other errors
      let msg = error.message;
      if (msg.includes('Network error'))
        msg = 'Cannot connect to server. Please check if the backend is running.';
      else if (msg.includes('413') || msg.includes('too large'))
        msg = 'Audio file is too large to process.';
      else if (msg.includes('400') || msg.includes('Invalid'))
        msg = 'Invalid audio parameters. Please check your selection.';
      else if (msg.includes('404') || msg.includes('not found'))
        msg = 'Audio file not found on server. Please upload again.';
      else if (msg.includes('500') || msg.includes('processing failed'))
        msg = 'Server error during processing. Please try again.';
      
      setProcessingError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [audioFile, startTime, endTime, fadeIn, fadeOut, playbackRate, pitch, volume, equalizer, isInverted, normalizeVolume, outputFormat, clearProgress, activeRegionDuration, startProgressSession, regions, showToast]);

  const handleDownload = useCallback(async () => {
    if (!processedFile)
      return setProcessingError('No processed file available. Please cut audio first.');

    try {
      const downloadUrl = audioApi.getDownloadUrl(processedFile.filename);
      const speedSuffix = processedFile.playbackRate !== 1 ? `_${processedFile.playbackRate}x` : '';
      const pitchSuffix = processedFile.pitch !== 0 ? `_${processedFile.pitch > 0 ? '+' : ''}${processedFile.pitch}st` : '';
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const downloadFilename = `cut_audio${speedSuffix}${pitchSuffix}_${timestamp}.${processedFile.outputFormat || 'mp3'}`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (downloadError) {
      setProcessingError(`Download failed: ${downloadError.message}`);
    }
  }, [processedFile]);

  const handleCopyLink = useCallback(async () => {
    if (!processedFile) return;
    try {
      await navigator.clipboard.writeText(audioApi.getDownloadUrl(processedFile.filename));
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    } catch {
      setProcessingError('Failed to copy link to clipboard');
    }
  }, [processedFile]);

  // --- JSX ---
  return (
    <div className="space-y-4">
      <FormatPresets selectedFormat={outputFormat} onFormatChange={onFormatChange} />
      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-slate-200/50">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={normalizeVolume}
              onChange={e => onNormalizeVolumeChange?.(e.target.checked)}
              disabled={disabled}
              className="sr-only"
            />
            <div className={`w-8 h-4 rounded-full transition-all duration-200 ease-in-out
              ${normalizeVolume ? 'bg-green-500' : 'bg-slate-300 hover:bg-slate-400'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out transform
                absolute top-0.5 ${normalizeVolume ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
            </div>
          </div>
          <span className="text-sm text-slate-700">Volume Normalization</span>
          {normalizeVolume && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
              On
            </span>
          )}
        </label>
      </div>
      {audioFile && (
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>Duration: {formatTimeUnified(activeRegionDuration)}</div>
            <div>Format: {outputFormat?.toUpperCase() || 'MP3'}</div>
            <div className={`${volume !== 1 ? 'font-semibold text-blue-600' : ''}`}>
              Volume: {volume !== 1 ? `${Math.round(volume * 100)}%` : normalizeVolume ? 'Normalized' : 'Original'}
              {volume !== 1 && (
                <span className="ml-1 text-xs bg-blue-100 px-1 rounded">APPLIED</span>
              )}
            </div>
            <div>Speed: {playbackRate !== 1 ? `${playbackRate}x` : 'Normal'}</div>
            <div>Pitch: {pitch !== 0 ? `${pitch > 0 ? '+' : ''}${pitch} semitones` : 'Normal'}</div>
            <div>Mode: {isInverted ? 'Invert (Remove)' : 'Normal (Keep)'}</div>
          </div>
        </div>
      )}
      {audioFile && isInverted && activeRegionDuration < 0.1 && (
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
      <div className="flex gap-3">
        <button
          onClick={handleCutOnly}
          disabled={cutButtonState.disabled}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-0 disabled:cursor-not-allowed ${cutButtonState.className}`}
        >
          <cutButtonState.icon className={`w-4 h-4 ${cutButtonState.spin ? 'animate-spin' : ''}`} />
          {cutButtonState.text}
        </button>
      </div>
      {processingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{processingError}</p>
        </div>
      )}
      {processedFile && !processingError && processedFile.outputFormat === outputFormat && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-800">Ready to Download!</h3>
              <p className="text-green-600 text-sm">Your audio has been processed successfully</p>
            </div>
          </div>

          {/* Audio Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-white/50 rounded-lg border border-green-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">Duration: <strong>{formatTimeUnified(processedFile.duration)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">Format: <strong>{processedFile.outputFormat?.toUpperCase()}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className={`text-sm text-green-700 ${volume !== 1 ? 'font-semibold' : ''}`}>
                Volume: <strong>{volume !== 1 ? `${Math.round(volume * 100)}%` : normalizeVolume ? 'Normalized' : 'Original'}</strong>
                {volume !== 1 && (
                  <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-normal">APPLIED</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">Speed: <strong>{processedFile.playbackRate !== 1 ? `${processedFile.playbackRate}x` : 'Normal'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">Pitch: <strong>{processedFile.pitch !== 0 ? `${processedFile.pitch > 0 ? '+' : ''}${processedFile.pitch} semitones` : 'Normal'}</strong></span>
            </div>
            {processedFile.fileSize && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700">Size: <strong>{(processedFile.fileSize / 1024 / 1024).toFixed(2)} MB</strong></span>
              </div>
            )}
          </div>

          {/* Download Button - Beautiful Modern Design */}
          <div className="space-y-4">
            <button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ease-out flex items-center justify-center gap-3 group"
            >
              <Save className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-lg">SAVE {processedFile.outputFormat?.toUpperCase()}</span>
            </button>

            {/* Share Link Section */}
            <div className="border-t border-green-200 pt-4">
              <div className="text-green-700 text-sm font-medium mb-3 flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Share Download Link:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={audioApi.getDownloadUrl(processedFile.filename)}
                  readOnly
                  className="flex-1 px-4 py-3 text-sm bg-white border-2 border-green-200 rounded-lg text-slate-600 font-mono focus:outline-none focus:border-green-400 transition-colors"
                  onClick={e => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 min-w-[100px] justify-center
                    ${copyLinkSuccess 
                      ? 'bg-green-600 text-white shadow-lg scale-105' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105 shadow-md'
                    }`}
                >
                  {copyLinkSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      <Toast 
        show={toast.show}
        onClose={hideToast}
        type={toast.type}
        title={toast.title}
        message={toast.message}
      />
    </div>
  );
};

export default CutDownload;
