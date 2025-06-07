import React from 'react';
import { AUDIO_FORMATS } from '../../utils/constants';

const FormatPresets = ({ selectedFormat, onFormatChange }) => {
  console.log('🎵 [FormatPresets] Rendering with selectedFormat:', selectedFormat);
  
  return (
    <div className="mb-3">
      <label className="block text-xs text-slate-600 mb-2 font-medium">Output Format</label>
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
              className={`
                px-2 py-1.5 rounded-md text-xs font-semibold text-center
                transition-all duration-200 ease-in-out
                border-2 min-h-[40px] flex flex-col justify-center
                ${isSelected 
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-md transform scale-105' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
                }
              `}
              title={`${format.label} - ${format.description}`}
            >
              <div className="font-bold">{format.label}</div>
              <div className={`text-[10px] leading-tight ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                {format.description}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* 🆕 **SELECTED FORMAT INFO**: Show selected format details */}
      {selectedFormat && (
        <div className="mt-2 text-xs text-slate-500 text-center">
          Selected: <span className="font-semibold text-indigo-600">
            {AUDIO_FORMATS[selectedFormat.toUpperCase()]?.label || selectedFormat.toUpperCase()}
          </span>
          {AUDIO_FORMATS[selectedFormat.toUpperCase()]?.description && (
            <span className="text-slate-400"> - {AUDIO_FORMATS[selectedFormat.toUpperCase()].description}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default FormatPresets;