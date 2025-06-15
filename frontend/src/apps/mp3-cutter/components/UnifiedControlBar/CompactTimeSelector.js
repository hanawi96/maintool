import React, { useState, useRef, useEffect } from 'react';
import { formatTimeUnified } from '../../utils/timeFormatter';

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

// Helper: parse input (supports MM.SS.CS & MM.SS)
function parseInputValue(input, min, max) {
  const parts = input.split(/[.:]/).filter(Boolean);
  let deci = 0;
  if (parts.length >= 3) {
    // MM.SS.CS
    const [mm, ss, cs] = parts;
    deci =
      (parseInt(mm) || 0) * 600 +
      (parseInt(ss) || 0) * 10 +
      Math.round((parseInt(cs) || 0) / 10);
  } else if (parts.length === 2) {
    // MM.SS
    const [mm, ss] = parts;
    deci = (parseInt(mm) || 0) * 600 + (parseInt(ss) || 0) * 10;
  } else {
    // invalid
    return null;
  }
  // Clamp
  return clampDeci(deci, toDeci(min), toDeci(max)) / 10;
}

// Main ArrowTimeInput
const ArrowTimeInput = React.memo(
  ({
    value,
    onChange,
    label,
    max,
    min = 0,
    isStartTime = false,
    isEndTime = false,
    duration = 0,
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState('');
    const inputRef = useRef(null);

    const normalizedValue = roundToDecisecond(value);
    const formattedTime = formatTimeUnified(normalizedValue);

    // Có thể tăng/giảm?
    const canIncrease = !(
      (isEndTime && Math.abs(normalizedValue - duration) < 0.05) ||
      toDeci(normalizedValue) + 1 > toDeci(max)
    );
    const canDecrease = !(
      (isStartTime && Math.abs(normalizedValue) < 0.05) ||
      toDeci(normalizedValue) - 1 < toDeci(min)
    );

    // Arrow handlers
    const handleArrow = (inc) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currDeci = toDeci(normalizedValue);
      const newDeci = clampDeci(
        currDeci + inc,
        toDeci(min),
        toDeci(max)
      );
      if (currDeci !== newDeci) {
        onChange(newDeci / 10);
      }
    };

    // Edit mode handlers
    const handleClick = () => {
      setIsEditing(true);
      setTempValue(formattedTime);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    };

    const handleCommit = () => {
      const parsed = parseInputValue(tempValue, min, max);
      if (parsed !== null && parsed !== normalizedValue) {
        onChange(parsed);
      }
      setIsEditing(false);
      setTempValue('');
    };

    const handleCancel = () => {
      setIsEditing(false);
      setTempValue('');
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'ArrowUp') {
        handleArrow(+1)(e);
      } else if (e.key === 'ArrowDown') {
        handleArrow(-1)(e);
      }
    };

    if (isEditing) {
      return (
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCommit}
            className="w-24 px-2 py-1.5 text-sm text-center border border-indigo-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
            placeholder="00.00.00"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <button
          onClick={handleClick}
          className="w-24 px-3 py-1.5 text-sm text-center border border-slate-300 rounded-l bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors font-mono compact-time-input text-color-timeselector"
          title={`Click to edit ${label} (Format: MM.SS.CS - 0.1s steps)`}
        >
          {formattedTime}
        </button>
        <div className="flex flex-col ml-1">
          <button
            onClick={handleArrow(+1)}
            disabled={!canIncrease}
            className="px-2 py-1 hover:bg-indigo-50 my-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:bg-indigo-100 rounded-sm"
            title={
              canIncrease
                ? `Increase ${label} by 0.1s`
                : `Cannot increase ${label} further`
            }
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-600 mx-auto"></div>
          </button>
          <button
            onClick={handleArrow(-1)}
            disabled={!canDecrease}
            className="px-2 py-1 hover:bg-indigo-50 my-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:bg-indigo-100 rounded-sm"
            title={
              canDecrease
                ? `Decrease ${label} by 0.1s`
                : `Cannot decrease ${label} further`
            }
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600 mx-auto"></div>
          </button>
        </div>
      </div>
    );
  }
);

ArrowTimeInput.displayName = 'ArrowTimeInput';

const CompactTimeSelector = React.memo(
  ({ startTime, endTime, duration, onStartTimeChange, onEndTimeChange }) => (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">Start:</label>
        <ArrowTimeInput
          value={startTime}
          onChange={onStartTimeChange}
          label="start time"
          max={Math.max(0, endTime - 0.1)}
          min={0}
          isStartTime={true}
          duration={duration}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">End:</label>
        <ArrowTimeInput
          value={endTime}
          onChange={onEndTimeChange}
          label="end time"
          max={duration}
          min={Math.min(duration, startTime + 0.1)}
          isEndTime={true}
          duration={duration}
        />
      </div>
    </div>
  )
);

CompactTimeSelector.displayName = 'CompactTimeSelector';

export default CompactTimeSelector;
