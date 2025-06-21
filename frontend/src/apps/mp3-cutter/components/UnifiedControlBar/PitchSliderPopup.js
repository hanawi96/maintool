import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Music, X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';
import ToggleSwitch from './ToggleSwitch';

const PitchSliderPopup = ({
  value = 0,
  onChange,
  onClose,
  isVisible = false,
  buttonRef = null,
  regions = [],
  activeRegionId = null,
  getCurrentPitchValues = null,
  pitch
}) => {
  const popupRef = useRef(null);
  const { position, responsive, ready } = usePopupPosition(isVisible, buttonRef, popupRef, 5);
  const { screenSize, maxWidth } = responsive;
  const isMobile = screenSize === 'mobile';
  
  const [applyToAllState, setApplyToAllState] = useState({});
  const [pitchBackup, setPitchBackup] = useState({});
  
  // 🚀 Get current applyToAll state for active region
  const currentApplyToAll = useMemo(() => {
    const key = `${activeRegionId || 'main'}-pitch`;
    return applyToAllState[key] || false;
  }, [applyToAllState, activeRegionId]);
  
  // 🔧 CRITICAL: Validate currentValue to prevent UI issues
  let currentValue = getCurrentPitchValues ? getCurrentPitchValues().pitch : value;
  
  if (typeof currentValue !== 'number' || !isFinite(currentValue) || isNaN(currentValue)) {
    console.error('🚨 INVALID currentValue in PitchSliderPopup:', {
      value: currentValue,
      type: typeof currentValue,
      fallbackValue: value
    });
    currentValue = typeof value === 'number' && isFinite(value) && !isNaN(value) ? value : 0.0;
  }
  
  // Clamp to safe display range
  currentValue = Math.max(-12, Math.min(12, currentValue));
  
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
      console.error('🚨 INVALID pitch from slider:', {
        rawValue: e.target.value,
        parsedValue: value,
        type: typeof value
      });
      return; // Don't apply invalid values
    }
    
    const clampedValue = Math.max(-12, Math.min(12, value));
    onChange(clampedValue, currentApplyToAll);
  }, [onChange, currentApplyToAll]);
  
  const handleReset = useCallback(() => onChange(0.0, currentApplyToAll), [onChange, currentApplyToAll]);
  
  const handlePresetClick = useCallback((presetValue) => {
    // 🔧 CRITICAL: Validate preset value
    if (typeof presetValue !== 'number' || !isFinite(presetValue) || isNaN(presetValue)) {
      console.error('🚨 INVALID preset pitch value:', presetValue);
      return; // Don't apply invalid values
    }
    
    const clampedValue = Math.max(-12, Math.min(12, presetValue));
    onChange(clampedValue, currentApplyToAll);
  }, [onChange, currentApplyToAll]);
  
  const handleApplyToAllChange = useCallback((checked) => {
    console.log(`🔧 Pitch Toggle: ${activeRegionId || 'main'} -> ${checked}`);
    
    const key = `${activeRegionId || 'main'}-pitch`;
    
    if (checked) {
      // Backup và apply to all
      const mainPitch = typeof pitch === 'number' && isFinite(pitch) && !isNaN(pitch) 
        ? Math.max(-12, Math.min(12, pitch)) 
        : 0.0;
      
      const backup = {
        main: mainPitch,
        regions: regions.map(region => {
          let regionPitch = region.pitch !== undefined ? region.pitch : 0.0;
          if (typeof regionPitch !== 'number' || !isFinite(regionPitch) || isNaN(regionPitch)) {
            regionPitch = 0.0;
          } else {
            regionPitch = Math.max(-12, Math.min(12, regionPitch));
          }
          return { id: region.id, value: regionPitch };
        })
      };
      
      setPitchBackup(prev => ({ ...prev, [key]: backup }));
      onChange(currentValue, true);
      
    } else {
      // Restore từ backup
      const backup = pitchBackup[key];
      if (backup) {
        if (backup.main !== undefined) {
          onChange(backup.main, false, 'restore-main', { pitch: backup.main });
        }
        if (backup.regions?.length > 0) {
          onChange(0, false, 'restore-regions', { 
            regions: backup.regions,
            pitchType: 'pitch'
          });
        }
        setPitchBackup(prev => {
          const newBackup = { ...prev };
          delete newBackup[key];
          return newBackup;
        });
      }
    }
    
    setApplyToAllState(prev => ({ ...prev, [key]: checked }));
  }, [activeRegionId, pitch, regions, currentValue, onChange, pitchBackup]);

  if (!isVisible) return null;
  const percent = ((currentValue + 12) / 24) * 100;

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
      
      <div className={`space-y-${isMobile ? '2' : '3'}`}>
        <div className="flex items-center justify-between">
          <span className={`font-mono font-semibold text-slate-700 ${isMobile ? 'text-base' : 'text-lg'}`}>
            {currentValue > 0 ? '+' : ''}{currentValue.toFixed(1)} st
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
            value={currentValue}
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
        
        <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
          {[
            { label: '-12', value: -12 },
            { label: '-6', value: -6 },
            { label: '0', value: 0 },
            { label: '+6', value: 6 },
            { label: '+12', value: 12 }
          ].map(({ label, value: presetValue }) => (
            <button
              key={label}
              onClick={() => handlePresetClick(presetValue)}
              className={`bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg transition-colors ${
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
              id="applyPitchToAll"
              checked={currentApplyToAll}
              onChange={handleApplyToAllChange}
              label="Áp dụng cho tất cả"
              color="teal"
              debug={true}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PitchSliderPopup;
