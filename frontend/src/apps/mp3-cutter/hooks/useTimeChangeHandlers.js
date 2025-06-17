import { useCallback, useRef } from 'react';
import { clamp } from '../utils/audioUtils';

export const useTimeChangeHandlers = ({
  startTime,
  endTime,
  duration,
  fadeIn,
  fadeOut,
  setStartTime,
  setEndTime,
  saveState,
  historySavedRef,
  isDragging // 🎯 Add isDragging prop to control when to save history
}) => {
  const startTimeoutRef = useRef(null);
  const endTimeoutRef = useRef(null);

  const handleStartTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, 0, endTime);
    setStartTime(clampedTime);
    if (historySavedRef) historySavedRef.current = false;
    
    // 🎯 Only save history if not currently dragging
    if (!isDragging) {
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = setTimeout(() => {
        if (historySavedRef && !historySavedRef.current) {
          historySavedRef.current = true;
          saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut });
        }
        startTimeoutRef.current = null;
      }, 100);
    }
  }, [endTime, setStartTime, saveState, fadeIn, fadeOut, historySavedRef, isDragging]);

  const handleEndTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, startTime, duration);
    setEndTime(clampedTime);
    if (historySavedRef) historySavedRef.current = false;
    
    // 🎯 Only save history if not currently dragging
    if (!isDragging) {
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
      endTimeoutRef.current = setTimeout(() => {
        if (historySavedRef && !historySavedRef.current) {
          historySavedRef.current = true;
          saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut });
        }
        endTimeoutRef.current = null;
      }, 100);
    }
  }, [startTime, duration, setEndTime, saveState, fadeIn, fadeOut, historySavedRef, isDragging]);
  const saveHistoryNow = useCallback(() => {
    if (historySavedRef && !historySavedRef.current) {
      historySavedRef.current = true;
      saveState({ startTime, endTime, fadeIn, fadeOut });
    }
  }, [startTime, endTime, fadeIn, fadeOut, saveState, historySavedRef]);

  const cleanup = useCallback(() => {
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    startTimeoutRef.current = null;
    endTimeoutRef.current = null;
  }, []);

  return { handleStartTimeChange, handleEndTimeChange, saveHistoryNow, cleanup };
};
