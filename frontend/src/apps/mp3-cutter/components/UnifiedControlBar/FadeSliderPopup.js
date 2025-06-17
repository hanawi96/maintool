import React, { useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, X, RotateCcw } from 'lucide-react';
import { FADE_CONFIG } from '../../utils/constants';
import usePopupPosition from './usePopupPosition';

const FadeSliderPopup = ({
  type = 'in',
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
  const isIn = type === 'in';
  const Icon = isIn ? TrendingUp : TrendingDown;
  const colorClass = isIn ? 'emerald' : 'orange';
  const bgColorHex = isIn ? '#10b981' : '#f59e0b';
  const percent = (value / FADE_CONFIG.MAX_DURATION) * 100;

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
          <Icon className={`w-4 h-4 text-${colorClass}-600`} />
          <span className={`font-medium text-slate-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Fade {isIn ? 'In' : 'Out'}
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
            {value.toFixed(1)}s
          </span>
          <span className={`text-slate-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            0-{FADE_CONFIG.MAX_DURATION}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={FADE_CONFIG.MIN_DURATION}
            max={FADE_CONFIG.MAX_DURATION}
            step={FADE_CONFIG.STEP}
            value={value}
            onChange={handleSliderChange}
            className={`flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer fade-popup-slider-${type}`}
            style={{
              background: `linear-gradient(to right, ${bgColorHex} 0%, ${bgColorHex} ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`
            }}
          />
          <button
            onClick={handleReset}
            className={`p-1.5 hover:bg-${colorClass}-100 text-${colorClass}-600 hover:text-${colorClass}-700 rounded-lg transition-colors flex-shrink-0`}
            title="Reset to 0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
        <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
          {[
            { label: '1s', value: 1.0, color: colorClass },
            { label: '3s', value: 3.0, color: colorClass },
            { label: '5s', value: 5.0, color: colorClass },
            ...(isMobile ? [] : [{ label: '7s', value: 7.0, color: colorClass }])
          ].map(({ label, value: presetValue, color }) => (
            <button
              key={label}
              onClick={() => onChange(presetValue)}
              className={`bg-${color}-100 hover:bg-${color}-200 text-${color}-700 rounded-lg transition-colors ${
                isMobile ? 'px-2 py-1.5 text-[10px] flex-1' : 'px-3 py-1.5 text-xs flex-1'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isMobile && (
          <div className="flex">
            <button
              onClick={() => onChange(7.0)}
              className={`px-2 py-1.5 text-[10px] bg-${colorClass}-100 hover:bg-${colorClass}-200 text-${colorClass}-700 rounded-lg transition-colors flex-1`}
            >
              7s
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FadeSliderPopup;
