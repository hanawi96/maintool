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

  // 🎯 COMMIT: Validate and commit changes
  const handleCommit = useCallback(() => {
    let newValue = 0;
    
    try {
      // Parse MM:SS.mmm or MM:SS format
      const timeParts = tempValue.split(':');
      if (timeParts.length >= 2) {
        const minutes = parseInt(timeParts[0]) || 0;
        const secondsParts = timeParts[1].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const milliseconds = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').slice(0, 3)) : 0;
        
        newValue = minutes * 60 + seconds + milliseconds / 1000;
        
        // Validate range
        newValue = Math.max(0, Math.min(newValue, max));
      }
    } catch (error) {
      // Keep current value on error
      newValue = value;
    }
    
    // 🔥 **ASYNC LOG**: Only log commits
    setTimeout(() => {
      console.log(`⏰ [CompactTimeInput] ${label} committed:`, `${value.toFixed(2)}s → ${newValue.toFixed(2)}s`);
    }, 0);
    
    onChange(newValue);
    setIsEditing(false);
  }, [tempValue, onChange, value, max, label]);

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
    }
  }, [handleCommit, handleCancel]);

  const handleBlur = useCallback(() => {
    handleCommit();
  }, [handleCommit]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-20 px-2 py-1 text-xs text-center border border-indigo-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
        placeholder="MM:SS.mmm"
      />
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-20 px-2 py-1 text-xs text-center border border-slate-300 rounded bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors font-mono compact-time-input text-color-timeselector"
      title={`Click to edit ${label}`}
    >
      {formattedTime}
    </button>
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
  // 🔥 **OPTIMIZED**: Removed all logging refs to prevent spam
  const setupCompleteRef = useRef(false);
  
  // 🔥 **SINGLE SETUP LOG**: Only log initial setup once, asynchronously
  useEffect(() => {
    if (!setupCompleteRef.current && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Move out of render cycle
      setTimeout(() => {
        console.log('⏰ [CompactTimeSelector] Initial setup complete:', {
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          duration: duration.toFixed(2)
        });
      }, 0);
    }
  }, [duration, startTime, endTime]);

  // 🎯 SELECTION DURATION: Memoized calculation
  const selectionDuration = useMemo(() => {
    const dur = endTime - startTime;
    return Math.round(dur * 100) / 100;
  }, [startTime, endTime]);

  // 🎯 DURATION FORMAT: Compact display
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
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {/* Start Time */}
      <div className="flex items-center gap-1">
        <label className="text-xs font-medium text-slate-600">Start:</label>
        <CompactTimeInput
          value={startTime}
          onChange={onStartTimeChange}
          label="start time"
          max={endTime - 0.1}
          isCompact={true}
        />
      </div>

      {/* Separator with duration */}
      <div className="text-xs text-purple-700 font-semibold px-2 py-1 bg-purple-50 rounded border">
        {formattedDuration}
      </div>

      {/* End Time */}
      <div className="flex items-center gap-1">
        <label className="text-xs font-medium text-slate-600">End:</label>
        <CompactTimeInput
          value={endTime}
          onChange={onEndTimeChange}
          label="end time"
          max={duration}
          isCompact={true}
        />
      </div>
    </div>
  );
});

CompactTimeSelector.displayName = 'CompactTimeSelector';

export default CompactTimeSelector; 