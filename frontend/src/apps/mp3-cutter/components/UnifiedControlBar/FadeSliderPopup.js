import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
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

  // 🔧 CRITICAL FIX: Store applyToAll state per region + fade type
  const [applyToAllState, setApplyToAllState] = useState({});
  
  // 🆕 BACKUP SYSTEM: Store original fade values before applying to all
  const [fadeBackup, setFadeBackup] = useState({});
  
  // 🚀 Get current applyToAll state for active region + fade type
  const currentApplyToAll = useMemo(() => {
    const key = `${activeRegionId || 'main'}-${type}`;
    return applyToAllState[key] || false;
  }, [applyToAllState, activeRegionId, type]);
  
  // 🚀 Update applyToAll state with backup/restore logic
  const setCurrentApplyToAll = useCallback((checked) => {
    console.log(`🔧 Setting applyToAll for ${activeRegionId || 'main'}-${type}: ${checked}`);
    
    const key = `${activeRegionId || 'main'}-${type}`;
    const fadeType = type === 'in' ? 'fadeIn' : 'fadeOut';
    
    if (checked) {
      // 🔄 BACKUP: Store current fade values before applying to all
      const backup = {
        main: type === 'in' ? fadeIn : fadeOut,
        regions: regions.map(region => ({
          id: region.id,
          value: region[fadeType] || 0
        }))
      };
      
      console.log(`💾 Backing up ${type} fade values:`, backup);
      setFadeBackup(prev => ({
        ...prev,
        [key]: backup
      }));
      
      // Apply current region's fade to all regions + main
      const currentRegionValue = getCurrentFadeValues()[fadeType];
      console.log(`🌐 Applying ${type} fade ${currentRegionValue}s to ALL regions + main`);
      onChange(currentRegionValue, true);
      
    } else {
      // 🔄 RESTORE: Restore backed up fade values
      const backup = fadeBackup[key];
      if (backup) {
        console.log(`🔄 Restoring ${type} fade values from backup:`, backup);
        
        // Restore main selection
        if (backup.main !== undefined) {
          const mainFadeIn = type === 'in' ? backup.main : fadeIn;
          const mainFadeOut = type === 'out' ? backup.main : fadeOut;
          console.log(`🎯 Restoring main ${type} fade to ${backup.main}s`);
          // Trigger main fade change
          onChange(type === 'in' ? mainFadeIn : mainFadeOut, false, 'restore-main', { fadeIn: mainFadeIn, fadeOut: mainFadeOut });
        }
        
        // Restore regions
        if (backup.regions && backup.regions.length > 0) {
          console.log(`🎯 Restoring ${backup.regions.length} region ${type} fade values`);
          // Trigger region restore
          onChange(0, false, 'restore-regions', { regions: backup.regions, fadeType });
        }
        
        // Clear backup
        setFadeBackup(prev => {
          const newBackup = { ...prev };
          delete newBackup[key];
          return newBackup;
        });
      }
    }
    
    // Update checkbox state
    setApplyToAllState(prev => ({
      ...prev,
      [key]: checked
    }));
  }, [activeRegionId, type, regions, fadeIn, fadeOut, getCurrentFadeValues, onChange, fadeBackup]);
  
  // 🔧 CRITICAL FIX: Auto-uncheck when switching regions
  useEffect(() => {
    if (!isVisible) return;
    
    // Clear applyToAll for other regions when switching
    const currentKey = `${activeRegionId || 'main'}-${type}`;
    setApplyToAllState(prev => {
      const newState = {};
      // Keep only current region's state, clear others
      newState[currentKey] = prev[currentKey] || false;
      
      console.log(`🔄 Region switched to ${activeRegionId || 'main'}, cleared other applyToAll states`);
      return newState;
    });
  }, [activeRegionId, type, isVisible]);
  
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

  const handleSliderChange = useCallback((e) => onChange(parseFloat(e.target.value), currentApplyToAll), [onChange, currentApplyToAll]);
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
        
        {/* 🆕 Global Apply Checkbox - Only show when regions exist */}
        {showGlobalOption && (
          <div className="flex items-center gap-2 py-2 border-t border-slate-200">
            <input
              type="checkbox"
              id={`apply-all-${type}`}
              checked={currentApplyToAll}
              onChange={(e) => setCurrentApplyToAll(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
            />
            <label 
              htmlFor={`apply-all-${type}`} 
              className={`text-slate-700 cursor-pointer select-none ${isMobile ? 'text-xs' : 'text-sm'}`}
            >
              Áp dụng cho tất cả ({regions.length + 1} items)
            </label>
          </div>
        )}
        
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
      </div>
    </div>,
    document.body
  );
};

export default FadeSliderPopup;
