import React, { useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';

const SpeedSliderPopup = ({
  value = 1,
  onChange,
  onClose,
  isVisible = false,
  buttonRef = null
}) => {
  const popupRef = useRef(null);
  const { position, isPositioned } = usePopupPosition(isVisible, buttonRef, popupRef, 300, 140);

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

  const handleSliderChange = useCallback((e) => {
    const newValue = parseFloat(e.target.value);
    // Immediate visual feedback
    onChange(newValue);
  }, [onChange]);
  const handleReset = useCallback(() => onChange(1.0), [onChange]);

  if (!isVisible) return null;

  const percent = ((value - 0.5) / 2.5) * 100;

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
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-slate-800">
            Playback Speed
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
      <div className="space-y-3">        <div className="flex items-center justify-between">
          <span className="text-lg font-mono font-semibold text-slate-700">
            {value.toFixed(2)}x
          </span>
          <span className="text-xs text-slate-500">
            0.5x-3.0x
          </span>
        </div>
        <div className="flex items-center gap-2">          <input
            type="range"
            min="0.5"
            max="3"
            step="0.01"
            value={value}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer speed-popup-slider"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`,
              willChange: 'background'
            }}
            draggable={false}
          />
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-purple-100 text-purple-600 hover:text-purple-700 rounded-lg transition-colors flex-shrink-0"
            title="Reset to 1.0x"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>        <div className="flex items-center gap-2">
          {[
            { label: '0.5x', value: 0.5 },
            { label: '1x', value: 1.0 },
            { label: '1.5x', value: 1.5 },
            { label: '2x', value: 2.0 },
            { label: '3x', value: 3.0 }
          ].map(({ label, value: presetValue }) => (
            <button
              key={label}
              onClick={() => onChange(presetValue)}
              className="px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors flex-1"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SpeedSliderPopup;
