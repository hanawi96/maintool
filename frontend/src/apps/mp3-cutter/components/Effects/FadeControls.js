import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { FADE_CONFIG } from '../../utils/constants';

const presets = [
  { key: 'GENTLE', label: 'Gentle (1s)' },
  { key: 'STANDARD', label: 'Standard (3s)' },
  { key: 'DRAMATIC', label: 'Dramatic (5s)' },
  { key: 'EXTENDED', label: 'Extended (8s)' },
  { key: 'MAXIMUM', label: 'Maximum (15s)', className: 'bg-purple-100 hover:bg-purple-200 text-purple-700 col-span-2' }
];

const FadeSlider = ({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  percent,
  color,
  onChange,
  onMouseDown,
  onMouseUp,
  onReset,
  disabled
}) => (
  <div>
    <label className="block text-xs text-slate-600 mb-2 flex items-center gap-1">
      <Icon className={`w-3 h-3 text-${color}-600`} />
      {label}
    </label>
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer fade-${label.toLowerCase().replace(' ', '-')}-slider`}
          style={{
            background: `linear-gradient(to right, #${color === 'green' ? '10b981' : 'ef4444'} 0%, #${color === 'green' ? '10b981' : 'ef4444'} ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`
          }}
          disabled={disabled}
        />
      </div>
      <span className="text-xs font-mono text-slate-700 w-12 text-right">
        {value.toFixed(1)}s
      </span>
      <button
        onClick={onReset}
        className={`px-2 py-1 text-xs bg-${color}-100 hover:bg-${color}-200 text-${color}-700 rounded transition-colors`}
        title={`Reset ${label}`}
        tabIndex={-1}
        type="button"
      >
        ×
      </button>
    </div>
  </div>
);

const FadeControls = ({
  fadeIn,
  fadeOut,
  onFadeInChange,
  onFadeOutChange,
  onFadeInDragEnd,
  onFadeOutDragEnd,
  onPresetApply
}) => {
  const [drag, setDrag] = useState({ fadeIn: false, fadeOut: false });

  // Factory handler to avoid duplicate code
  const handleFadeChange = type => e => {
    const val = parseFloat(e.target.value);
    type === 'in' ? onFadeInChange(val) : onFadeOutChange(val);
  };

  const handleDragStart = type => () =>
    setDrag(prev => ({ ...prev, [type]: true }));

  const handleDragEnd = useCallback(
    type => () => {
      if (drag[type]) {
        setDrag(prev => ({ ...prev, [type]: false }));
        if (type === 'fadeIn') onFadeInDragEnd?.(fadeIn);
        if (type === 'fadeOut') onFadeOutDragEnd?.(fadeOut);
      }
    },
    [drag, fadeIn, fadeOut, onFadeInDragEnd, onFadeOutDragEnd]
  );

  // Global mouseup for UX
  useEffect(() => {
    const handleUp = () => {
      if (drag.fadeIn) handleDragEnd('fadeIn')();
      if (drag.fadeOut) handleDragEnd('fadeOut')();
    };
    if (drag.fadeIn || drag.fadeOut)
      document.addEventListener('mouseup', handleUp);
    return () => document.removeEventListener('mouseup', handleUp);
  }, [drag, handleDragEnd]);

  const percent = useMemo(() => ({
    fadeIn: (fadeIn / FADE_CONFIG.MAX_DURATION) * 100,
    fadeOut: (fadeOut / FADE_CONFIG.MAX_DURATION) * 100
  }), [fadeIn, fadeOut]);

  const handlePreset = key => {
    const preset = FADE_CONFIG.DEFAULT_PRESETS[key];
    if (preset) onPresetApply?.(preset.fadeIn, preset.fadeOut);
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-slate-800 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Fade Effects
        <span className="text-xs text-slate-500 ml-auto">
          0-{FADE_CONFIG.MAX_DURATION}s
        </span>
      </h3>
      <div className="space-y-4">

        <FadeSlider
          label="Fade In"
          icon={TrendingUp}
          value={fadeIn}
          min={FADE_CONFIG.MIN_DURATION}
          max={FADE_CONFIG.MAX_DURATION}
          step={FADE_CONFIG.STEP}
          percent={percent.fadeIn}
          color="green"
          onChange={handleFadeChange('in')}
          onMouseDown={handleDragStart('fadeIn')}
          onMouseUp={handleDragEnd('fadeIn')}
          onReset={() => onPresetApply?.(0, fadeOut)}
        />

        <FadeSlider
          label="Fade Out"
          icon={TrendingDown}
          value={fadeOut}
          min={FADE_CONFIG.MIN_DURATION}
          max={FADE_CONFIG.MAX_DURATION}
          step={FADE_CONFIG.STEP}
          percent={percent.fadeOut}
          color="red"
          onChange={handleFadeChange('out')}
          onMouseDown={handleDragStart('fadeOut')}
          onMouseUp={handleDragEnd('fadeOut')}
          onReset={() => onPresetApply?.(fadeIn, 0)}
        />

        {/* Presets */}
        <div className="pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Quick Presets:</div>
          <div className="grid grid-cols-2 gap-2">
            {presets.map(({ key, label, className }) => (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className={`px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors ${className || ''}`}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(fadeIn > 0 || fadeOut > 0) && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Current Settings:</div>
            <div className="flex gap-4 text-xs">
              {fadeIn > 0 && (
                <span className="text-green-700">
                  In: {fadeIn.toFixed(1)}s ({percent.fadeIn.toFixed(0)}%)
                </span>
              )}
              {fadeOut > 0 && (
                <span className="text-red-700">
                  Out: {fadeOut.toFixed(1)}s ({percent.fadeOut.toFixed(0)}%)
                </span>
              )}
            </div>
            {fadeIn > 0 && fadeOut > 0 && (
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
