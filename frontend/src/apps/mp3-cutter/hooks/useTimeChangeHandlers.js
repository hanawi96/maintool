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
  saveState
}) => {
  // 🚀 **SHARED DEBOUNCE REFS**: Single timeout per handler để prevent memory leaks
  const startTimeoutRef = useRef(null);
  const endTimeoutRef = useRef(null);

  // 🚀 **ULTRA-FAST START TIME**: Immediate UI update + smart debounced history
  const handleStartTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, 0, endTime);
    
    // ⚡ **INSTANT UI UPDATE**: Update UI ngay lập tức - no delay
    setStartTime(clampedTime);
    
    // 🔄 **CLEAR PREVIOUS TIMEOUT**: Prevent multiple saves
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
    }
    
    // 🚀 **ULTRA-FAST HISTORY SAVE**: Chỉ 100ms thay vì 300ms - gấp 3 lần nhanh hơn
    startTimeoutRef.current = setTimeout(() => {
      console.log(`💾 [TimeChangeHandlers] FAST start time history save: ${clampedTime.toFixed(2)}s`);
      saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut });
      startTimeoutRef.current = null; // 🧹 Cleanup ref
    }, 100); // 🚀 **100MS ONLY**: Gấp 3 lần nhanh hơn
    
  }, [endTime, setStartTime, saveState, fadeIn, fadeOut]);

  // 🚀 **ULTRA-FAST END TIME**: Immediate UI update + smart debounced history  
  const handleEndTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, startTime, duration);
    
    // ⚡ **INSTANT UI UPDATE**: Update UI ngay lập tức - no delay
    setEndTime(clampedTime);
    
    // 🔄 **CLEAR PREVIOUS TIMEOUT**: Prevent multiple saves
    if (endTimeoutRef.current) {
      clearTimeout(endTimeoutRef.current);
    }
    
    // 🚀 **ULTRA-FAST HISTORY SAVE**: Chỉ 100ms thay vì 300ms - gấp 3 lần nhanh hơn
    endTimeoutRef.current = setTimeout(() => {
      console.log(`💾 [TimeChangeHandlers] FAST end time history save: ${clampedTime.toFixed(2)}s`);
      saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut });
      endTimeoutRef.current = null; // 🧹 Cleanup ref
    }, 100); // 🚀 **100MS ONLY**: Gấp 3 lần nhanh hơn
    
  }, [startTime, duration, setEndTime, saveState, fadeIn, fadeOut]);

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