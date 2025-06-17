import React, { useCallback, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sliders, X, RotateCcw } from 'lucide-react';
import usePopupPosition from './usePopupPosition';

const EqualizerSliderPopup = ({
  onClose,
  isVisible = false,
  buttonRef = null
}) => {
  const popupRef = useRef(null);
  const { position, isPositioned } = usePopupPosition(isVisible, buttonRef, popupRef, 350, 200);

  // Equalizer bands state (Hz frequencies and their gain values in dB)
  const [bands, setBands] = useState([
    { freq: '60Hz', value: 0, min: -12, max: 12 },
    { freq: '170Hz', value: 0, min: -12, max: 12 },
    { freq: '310Hz', value: 0, min: -12, max: 12 },
    { freq: '600Hz', value: 0, min: -12, max: 12 },
    { freq: '1kHz', value: 0, min: -12, max: 12 },
    { freq: '3kHz', value: 0, min: -12, max: 12 },
    { freq: '6kHz', value: 0, min: -12, max: 12 },
    { freq: '12kHz', value: 0, min: -12, max: 12 },
    { freq: '14kHz', value: 0, min: -12, max: 12 },
    { freq: '16kHz', value: 0, min: -12, max: 12 }
  ]);

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

  const handleBandChange = useCallback((index, newValue) => {
    setBands(prevBands => 
      prevBands.map((band, i) => 
        i === index ? { ...band, value: parseFloat(newValue) } : band
      )
    );
  }, []);

  const handleReset = useCallback(() => {
    setBands(prevBands => 
      prevBands.map(band => ({ ...band, value: 0 }))
    );
  }, []);
  const handlePreset = useCallback((presetName) => {
    let presetValues;
    switch (presetName) {
      case 'Rock':
        presetValues = [3, 2, 1, 0, -1, 1, 3, 4, 4, 4];
        break;
      case 'Pop':
        presetValues = [1, 2, 3, 2, 0, -1, -1, 1, 2, 2];
        break;
      case 'Jazz':
        presetValues = [2, 1, 0, 1, -1, -1, 0, 1, 2, 3];
        break;
      case 'Classical':
        presetValues = [3, 2, 1, 0, -1, -1, 0, 2, 3, 4];
        break;
      case 'Bass Boost':
        presetValues = [6, 4, 2, 1, 0, 0, 0, 0, 0, 0];
        break;
      case 'Vocal':
        presetValues = [-2, -1, 0, 1, 3, 3, 2, 1, 0, -1];
        break;
      case 'Electronic':
        presetValues = [2, 1, 0, -1, -2, 0, 1, 2, 3, 4];
        break;
      case 'Acoustic':
        presetValues = [1, 1, 0, 0, 1, 1, 2, 2, 2, 1];
        break;
      default:
        presetValues = bands.map(() => 0);
    }
    
    setBands(prevBands => 
      prevBands.map((band, i) => ({ ...band, value: presetValues[i] || 0 }))
    );
  }, [bands]);

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={popupRef}
      className="fixed bg-white/98 backdrop-blur-md border border-slate-300/60 rounded-2xl shadow-2xl p-4 pointer-events-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 9999999,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25),0 0 0 1px rgba(0,0,0,0.05)',
        transform: 'translateZ(0)',
        willChange: 'transform, opacity',
        opacity: isPositioned ? 1 : 0,
        visibility: isPositioned ? 'visible' : 'hidden'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-slate-800">
            Equalizer Control
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
      
      <div className="space-y-4">
        {/* Frequency bands */}
        <div className="grid grid-cols-5 gap-2">
          {bands.map((band, index) => (
            <div key={band.freq} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-slate-600 mb-1">
                {band.freq}
              </span>
              <div className="relative h-20 w-4">
                <input
                  type="range"
                  min={band.min}
                  max={band.max}
                  step="0.5"
                  value={band.value}
                  onChange={(e) => handleBandChange(index, e.target.value)}
                  className="h-20 w-4 bg-slate-200 rounded-full appearance-none cursor-pointer eq-slider"
                  style={{
                    writingMode: 'bt-lr',
                    WebkitAppearance: 'slider-vertical',
                    background: `linear-gradient(to top, #06b6d4 0%, #06b6d4 ${((band.value + 12) / 24) * 100}%, #e2e8f0 ${((band.value + 12) / 24) * 100}%, #e2e8f0 100%)`
                  }}
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                {band.value > 0 ? '+' : ''}{band.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-cyan-100 text-cyan-600 hover:text-cyan-700 rounded-lg transition-colors flex-shrink-0"
            title="Reset all bands to 0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <span className="text-xs text-slate-500">
            -12dB to +12dB
          </span>
        </div>        {/* Presets */}
        <div className="space-y-1.5">
          {/* First row */}
          <div className="grid grid-cols-4 gap-1.5">
            {['Rock', 'Pop', 'Jazz', 'Classical'].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePreset(preset)}
                className="px-2 py-1.5 text-[11px] bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg transition-colors font-medium"
              >
                {preset}
              </button>
            ))}
          </div>          {/* Second row */}
          <div className="grid grid-cols-4 gap-1.5">
            {['Bass Boost', 'Vocal', 'Electronic', 'Acoustic'].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePreset(preset)}
                className="px-2 py-1.5 text-[11px] bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg transition-colors font-medium"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EqualizerSliderPopup;
