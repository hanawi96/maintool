import React, { useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Music, X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';

const PitchSliderPopup = ({
  value = 0,
  onChange,
  onClose,
  isVisible = false,
  buttonRef = null
}) => {
  const popupRef = useRef(null);
  const { position, responsive, ready } = usePopupPosition(isVisible, buttonRef, popupRef, 5);
  const { screenSize, maxWidth } = responsive;
  const isMobile = screenSize === 'mobile';

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
  const handleReset = useCallback(() => onChange(0), [onChange]);

  if (!isVisible) return null;
  const percent = ((value + 12) / 24) * 100;

  return createPortal(
    <div
      ref={popupRef}
      className={`fixed bg-white/98 backdrop-blur-md border border-slate-300/60 rounded-2xl shadow-2xl pointer-events-auto ${isMobile ? 'p-3' : 'p-4'}`}
      style={{
        top: ready ? `${position.top}px` : undefined,
        left: ready ? `${position.left}px` : undefined,
        width: '100%',
        maxWidth: `${maxWidth}px`,
        zIndex: 9999999,
        display: ready ? undefined : 'none'
      }}
    >
      <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-3'}`}>
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-teal-600" />
          <span className={`font-medium text-slate-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Pitch Control
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
          <span className={`font-mono font-semibold text-slate-700 ${isMobile ? 'text-base' : 'text-lg'}`}>
            {value > 0 ? '+' : ''}{value.toFixed(1)} st
          </span>
          <span className={`text-slate-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            -12 to +12 semitones
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="-12"
            max="12"
            step="0.1"
            value={value}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer pitch-popup-slider"
            style={{
              background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`,
              willChange: 'background'
            }}
            draggable={false}
          />
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-teal-100 text-teal-600 hover:text-teal-700 rounded-lg transition-colors flex-shrink-0"
            title="Reset to 0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
        <div className={`flex items-center gap-1.5 ${isMobile ? 'flex-wrap' : ''}`}>
          {[
            { label: '-12', value: -12 },
            { label: '-6', value: -6 },
            { label: '0', value: 0 },
            { label: '+6', value: 6 },
            { label: '+12', value: 12 }
          ].map(({ label, value: presetValue }) => (
            <button
              key={label}
              onClick={() => onChange(presetValue)}
              className={`bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg transition-colors ${
                isMobile ? 'px-1.5 py-1.5 text-[10px] flex-1 min-w-0' : 'px-1.5 py-1.5 text-[11px] flex-1 min-w-0'
              } font-medium`}
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

export default PitchSliderPopup;
