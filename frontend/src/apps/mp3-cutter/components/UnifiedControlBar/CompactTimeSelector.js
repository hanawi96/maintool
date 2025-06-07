import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';

// 🎯 **ARROW TIME INPUT** - Input with up/down arrows for 0.1s increments
const ArrowTimeInput = React.memo(({ value, onChange, label, max, min = 0, isStartTime = false, isEndTime = false, duration = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef(null);

  // 🎯 **NEW FORMAT**: MM.SS.CS (minutes.seconds.centiseconds - 2 chữ số cuối)
  const formattedTime = useMemo(() => {
    const stableValue = Math.round(value * 100) / 100; // Round to 0.01s precision cho centiseconds
    const minutes = Math.floor(stableValue / 60);
    const seconds = Math.floor(stableValue % 60);
    const centiseconds = Math.floor((stableValue % 1) * 100); // Extract centiseconds (0-99)
    
    // 🚀 **ALWAYS 2 DIGITS**: Đảm bảo luôn hiển thị 2 chữ số cho centiseconds
    return `${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }, [value]);

  // 🎯 **SMART DISABLE LOGIC**: Logic disable với INTEGER ARITHMETIC cho consistency
  const canIncrease = useMemo(() => {
    if (isEndTime && Math.abs(value - duration) < 0.01) {
      // End time đã ở cuối duration, không thể tăng thêm
      return false;
    }
    
    // 🔥 **INTEGER CHECK**: Sử dụng centiseconds để kiểm tra chính xác
    const currentCentiseconds = Math.round(value * 100);
    const maxCentiseconds = Math.round(max * 100);
    return currentCentiseconds + 10 <= maxCentiseconds; // Check if can add 10cs (0.1s)
  }, [value, max, isEndTime, duration]);

  const canDecrease = useMemo(() => {
    if (isStartTime && Math.abs(value - 0) < 0.01) {
      // Start time đã ở 0, không thể giảm thêm
      return false;
    }
    
    // 🔥 **INTEGER CHECK**: Sử dụng centiseconds để kiểm tra chính xác
    const currentCentiseconds = Math.round(value * 100);
    const minCentiseconds = Math.round(min * 100);
    return currentCentiseconds - 10 >= minCentiseconds; // Check if can subtract 10cs (0.1s)
  }, [value, min, isStartTime]);

  // 🎯 **ARROW HANDLERS**: Tăng/giảm 0.1s CHÍNH XÁC với integer arithmetic
  const handleArrowUp = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canIncrease) {
      console.log(`🚫 [ArrowTimeInput] ${label} UP blocked - at limit`);
      return;
    }
    
    // 🔥 **INTEGER ARITHMETIC**: Tránh floating point precision errors
    const currentCentiseconds = Math.round(value * 100); // Convert to centiseconds (integer)
    const newCentiseconds = currentCentiseconds + 10; // Add exactly 10 centiseconds (0.1s)
    const maxCentiseconds = Math.round(max * 100);
    
    // Clamp to max và convert back to seconds
    const clampedCentiseconds = Math.min(newCentiseconds, maxCentiseconds);
    const newValue = clampedCentiseconds / 100; // Convert back to seconds
    
    // 🔥 **ENHANCED DEBUG**: Show exact centiseconds calculation  
    console.log(`⬆️ [ArrowTimeInput] ${label} UP precision:`, {
      original: `${value.toFixed(2)}s (${currentCentiseconds}cs)`,
      step: '+10cs (+0.10s)',
      result: `${newValue.toFixed(2)}s (${clampedCentiseconds}cs)`,
      exact_diff: `+${(newValue - value).toFixed(2)}s`
    });
    
    onChange(newValue);
  }, [value, max, onChange, label, canIncrease]);

  const handleArrowDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canDecrease) {
      console.log(`🚫 [ArrowTimeInput] ${label} DOWN blocked - at limit`);
      return;
    }
    
    // 🔥 **INTEGER ARITHMETIC**: Tránh floating point precision errors
    const currentCentiseconds = Math.round(value * 100); // Convert to centiseconds (integer)
    const newCentiseconds = currentCentiseconds - 10; // Subtract exactly 10 centiseconds (0.1s)
    const minCentiseconds = Math.round(min * 100);
    
    // Clamp to min và convert back to seconds
    const clampedCentiseconds = Math.max(newCentiseconds, minCentiseconds);
    const newValue = clampedCentiseconds / 100; // Convert back to seconds
    
    // 🔥 **ENHANCED DEBUG**: Show exact centiseconds calculation
    console.log(`⬇️ [ArrowTimeInput] ${label} DOWN precision:`, {
      original: `${value.toFixed(2)}s (${currentCentiseconds}cs)`,
      step: '-10cs (-0.10s)',
      result: `${newValue.toFixed(2)}s (${clampedCentiseconds}cs)`,
      exact_diff: `${(newValue - value).toFixed(2)}s`
    });
    
    onChange(newValue);
  }, [value, min, onChange, label, canDecrease]);

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

  // 🎯 COMMIT: Validate and commit changes với INTEGER ARITHMETIC
  const handleCommit = useCallback(() => {
    let newValue = value; // Default to current value
    
    try {
      // Parse MM.SS.CS format (support cả : và . separator)
      const timeParts = tempValue.split(/[.:]/).filter(part => part.length > 0);
      
      if (timeParts.length >= 3) {
        const minutes = parseInt(timeParts[0]) || 0;
        const seconds = parseInt(timeParts[1]) || 0;
        const centiseconds = parseInt(timeParts[2]) || 0;
        
        // 🔥 **INTEGER CALCULATION**: Tính bằng centiseconds rồi chia 100
        const totalCentiseconds = minutes * 6000 + seconds * 100 + centiseconds;
        newValue = totalCentiseconds / 100; // Convert to seconds
        
        // Validate range với INTEGER ARITHMETIC
        const minCentiseconds = Math.round(min * 100);
        const maxCentiseconds = Math.round(max * 100);
        const clampedCentiseconds = Math.max(minCentiseconds, Math.min(totalCentiseconds, maxCentiseconds));
        newValue = clampedCentiseconds / 100;
        
      } else if (timeParts.length === 2) {
        // Support MM.SS format
        const minutes = parseInt(timeParts[0]) || 0;
        const seconds = parseInt(timeParts[1]) || 0;
        
        // 🔥 **INTEGER CALCULATION**: Tính bằng centiseconds  
        const totalCentiseconds = minutes * 6000 + seconds * 100;
        newValue = totalCentiseconds / 100;
        
        // Validate range với INTEGER ARITHMETIC
        const minCentiseconds = Math.round(min * 100);
        const maxCentiseconds = Math.round(max * 100);
        const clampedCentiseconds = Math.max(minCentiseconds, Math.min(totalCentiseconds, maxCentiseconds));
        newValue = clampedCentiseconds / 100;
      }
    } catch (error) {
      console.warn(`⚠️ [ArrowTimeInput] Parse error for ${label}:`, error);
      // Keep current value on error
      newValue = value;
    }
    
    // 🔥 **DEBUG LOG**: Log manual edits với centiseconds detail
    const oldCs = Math.round(value * 100);
    const newCs = Math.round(newValue * 100);
    console.log(`✏️ [ArrowTimeInput] ${label} manual edit precision:`, {
      input: tempValue,
      original: `${value.toFixed(2)}s (${oldCs}cs)`,
      result: `${newValue.toFixed(2)}s (${newCs}cs)`,
      exact_diff: `${(newValue - value).toFixed(2)}s`
    });
    
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
      default:
        // Let other keys pass through normally
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
          className="w-24 px-2 py-1.5 text-sm text-center border border-indigo-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
          placeholder="00.00.00"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {/* 🎯 **TIME DISPLAY BUTTON** - Tăng width để fit format mới */}
      <button
        onClick={handleClick}
        className="w-24 px-3 py-1.5 text-sm text-center border border-slate-300 rounded-l bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors font-mono compact-time-input text-color-timeselector"
        title={`Click to edit ${label} (Format: MM.SS.CS)`}
      >
        {formattedTime}
      </button>
      
      {/* 🎯 **SMART ARROW BUTTONS** - Disable thông minh dựa trên vị trí */}
      <div className="flex flex-col ml-1">
        {/* 🔺 **UP ARROW** - Disable khi ở giới hạn trên */}
        <button
          onClick={handleArrowUp}
          disabled={!canIncrease}
          className="px-2 py-1 hover:bg-indigo-50 my-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:bg-indigo-100 rounded-sm"
          title={canIncrease ? `Increase ${label} by 0.1s` : `Cannot increase ${label} further`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-600 mx-auto"></div>
        </button>
        
        {/* 🔻 **DOWN ARROW** - Disable khi ở giới hạn dưới */}
        <button
          onClick={handleArrowDown}
          disabled={!canDecrease}
          className="px-2 py-1 hover:bg-indigo-50 my-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:bg-indigo-100 rounded-sm"
          title={canDecrease ? `Decrease ${label} by 0.1s` : `Cannot decrease ${label} further`}
        >
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600 mx-auto"></div>
        </button>
      </div>
    </div>
  );
});

ArrowTimeInput.displayName = 'ArrowTimeInput';

// 🎯 **COMPACT TIME SELECTOR** - Updated với logic disable thông minh
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
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          duration: duration.toFixed(2),
          format: 'MM.SS.CS với ±0.1s steps',
          improvements: 'Smart disable logic, 2-digit centiseconds, 0.1s increments'
        });
      }, 0);
    }
  }, [duration, startTime, endTime]);

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {/* Start Time với Smart Disable Logic */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">Start:</label>
        <ArrowTimeInput
          value={startTime}
          onChange={onStartTimeChange}
          label="start time"
          max={Math.max(0, endTime - 0.1)} // Ensure start < end
          min={0}
          isStartTime={true}
          duration={duration}
        />
      </div>

      {/* End Time với Smart Disable Logic */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">End:</label>
        <ArrowTimeInput
          value={endTime}
          onChange={onEndTimeChange}
          label="end time"
          max={duration}
          min={Math.min(duration, startTime + 0.1)} // Ensure end > start
          isEndTime={true}
          duration={duration}
        />
      </div>
    </div>
  );
});

CompactTimeSelector.displayName = 'CompactTimeSelector';

export default CompactTimeSelector; 