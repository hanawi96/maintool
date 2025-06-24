import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, X, RotateCcw } from 'lucide-react';
import { FADE_CONFIG } from '../../utils/constants';
import usePopupPosition from './usePopupPosition';
import ToggleSwitch from './ToggleSwitch';

// Throttle helper for smooth slider performance
const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return (...args) => {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

const FadeSliderPopup = ({
  type = 'in',
  value = 0,
  onChange,
  onClose,
  isVisible = false,
  buttonRef = null,
  regions = [],
  activeRegionId = null,
  getCurrentFadeValues = null,
  fadeIn = 0,
  fadeOut = 0
}) => {
  const popupRef = useRef(null);
  const { position, responsive, ready } = usePopupPosition(isVisible, buttonRef, popupRef, 5);
  const { screenSize, maxWidth } = responsive;
  const isMobile = screenSize === 'mobile';

  const [applyToAllState, setApplyToAllState] = useState({});
  const [fadeBackup, setFadeBackup] = useState({});
  
  const currentApplyToAll = useMemo(() => {
    const key = `${activeRegionId || 'main'}-${type}`;
    return applyToAllState[key] || false;
  }, [applyToAllState, activeRegionId, type]);  // 🔧 CRITICAL FIX: Reset all "apply to all" states when activeRegionId changes
  useEffect(() => {

    setApplyToAllState({});
    setFadeBackup({});
  }, [activeRegionId]);

  const setCurrentApplyToAll = useCallback((checked) => {
    const key = `${activeRegionId || 'main'}-${type}`;
    const fadeType = type === 'in' ? 'fadeIn' : 'fadeOut';
    
    if (checked) {
      // Backup và apply to all
      const backup = {
        main: type === 'in' ? fadeIn : fadeOut,
        regions: regions.map(region => ({
          id: region.id,
          value: region[fadeType] || 0
        }))
      };
      
      setFadeBackup(prev => ({ ...prev, [key]: backup }));
      const currentValue = getCurrentFadeValues()[fadeType];
      onChange(currentValue, true);
      
    } else {
      // Restore từ backup
      const backup = fadeBackup[key];
      if (backup) {
        if (backup.main !== undefined) {
          const mainFadeIn = type === 'in' ? backup.main : fadeIn;
          const mainFadeOut = type === 'out' ? backup.main : fadeOut;
          onChange(type === 'in' ? mainFadeIn : mainFadeOut, false, 'restore-main', { fadeIn: mainFadeIn, fadeOut: mainFadeOut });
        }
        if (backup.regions?.length > 0) {
          onChange(0, false, 'restore-regions', { regions: backup.regions, fadeType });
        }
        setFadeBackup(prev => {
          const newBackup = { ...prev };
          delete newBackup[key];
          return newBackup;
        });
      }
    }
    
    setApplyToAllState(prev => ({ ...prev, [key]: checked }));
  }, [activeRegionId, type, regions, fadeIn, fadeOut, getCurrentFadeValues, onChange, fadeBackup]);
  
  const currentValue = getCurrentFadeValues ? getCurrentFadeValues()[type === 'in' ? 'fadeIn' : 'fadeOut'] : value;
  
  const showGlobalOption = regions.length > 0;

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

  // Throttled onChange for smooth slider performance (16ms = ~60fps)
  const throttledOnChange = useMemo(() => throttle((value, applyToAll) => {
    onChange(value, applyToAll);
  }, 16), [onChange]);

  const handleSliderChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    throttledOnChange(value, currentApplyToAll);
  }, [throttledOnChange, currentApplyToAll]);
  
  const handleReset = useCallback(() => onChange(0, currentApplyToAll), [onChange, currentApplyToAll]);
  const handlePresetClick = useCallback((presetValue) => onChange(presetValue, currentApplyToAll), [onChange, currentApplyToAll]);

  if (!isVisible) return null;
  const isIn = type === 'in';
  const Icon = isIn ? TrendingUp : TrendingDown;
  const colorClass = isIn ? 'emerald' : 'orange';
  const bgColorHex = isIn ? '#10b981' : '#f59e0b';
  const percent = (currentValue / FADE_CONFIG.MAX_DURATION) * 100;

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
            {currentValue.toFixed(1)}s
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
            value={currentValue}
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
              onClick={() => handlePresetClick(presetValue)}
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
              onClick={() => handlePresetClick(7.0)}
              className={`px-2 py-1.5 text-[10px] bg-${colorClass}-100 hover:bg-${colorClass}-200 text-${colorClass}-700 rounded-lg transition-colors flex-1`}
            >
              7s
            </button>
          </div>
        )}
        
        {showGlobalOption && (
          <div className="pt-2 border-t border-slate-200">
            <ToggleSwitch
              id={`apply-all-${type}`}
              checked={currentApplyToAll}
              onChange={setCurrentApplyToAll}
              label={`Áp dụng cho tất cả (${regions.length + 1} items)`}
              color="purple"
              debug={true}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FadeSliderPopup;
