import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';
import ToggleSwitch from './ToggleSwitch';

const getVolumeColor = (volume) => {
  const volumePercent = volume * 100;
  if (volumePercent <= 100) {
    return '#7c3aed';
  } else if (volumePercent <= 150) {
    const ratio = (volumePercent - 100) / 50;
    return interpolateColor('#7c3aed', '#f97316', ratio);
  } else {
    const ratio = Math.min((volumePercent - 150) / 50, 1);
    return interpolateColor('#f97316', '#ef4444', ratio);
  }
};
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
  buttonRef = null,
  regions = [],
  activeRegionId = null,
  getCurrentVolumeValues = null,
  volume = 1.0
}) => {
  const popupRef = useRef(null);
  const { position, responsive, ready } = usePopupPosition(isVisible, buttonRef, popupRef, 5);
  const { screenSize, maxWidth } = responsive;
  const isMobile = screenSize === 'mobile';
  const [applyToAllState, setApplyToAllState] = useState({});
  const [volumeBackup, setVolumeBackup] = useState({});
    // 🔧 CRITICAL FIX: Reset all "apply to all" states when activeRegionId changes
  useEffect(() => {
    console.log(`🔄 Volume region changed, resetting apply-to-all states:`, {
      newActiveRegion: activeRegionId || 'main'
    });
    setApplyToAllState({});
    setVolumeBackup({});
  }, [activeRegionId]);
  
  const currentApplyToAll = useMemo(() => {
    const key = `${activeRegionId || 'main'}-volume`;
    return applyToAllState[key] || false;
  }, [applyToAllState, activeRegionId]);
  
  const setCurrentApplyToAll = useCallback((checked) => {
    console.log(`🔧 Volume Toggle: ${activeRegionId || 'main'} -> ${checked}`);
    
    const key = `${activeRegionId || 'main'}-volume`;
    
    if (checked) {
      // Backup và apply to all
      const backup = {
        main: volume,
        regions: regions.map(region => ({
          id: region.id,
          value: region.volume !== undefined ? region.volume : 1.0
        }))
      };
      
      setVolumeBackup(prev => ({ ...prev, [key]: backup }));
      const currentValue = getCurrentVolumeValues().volume;
      onChange(currentValue, true);
      
    } else {
      // Restore từ backup
      const backup = volumeBackup[key];
      if (backup) {
        if (backup.main !== undefined) {
          onChange(backup.main, false, 'restore-main', { volume: backup.main });
        }
        if (backup.regions?.length > 0) {
          onChange(0, false, 'restore-regions', { regions: backup.regions });
        }
        setVolumeBackup(prev => {
          const newBackup = { ...prev };
          delete newBackup[key];
          return newBackup;
        });
      }
    }
    
    setApplyToAllState(prev => ({ ...prev, [key]: checked }));
  }, [activeRegionId, regions, volume, getCurrentVolumeValues, onChange, volumeBackup]);
  
  const currentValue = getCurrentVolumeValues ? getCurrentVolumeValues().volume : value;
  
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
  const handleReset = useCallback(() => onChange(1.0, currentApplyToAll), [onChange, currentApplyToAll]);
  const handlePresetClick = useCallback((presetValue) => onChange(presetValue, currentApplyToAll), [onChange, currentApplyToAll]);

  if (!isVisible) return null;
  const isMuted = currentValue === 0;
  const isBoost = currentValue > 1;
  const percent = (currentValue / 2) * 100;
  const displayPercent = currentValue * 100;
  const dynamicColor = getVolumeColor(currentValue);

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
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-600" />
          ) : (
            <Volume2 className="w-4 h-4" style={{ color: dynamicColor }} />
          )}
          <span className={`font-medium text-slate-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
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
          <span className={`font-mono font-semibold ${isBoost ? 'text-orange-700' : 'text-slate-700'} ${isMobile ? 'text-base' : 'text-lg'}`}>
            {Math.round(displayPercent)}%
          </span>
          <span className={`text-slate-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            0-200%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="2"
            step="0.02"
            value={currentValue}
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
          </button>
        </div>
        
        <div className={`grid gap-1.5 ${isMobile ? 'grid-cols-3' : 'grid-cols-5'}`}>
          {[
            { label: '25%', value: 0.25 },
            { label: '50%', value: 0.5 },
            { label: '100%', value: 1.0 },
            ...(isMobile ? [] : [
              { label: '150%', value: 1.5 },
              { label: '200%', value: 2.0 }
            ])
          ].map(({ label, value: presetValue }) => (
            <button
              key={label}
              onClick={() => handlePresetClick(presetValue)}
              className={`rounded-lg transition-colors ${
                presetValue > 1 
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                  : presetValue === 1
                  ? 'bg-green-100 hover:bg-green-200 text-green-700'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              } ${isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-2 py-1.5 text-xs'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {isMobile && (
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: '150%', value: 1.5 },
              { label: '200%', value: 2.0 }
            ].map(({ label, value: presetValue }) => (
              <button
                key={label}
                onClick={() => handlePresetClick(presetValue)}
                className="px-2 py-1.5 text-[10px] bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        
        {showGlobalOption && (
          <div className="pt-2 border-t border-slate-200">
            <ToggleSwitch
              id="apply-all-volume"
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

export default VolumeSliderPopup;
