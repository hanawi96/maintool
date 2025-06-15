import { useCallback, useRef } from 'react';
import { clamp } from '../utils/audioUtils';

// 🎯 **ULTRA-OPTIMIZED TIME CHANGE HANDLERS**: Fast, responsive, efficient
export const useTimeChangeHandlers = ({
  startTime,
  endTime,
  duration,
  fadeIn,
  fadeOut,
  setStartTime,
  setEndTime,
  saveState,
  // 🆕 **SHARED HISTORY REF**: Shared ref để prevent duplicate saves
  historySavedRef // Ref từ parent để track history saving
}) => {
  // 🚀 **SHARED DEBOUNCE REFS**: Single timeout per handler để prevent memory leaks
  const startTimeoutRef = useRef(null);
  const endTimeoutRef = useRef(null);

  // 🚀 **ULTRA-FAST START TIME**: Immediate UI update + smart debounced history
  const handleStartTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, 0, endTime);
    
    // ⚡ **INSTANT UI UPDATE**: Update UI ngay lập tức - no delay
    setStartTime(clampedTime);
    
    // 🆕 **RESET HISTORY TRACKING**: Reset for new time selector change
    if (historySavedRef) {
      historySavedRef.current = false;
    }
    
    // 🔄 **CLEAR PREVIOUS TIMEOUT**: Prevent multiple saves
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
    }
    
    // 🚀 **ULTRA-FAST HISTORY SAVE**: Chỉ 100ms thay vì 300ms - gấp 3 lần nhanh hơn
    startTimeoutRef.current = setTimeout(() => {
      // 🆕 **PREVENT DUPLICATE SAVE**: Only save if not already saved by interaction handlers
      if (historySavedRef && !historySavedRef.current) {
        console.log(`💾 [TimeChangeHandlers] FAST start time history save: ${clampedTime.toFixed(2)}s`);
        historySavedRef.current = true; // Mark as saved
        saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut });
      } else {
        console.log(`🚫 [TimeChangeHandlers] Start time history already saved by interaction handler, skipping`);
      }
      startTimeoutRef.current = null; // 🧹 Cleanup ref
    }, 100); // 🚀 **100MS ONLY**: Gấp 3 lần nhanh hơn
    
  }, [endTime, setStartTime, saveState, fadeIn, fadeOut, historySavedRef]);

  // 🚀 **ULTRA-FAST END TIME**: Immediate UI update + smart debounced history  
  const handleEndTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, startTime, duration);
    
    // ⚡ **INSTANT UI UPDATE**: Update UI ngay lập tức - no delay
    setEndTime(clampedTime);
    
    // 🆕 **RESET HISTORY TRACKING**: Reset for new time selector change
    if (historySavedRef) {
      historySavedRef.current = false;
    }
    
    // 🔄 **CLEAR PREVIOUS TIMEOUT**: Prevent multiple saves
    if (endTimeoutRef.current) {
      clearTimeout(endTimeoutRef.current);
    }
    
    // 🚀 **ULTRA-FAST HISTORY SAVE**: Chỉ 100ms thay vì 300ms - gấp 3 lần nhanh hơn
    endTimeoutRef.current = setTimeout(() => {
      // 🆕 **PREVENT DUPLICATE SAVE**: Only save if not already saved by interaction handlers
      if (historySavedRef && !historySavedRef.current) {
        console.log(`💾 [TimeChangeHandlers] FAST end time history save: ${clampedTime.toFixed(2)}s`);
        historySavedRef.current = true; // Mark as saved
        saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut });
      } else {
        console.log(`🚫 [TimeChangeHandlers] End time history already saved by interaction handler, skipping`);
      }
      endTimeoutRef.current = null; // 🧹 Cleanup ref
    }, 100); // 🚀 **100MS ONLY**: Gấp 3 lần nhanh hơn
    
  }, [startTime, duration, setEndTime, saveState, fadeIn, fadeOut, historySavedRef]);

  // 🧹 **CLEANUP ON UNMOUNT**: Đảm bảo no memory leaks
  const cleanup = useCallback(() => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    if (endTimeoutRef.current) {
      clearTimeout(endTimeoutRef.current);
      endTimeoutRef.current = null;
    }
  }, []);

  return {
    handleStartTimeChange,
    handleEndTimeChange,
    cleanup // 🆕 **EXPOSE CLEANUP**: Cho parent component có thể cleanup nếu cần
  };
}; 