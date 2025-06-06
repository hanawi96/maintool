import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const VolumeControl = ({ volume, onVolumeChange, disabled = false }) => {
  // 🎯 DEBUG: Log volume changes
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    console.log('🔊 [VolumeControl] Volume changed:', newVolume);
    onVolumeChange(newVolume);
  };

  const isMuted = volume === 0;

  return (
    <div className="flex items-center gap-3">
      {/* 🎯 Volume Icon with visual feedback */}
      <button
        onClick={() => onVolumeChange(isMuted ? 1 : 0)}
        disabled={disabled}
        className="p-1 rounded hover:bg-slate-100 transition-colors"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-red-500" />
        ) : (
          <Volume2 className="w-4 h-4 text-slate-600" />
        )}
      </button>

      {/* 🎯 Enhanced Volume Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          disabled={disabled}
          className="volume-slider w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Volume: ${Math.round(volume * 100)}%`}
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`
          }}
        />
      </div>

      {/* 🎯 Volume Percentage Display */}
      <span className="text-xs font-mono text-slate-700 w-9 text-right">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
};

export default VolumeControl;