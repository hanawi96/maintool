import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';

// 🎯 **ARROW TIME INPUT** - Input with up/down arrows for 0.1s increments
const ArrowTimeInput = React.memo(({ value, onChange, label, max, min = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef(null);

  // 🎯 **NEW FORMAT**: MM:SS.d (minutes:seconds.tenths)
  const formattedTime = useMemo(() => {
    const stableValue = Math.round(value * 10) / 10; // Round to 0.1s precision
    const minutes = Math.floor(stableValue / 60);
    const seconds = Math.floor(stableValue % 60);
    const tenths = Math.floor((stableValue % 1) * 10); // Extract tenths
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }, [value]);

  // 🎯 **ARROW HANDLERS**: Tăng/giảm 0.1s với validation
  const handleArrowUp = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newValue = Math.min(max, Math.round((value + 0.1) * 10) / 10);
    
    // 🔥 **DEBUG LOG**: Log arrow operations
    console.log(`⬆️ [ArrowTimeInput] ${label} UP: ${value.toFixed(1)}s → ${newValue.toFixed(1)}s`);
    
    onChange(newValue);
  }, [value, max, onChange, label]);

  const handleArrowDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newValue = Math.max(min, Math.round((value - 0.1) * 10) / 10);
    
    // 🔥 **DEBUG LOG**: Log arrow operations
    console.log(`⬇️ [ArrowTimeInput] ${label} DOWN: ${value.toFixed(1)}s → ${newValue.toFixed(1)}s`);
    
    onChange(newValue);
  }, [value, min, onChange, label]);

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

  // 🎯 COMMIT: Validate and commit changes
  const handleCommit = useCallback(() => {
    let newValue = value; // Default to current value
    
    try {
      // Parse MM:SS.d format
      const timeParts = tempValue.split(':');
      if (timeParts.length >= 2) {
        const minutes = parseInt(timeParts[0]) || 0;
        const secondsParts = timeParts[1].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const tenths = secondsParts[1] ? parseInt(secondsParts[1]) || 0 : 0;
        
        newValue = minutes * 60 + seconds + tenths / 10;
        
        // Validate range
        newValue = Math.max(min, Math.min(newValue, max));
        newValue = Math.round(newValue * 10) / 10; // Round to 0.1s precision
      }
    } catch (error) {
      console.warn(`⚠️ [ArrowTimeInput] Parse error for ${label}:`, error);
      // Keep current value on error
      newValue = value;
    }
    
    // 🔥 **DEBUG LOG**: Log manual edits
    console.log(`✏️ [ArrowTimeInput] ${label} manual edit:`, `${value.toFixed(1)}s → ${newValue.toFixed(1)}s`);
    
    onChange(newValue);
    setIsEditing(false);
  }, [tempValue, onChange, value, max, min, label]);

  // 🎯 CANCEL: Revert changes
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setTempValue('');
  }, []);

  // 🎯 KEYBOARD: Handle input events
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleCommit();
        break;
      case 'Escape':
        e.preventDefault();
        handleCancel();
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleArrowUp(e);
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleArrowDown(e);
        break;
    }
  }, [handleCommit, handleCancel, handleArrowUp, handleArrowDown]);

  const handleBlur = useCallback(() => {
    handleCommit();
  }, [handleCommit]);

  if (isEditing) {
    return (
      <div className="flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-20 px-2 py-1.5 text-sm text-center border border-indigo-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
          placeholder="00:00.0"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {/* 🎯 **TIME DISPLAY BUTTON** - Tăng kích thước từ w-16 → w-20 */}
      <button
        onClick={handleClick}
        className="w-20 px-3 py-1.5 text-sm text-center border border-slate-300 rounded-l bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors font-mono compact-time-input text-color-timeselector"
        title={`Click to edit ${label}`}
      >
        {formattedTime}
      </button>
      
      {/* 🎯 **CLEAN ARROW BUTTONS** - Bỏ background và border, chỉ giữ triangle */}
      <div className="flex flex-col ml-1">
        {/* 🔺 **UP ARROW** - Clean design, larger size */}
        <button
          onClick={handleArrowUp}
          disabled={value >= max}
          className="px-2 py-1 hover:bg-indigo-50 disabled:opacity-30 transition-colors focus:outline-none focus:bg-indigo-100 rounded-sm"
          title={`Increase ${label} by 0.1s`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-600 mx-auto"></div>
        </button>
        
        {/* 🔻 **DOWN ARROW** - Clean design, larger size */}
        <button
          onClick={handleArrowDown}
          disabled={value <= min}
          className="px-2 py-1 hover:bg-indigo-50 disabled:opacity-30 transition-colors focus:outline-none focus:bg-indigo-100 rounded-sm"
          title={`Decrease ${label} by 0.1s`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600 mx-auto"></div>
        </button>
      </div>
    </div>
  );
});

ArrowTimeInput.displayName = 'ArrowTimeInput';

// 🎯 **COMPACT TIME SELECTOR** - Updated to use larger ArrowTimeInput
const CompactTimeSelector = React.memo(({ 
  startTime, 
  endTime, 
  duration,
  onStartTimeChange, 
  onEndTimeChange 
}) => {
  // 🔥 **OPTIMIZED**: Removed all logging refs to prevent spam
  const setupCompleteRef = useRef(false);
  
  // 🔥 **SINGLE SETUP LOG**: Only log initial setup once, asynchronously
  useEffect(() => {
    if (!setupCompleteRef.current && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Move out of render cycle
      setTimeout(() => {
        console.log('⏰ [CompactTimeSelector] Enhanced ArrowTimeInput setup complete:', {
          timeRange: `${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`,
          duration: duration.toFixed(1),
          format: 'MM:SS.d with larger clean arrows',
          improvements: 'Larger input (w-20), clean arrows, better touch targets'
        });
      }, 0);
    }
  }, [duration, startTime, endTime]);

  // 🎯 SELECTION DURATION: Memoized calculation với 0.1s precision
  const selectionDuration = useMemo(() => {
    const dur = endTime - startTime;
    return Math.round(dur * 10) / 10; // 0.1s precision
  }, [startTime, endTime]);

  // 🎯 **UPDATED DURATION FORMAT**: Consistent with new format, slightly larger text
  const formattedDuration = useMemo(() => {
    if (selectionDuration < 60) {
      return `${selectionDuration.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(selectionDuration / 60);
      const seconds = selectionDuration % 60;
      return `${minutes}m ${seconds.toFixed(1)}s`;
    }
  }, [selectionDuration]);

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {/* Start Time với Enhanced Arrow Controls */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">Start:</label>
        <ArrowTimeInput
          value={startTime}
          onChange={onStartTimeChange}
          label="start time"
          max={Math.max(0, endTime - 0.1)} // Ensure start < end
          min={0}
        />
      </div>

      {/* Separator with duration - Slightly larger */}
      <div className="text-sm text-purple-700 font-semibold px-2 py-1 bg-purple-50 rounded border">
        {formattedDuration}
      </div>

      {/* End Time với Enhanced Arrow Controls */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">End:</label>
        <ArrowTimeInput
          value={endTime}
          onChange={onEndTimeChange}
          label="end time"
          max={duration}
          min={Math.min(duration, startTime + 0.1)} // Ensure end > start
        />
      </div>
    </div>
  );
});

CompactTimeSelector.displayName = 'CompactTimeSelector';

export default CompactTimeSelector; 