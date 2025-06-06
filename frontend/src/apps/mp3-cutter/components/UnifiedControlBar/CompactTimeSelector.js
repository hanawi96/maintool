import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';

// 🎯 **COMPACT TIME INPUT** - Optimized for UnifiedControlBar
const CompactTimeInput = React.memo(({ value, onChange, label, max, isCompact = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef(null);

  // 🎯 FORMAT: Compact time display (MM:SS or MM:SS.mmm)
  const formattedTime = useMemo(() => {
    const stableValue = Math.round(value * 1000) / 1000;
    const minutes = Math.floor(stableValue / 60);
    const seconds = Math.floor(stableValue % 60);
    const milliseconds = Math.floor((stableValue % 1) * 1000);
    
    if (isCompact) {
      // Compact: MM:SS
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      // Full: MM:SS.mmm
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
  }, [value, isCompact]);

  // 🎯 EDIT MODE: Click to edit
  const handleClick = useCallback(() => {
    setIsEditing(true);
    setTempValue(formattedTime);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  }, [formattedTime]);

  // 🎯 COMMIT: Parse and validate input
  const commitEdit = useCallback(() => {
    if (tempValue && tempValue !== formattedTime) {
      // Parse MM:SS or MM:SS.mmm format
      const parts = tempValue.split(':');
      if (parts.length >= 2) {
        const minutes = parseInt(parts[0]) || 0;
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const milliseconds = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').slice(0, 3)) || 0 : 0;
        
        const newTime = minutes * 60 + seconds + milliseconds / 1000;
        const clampedTime = Math.max(0, Math.min(max, newTime));
        
        // 🔥 **ASYNC LOG**: Đưa ra khỏi commit để tránh setState conflict
        setTimeout(() => {
          console.log(`⏰ [CompactTimeInput] ${label} time changed:`, value.toFixed(3), '→', clampedTime.toFixed(3));
        }, 0);
        onChange(clampedTime);
      }
    }
    
    setIsEditing(false);
    setTempValue('');
  }, [tempValue, formattedTime, max, onChange, label, value]);

  // 🎯 KEYBOARD: Handle enter/escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue('');
    }
  }, [commitEdit]);

  return (
    <div className="flex items-center gap-1">
      <label className="text-xs font-medium text-slate-700 min-w-[24px] hidden sm:block">
        {label}
      </label>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          className="w-16 sm:w-20 text-center bg-indigo-50 border border-indigo-300 rounded px-1 py-0.5 text-sm font-mono outline-none focus:bg-indigo-100 focus:border-indigo-400 text-color-timeselector"
          placeholder={isCompact ? "MM:SS" : "MM:SS.mmm"}
        />
      ) : (
        <button
          onClick={handleClick}
          className="w-16 sm:w-20 text-center bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded px-1 py-0.5 text-sm font-mono text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-color-timeselector"
          title={`Click to edit ${label} time`}
        >
          {formattedTime}
        </button>
      )}
    </div>
  );
});

CompactTimeInput.displayName = 'CompactTimeInput';

// 🎯 **COMPACT TIME SELECTOR** - Optimized for single row layout
const CompactTimeSelector = React.memo(({ 
  startTime, 
  endTime, 
  duration,
  onStartTimeChange, 
  onEndTimeChange 
}) => {
  // 🔥 **FIX INFINITE LOG**: Refs để track render mà không gây setState
  const lastLogTimeRef = useRef(0);
  const renderCountRef = useRef(0);
  const setupCompleteRef = useRef(false);
  
  // 🔥 **SMART RENDER TRACKING**: Passive tracking không gây re-render
  const trackRender = useCallback(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    
    // 🔥 **INITIAL SETUP LOG**: Chỉ log setup lần đầu
    if (!setupCompleteRef.current && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      setTimeout(() => {
        console.log('⏰ [CompactTimeSelector] Initial setup complete:', {
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          duration: duration.toFixed(2),
          renderCount: renderCountRef.current
        });
      }, 0);
    }
    
    // 🔥 **PERIODIC STATUS**: Log trạng thái mỗi 180s để debug
    if (now - lastLogTimeRef.current > 180000) {
      lastLogTimeRef.current = now;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle  
      setTimeout(() => {
        console.log(`⏰ [CompactTimeSelector] Status check (180s interval):`, {
          renders: renderCountRef.current,
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          duration: duration.toFixed(2)
        });
      }, 0);
    }
  }, [startTime, endTime, duration]);

  // 🔥 **PASSIVE RENDER TRACKING**: Track render chỉ để debug, không gây re-render
  useEffect(() => {
    trackRender();
  });

  // 🎯 SELECTION DURATION: Memoized calculation
  const selectionDuration = useMemo(() => {
    const dur = endTime - startTime;
    return Math.round(dur * 100) / 100;
  }, [startTime, endTime]);

  // 🎯 RESPONSIVE: Different layouts for different screen sizes
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Start Time */}
      <CompactTimeInput
        value={startTime}
        onChange={onStartTimeChange}
        label="Start"
        max={endTime}
        isCompact={false}
      />
      
      {/* Arrow Separator - Hidden on very small screens */}
      <div className="text-slate-500 text-sm hidden sm:block">→</div>
      
      {/* End Time */}
      <CompactTimeInput
        value={endTime}
        onChange={onEndTimeChange}
        label="End"
        max={duration}
        isCompact={false}
      />
      
      {/* Selection Duration - Hidden on small screens */}
      <div className="hidden md:flex items-center gap-1 ml-2 pl-2 border-l border-slate-300">
        <span className="text-xs text-slate-700">Sel:</span>
        <div className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {(selectionDuration / 60).toFixed(1)}m
        </div>
      </div>
    </div>
  );
});

CompactTimeSelector.displayName = 'CompactTimeSelector';

export default CompactTimeSelector; 