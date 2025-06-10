import React, { useState, useEffect, useCallback } from 'react';
import { Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { FADE_CONFIG } from '../../utils/constants';

const FadeControls = ({ 
  fadeIn, 
  fadeOut, 
  onFadeInChange, 
  onFadeOutChange, 
  onFadeInDragEnd,
  onFadeOutDragEnd,
  onPresetApply
}) => {
  const [isDraggingFadeIn, setIsDraggingFadeIn] = useState(false);
  const [isDraggingFadeOut, setIsDraggingFadeOut] = useState(false);
  
  const handleFadeInChange = (e) => {
    const newValue = parseFloat(e.target.value);
    onFadeInChange(newValue);
  };

  const handleFadeOutChange = (e) => {
    const newValue = parseFloat(e.target.value);
    onFadeOutChange(newValue);
  };

  const handleFadeInMouseDown = () => setIsDraggingFadeIn(true);
  const handleFadeOutMouseDown = () => setIsDraggingFadeOut(true);

  const handleFadeInMouseUp = useCallback(() => {
    if (isDraggingFadeIn) {
      setIsDraggingFadeIn(false);
      onFadeInDragEnd?.(fadeIn);
    }
  }, [isDraggingFadeIn, fadeIn, onFadeInDragEnd]);

  const handleFadeOutMouseUp = useCallback(() => {
    if (isDraggingFadeOut) {
      setIsDraggingFadeOut(false);
      onFadeOutDragEnd?.(fadeOut);
    }
  }, [isDraggingFadeOut, fadeOut, onFadeOutDragEnd]);

  // Global mouse up listener for better UX
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingFadeIn) handleFadeInMouseUp();
      if (isDraggingFadeOut) handleFadeOutMouseUp();
    };

    if (isDraggingFadeIn || isDraggingFadeOut) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDraggingFadeIn, isDraggingFadeOut, handleFadeInMouseUp, handleFadeOutMouseUp]);

  const fadeInPercent = (fadeIn / FADE_CONFIG.MAX_DURATION) * 100;
  const fadeOutPercent = (fadeOut / FADE_CONFIG.MAX_DURATION) * 100;

  const applyPreset = (presetName) => {
    const preset = FADE_CONFIG.DEFAULT_PRESETS[presetName];
    if (preset && onPresetApply) {
      onPresetApply(preset.fadeIn, preset.fadeOut);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-slate-800 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Fade Effects
        <span className="text-xs text-slate-500 ml-auto">0-{FADE_CONFIG.MAX_DURATION}s</span>
      </h3>
      
      <div className="space-y-4">
        {/* Fade In Control */}
        <div>
          <label className="block text-xs text-slate-600 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-600" />
            Fade In
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="range"
                min={FADE_CONFIG.MIN_DURATION}
                max={FADE_CONFIG.MAX_DURATION}
                step={FADE_CONFIG.STEP}
                value={fadeIn}
                onChange={handleFadeInChange}
                onMouseDown={handleFadeInMouseDown}
                onMouseUp={handleFadeInMouseUp}
                className="fade-in-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${fadeInPercent}%, #e2e8f0 ${fadeInPercent}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-700 w-12 text-right">
              {fadeIn.toFixed(1)}s
            </span>
            <button
              onClick={() => onPresetApply?.(0, fadeOut)}
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              title="Reset Fade In"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Fade Out Control */}
        <div>
          <label className="block text-xs text-slate-600 mb-2 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-600" />
            Fade Out
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="range"
                min={FADE_CONFIG.MIN_DURATION}
                max={FADE_CONFIG.MAX_DURATION}
                step={FADE_CONFIG.STEP}
                value={fadeOut}
                onChange={handleFadeOutChange}
                onMouseDown={handleFadeOutMouseDown}
                onMouseUp={handleFadeOutMouseUp}
                className="fade-out-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${fadeOutPercent}%, #e2e8f0 ${fadeOutPercent}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-700 w-12 text-right">
              {fadeOut.toFixed(1)}s
            </span>
            <button
              onClick={() => onPresetApply?.(fadeIn, 0)}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
              title="Reset Fade Out"
            >
              ×
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Quick Presets:</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => applyPreset('GENTLE')} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
              Gentle (1s)
            </button>
            <button onClick={() => applyPreset('STANDARD')} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
              Standard (3s)
            </button>
            <button onClick={() => applyPreset('DRAMATIC')} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
              Dramatic (5s)
            </button>
            <button onClick={() => applyPreset('EXTENDED')} className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors">
              Extended (8s)
            </button>
            <button onClick={() => applyPreset('MAXIMUM')} className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors col-span-2">
              Maximum (15s)
            </button>
          </div>
        </div>

        {(fadeIn > 0 || fadeOut > 0) && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Current Settings:</div>
            <div className="flex gap-4 text-xs">
              {fadeIn > 0 && (
                <span className="text-green-700">
                  In: {fadeIn.toFixed(1)}s ({((fadeIn / FADE_CONFIG.MAX_DURATION) * 100).toFixed(0)}%)
                </span>
              )}
              {fadeOut > 0 && (
                <span className="text-red-700">
                  Out: {fadeOut.toFixed(1)}s ({((fadeOut / FADE_CONFIG.MAX_DURATION) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
            {(fadeIn > 0 && fadeOut > 0) && (
              <div className="text-xs text-slate-600 mt-1">
                Total fade time: {(fadeIn + fadeOut).toFixed(1)}s
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FadeControls;