import { useCallback } from 'react';
import { clamp } from '../utils/audioUtils';

// 🎯 **TIME CHANGE HANDLERS HOOK**: Extract time change logic 
export const useTimeChangeHandlers = ({
  startTime,
  endTime,
  duration,
  fadeIn,
  fadeOut,
  setStartTime,
  setEndTime,
  saveState
}) => {
  // 🎯 OPTIMIZED: Start time change handler with debouncing
  const handleStartTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, 0, endTime);
    setStartTime(clampedTime);
    
    // 🆕 DEBOUNCED HISTORY SAVE: Only save after user stops changing
    const saveTimeout = setTimeout(() => {
      saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut });
    }, 300); // 300ms delay
    
    return () => clearTimeout(saveTimeout);
  }, [endTime, setStartTime, saveState, fadeIn, fadeOut]);

  // 🎯 OPTIMIZED: End time change handler with debouncing
  const handleEndTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, startTime, duration);
    setEndTime(clampedTime);
    
    // 🆕 DEBOUNCED HISTORY SAVE: Only save after user stops changing
    const saveTimeout = setTimeout(() => {
      saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut });
    }, 300); // 300ms delay
    
    return () => clearTimeout(saveTimeout);
  }, [startTime, duration, setEndTime, saveState, fadeIn, fadeOut]);

  return {
    handleStartTimeChange,
    handleEndTimeChange
  };
}; 