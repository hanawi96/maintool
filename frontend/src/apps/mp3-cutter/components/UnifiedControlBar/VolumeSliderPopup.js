import React, { useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';

// Helper: get dynamic color based on volume level (same as waveform)
const getVolumeColor = (volume) => {
  const volumePercent = volume * 100;
  
  if (volumePercent <= 100) {
    return '#7c3aed'; // Purple for 0-100%
  } else if (volumePercent <= 150) {
    // Smooth transition from purple to orange (101-150%)
    const ratio = (volumePercent - 100) / 50;
    return interpolateColor('#7c3aed', '#f97316', ratio);
  } else {
    // Smooth transition from orange to red (151-200%)
    const ratio = Math.min((volumePercent - 150) / 50, 1);
    return interpolateColor('#f97316', '#ef4444', ratio);
  }
};

// Helper: interpolate between two hex colors
const interpolateColor = (color1, color2, ratio) => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const VolumeSliderPopup = ({
  value = 1,
  onChange,
  onClose,
  isVisible = false,
  buttonRef = null
}) => {
  const popupRef = useRef(null);
  const { position, isPositioned } = usePopupPosition(isVisible, buttonRef, popupRef, 300, 200);

  useEffect(() => {
    if (!isVisible) return;
    const handleClickOutside = (event) => {
      if (buttonRef?.current?.contains(event.target)) return;
      if (popupRef.current?.contains(event.target)) return;
      onClose();
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose, buttonRef]);

  const handleSliderChange = useCallback((e) => onChange(parseFloat(e.target.value)), [onChange]);
  const handleReset = useCallback(() => onChange(1.0), [onChange]);

  if (!isVisible) return null;
  const isMuted = value === 0;
  const isBoost = value > 1;
  const percent = (value / 2) * 100; // Convert 0-2 range to 0-100% for slider visual
  const displayPercent = value * 100; // Display actual percentage
  const dynamicColor = getVolumeColor(value); // Get dynamic color based on volume

  return createPortal(
    <div
      ref={popupRef}
      className="fixed bg-white/98 backdrop-blur-md border border-slate-300/60 rounded-2xl shadow-2xl p-4 pointer-events-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 9999999,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25),0 0 0 1px rgba(0,0,0,0.05)',
        transform: 'translateZ(0)',
        willChange: 'transform, opacity',
        opacity: isPositioned ? 1 : 0,
        visibility: isPositioned ? 'visible' : 'hidden'
      }}
    >      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-600" />
          ) : (
            <Volume2 className="w-4 h-4" style={{ color: dynamicColor }} />
          )}
          <span className="text-sm font-medium text-slate-800">
            Volume Control
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          title="Close"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-lg font-mono font-semibold ${isBoost ? 'text-orange-700' : 'text-slate-700'}`}>
            {Math.round(displayPercent)}%
          </span>
          <span className="text-xs text-slate-500">
            0-200%
          </span>
        </div>        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="2"
            step="0.02"
            value={value}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer volume-popup-slider"
            style={{
              background: `linear-gradient(to right, ${dynamicColor} 0%, ${dynamicColor} ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`,
              '--slider-color': dynamicColor
            }}
          />
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-lg transition-colors flex-shrink-0"
            title="Reset to 100%"
          >
            <RotateCcw className="w-3 h-3" />
          </button>        </div><div className="grid grid-cols-5 gap-1.5">
          {[
            { label: '25%', value: 0.25 },
            { label: '50%', value: 0.5 },
            { label: '100%', value: 1.0 },
            { label: '150%', value: 1.5 },
            { label: '200%', value: 2.0 }
          ].map(({ label, value: presetValue }) => (
            <button
              key={label}
              onClick={() => onChange(presetValue)}
              className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${
                presetValue > 1 
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                  : presetValue === 1
                  ? 'bg-green-100 hover:bg-green-200 text-green-700'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isBoost && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
            <p className="text-xs text-orange-700">
              ⚠️ Volume boost may cause audio distortion at high levels
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default VolumeSliderPopup;
