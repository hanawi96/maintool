import React from 'react';
import { Settings, TrendingUp, TrendingDown } from 'lucide-react';

const FadeControls = ({ fadeIn, fadeOut, onFadeInChange, onFadeOutChange }) => {
  // 🎯 DEBUG: Log fade changes
  const handleFadeInChange = (e) => {
    const newValue = parseFloat(e.target.value);
    console.log('📈 [FadeControls] Fade In changed:', newValue);
    onFadeInChange(newValue);
  };

  const handleFadeOutChange = (e) => {
    const newValue = parseFloat(e.target.value);
    console.log('📉 [FadeControls] Fade Out changed:', newValue);
    onFadeOutChange(newValue);
  };

  // 🎯 Calculate progress for visual feedback
  const fadeInPercent = (fadeIn / 5) * 100;
  const fadeOutPercent = (fadeOut / 5) * 100;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-slate-800 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Fade Effects
      </h3>
      
      <div className="space-y-4">
        {/* 🎯 Fade In Control */}
        <div>
          <label className="block text-xs text-slate-600 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-600" />
            Fade In
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={fadeIn}
                onChange={handleFadeInChange}
                className="fade-in-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                title={`Fade In: ${fadeIn}s`}
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${fadeInPercent}%, #e2e8f0 ${fadeInPercent}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-700 w-10 text-right">
              {fadeIn.toFixed(1)}s
            </span>
            {fadeIn > 0 && (
              <button
                onClick={() => onFadeInChange(0)}
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                title="Reset Fade In"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* 🎯 Fade Out Control */}
        <div>
          <label className="block text-xs text-slate-600 mb-2 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-600" />
            Fade Out
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={fadeOut}
                onChange={handleFadeOutChange}
                className="fade-out-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                title={`Fade Out: ${fadeOut}s`}
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${fadeOutPercent}%, #e2e8f0 ${fadeOutPercent}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-700 w-10 text-right">
              {fadeOut.toFixed(1)}s
            </span>
            {fadeOut > 0 && (
              <button
                onClick={() => onFadeOutChange(0)}
                className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                title="Reset Fade Out"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* 🎯 Quick Preset Buttons */}
        {(fadeIn === 0 && fadeOut === 0) && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-2">Quick Presets:</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onFadeInChange(1);
                  onFadeOutChange(1);
                }}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                1s Both
              </button>
              <button
                onClick={() => {
                  onFadeInChange(2);
                  onFadeOutChange(2);
                }}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                2s Both
              </button>
              <button
                onClick={() => {
                  onFadeInChange(3);
                  onFadeOutChange(3);
                }}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                3s Both
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FadeControls;