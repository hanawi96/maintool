import React, { useState, useRef, useCallback } from 'react';

// Helper: làm tròn về bội số 0.1s
function roundToDecisecond(val) {
  return Math.round(val * 10) / 10;
}

// Helper: seconds -> decisecond (int)
function toDeci(val) {
  return Math.round(val * 10);
}

// Helper: clamp deci trong range
function clampDeci(val, min, max) {
  return Math.max(min, Math.min(val, max));
}

// Helper: parse time parts
function parseTimeParts(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const centiseconds = Math.round((timeInSeconds % 1) * 10);
  return { minutes, seconds, centiseconds };
}

// Helper: construct time from parts
function constructTime(minutes, seconds, centiseconds) {
  return minutes * 60 + seconds + centiseconds / 10;
}

// Segment Time Input Component
const SegmentTimeInput = React.memo(({
  value,
  onChange,
  label,
  max,
  min = 0,
  isStartTime = false,
  isEndTime = false,
  duration = 0,
}) => {
  const [editingSegment, setEditingSegment] = useState(null); // 'mm', 'ss', 'cs', or null
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef(null);
  const switchingSegmentRef = useRef(false); // Track segment switching to prevent blur commit
  
  // 🆕 Hold-to-repeat state
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const initialValueRef = useRef(null); // Store initial value for history
  const holdingRef = useRef(false); // Track holding state for onChange
  const currentValueRef = useRef(value); // 🔧 Track current value for hold operations

  const normalizedValue = roundToDecisecond(value);
  const { minutes, seconds, centiseconds } = parseTimeParts(normalizedValue);
  
  // Format with zero padding
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');
  const formattedCentiseconds = centiseconds.toString().padStart(1, '0');

  // Validation helpers
  const validateSegment = useCallback((segment, inputValue) => {
    const val = parseInt(inputValue) || 0;
    switch (segment) {
      case 'mm':
        return Math.max(0, Math.min(99, val)); // 0-99 minutes
      case 'ss':
        return Math.max(0, Math.min(59, val)); // 0-59 seconds
      case 'cs':
        return Math.max(0, Math.min(9, val)); // 0-9 centiseconds
      default:
        return 0;
    }
  }, []);

  // 🆕 Smart onChange wrapper
  const smartOnChange = useCallback((newValue, options = {}) => {
    const { isHoldOperation = false, saveHistory = true } = options;
    
    console.log(`🔧 CompactTimeSelector.smartOnChange called:`, {
      label,
      value: newValue.toFixed(3),
      isHoldOperation,
      saveHistory,
      holdingRefCurrent: holdingRef.current,
      timestamp: Date.now()
    });
    
    if (isHoldOperation) {
      // During hold: just update value, don't save history
      console.log(`🔄 CompactTimeSelector.smartOnChange: Hold operation, value=${newValue.toFixed(3)}, NO HISTORY`);
      onChange(newValue);
    } else if (saveHistory) {
      // Normal operation: save history
      console.log(`💾 CompactTimeSelector.smartOnChange: Normal operation with history, value=${newValue.toFixed(3)}`);
      onChange(newValue);
    } else {
      // Final hold onChange: trigger history save
      console.log(`✅ CompactTimeSelector.smartOnChange: Final hold onChange for history, value=${newValue.toFixed(3)}`);
      onChange(newValue);
    }
  }, [onChange, label]);

  // Handle commit - improved with switching detection
  const handleCommit = useCallback(() => {
    console.log(`💾 CompactTimeSelector.handleCommit triggered`, { 
      editingSegment, 
      tempValue,
      switchingSegment: switchingSegmentRef.current,
      label,
      timestamp: Date.now()
    });
    
    // 🔧 CRITICAL FIX: Don't commit if we're switching segments
    if (switchingSegmentRef.current) {
      console.log(`⏸️ CompactTimeSelector.handleCommit skipped - switching segments`);
      return;
    }
    
    if (!editingSegment) return;
    
    const validatedValue = validateSegment(editingSegment, tempValue);
    console.log(`✅ CompactTimeSelector.Committing ${editingSegment}: ${tempValue} -> ${validatedValue}`);
    
    // Construct new time
    let newMinutes = minutes;
    let newSeconds = seconds;
    let newCentiseconds = centiseconds;
    
    switch (editingSegment) {
      case 'mm':
        newMinutes = validatedValue;
        break;
      case 'ss':
        newSeconds = validatedValue;
        break;
      case 'cs':
        newCentiseconds = validatedValue;
        break;
      default:
        break;
    }
    
    const newTime = constructTime(newMinutes, newSeconds, newCentiseconds);
    
    // Apply min/max constraints
    const clampedTime = Math.max(min, Math.min(max, newTime));
    
    if (Math.abs(clampedTime - normalizedValue) > 0.01) {
      console.log(`🚀 CompactTimeSelector.onChange calling with:`, {
        label,
        oldValue: normalizedValue.toFixed(3),
        newValue: clampedTime.toFixed(3),
        onChange: !!onChange
      });
      onChange(clampedTime);
    } else {
      console.log(`🔍 CompactTimeSelector.onChange skipped - no significant change`, {
        label,
        oldValue: normalizedValue.toFixed(3),
        newValue: clampedTime.toFixed(3),
        diff: Math.abs(clampedTime - normalizedValue)
      });
    }
    
    setEditingSegment(null);
    setTempValue('');
    console.log(`🔚 CompactTimeSelector.handleCommit completed, editingSegment reset to null`);
  }, [editingSegment, tempValue, validateSegment, minutes, seconds, centiseconds, min, max, normalizedValue, onChange, label]);

  // Handle segment click - optimized for seamless switching
  const handleSegmentClick = useCallback((segment) => {
    console.log(`🎯 handleSegmentClick: ${segment}`, {
      currentEditingSegment: editingSegment,
      timestamp: Date.now()
    });
    
    // If clicking the same segment that's already editing, do nothing
    if (editingSegment === segment) {
      console.log(`🔄 Same segment clicked, refocusing: ${segment}`);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return;
    }
    
    // 🔧 CRITICAL FIX: Set switching flag to prevent blur interference
    switchingSegmentRef.current = true;
    
    // If switching from another segment, commit current value first
    if (editingSegment && editingSegment !== segment) {
      console.log(`🔄 Switching from ${editingSegment} to ${segment} - committing first`);
      
      // Manually commit the current segment
      const validatedValue = validateSegment(editingSegment, tempValue);
      let newMinutes = minutes;
      let newSeconds = seconds; 
      let newCentiseconds = centiseconds;
      
      switch (editingSegment) {
        case 'mm':
          newMinutes = validatedValue;
          break;
        case 'ss':
          newSeconds = validatedValue;
          break;
        case 'cs':
          newCentiseconds = validatedValue;
          break;
        default:
          break;
      }
      
      const newTime = constructTime(newMinutes, newSeconds, newCentiseconds);
      const clampedTime = Math.max(min, Math.min(max, newTime));
      
      if (Math.abs(clampedTime - normalizedValue) > 0.01) {
        onChange(clampedTime);
      }
    }
    
    // Set new editing segment
    setEditingSegment(segment);
    
    // Set initial temp value based on segment - using the latest formatted values
    switch (segment) {
      case 'mm':
        setTempValue(formattedMinutes);
        break;
      case 'ss':
        setTempValue(formattedSeconds);
        break;
      case 'cs':
        setTempValue(formattedCentiseconds);
        break;
      default:
        break;
    }
    
    // Focus and select after state update
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      console.log(`✅ Focus completed for segment: ${segment}`);
      switchingSegmentRef.current = false; // Clear switching flag after focus
    }, 0);
    
  }, [editingSegment, tempValue, validateSegment, formattedMinutes, formattedSeconds, formattedCentiseconds, minutes, seconds, centiseconds, min, max, normalizedValue, onChange]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    console.log(`❌ handleCancel triggered`, { editingSegment });
    setEditingSegment(null);
    setTempValue('');
    switchingSegmentRef.current = false;
  }, [editingSegment]);

  // Handle key events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCommit();
      
      // Move to next segment
      const segments = ['mm', 'ss', 'cs'];
      const currentIndex = segments.indexOf(editingSegment);
      const nextIndex = (currentIndex + 1) % segments.length;
      setTimeout(() => handleSegmentClick(segments[nextIndex]), 0);
    }
  }, [editingSegment, handleCommit, handleCancel, handleSegmentClick]);

  // Improved blur handler
  const handleBlur = useCallback(() => {
    console.log(`🔍 handleBlur triggered`, { 
      editingSegment, 
      switchingSegment: switchingSegmentRef.current 
    });
    
    // Only commit if we're not switching segments
    if (!switchingSegmentRef.current) {
      handleCommit();
    }
  }, [handleCommit, editingSegment]);

  // Arrow controls with hold-to-repeat
  const canIncrease = !(
    (isEndTime && Math.abs(normalizedValue - duration) < 0.05) ||
    toDeci(normalizedValue) + 1 > toDeci(max)
  );
  const canDecrease = !(
    (isStartTime && Math.abs(normalizedValue) < 0.05) ||
    toDeci(normalizedValue) - 1 < toDeci(min)
  );

  // 🆕 Single arrow change function
  const performArrowChange = useCallback((inc) => {
    // 🔧 Use current value ref to avoid stale values during hold
    const currentValue = roundToDecisecond(currentValueRef.current);
    const currDeci = toDeci(currentValue);
    const newDeci = clampDeci(currDeci + inc, toDeci(min), toDeci(max));
    if (currDeci !== newDeci) {
      const newValue = newDeci / 10;
      console.log(`🏹 CompactTimeSelector.performArrowChange:`, {
        label,
        increment: inc,
        currentRefValue: currentValue.toFixed(3),
        oldValue: currentValue.toFixed(3),
        newValue: newValue.toFixed(3),
        isHolding: holdingRef.current
      });
      
      // Update ref immediately for next calculation
      currentValueRef.current = newValue;
      
      // Use smart onChange with hold detection
      smartOnChange(newValue, { 
        isHoldOperation: holdingRef.current,
        saveHistory: !holdingRef.current 
      });
      return true; // Change occurred
    }
    return false; // No change
  }, [min, max, smartOnChange, label]);

  // 🆕 Cleanup timers function
  const cleanupTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  // 🆕 Start hold-to-repeat
  const handleArrowMouseDown = useCallback((inc) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Store initial value for history comparison
    initialValueRef.current = currentValueRef.current;
    setIsHolding(true);
    holdingRef.current = true; // Sync ref with state
    
    // 🔧 Set global flag for useTimeChangeHandlers
    window._isCompactTimeSelectorHolding = true;
    
    console.log(`🔽 CompactTimeSelector.holdStart:`, {
      label,
      increment: inc,
      initialValue: currentValueRef.current.toFixed(3),
      globalFlag: window._isCompactTimeSelectorHolding
    });
    
    // First immediate change
    const hasChange = performArrowChange(inc);
    if (!hasChange) {
      cleanupTimers();
      setIsHolding(false);
      holdingRef.current = false;
      window._isCompactTimeSelectorHolding = false;
      return;
    }
    
    // Start repeat after delay
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        const success = performArrowChange(inc);
        if (!success) {
          // Stop if we hit boundaries
          cleanupTimers();
          setIsHolding(false);
          holdingRef.current = false;
          window._isCompactTimeSelectorHolding = false;
        }
      }, 100); // 🔧 Reduced speed: 100ms interval for better control
    }, 400); // 🔧 Increased initial delay: 400ms
  }, [performArrowChange, label, cleanupTimers]);

  // 🆕 Stop hold-to-repeat and save history
  const handleArrowMouseUp = useCallback(() => {
    if (!isHolding) return;
    
    // 🔧 Clear global flag
    window._isCompactTimeSelectorHolding = false;
    
    console.log(`🔼 CompactTimeSelector.holdEnd:`, {
      label,
      initialValue: initialValueRef.current?.toFixed(3),
      finalValue: currentValueRef.current.toFixed(3),
      hasChanged: Math.abs((initialValueRef.current || 0) - currentValueRef.current) > 0.01,
      globalFlag: window._isCompactTimeSelectorHolding
    });
    
    // Clear timers and reset state
    cleanupTimers();
    setIsHolding(false);
    holdingRef.current = false;
    
    // Trigger final onChange for history save if value changed significantly
    if (initialValueRef.current !== null && Math.abs(initialValueRef.current - currentValueRef.current) > 0.01) {
      console.log(`💾 CompactTimeSelector.saveHistoryAfterHold:`, {
        label,
        oldValue: initialValueRef.current.toFixed(3),
        newValue: currentValueRef.current.toFixed(3)
      });
      // Final onChange to ensure history is saved
      smartOnChange(currentValueRef.current, { 
        isHoldOperation: false,
        saveHistory: true 
      });
    }
    
    initialValueRef.current = null;
  }, [isHolding, smartOnChange, label, cleanupTimers]);

  // 🆕 Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupTimers();
    };
  }, [cleanupTimers]);

  // 🆕 Global mouse up listener when holding
  React.useEffect(() => {
    if (!isHolding) return;
    
    const handleGlobalMouseUp = () => {
      handleArrowMouseUp();
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isHolding, handleArrowMouseUp]);

  // 🔧 Update current value ref when prop changes
  React.useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  return (
    <div className="flex items-center">
      <div className="flex items-center font-mono text-xs" style={{ gap: '0px' }}>
        {editingSegment ? (
          <div className="flex items-center" style={{ gap: '0px' }}>
            {/* Show non-editing segments with onMouseDown for instant response */}
            {editingSegment !== 'mm' && (
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSegmentClick('mm');
                }}
                className="cursor-pointer hover:bg-blue-100 rounded"
                style={{ color: '#475569', padding: '1px 2px', margin: '0' }}
              >
                {formattedMinutes}
              </span>
            )}
            
            {/* Show editing input */}
            {editingSegment === 'mm' && (
              <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-6 text-xs text-center text-slate-800 font-mono"
                style={{ 
                  padding: '1px 2px', 
                  margin: '0', 
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                maxLength={2}
              />
            )}
            
            <span className="text-slate-400" style={{ margin: '0', padding: '0' }}>.</span>
            
            {editingSegment !== 'ss' && (
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSegmentClick('ss');
                }}
                className="cursor-pointer hover:bg-blue-100 rounded"
                style={{ color: '#475569', padding: '1px 2px', margin: '0' }}
              >
                {formattedSeconds}
              </span>
            )}
            
            {editingSegment === 'ss' && (
              <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-6 text-xs text-center text-slate-800 font-mono"
                style={{ 
                  padding: '1px 2px', 
                  margin: '0', 
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                maxLength={2}
              />
            )}
            
            <span className="text-slate-400" style={{ margin: '0', padding: '0' }}>.</span>
            
            {editingSegment !== 'cs' && (
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSegmentClick('cs');
                }}
                className="cursor-pointer hover:bg-blue-100 rounded"
                style={{ color: '#475569', padding: '1px 2px', margin: '0' }}
              >
                {formattedCentiseconds}
              </span>
            )}
            
            {editingSegment === 'cs' && (
              <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-4 text-xs text-center text-slate-800 font-mono"
                style={{ 
                  padding: '1px 2px', 
                  margin: '0', 
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  boxShadow: 'none'
                }}
                maxLength={1}
              />
            )}
          </div>
        ) : (
          // Display mode - clickable segments with onMouseDown
          <button
            className="flex items-center hover:bg-slate-100 rounded transition-colors"
            style={{ backgroundColor: 'transparent', border: 'none', padding: '0', gap: '0px' }}
            title={`${label}: Click on specific part to edit`}
          >
            <span
              onMouseDown={(e) => {
                e.preventDefault();
                handleSegmentClick('mm');
              }}
              className="cursor-pointer hover:bg-blue-100 rounded transition-colors"
              style={{ color: '#475569', padding: '1px 2px', margin: '0' }}
              title="Click to edit minutes"
            >
              {formattedMinutes}
            </span>
            <span className="text-slate-400" style={{ margin: '0', padding: '0' }}>.</span>
            <span
              onMouseDown={(e) => {
                e.preventDefault();
                handleSegmentClick('ss');
              }}
              className="cursor-pointer hover:bg-blue-100 rounded transition-colors"
              style={{ color: '#475569', padding: '1px 2px', margin: '0' }}
              title="Click to edit seconds"
            >
              {formattedSeconds}
            </span>
            <span className="text-slate-400" style={{ margin: '0', padding: '0' }}>.</span>
            <span
              onMouseDown={(e) => {
                e.preventDefault();
                handleSegmentClick('cs');
              }}
              className="cursor-pointer hover:bg-blue-100 rounded transition-colors"
              style={{ color: '#475569', padding: '1px 2px', margin: '0' }}
              title="Click to edit centiseconds"
            >
              {formattedCentiseconds}
            </span>
          </button>
        )}
      </div>
      
      {/* Arrow controls */}
      <div className="flex flex-col arrow-controls" style={{ marginLeft: '1px', gap: '5px' }}>
        <button
          onMouseDown={handleArrowMouseDown(+1)}
          onMouseUp={handleArrowMouseUp}
          disabled={!canIncrease}
          className="px-1 py-1 disabled:opacity-25 disabled:cursor-not-allowed focus:outline-none rounded-sm"
          title={canIncrease ? `+0.1s` : `Max`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-600 mx-auto"></div>
        </button>
        <button
          onMouseDown={handleArrowMouseDown(-1)}
          onMouseUp={handleArrowMouseUp}
          disabled={!canDecrease}
          className="px-1 py-1 disabled:opacity-25 disabled:cursor-not-allowed focus:outline-none rounded-sm"
          title={canDecrease ? `-0.1s` : `Min`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600 mx-auto"></div>
        </button>
      </div>
    </div>
  );
});

SegmentTimeInput.displayName = 'SegmentTimeInput';

const CompactTimeSelector = React.memo(
  ({ startTime, endTime, duration, onStartTimeChange, onEndTimeChange }) => (
    <div 
      className="time-selector-container flex items-center justify-center rounded-lg p-1" 
      style={{ 
        border: '1px solid #cbd5e1',
        backgroundColor: 'transparent',
        gap: '4px'
      }}
    >
      <SegmentTimeInput
        value={startTime}
        onChange={onStartTimeChange}
        label="Start"
        max={Math.max(0, endTime - 0.1)}
        min={0}
        isStartTime={true}
        duration={duration}
      />
      <span className="text-slate-400 text-xs font-mono">→</span>
      <SegmentTimeInput
        value={endTime}
        onChange={onEndTimeChange}
        label="End"
        max={duration}
        min={Math.min(duration, startTime + 0.1)}
        isEndTime={true}
        duration={duration}
      />
    </div>
  )
);

CompactTimeSelector.displayName = 'CompactTimeSelector';

export default CompactTimeSelector;
