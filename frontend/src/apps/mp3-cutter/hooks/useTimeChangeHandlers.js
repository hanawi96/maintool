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
  isDragging, // 🎯 Add isDragging prop to control when to save history
  // 🆕 Add regions support for history
  regions = [],
  activeRegionId = null
}) => {
  const startTimeoutRef = useRef(null);
  const endTimeoutRef = useRef(null);

  const handleStartTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, 0, endTime);
    setStartTime(clampedTime);
    if (historySavedRef) historySavedRef.current = false;
    
    // 🎯 Only save history if not currently dragging
    if (!isDragging) {
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);      startTimeoutRef.current = setTimeout(() => {
        if (historySavedRef && !historySavedRef.current) {
          historySavedRef.current = true;
          // 🆕 Include regions in history state
          saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut, regions, activeRegionId });
        }
        startTimeoutRef.current = null;
      }, 100);
    }
  }, [endTime, setStartTime, saveState, fadeIn, fadeOut, historySavedRef, isDragging, regions, activeRegionId]);

  const handleEndTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, startTime, duration);
    setEndTime(clampedTime);
    if (historySavedRef) historySavedRef.current = false;
    
    // 🎯 Only save history if not currently dragging
    if (!isDragging) {
      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);      endTimeoutRef.current = setTimeout(() => {
        if (historySavedRef && !historySavedRef.current) {
          historySavedRef.current = true;
          // 🆕 Include regions in history state
          saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut, regions, activeRegionId });
        }
        endTimeoutRef.current = null;
      }, 100);
    }
  }, [startTime, duration, setEndTime, saveState, fadeIn, fadeOut, historySavedRef, isDragging, regions, activeRegionId]);  const saveHistoryNow = useCallback(() => {
    if (historySavedRef && !historySavedRef.current) {
      historySavedRef.current = true;
      // 🆕 Include regions in history state
      saveState({ startTime, endTime, fadeIn, fadeOut, regions, activeRegionId });
    }
  }, [startTime, endTime, fadeIn, fadeOut, saveState, historySavedRef, regions, activeRegionId]);

  const cleanup = useCallback(() => {
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    startTimeoutRef.current = null;
    endTimeoutRef.current = null;
  }, []);

  return { handleStartTimeChange, handleEndTimeChange, saveHistoryNow, cleanup };
};
