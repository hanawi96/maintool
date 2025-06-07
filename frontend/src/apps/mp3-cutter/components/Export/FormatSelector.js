import React from 'react';
import { AUDIO_FORMATS } from '../../utils/constants';

const FormatPresets = ({ selectedFormat, onFormatChange }) => {
  console.log('🎵 [FormatPresets] Rendering with selectedFormat:', selectedFormat);
  
  return (
    <div className="mb-3">
      <div className="grid grid-cols-4 gap-1.5">
        {Object.values(AUDIO_FORMATS).map(format => {
          const isSelected = selectedFormat === format.value;
          
          return (
            <button
              key={format.value}
              onClick={() => {
                console.log('🎵 [FormatPresets] Format changed:', format.value);
                onFormatChange(format.value);
              }}
              onMouseEnter={() => {
                // 🔧 **DEBUG PERFORMANCE**: Log hover start để verify siêu mượt performance  
                console.log(`🚀 [FormatSelector] ULTRA-SMOOTH hover START: ${format.value}`);
              }}
              onMouseLeave={() => {
                // 🔧 **DEBUG PERFORMANCE**: Log hover end để verify smooth transitions
                console.log(`⚡ [FormatSelector] ULTRA-SMOOTH hover END: ${format.value}`);
              }}
              className={`
                px-2 py-1.5 rounded-md text-xs font-semibold text-center
                min-h-[40px] flex flex-col justify-center border-2
                transform transition-colors transition-border transition-transform
                duration-75 ease-out will-change-transform
                ${isSelected 
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-md scale-105' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-[1.02]'
                }
              `}
              title={`${format.label} - ${format.description}`}
              style={{
                // 🚀 **ULTRA-SMOOTH OPTIMIZATION**: Hardware acceleration + optimized transitions
                backfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                transition: 'background-color 50ms ease-out, border-color 50ms ease-out, color 50ms ease-out, transform 75ms ease-out'
              }}
            >
              <div className="font-bold">{format.label}</div>
              <div className={`text-[10px] leading-tight transition-colors duration-50 ease-out ${
                isSelected ? 'text-indigo-100' : 'text-slate-400'
              }`}>
                {format.description}
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
};

export default FormatPresets;