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
  
  // 🔧 Track if we're in a hold operation globally
  const isInHoldOperationRef = useRef(false);

  const handleStartTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, 0, endTime);
    
    // 🔧 Check if we're in a hold operation using global flag
    const isInHoldOperation = window._isCompactTimeSelectorHolding || false;
    

    setStartTime(clampedTime);
    
    // 🔧 CRITICAL FIX: Don't reset historySavedRef during hold operations
    if (!isInHoldOperation && historySavedRef) {
      historySavedRef.current = false;
    } else if (isInHoldOperation) {
    }
    
    // 🔧 CRITICAL FIX: Save history immediately for discrete clicks, debounce only for drag
    if (isDragging) {
      // During drag: use debouncing
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
      
      startTimeoutRef.current = setTimeout(() => {
        if (historySavedRef && !historySavedRef.current) {
          console.log('💾 useTimeChangeHandlers: Saving start time history after drag debounce');
          historySavedRef.current = true;
          saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut, regions, activeRegionId });
        }
        startTimeoutRef.current = null;
      }, 100);
    } else {
      // Discrete clicks: save immediately only if not in hold operation
      if (!isInHoldOperation) {
        console.log('⚡ useTimeChangeHandlers: Saving start time history immediately (discrete click)');
        if (historySavedRef && !historySavedRef.current) {
          historySavedRef.current = true;
          saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut, regions, activeRegionId });
        }
      } else {
        console.log('🚫 useTimeChangeHandlers: Skipping history save (hold operation detected)');
      }
    }
  }, [endTime, setStartTime, saveState, fadeIn, fadeOut, historySavedRef, isDragging, regions, activeRegionId, startTime]);

  const handleEndTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, startTime, duration);
    
    // 🔧 Check if we're in a hold operation using global flag
    const isInHoldOperation = window._isCompactTimeSelectorHolding || false;
    
    console.log('⏰ useTimeChangeHandlers.handleEndTimeChange called:', {
      newTime: newTime.toFixed(3),
      clampedTime: clampedTime.toFixed(3),
      currentEndTime: endTime.toFixed(3),
      isDragging,
      historySavedBefore: historySavedRef?.current,
      isInHoldOperation,
      globalFlag: window._isCompactTimeSelectorHolding,
      timestamp: Date.now()
    });
    
    setEndTime(clampedTime);
    
    // 🔧 CRITICAL FIX: Don't reset historySavedRef during hold operations
    if (!isInHoldOperation && historySavedRef) {
      historySavedRef.current = false;
      console.log('🔄 useTimeChangeHandlers: Reset historySavedRef to false (non-hold operation)');
    } else if (isInHoldOperation) {
      console.log('🔄 useTimeChangeHandlers: Keeping historySavedRef unchanged (hold operation detected)');
    }
    
    // 🔧 CRITICAL FIX: Save history immediately for discrete clicks, debounce only for drag
    if (isDragging) {
      // During drag: use debouncing
      if (endTimeoutRef.current) {
        clearTimeout(endTimeoutRef.current);
      }
      
      endTimeoutRef.current = setTimeout(() => {
        if (historySavedRef && !historySavedRef.current) {
          console.log('💾 useTimeChangeHandlers: Saving end time history after drag debounce');
          historySavedRef.current = true;
          saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut, regions, activeRegionId });
        }
        endTimeoutRef.current = null;
      }, 100);
    } else {
      // Discrete clicks: save immediately only if not in hold operation
      if (!isInHoldOperation) {
        console.log('⚡ useTimeChangeHandlers: Saving end time history immediately (discrete click)');
        if (historySavedRef && !historySavedRef.current) {
          historySavedRef.current = true;
          saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut, regions, activeRegionId });
        }
      } else {
        console.log('🚫 useTimeChangeHandlers: Skipping history save (hold operation detected)');
      }
    }
  }, [startTime, duration, setEndTime, saveState, fadeIn, fadeOut, historySavedRef, isDragging, regions, activeRegionId, endTime]);

  const saveHistoryNow = useCallback(() => {
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
