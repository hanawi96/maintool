import React, { memo } from 'react';
import { AUDIO_FORMATS } from '../../utils/constants';

// 🚀 **MEMOIZED COMPONENT**: Prevent unnecessary re-renders
const FormatPresets = memo(({ selectedFormat, onFormatChange }) => {
  return (
    <div className="mb-3">
      <div className="grid grid-cols-4 gap-1.5">
        {Object.values(AUDIO_FORMATS).map(format => {
          const isSelected = selectedFormat === format.value;
          
          return (
            <button
              key={format.value}
              onClick={() => onFormatChange(format.value)}
              className={`
                px-2 py-1.5 rounded-md text-xs font-semibold text-center
                min-h-[40px] flex flex-col justify-center border
                ${isSelected 
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
                }
              `}
              title={`${format.label} - ${format.description}`}
              style={{
                // 🚀 **MAXIMUM PERFORMANCE**: Optimized inline styles to override everything
                willChange: 'transform, background-color, border-color',
                transform: 'translateZ(0)', // 🔧 **NO SCALE**: Removed scale transform for both states
                backfaceVisibility: 'hidden',
                contain: 'layout style paint',
                // 🔥 **INSTANT TRANSITIONS**: Zero delay for immediate response
                transition: 'background-color 0ms, border-color 0ms, color 0ms',
                // 🆕 **ELIMINATE ALL DELAYS**: Zero delay for instant response
                transitionDelay: '0ms',
                animation: 'none'
              }}
            >
              <div className="font-bold">{format.label}</div>
              <div className={`text-[10px] leading-tight ${
                isSelected ? 'text-indigo-100' : 'text-slate-400'
              }`}
                style={{
                  // 🚀 **INSTANT TEXT TRANSITION**: Zero delay for immediate response
                  transition: 'color 0ms',
                  transitionDelay: '0ms'
                }}
              >
                {format.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

// 🔧 **DISPLAY NAME**: For React DevTools debugging
FormatPresets.displayName = 'FormatPresets';

export default FormatPresets;