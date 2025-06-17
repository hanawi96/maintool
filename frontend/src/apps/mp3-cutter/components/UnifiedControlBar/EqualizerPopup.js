import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';

const EqualizerPopup = ({
  onClose,
  isVisible = false,
  buttonRef = null,
  onEqualizerChange = null // 🎚️ Callback for realtime EQ updates
}) => {
  const popupRef = useRef(null);
  const { position, responsive, ready } = usePopupPosition(isVisible, buttonRef, popupRef, 5);

  const { screenSize, maxWidth } = responsive;
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const frequencies = ['60Hz', '170Hz', '310Hz', '600Hz', '1kHz', '3kHz', '6kHz', '12kHz', '14kHz', '16kHz'];
  const [eqValues, setEqValues] = useState(Array(10).fill(0));
  const [activePreset, setActivePreset] = useState(null); // 🎚️ Track active preset
  const presets = {
    'Rock': [4, 3, -2, -1, 1, 2, 4, 5, 5, 6],
    'Pop': [2, 4, 3, 1, -1, -1, 2, 3, 4, 4],
    'Jazz': [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
    'Classical': [4, 3, 2, 1, -1, -1, -1, 2, 3, 4],
    'Bass Boost': [6, 5, 4, 2, 0, -1, -1, -1, 0, 1],
    'Vocal': [-2, -1, 1, 3, 4, 4, 3, 2, 1, 0],
    'Electronic': [5, 4, 2, 0, -1, 2, 4, 5, 6, 6],    'Acoustic': [3, 3, 2, 1, 0, 1, 2, 3, 3, 2]
  };

  // 🎚️ Function to check if current values match a preset
  const checkActivePreset = useCallback((values) => {
    for (const [presetName, presetValues] of Object.entries(presets)) {
      if (values.length === presetValues.length && 
          values.every((val, idx) => Math.abs(val - presetValues[idx]) < 0.1)) {
        return presetName;
      }
    }
    return null;
  }, [presets]);

  // Update active preset when EQ values change
  useEffect(() => {
    const newActivePreset = checkActivePreset(eqValues);
    setActivePreset(newActivePreset);
  }, [eqValues, checkActivePreset]);

  // Click outside to close
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
  }, [isVisible, onClose, buttonRef]);  const handleSliderChange = (index, value) => {
    const newValues = [...eqValues];
    newValues[index] = parseFloat(value);
    setEqValues(newValues);
    
    // 🎚️ Real-time EQ update - instant parameter change
    if (onEqualizerChange) {
      onEqualizerChange('band', { index, value: parseFloat(value) });
    }
  };

  const handlePresetSelect = (presetName) => {
    const newValues = [...presets[presetName]];
    setEqValues(newValues);
    setActivePreset(presetName); // 🎚️ Set active preset immediately
    
    // 🎚️ Batch update all EQ bands for smooth preset change
    if (onEqualizerChange) {
      onEqualizerChange('preset', { name: presetName, values: newValues });
    }
  };

  const handleReset = () => {
    const resetValues = Array(10).fill(0);
    setEqValues(resetValues);
    setActivePreset(null); // 🎚️ Clear active preset
    
    // 🎚️ Reset all EQ bands to flat
    if (onEqualizerChange) {
      onEqualizerChange('reset');
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={`fixed bg-white/98 backdrop-blur-md border border-slate-300/60 rounded-2xl shadow-2xl pointer-events-auto ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-5'}`}
      style={{
        top: ready ? `${position.top}px` : undefined,
        left: ready ? `${position.left}px` : undefined,
        width: '100%',
        maxWidth: `${maxWidth}px`,
        zIndex: 9999999,
        display: ready ? undefined : 'none'
      }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-sm"></div>
          <span className={`font-medium text-slate-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Equalizer Control
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-700 rounded-lg transition-colors"
            title="Reset all to 0dB"
          >
            <RotateCcw className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
      {/* Equalizer Sliders */}
      <div className={`${isMobile ? 'mb-3' : 'mb-4'}`}>
        <div className={`flex items-end justify-between mb-3 ${isMobile ? 'gap-0.5 h-28' : isTablet ? 'gap-1 h-36' : 'gap-2 h-48'}`}>
          {frequencies.map((freq, index) => {
            const value = eqValues[index];
            const percent = ((value + 12) / 24) * 100;
            return (
              <div key={freq} className="flex flex-col items-center flex-1 h-full">
                {/* dB Value Display */}
                <div className={`font-mono text-slate-600 mb-1 min-h-[14px] ${isMobile ? 'text-[9px]' : isTablet ? 'text-[10px]' : 'text-xs'}`}>
                  {value > 0 ? '+' : ''}{value.toFixed(0)}
                </div>
                {/* Vertical Slider Container */}
                <div className={`relative flex-1 flex items-end ${isMobile ? 'w-3' : isTablet ? 'w-4' : 'w-6'}`}>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={value}
                    onChange={(e) => handleSliderChange(index, e.target.value)}
                    className={`vertical-slider ${isMobile ? 'w-16 h-3' : isTablet ? 'w-20 h-4' : 'w-32 h-6'}`}
                    style={{
                      background: `linear-gradient(to top, #06b6d4 0%, #06b6d4 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`,
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center',
                      position: 'absolute',
                      left: '50%',
                      bottom: '50%',
                      marginLeft: isMobile ? '-32px' : isTablet ? '-40px' : '-64px',
                      marginBottom: isMobile ? '-6px' : isTablet ? '-8px' : '-12px'
                    }}
                  />
                </div>
                {/* Frequency Label */}
                <div className={`text-slate-500 mt-1 font-medium ${isMobile ? 'text-[8px]' : isTablet ? 'text-[9px]' : 'text-xs'}`}>
                  {freq}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <span className={`text-slate-400 ${isMobile ? 'text-[9px]' : isTablet ? 'text-[10px]' : 'text-xs'}`}>
            -12dB to +12dB
          </span>
        </div>
      </div>
      {/* Preset Buttons */}
      <div className="space-y-2">
        <div className={`text-slate-500 font-medium mb-2 ${isMobile ? 'text-[9px]' : isTablet ? 'text-[10px]' : 'text-xs'}`}>
          Presets:
        </div>        <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {Object.keys(presets).map((presetName) => {
            const isActive = activePreset === presetName;
            return (
              <button
                key={presetName}
                onClick={() => handlePresetSelect(presetName)}
                className={`border rounded-lg transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-800 border-purple-300 hover:border-purple-400'
                    : 'bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 text-cyan-700 border-cyan-200 hover:border-cyan-300'
                } ${
                  isMobile ? 'px-2 py-1.5 text-[9px]' : isTablet ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'
                }`}
              >
                {presetName}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EqualizerPopup;
