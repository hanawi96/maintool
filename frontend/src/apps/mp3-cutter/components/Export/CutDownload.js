import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  pitch = 0,
  volume = 1, // 🎯 Add volume prop
  isInverted = false,
  normalizeVolume = false,
  onNormalizeVolumeChange,
  onFormatChange,
  disabled = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [processedFile, setProcessedFile] = useState(null);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  // WebSocket progress
  const { progress, startProgressSession, clearProgress } = useWebSocketProgress();

  // --- Helpers ---
  const activeRegionDuration = useMemo(() => {
    if (!audioFile) return 0;
    if (isInverted) {
      const d1 = startTime;
      const d2 = Math.max(0, audioFile.duration - endTime);
      return d1 + d2;
    }
    return endTime - startTime;
  }, [audioFile, startTime, endTime, isInverted]);

  // Button States
  const cutButtonState = useMemo(() => {
    if (disabled || !audioFile) return {
      icon: Scissors, text: 'No Audio File', className: 'bg-gray-300 text-gray-500 cursor-not-allowed', disabled: true
    };
    if (isInverted && audioFile.duration && activeRegionDuration < 0.1)
      return {
        icon: AlertCircle, text: 'No Active Regions', className: 'bg-orange-300 text-orange-700 cursor-not-allowed', disabled: true
      };
    if (isProcessing) return {
      icon: Loader, text: 'Cutting...', className: 'bg-blue-500 text-white', disabled: true, spin: true
    };
    return {
      icon: Scissors, text: 'Cut Audio',
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transform hover:scale-105',
      disabled: false
    };
  }, [audioFile, disabled, isInverted, activeRegionDuration, isProcessing]);

  const downloadButtonState = useMemo(() => {
    if (!processedFile) return {
      icon: Save, text: 'Save', className: 'bg-gray-300 text-gray-500 cursor-not-allowed', disabled: true
    };
    const isFormatMatch = processedFile.outputFormat === outputFormat;
    if (!isFormatMatch) return {
      icon: Save,
      text: `Save (${processedFile.outputFormat?.toUpperCase()})`,
      className: 'bg-yellow-200 text-yellow-700 cursor-not-allowed border-2 border-yellow-400',
      tooltip: `Switch back to ${processedFile.outputFormat?.toUpperCase()} format to download`,
      disabled: true
    };
    return {
      icon: Save,
      text: `Save ${outputFormat?.toUpperCase()}`,
      className: 'bg-green-500 hover:bg-green-600 text-white transform hover:scale-105 shadow-md hover:shadow-lg',
      disabled: false
    };
  }, [processedFile, outputFormat]);

  // Clear progress on complete (auto-fade)
  useEffect(() => {
    if (progress?.stage === 'completed') {
      const t = setTimeout(clearProgress, 3500);
      return () => clearTimeout(t);
    }
  }, [progress, clearProgress]);

  // Log if format changes
  useEffect(() => {
    if (processedFile && processedFile.outputFormat !== outputFormat) {
      console.log('[CutDownload] Format mismatch detected');
    }
  }, [outputFormat, processedFile]);

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
      startProgressSession(sessionId);      const cutParams = {
        fileId: audioFile.filename,
        startTime, endTime,
        outputFormat: outputFormat || 'mp3',
        fadeIn: fadeIn || 0, fadeOut: fadeOut || 0,
        playbackRate,
        pitch,
        volume, // 🎯 Add volume parameter
        isInverted,
        normalizeVolume,
        quality: 'high',
        sessionId
      };

      // 🎯 Debug log for volume parameter
      console.log('🔊 Frontend Volume Debug:', {
        volume: volume,
        volumeType: typeof volume,
        volumePercent: `${Math.round(volume * 100)}%`,
        noteToUser: volume !== 1 ? 'Volume adjustment will be applied to exported audio' : 'No volume adjustment (100%)'
      });

      const result = await audioApi.cutAudioByFileId(cutParams);

      if (!result?.success)
        throw new Error(result?.error || 'Cut operation failed - invalid response');
      const outputFile = result.data?.output?.filename || result.output?.filename || result.data?.outputFile;
      if (!outputFile)
        throw new Error('No output file received from server');

      setProcessedFile({
        filename: outputFile,
        duration: result.data?.output?.duration || result.output?.duration || (endTime - startTime),
        fileSize: result.data?.output?.size || result.output?.size,
        playbackRate: cutParams.playbackRate,
        pitch: cutParams.pitch,
        outputFormat: cutParams.outputFormat,
        processedAt: new Date().toISOString(),
        sessionId
      });

    } catch (error) {
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
  }, [audioFile, startTime, endTime, fadeIn, fadeOut, playbackRate, pitch, volume, isInverted, normalizeVolume, outputFormat, clearProgress, activeRegionDuration, startProgressSession]);

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
          <div className="grid grid-cols-2 gap-2">
            <div>Duration: {formatTimeUnified(activeRegionDuration)}</div>
            <div>Speed: {playbackRate !== 1 ? `${playbackRate}x` : 'Normal'}</div>
            <div>Format: {outputFormat?.toUpperCase() || 'MP3'}</div>
            <div>Pitch: {pitch !== 0 ? `${pitch > 0 ? '+' : ''}${pitch} semitones` : 'Normal'}</div>
            <div>Mode: {isInverted ? 'Invert (Remove)' : 'Normal (Keep)'}</div>            <div className={`${volume !== 1 ? 'font-semibold text-blue-600' : ''}`}>
              Volume: {volume !== 1 ? `${Math.round(volume * 100)}%` : normalizeVolume ? 'Normalized' : 'Original'}
              {volume !== 1 && (
                <span className="ml-1 text-xs bg-blue-100 px-1 rounded">APPLIED</span>
              )}
            </div>
          </div>          {volume > 1 && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              ⚠️ <strong>Volume boost may cause audio distortion at high levels</strong>
            </div>
          )}
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
      <ProgressIndicator progress={progress} className="mb-4" />
      <div className="flex gap-3">
        <button
          onClick={handleCutOnly}
          disabled={cutButtonState.disabled}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-0 disabled:cursor-not-allowed ${cutButtonState.className}`}
        >
          <cutButtonState.icon className={`w-4 h-4 ${cutButtonState.spin ? 'animate-spin' : ''}`} />
          {cutButtonState.text}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloadButtonState.disabled}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-0 disabled:cursor-not-allowed ${downloadButtonState.className}`}
          title={downloadButtonState.tooltip || `Download processed ${outputFormat?.toUpperCase()} file`}
        >
          <downloadButtonState.icon className="w-4 h-4" />
          {downloadButtonState.text}
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Save className="w-4 h-4" />
            <span className="font-medium">Ready to Download</span>
          </div>
          <div className="text-green-600 text-sm space-y-1 mb-3">
            <div>✅ Duration: {formatTimeUnified(processedFile.duration)}</div>
            <div>✅ Speed: {processedFile.playbackRate !== 1 ? `${processedFile.playbackRate}x` : 'Normal'}</div>
            <div>✅ Pitch: {processedFile.pitch !== 0 ? `${processedFile.pitch > 0 ? '+' : ''}${processedFile.pitch} semitones` : 'Normal'}</div>
            <div>✅ Format: {processedFile.outputFormat?.toUpperCase()}</div>
            <div className={`${volume !== 1 ? 'font-semibold text-green-700' : ''}`}>
              ✅ Volume: {volume !== 1 ? `${Math.round(volume * 100)}% (Identical to Preview)` : normalizeVolume ? 'Normalized' : 'Original'}
              {volume !== 1 && (
                <span className="ml-2 text-xs bg-green-100 px-1 rounded font-normal">MATCHED</span>
              )}
            </div>
            {processedFile.fileSize && (
              <div>✅ Size: {(processedFile.fileSize / 1024 / 1024).toFixed(2)} MB</div>
            )}
          </div>
          <div className="border-t border-green-200 pt-3">
            <div className="text-green-700 text-xs font-medium mb-2">Share Download Link:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={audioApi.getDownloadUrl(processedFile.filename)}
                readOnly
                className="flex-1 px-3 py-2 text-xs bg-white border border-green-200 rounded-md text-slate-600 font-mono"
                onClick={e => e.target.select()}
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-0 flex items-center gap-1
                  ${copyLinkSuccess ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                {copyLinkSuccess ? (
                  <>
                    <Check className="w-3 h-3" />Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />Copy
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
