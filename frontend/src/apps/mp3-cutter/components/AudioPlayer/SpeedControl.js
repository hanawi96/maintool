import React from 'react';
import { Zap } from 'lucide-react';

const SpeedControl = ({ playbackRate, onSpeedChange, disabled = false }) => {
  // 🎯 DEBUG: Log speed changes
  const handleSpeedChange = (e) => {
    const newRate = parseFloat(e.target.value);
    console.log('⚡ [SpeedControl] Speed changed:', newRate);
    onSpeedChange(newRate);
  };

  // 🎯 Preset speed buttons for quick access
  const presetSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  
  const handlePresetClick = (speed) => {
    console.log('⚡ [SpeedControl] Preset speed selected:', speed);
    onSpeedChange(speed);
  };

  // 🎯 Calculate slider progress for visual feedback
  const progressPercent = ((playbackRate - 0.5) / (2 - 0.5)) * 100;

  return (
    <div className="flex items-center gap-3">
      {/* 🎯 Speed Icon */}
      <Zap className="w-4 h-4 text-slate-600" />

      {/* 🎯 Enhanced Speed Slider */}
      <div className="relative">
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.05"
          value={playbackRate}
          onChange={handleSpeedChange}
          disabled={disabled}
          className="speed-slider w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Speed: ${playbackRate}x`}
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${progressPercent}%, #e2e8f0 ${progressPercent}%, #e2e8f0 100%)`
          }}
        />
      </div>

      {/* 🎯 Speed Display */}
      <span className="text-xs font-mono text-slate-700 w-11 text-right">
        {playbackRate.toFixed(2)}x
      </span>

      {/* 🎯 Quick Reset to Normal Speed */}
      {playbackRate !== 1 && (
        <button
          onClick={() => handlePresetClick(1)}
          disabled={disabled}
          className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors disabled:opacity-50"
          title="Reset to 1x"
        >
          1x
        </button>
      )}
    </div>
  );
};

export default SpeedControl;