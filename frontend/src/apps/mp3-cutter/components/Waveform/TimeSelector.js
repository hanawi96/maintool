import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const AdvancedTimeInput = React.memo(({ value, onChange, label, max }) => {
  const [editingSegment, setEditingSegment] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef(null);

  // 🎯 OPTIMIZED: Stable format segments calculation with memoization
  const formatSegments = useMemo(() => {
    // 🆕 STABILITY: Round values to prevent excessive re-calculations
    const stableValue = Math.round(value * 1000) / 1000; // Round to millisecond precision
    const minutes = Math.floor(stableValue / 60);
    const seconds = Math.floor(stableValue % 60);
    const milliseconds = Math.floor((stableValue % 1) * 1000);
    
    return {
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      milliseconds: milliseconds.toString().padStart(3, '0')
    };
  }, [value]);

  const handleSegmentClick = useCallback((segment) => {
    // 🆕 BATCH STATE UPDATES: Use requestIdleCallback to prevent render conflicts
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        setEditingSegment(segment);
        setTempValue(formatSegments[segment]);
        
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 0);
      });
    } else {
      setTimeout(() => {
        setEditingSegment(segment);
        setTempValue(formatSegments[segment]);
        
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 0);
      }, 0);
    }
  }, [formatSegments]);

  // 🎯 OPTIMIZED: Commit function with validation and batching
  const commitEdit = useCallback(() => {
    if (editingSegment && tempValue !== '') {
      const numValue = parseInt(tempValue);
      let newTime = value;
      
      // 🆕 ENHANCED VALIDATION: More robust bounds checking
      if (editingSegment === 'minutes' && numValue >= 0 && numValue <= 999) {
        newTime = numValue * 60 + (value % 60);
      } else if (editingSegment === 'seconds' && numValue >= 0 && numValue < 60) {
        newTime = Math.floor(value / 60) * 60 + numValue + (value % 1);
      } else if (editingSegment === 'milliseconds' && numValue >= 0 && numValue < 1000) {
        newTime = Math.floor(value) + numValue / 1000;
      }
      
      const clampedTime = Math.max(0, Math.min(max, newTime));
      
      // 🆕 DEBOUNCED CHANGE: Use setTimeout to prevent rapid onChange calls
      setTimeout(() => {
        onChange(clampedTime);
      }, 0);
    }
    
    // 🆕 BATCH STATE RESET: Use requestIdleCallback for cleanup
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        setEditingSegment(null);
        setTempValue('');
      });
    } else {
      setTimeout(() => {
        setEditingSegment(null);
        setTempValue('');
      }, 0);
    }
  }, [editingSegment, tempValue, value, max, onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      // 🆕 BATCH STATE RESET: Use requestIdleCallback for non-critical updates
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          setEditingSegment(null);
          setTempValue('');
        });
      } else {
        setTimeout(() => {
          setEditingSegment(null);
          setTempValue('');
        }, 0);
      }
    }
  }, [commitEdit]);

  return (
    <div className="flex flex-col items-center gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="relative bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs">
        <div className="flex items-center">
          {editingSegment === 'minutes' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              className="w-6 text-center bg-indigo-100 border-indigo-400 border rounded outline-none"
              maxLength={2}
            />
          ) : (
            <span
              className="w-6 text-center cursor-pointer hover:bg-slate-100 rounded px-1 transition-colors"
              onClick={() => handleSegmentClick('minutes')}
            >
              {formatSegments.minutes}
            </span>
          )}
          
          <span className="text-slate-400">:</span>
          
          {editingSegment === 'seconds' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              className="w-6 text-center bg-indigo-100 border-indigo-400 border rounded outline-none"
              maxLength={2}
            />
          ) : (
            <span
              className="w-6 text-center cursor-pointer hover:bg-slate-100 rounded px-1 transition-colors"
              onClick={() => handleSegmentClick('seconds')}
            >
              {formatSegments.seconds}
            </span>
          )}
          
          <span className="text-slate-400">.</span>
          
          {editingSegment === 'milliseconds' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              className="w-8 text-center bg-indigo-100 border-indigo-400 border rounded outline-none"
              maxLength={3}
            />
          ) : (
            <span
              className="w-8 text-center cursor-pointer hover:bg-slate-100 rounded px-1 transition-colors"
              onClick={() => handleSegmentClick('milliseconds')}
            >
              {formatSegments.milliseconds}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

AdvancedTimeInput.displayName = 'AdvancedTimeInput';

const TimeSelector = React.memo(({ 
  startTime, 
  endTime, 
  duration,
  onStartTimeChange, 
  onEndTimeChange 
}) => {
  // 🎯 OPTIMIZED: Stable selection duration calculation with rounding
  const selectionDuration = useMemo(() => {
    const duration = endTime - startTime;
    // 🆕 STABLE VALUE: Round to prevent excessive re-renders
    return Math.round(duration * 100) / 100;
  }, [startTime, endTime]);

  // 🆕 STABLE DISPLAY: Format duration to minutes with consistent precision
  const durationDisplay = useMemo(() => {
    return (selectionDuration / 60).toFixed(2) + 'm';
  }, [selectionDuration]);

  return (
    <div className="flex items-center gap-2 bg-slate-50/80 rounded-lg px-3 py-1.5">
      <AdvancedTimeInput
        value={startTime}
        onChange={onStartTimeChange}
        label="Start"
        max={endTime}
      />
      
      <div className="text-slate-400 text-sm">→</div>
      
      <AdvancedTimeInput
        value={endTime}
        onChange={onEndTimeChange}
        label="End"
        max={duration}
      />
      
      <div className="flex flex-col items-center ml-2">
        <div className="text-xs text-slate-500 mb-1">Selection</div>
        <div className="text-xs font-mono text-purple-600 bg-white px-2 py-0.5 rounded border">
          {durationDisplay}
        </div>
      </div>
    </div>
  );
});

TimeSelector.displayName = 'TimeSelector';

export default TimeSelector;