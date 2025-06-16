import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, X, RotateCcw } from 'lucide-react';
import { FADE_CONFIG } from '../../utils/constants';

const FadeSliderPopup = ({ 
  type = 'in',
  value = 0,
  onChange,
  onClose,
  isVisible = false,
  buttonRef = null
}) => {
  const popupRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // 🐛 **DEBUG Z-INDEX**: Log z-index conflicts
  useEffect(() => {
    if (isVisible && popupRef.current) {
      const popup = popupRef.current;
      const computedStyle = window.getComputedStyle(popup);
      console.log(`[${type.toUpperCase()}] POPUP Z-INDEX DEBUG:`, {
        zIndex: computedStyle.zIndex,
        position: computedStyle.position,
        transform: computedStyle.transform,
        visibility: computedStyle.visibility,
        display: computedStyle.display
      });
      
      // Check for conflicting elements
      const allElements = document.querySelectorAll('*');
      const highZIndexElements = Array.from(allElements).filter(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex);
        return zIndex > 99999;
      });
      
      if (highZIndexElements.length > 0) {
        console.log(`[${type.toUpperCase()}] HIGH Z-INDEX CONFLICTS:`, 
          highZIndexElements.map(el => ({
            element: el.tagName,
            className: el.className,
            zIndex: window.getComputedStyle(el).zIndex
          }))
        );
      }
    }
  }, [isVisible, type]);

  // 🎯 **PORTAL POSITIONING**: Tính toán vị trí cho Portal
  useEffect(() => {
    if (isVisible && buttonRef?.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 300;
      const popupHeight = 140;
      
      // 🔽 **BELOW POSITIONING**: Hiển thị bên dưới button
      let top = buttonRect.bottom + 10; // 10px gap dưới button
      let left = buttonRect.left + (buttonRect.width / 2) - (popupWidth / 2);
      
      // 🛡️ **VIEWPORT BOUNDS**: Đảm bảo không ra ngoài viewport
      if (left < 10) left = 10;
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }
      
      // 🔄 **FALLBACK TO TOP**: Nếu không đủ chỗ dưới thì hiển thị trên
      if (top + popupHeight > window.innerHeight - 10) {
        top = buttonRect.top - popupHeight - 10;
      }
      
      console.log(`[${type.toUpperCase()}] PORTAL POSITION (BELOW):`, { top, left, buttonRect });
      setPosition({ top, left });
    }
  }, [isVisible, buttonRef, type]);

  // 🎯 **SIMPLIFIED OUTSIDE CLICK**: Đơn giản hóa logic đóng popup
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && 
          buttonRef?.current && !buttonRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose, buttonRef]);

  // 🎯 **OPTIMIZED HANDLERS**: Đơn giản hóa logic
  const handleSliderChange = useCallback((e) => onChange(parseFloat(e.target.value)), [onChange]);
  const handleReset = useCallback(() => onChange(0), [onChange]);

  if (!isVisible) return null;

  const isIn = type === 'in';
  const Icon = isIn ? TrendingUp : TrendingDown;
  const colorClass = isIn ? 'emerald' : 'orange';
  const bgColorHex = isIn ? '#10b981' : '#f59e0b';
  const percent = (value / FADE_CONFIG.MAX_DURATION) * 100;

  // 🌟 **PORTAL CONTENT**: Render ở document.body để tránh z-index conflicts
  const popupContent = (
    <>
      {/* 🎭 **ULTRA HIGH PRIORITY BACKDROP**: Z-index cao nhất */}
      <div className="fixed inset-0 bg-black/5" style={{ zIndex: 9999998 }} onClick={onClose} />
      
      {/* 🎯 **ULTRA HIGH PRIORITY POPUP**: Z-index cao nhất + 1 */}
      <div
        ref={popupRef}
        className="fixed bg-white/98 backdrop-blur-md border border-slate-300/60 rounded-2xl shadow-2xl p-4 w-[300px] pointer-events-auto"
        style={{ 
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 9999999, // Cao hơn tất cả CSS conflicts
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          transform: 'translateZ(0)',
          willChange: 'transform, opacity'
        }}
      >
        {/* 📋 **HEADER**: Simple header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 text-${colorClass}-600`} />
            <span className="text-sm font-medium text-slate-800">
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

        {/* 🎚️ **SLIDER SECTION**: Optimized slider controls */}
        <div className="space-y-3">
          {/* ⏱️ **VALUE DISPLAY**: Current value */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-mono font-semibold text-slate-700">
              {value.toFixed(1)}s
            </span>
            <span className="text-xs text-slate-500">
              0-{FADE_CONFIG.MAX_DURATION}s
            </span>
          </div>

          {/* 🎚️ **SLIDER**: Main slider control */}
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

          {/* ⚡ **QUICK ACTIONS**: Preset buttons */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Off', value: 0, color: 'slate' },
              { label: '1s', value: 1.0, color: colorClass },
              { label: '3s', value: 3.0, color: colorClass },
              { label: '5s', value: 5.0, color: colorClass }
            ].map(({ label, value: presetValue, color }) => (
              <button
                key={label}
                onClick={() => onChange(presetValue)}
                className={`px-3 py-1.5 text-xs bg-${color}-100 hover:bg-${color}-200 text-${color}-700 rounded-lg transition-colors flex-1`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  // 🌟 **PORTAL RENDER**: Render ở document.body để tránh tất cả conflicts
  return createPortal(popupContent, document.body);
};

export default FadeSliderPopup; 