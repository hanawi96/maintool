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
  const handleReset = useCallback(() => onChange(1.0), [onChange]);

  if (!isVisible) return null;
  const percent = ((value - 0.5) / 2.5) * 100;

  return createPortal(    <div
      ref={popupRef}
      className={`fixed bg-white border border-slate-300 rounded-2xl shadow-2xl pointer-events-auto ${isMobile ? 'p-3' : 'p-4'}`}
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
          <Zap className="w-4 h-4 text-purple-600" />
          <span className={`font-medium text-slate-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`font-mono font-semibold text-slate-700 ${isMobile ? 'text-base' : 'text-lg'}`}>
            {value.toFixed(2)}x
          </span>
          <span className={`text-slate-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            0.5x-3.0x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
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
        </div>
        <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
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
              className={`bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors ${
                isMobile ? 'px-2 py-1.5 text-[10px] flex-1' : 'px-3 py-1.5 text-xs flex-1'
              }`}
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
