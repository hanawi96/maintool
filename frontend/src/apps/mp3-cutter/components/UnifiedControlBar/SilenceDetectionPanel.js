import React, { useState, useCallback } from 'react';
import { BarChart } from 'lucide-react';
import { audioApi } from '../../services/audioApi';

const SilenceDetectionPanel = ({ 
  fileId, 
  duration, 
  waveformData = [], 
  onSilenceDetected, 
  disabled = false,
  isOpen = false,
  onToggle
}) => {
  const [threshold, setThreshold] = useState(-40); // dB
  const [minDuration, setMinDuration] = useState(0.5); // seconds
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetectSilence = useCallback(async () => {
    if (!fileId || !duration || isDetecting) return;

    setIsDetecting(true);
    try {
      console.log('🔇 [SilenceDetection] Starting detection with:', { 
        fileId, threshold, minDuration 
      });

      const result = await audioApi.detectSilence({
        fileId,
        threshold,
        minDuration,
        duration
      });

      if (result.success && onSilenceDetected) {
        onSilenceDetected(result.data);
        console.log('✅ [SilenceDetection] Detection completed:', result.data);
      }
    } catch (error) {
      console.error('❌ [SilenceDetection] Detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [fileId, duration, threshold, minDuration, isDetecting, onSilenceDetected]);

  if (!isOpen) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mt-4 shadow-sm">      <div className="flex items-center gap-2 mb-4">
        <BarChart className="w-4 h-4 text-red-600" />
        <h3 className="text-sm font-semibold text-slate-700">Silence Detection</h3>
      </div>

      {/* Sliders Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-slate-600">Threshold</label>
            <span className="text-xs font-mono text-slate-500">{threshold}dB</span>
          </div>
          <input
            type="range"
            min="-60"
            max="-10"
            step="1"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            disabled={disabled || isDetecting}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((threshold + 60) / 50) * 100}%, #e2e8f0 ${((threshold + 60) / 50) * 100}%, #e2e8f0 100%)`
            }}
          />
        </div>

        {/* Min Duration Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-slate-600">Min Duration</label>
            <span className="text-xs font-mono text-slate-500">{minDuration}s</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={minDuration}
            onChange={(e) => setMinDuration(parseFloat(e.target.value))}
            disabled={disabled || isDetecting}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((minDuration - 0.1) / 2.9) * 100}%, #e2e8f0 ${((minDuration - 0.1) / 2.9) * 100}%, #e2e8f0 100%)`
            }}
          />
        </div>
      </div>

      {/* Detect Button */}
      <button
        onClick={handleDetectSilence}
        disabled={disabled || isDetecting || !fileId}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          isDetecting
            ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isDetecting ? 'Detecting...' : 'Remove Silent Parts'}
      </button>
    </div>
  );
};

export default SilenceDetectionPanel;
