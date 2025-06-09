import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { formatTimeUnified } from '../../utils/timeFormatter';

// 🎯 **ARROW TIME INPUT** - Input with up/down arrows for 0.1s increments
const ArrowTimeInput = React.memo(({ value, onChange, label, max, min = 0, isStartTime = false, isEndTime = false, duration = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef(null);

  // 🔥 **CHUẨN HÓA GIÁ TRỊ**: Normalize value để loại bỏ floating point errors ngay từ đầu
  const normalizedValue = useMemo(() => {
    // 🎯 **ROUND TO DECISECOND**: Làm tròn về bội số của 0.1s (decisecond)
    // Đảm bảo value luôn là multiple của 0.1s để tránh precision errors
    return Math.round(value * 10) / 10;
  }, [value]);

  // 🎯 **UNIFIED TIME FORMATTING**: Sử dụng formatTimeUnified để perfect consistency với tooltip
  const formattedTime = useMemo(() => {
    return formatTimeUnified(normalizedValue);
  }, [normalizedValue]);

  // 🎯 **SMART DISABLE LOGIC**: Logic disable với DECISECOND ARITHMETIC cho consistency
  const canIncrease = useMemo(() => {
    if (isEndTime && Math.abs(normalizedValue - duration) < 0.05) {
      // End time đã gần cuối duration, không thể tăng thêm
      return false;
    }
    
    // 🔥 **DECISECOND CHECK**: Sử dụng deciseconds để kiểm tra chính xác (0.1s steps)
    const currentDeciseconds = Math.round(normalizedValue * 10);
    const maxDeciseconds = Math.round(max * 10);
    return currentDeciseconds + 1 <= maxDeciseconds; // Check if can add 1 decisecond (0.1s)
  }, [normalizedValue, max, isEndTime, duration]);

  const canDecrease = useMemo(() => {
    if (isStartTime && Math.abs(normalizedValue - 0) < 0.05) {
      // Start time đã ở 0, không thể giảm thêm
      return false;
    }
    
    // 🔥 **DECISECOND CHECK**: Sử dụng deciseconds để kiểm tra chính xác (0.1s steps)
    const currentDeciseconds = Math.round(normalizedValue * 10);
    const minDeciseconds = Math.round(min * 10);
    return currentDeciseconds - 1 >= minDeciseconds; // Check if can subtract 1 decisecond (0.1s)
  }, [normalizedValue, min, isStartTime]);

  // 🎯 **ARROW HANDLERS**: Tăng/giảm CHÍNH XÁC 0.1s với decisecond arithmetic
  const handleArrowUp = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canIncrease) {
      return; // 🚀 **SILENT WHEN BLOCKED**: Không log để reduce noise
    }
    
    // 🔥 **DECISECOND ARITHMETIC**: Hoàn toàn chính xác với integer arithmetic
    const currentDeciseconds = Math.round(normalizedValue * 10); // Convert to deciseconds (integer)
    const newDeciseconds = currentDeciseconds + 1; // Add exactly 1 decisecond (0.1s)
    const maxDeciseconds = Math.round(max * 10);
    
    // Clamp to max và convert back to seconds với precision cao
    const clampedDeciseconds = Math.min(newDeciseconds, maxDeciseconds);
    const newValue = clampedDeciseconds / 10; // Convert back to seconds (exact 0.1s multiple)
    
    // 🚀 **OPTIMIZED DEBUG**: Chỉ log essential info khi cần debug
    if (Math.random() < 0.1) { // 10% sampling để giảm noise
      console.log(`⬆️ [ArrowTimeInput] ${label} UP: ${normalizedValue.toFixed(1)}s → ${newValue.toFixed(1)}s (+0.1s)`);
    }
    
    // ⚡ **INSTANT CHANGE**: Call onChange ngay lập tức
    onChange(newValue);
  }, [normalizedValue, max, onChange, label, canIncrease]);

  const handleArrowDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canDecrease) {
      return; // 🚀 **SILENT WHEN BLOCKED**: Không log để reduce noise
    }
    
    // 🔥 **DECISECOND ARITHMETIC**: Hoàn toàn chính xác với integer arithmetic
    const currentDeciseconds = Math.round(normalizedValue * 10); // Convert to deciseconds (integer)
    const newDeciseconds = currentDeciseconds - 1; // Subtract exactly 1 decisecond (0.1s)
    const minDeciseconds = Math.round(min * 10);
    
    // Clamp to min và convert back to seconds với precision cao
    const clampedDeciseconds = Math.max(newDeciseconds, minDeciseconds);
    const newValue = clampedDeciseconds / 10; // Convert back to seconds (exact 0.1s multiple)
    
    // 🚀 **OPTIMIZED DEBUG**: Chỉ log essential info khi cần debug
    if (Math.random() < 0.1) { // 10% sampling để giảm noise
      console.log(`⬇️ [ArrowTimeInput] ${label} DOWN: ${normalizedValue.toFixed(1)}s → ${newValue.toFixed(1)}s (-0.1s)`);
    }
    
    // ⚡ **INSTANT CHANGE**: Call onChange ngay lập tức
    onChange(newValue);
  }, [normalizedValue, min, onChange, label, canDecrease]);

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

  // 🎯 COMMIT: Validate and commit changes với DECISECOND ARITHMETIC
  const handleCommit = useCallback(() => {
    let newValue = normalizedValue; // Default to current normalized value
    
    try {
      // Parse MM.SS.CS format (support cả : và . separator) - GIỮ NGUYÊN PARSER CŨ
      const timeParts = tempValue.split(/[.:]/).filter(part => part.length > 0);
      
      if (timeParts.length >= 3) {
        const minutes = parseInt(timeParts[0]) || 0;
        const seconds = parseInt(timeParts[1]) || 0;
        const centiseconds = parseInt(timeParts[2]) || 0;
        
        // 🔥 **CONVERT CS TO DS**: Convert centiseconds input to deciseconds for calculation
        // Làm tròn centiseconds về deciseconds gần nhất (multiples of 10)
        const deciseconds = Math.round(centiseconds / 10); // Convert CS to DS (0-9)
        
        // 🔥 **DECISECOND CALCULATION**: Tính bằng deciseconds để đảm bảo precision
        const totalDeciseconds = minutes * 600 + seconds * 10 + deciseconds;
        newValue = totalDeciseconds / 10; // Convert to seconds (multiple của 0.1s)
        
        // Validate range với DECISECOND ARITHMETIC
        const minDeciseconds = Math.round(min * 10);
        const maxDeciseconds = Math.round(max * 10);
        const clampedDeciseconds = Math.max(minDeciseconds, Math.min(totalDeciseconds, maxDeciseconds));
        newValue = clampedDeciseconds / 10;
        
      } else if (timeParts.length === 2) {
        // Support MM.SS format (set deciseconds = 0)
        const minutes = parseInt(timeParts[0]) || 0;
        const seconds = parseInt(timeParts[1]) || 0;
        
        // 🔥 **DECISECOND CALCULATION**: Tính bằng deciseconds với 0 deciseconds
        const totalDeciseconds = minutes * 600 + seconds * 10;
        newValue = totalDeciseconds / 10;
        
        // Validate range với DECISECOND ARITHMETIC
        const minDeciseconds = Math.round(min * 10);
        const maxDeciseconds = Math.round(max * 10);
        const clampedDeciseconds = Math.max(minDeciseconds, Math.min(totalDeciseconds, maxDeciseconds));
        newValue = clampedDeciseconds / 10;
      }
    } catch (error) {
      console.warn(`⚠️ [ArrowTimeInput] Parse error for ${label}:`, error);
      // Keep current normalized value on error
      newValue = normalizedValue;
    }
    
    // 🔥 **DEBUG LOG**: Log manual edits với deciseconds detail để verify precision
    const oldDs = Math.round(normalizedValue * 10);
    const newDs = Math.round(newValue * 10);
    console.log(`✏️ [ArrowTimeInput] ${label} manual edit PRECISE:`, {
      input: tempValue,
      original: `${normalizedValue.toFixed(1)}s (${oldDs}ds)`,
      result: `${newValue.toFixed(1)}s (${newDs}ds)`,
      exact_diff: `${(newValue - normalizedValue).toFixed(1)}s`,
      is_0_1s_multiple: (newDs % 1 === 0) ? '✅ EXACT 0.1s' : '❌ NOT 0.1s multiple',
      display_format: formattedTime
    });
    
    onChange(newValue);
    setIsEditing(false);
  }, [tempValue, onChange, normalizedValue, max, min, label, formattedTime]);

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
      {/* 🎯 **TIME DISPLAY BUTTON** - Hiển thị format MM.SS.CS */}
      <button
        onClick={handleClick}
        className="w-24 px-3 py-1.5 text-sm text-center border border-slate-300 rounded-l bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors font-mono compact-time-input text-color-timeselector"
        title={`Click to edit ${label} (Format: MM.SS.CS - 0.1s steps)`}
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

// 🎯 **COMPACT TIME SELECTOR** - Updated với precise 0.1s logic
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
        console.log('⏰ [CompactTimeSelector] PRECISE 0.1s ArrowTimeInput setup complete:', {
          timeRange: `${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`,
          duration: duration.toFixed(1),
          format: 'MM.SS.CS với PRECISE ±0.1s steps',
          improvements: 'Decisecond arithmetic, exact 0.1s increments, no floating point errors'
        });
      }, 0);
    }
  }, [duration, startTime, endTime]);

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {/* Start Time với Precise 0.1s Logic */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">Start:</label>
        <ArrowTimeInput
          value={startTime}
          onChange={onStartTimeChange}
          label="start time"
          max={Math.max(0, endTime - 0.1)} // Ensure start < end với 0.1s spacing
          min={0}
          isStartTime={true}
          duration={duration}
        />
      </div>

      {/* End Time với Precise 0.1s Logic */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">End:</label>
        <ArrowTimeInput
          value={endTime}
          onChange={onEndTimeChange}
          label="end time"
          max={duration}
          min={Math.min(duration, startTime + 0.1)} // Ensure end > start với 0.1s spacing
          isEndTime={true}
          duration={duration}
        />
      </div>
    </div>
  );
});

CompactTimeSelector.displayName = 'CompactTimeSelector';

export default CompactTimeSelector; 