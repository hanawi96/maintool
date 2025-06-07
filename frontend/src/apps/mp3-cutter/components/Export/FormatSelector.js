import React, { memo } from 'react';
import { AUDIO_FORMATS } from '../../utils/constants';

// 🚀 **MEMOIZED COMPONENT**: Prevent unnecessary re-renders
const FormatPresets = memo(({ selectedFormat, onFormatChange }) => {
  // 🔧 **DEBUG PERFORMANCE**: Log render để track performance
  console.log('🎵 [FormatPresets] RENDER:', selectedFormat, performance.now());
  
  return (
    <div className="mb-3">
      <div className="grid grid-cols-4 gap-1.5">
        {Object.values(AUDIO_FORMATS).map(format => {
          const isSelected = selectedFormat === format.value;
          
          return (
            <button
              key={format.value}
              onClick={() => {
                // 🔧 **DEBUG CLICK**: Track click response time
                const startTime = performance.now();
                console.log(`🚀 [FormatSelector] INSTANT CLICK START: ${format.value}`, startTime);
                onFormatChange(format.value);
                console.log(`⚡ [FormatSelector] CLICK PROCESSED: ${format.value}`, performance.now() - startTime, 'ms');
              }}
              onMouseEnter={() => {
                // 🔧 **DEBUG HOVER**: Track hover response time  
                console.log(`🚀 [FormatSelector] INSTANT HOVER: ${format.value}`, performance.now());
              }}
              className={`
                px-2 py-1.5 rounded-md text-xs font-semibold text-center
                min-h-[40px] flex flex-col justify-center border-2
                ${isSelected 
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
                }
              `}
              title={`${format.label} - ${format.description}`}
              style={{
                // 🚀 **MAXIMUM PERFORMANCE**: Optimized inline styles to override everything
                willChange: 'transform, background-color, border-color',
                transform: isSelected ? 'translateZ(0) scale(1.05)' : 'translateZ(0)',
                backfaceVisibility: 'hidden',
                contain: 'layout style paint',
                // 🔥 **INSTANT TRANSITIONS**: Ultra-fast for immediate response
                transition: 'background-color 15ms ease-out, border-color 15ms ease-out, color 15ms ease-out, transform 30ms ease-out',
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
                  // 🚀 **INSTANT TEXT TRANSITION**: Match button transition speed
                  transition: 'color 15ms ease-out',
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