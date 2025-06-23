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

  // Handle commit - improved with switching detection
  const handleCommit = useCallback(() => {
    console.log(`💾 handleCommit triggered`, { 
      editingSegment, 
      tempValue,
      switchingSegment: switchingSegmentRef.current,
      timestamp: Date.now()
    });
    
    // 🔧 CRITICAL FIX: Don't commit if we're switching segments
    if (switchingSegmentRef.current) {
      console.log(`⏸️ handleCommit skipped - switching segments`);
      return;
    }
    
    if (!editingSegment) return;
    
    const validatedValue = validateSegment(editingSegment, tempValue);
    console.log(`✅ Committing ${editingSegment}: ${tempValue} -> ${validatedValue}`);
    
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
      onChange(clampedTime);
    }
    
    setEditingSegment(null);
    setTempValue('');
    console.log(`🔚 handleCommit completed, editingSegment reset to null`);
  }, [editingSegment, tempValue, validateSegment, minutes, seconds, centiseconds, min, max, normalizedValue, onChange]);

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

  // Arrow controls
  const canIncrease = !(
    (isEndTime && Math.abs(normalizedValue - duration) < 0.05) ||
    toDeci(normalizedValue) + 1 > toDeci(max)
  );
  const canDecrease = !(
    (isStartTime && Math.abs(normalizedValue) < 0.05) ||
    toDeci(normalizedValue) - 1 < toDeci(min)
  );

  const handleArrow = useCallback((inc) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currDeci = toDeci(normalizedValue);
    const newDeci = clampDeci(currDeci + inc, toDeci(min), toDeci(max));
    if (currDeci !== newDeci) {
      onChange(newDeci / 10);
    }
  }, [normalizedValue, min, max, onChange]);

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
          onClick={handleArrow(+1)}
          disabled={!canIncrease}
          className="px-1 py-1 disabled:opacity-25 disabled:cursor-not-allowed focus:outline-none rounded-sm"
          title={canIncrease ? `+0.1s` : `Max`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-600 mx-auto"></div>
        </button>
        <button
          onClick={handleArrow(-1)}
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
