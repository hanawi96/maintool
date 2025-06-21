import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Zap, X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';
import ToggleSwitch from './ToggleSwitch';

const SpeedSliderPopup = ({
  value = 1,
  onChange,
  onClose,
  isVisible = false,
  buttonRef = null,
  regions = [],
  activeRegionId = null,
  getCurrentSpeedValues = null,
  playbackRate
}) => {
  const popupRef = useRef(null);
  const { position, responsive, ready } = usePopupPosition(isVisible, buttonRef, popupRef, 5);
  const { screenSize, maxWidth } = responsive;
  const isMobile = screenSize === 'mobile';
  
  const [applyToAllState, setApplyToAllState] = useState({});
  const [speedBackup, setSpeedBackup] = useState({});
  
  // 🚀 Get current applyToAll state for active region
  const currentApplyToAll = useMemo(() => {
    const key = `${activeRegionId || 'main'}-speed`;
    return applyToAllState[key] || false;
  }, [applyToAllState, activeRegionId]);
  
  // 🔧 CRITICAL: Validate currentValue to prevent UI issues
  let currentValue = getCurrentSpeedValues ? getCurrentSpeedValues().playbackRate : value;
  
  if (typeof currentValue !== 'number' || !isFinite(currentValue) || isNaN(currentValue)) {
    console.error('🚨 INVALID currentValue in SpeedSliderPopup:', {
      value: currentValue,
      type: typeof currentValue,
      fallbackValue: value
    });
    currentValue = typeof value === 'number' && isFinite(value) && !isNaN(value) ? value : 1.0;
  }
  
  // Clamp to safe display range
  currentValue = Math.max(0.5, Math.min(3.0, currentValue));
  
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
  
  const handleSliderChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    
    // 🔧 CRITICAL: Validate slider value
    if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
      console.error('🚨 INVALID speed from slider:', {
        rawValue: e.target.value,
        parsedValue: value,
        type: typeof value
      });
      return; // Don't apply invalid values
    }
    
    const clampedValue = Math.max(0.5, Math.min(3.0, value));
    onChange(clampedValue, currentApplyToAll);
  }, [onChange, currentApplyToAll]);
  
  const handleReset = useCallback(() => onChange(1.0, currentApplyToAll), [onChange, currentApplyToAll]);
  
  const handlePresetClick = useCallback((presetValue) => {
    // 🔧 CRITICAL: Validate preset value
    if (typeof presetValue !== 'number' || !isFinite(presetValue) || isNaN(presetValue)) {
      console.error('🚨 INVALID preset speed value:', presetValue);
      return; // Don't apply invalid values
    }
    
    const clampedValue = Math.max(0.5, Math.min(3.0, presetValue));
    onChange(clampedValue, currentApplyToAll);
  }, [onChange, currentApplyToAll]);
  
  const handleApplyToAllChange = useCallback((checked) => {
    console.log(`🔧 Speed Toggle: ${activeRegionId || 'main'} -> ${checked}`);
    
    const key = `${activeRegionId || 'main'}-speed`;
    
    if (checked) {
      // Backup và apply to all
      const mainSpeed = typeof playbackRate === 'number' && isFinite(playbackRate) && !isNaN(playbackRate) 
        ? Math.max(0.25, Math.min(4.0, playbackRate)) 
        : 1.0;
      
      const backup = {
        main: mainSpeed,
        regions: regions.map(region => {
          let regionSpeed = region.playbackRate !== undefined ? region.playbackRate : 1.0;
          if (typeof regionSpeed !== 'number' || !isFinite(regionSpeed) || isNaN(regionSpeed)) {
            regionSpeed = 1.0;
          } else {
            regionSpeed = Math.max(0.25, Math.min(4.0, regionSpeed));
          }
          return { id: region.id, value: regionSpeed };
        })
      };
      
      setSpeedBackup(prev => ({ ...prev, [key]: backup }));
      onChange(currentValue, true);
      
    } else {
      // Restore từ backup
      const backup = speedBackup[key];
      if (backup) {
        if (backup.main !== undefined) {
          onChange(backup.main, false, 'restore-main', { playbackRate: backup.main });
        }
        if (backup.regions?.length > 0) {
          onChange(0, false, 'restore-regions', { 
            regions: backup.regions,
            speedType: 'playbackRate'
          });
        }
        setSpeedBackup(prev => {
          const newBackup = { ...prev };
          delete newBackup[key];
          return newBackup;
        });
      }
    }
    
    setApplyToAllState(prev => ({ ...prev, [key]: checked }));
  }, [activeRegionId, playbackRate, regions, currentValue, onChange, speedBackup]);

  if (!isVisible) return null;
  const percent = ((currentValue - 0.5) / 2.5) * 100;

  return createPortal(
    <div
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
      
      <div className={`space-y-${isMobile ? '2' : '3'}`}>
        <div className="flex items-center justify-between">
          <span className={`font-mono font-semibold text-slate-700 ${isMobile ? 'text-base' : 'text-lg'}`}>
            {currentValue.toFixed(2)}x
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
            value={currentValue}
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
              onClick={() => handlePresetClick(presetValue)}
              className={`bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors ${
                isMobile ? 'px-2 py-1.5 text-[10px] flex-1' : 'px-3 py-1.5 text-xs flex-1'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        {showGlobalOption && (
          <div className="pt-2 border-t border-slate-200">
            <ToggleSwitch
              id="applySpeedToAll"
              checked={currentApplyToAll}
              onChange={handleApplyToAllChange}
              label="Áp dụng cho tất cả"
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

export default SpeedSliderPopup;
