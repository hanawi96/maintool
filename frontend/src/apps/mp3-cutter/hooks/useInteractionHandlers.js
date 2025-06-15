

import { useCallback, useRef } from 'react';

// 🎯 **60FPS OPTIMIZED INTERACTION HANDLERS**
export const useInteractionHandlers = ({
  canvasRef,
  duration,
  startTime,
  endTime,
  audioRef,
  isPlaying,
  fadeIn,
  fadeOut,
  
  // 🔧 **FIX MISSING DEPENDENCY**: Add isDragging to parameters
  isDragging, // 🆕 **ADDED**: isDragging state để fix undefined error
  hoveredHandle, // 🔧 **ADDED**: hoveredHandle state để fix undefined error
  
  // State setters
  setStartTime,
  setEndTime,
  setIsDragging,
  setHoveredHandle,
  setCurrentTime,
  
  // 🆕 **INVERT MODE HANDLERS**: Enhanced handlers with invert logic
  handleStartTimeChange,
  handleEndTimeChange,
  
  // Utilities
  jumpToTime,
  saveState,
  interactionManagerRef,
  
  // 🆕 **AUDIO CONTEXT**: Receive from parent instead of creating locally
  audioContext // Full audio context with isInverted
}) => {
  // 🔥 **PERFORMANCE REF**: (Đã thay bằng requestAnimationFrame, không cần lastMouseTimeRef nữa)

  // Cache bounding rect for current interaction
  const cachedRectRef = useRef(null);
  
  // 🆕 **HISTORY TRACKING**: Prevent duplicate history saves
  const historySavedRef = useRef(false);

  // 🆕 **USE AUDIO CONTEXT FROM PARENT**: Use the audioContext parameter that includes isInverted
  // Removed duplicate audioContext creation - using parameter instead

  // 🎯 **OPTIMIZED MOUSE DOWN** - Minimal logic for 60fps
  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;

    // 🆕 **RESET HISTORY TRACKING**: Reset for new interaction
    historySavedRef.current = false;

    // Cache rect for this interaction
    const rect = canvasRef.current.getBoundingClientRect();
    cachedRectRef.current = rect;

    const x = e.clientX - rect.left;
    const eventInfo = {
      isHandleEvent: e.isHandleEvent || false,
      handleType: e.handleType || null
    };

    const manager = interactionManagerRef.current;
    if (manager && canvasRef.current) {
      const globalDragCallback = (result) => {
        if (result.action === 'saveHistoryOnGlobalMouseUp' && result.saveHistory && !historySavedRef.current) {
          console.log(`💾 [History] Global mouse up - saving history (SINGLE save)`);
          historySavedRef.current = true;
          // 🔄 **IMMEDIATE SAVE**: Save immediately to prevent race condition with regular mouse up
          saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: audioContext?.isInverted || false });
          return;
        }
        // 🆕 **USE ENHANCED HANDLERS**: Use enhanced handlers for proper cursor positioning
        if (result.startTime !== undefined) handleStartTimeChange(result.startTime);
        if (result.endTime !== undefined) handleEndTimeChange(result.endTime);
      };

      manager.setupGlobalDragContext(rect, canvasRef.current.width, duration, startTime, endTime, audioContext, globalDragCallback);
    }

    const result = manager.handleMouseDown(x, canvasRef.current.width, duration, startTime, endTime, eventInfo);
    
    // 🚀 **IMMEDIATE PROCESSING** - No delays for 60fps
    switch (result.action) {
      case 'startDrag':
        setIsDragging(result.handle);
        break;
      case 'pendingJump':
        if (result.regionDragPotential) setIsDragging('region-potential');
        break;
      case 'createSelection':
        setStartTime(result.startTime);
        setEndTime(result.endTime);
        break;
      default:
        // No action needed for other cases
        break;
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setIsDragging, interactionManagerRef, audioContext, saveState, fadeIn, fadeOut, handleStartTimeChange, handleEndTimeChange]);

  // 🎯 **OPTIMIZED MOUSE MOVE with requestAnimationFrame**
  const rafIdRef = useRef(null);
  const latestEventRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const processMouseMove = useCallback(() => {
    const e = latestEventRef.current;
    if (!e || !canvasRef.current || duration <= 0) return;

    // Dùng cached rect nếu có, nếu không thì fallback lấy lại (trường hợp hiếm)
    const rect = cachedRectRef.current || canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const manager = interactionManagerRef.current;
    const result = manager.handleMouseMove(x, canvasRef.current.width, duration, startTime, endTime, audioContext);
    switch (result.action) {
      case 'updateRegion':
        if (result.isRegionDrag) {
          // Batch setState để tránh render 2 lần liên tiếp
          if (result.startTime !== undefined && result.endTime !== undefined) {
            setStartTime(result.startTime);
            setEndTime(result.endTime);
          } else {
            if (result.startTime !== undefined) setStartTime(result.startTime);
            if (result.endTime !== undefined) setEndTime(result.endTime);
          }
        } else {
          if (result.startTime !== undefined) handleStartTimeChange(result.startTime);
          if (result.endTime !== undefined) handleEndTimeChange(result.endTime);
        }
        break;
      case 'hover':
        setHoveredHandle(result.handle);
        break;
      default:
        break;
    }
    setHoveredHandle(result.cursor === 'ew-resize' && result.handle ? result.handle : null);
    rafIdRef.current = null;
  }, [canvasRef, duration, startTime, endTime, setHoveredHandle, interactionManagerRef, audioContext, handleStartTimeChange, handleEndTimeChange, setStartTime, setEndTime]);

  const handleCanvasMouseMove = useCallback((e) => {
    latestEventRef.current = e;
    if (rafIdRef.current === null) {
      rafIdRef.current = window.requestAnimationFrame(processMouseMove);
    }
  }, [processMouseMove]);

  // 🎯 **OPTIMIZED MOUSE UP**
  const handleCanvasMouseUp = useCallback(() => {
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseUp(startTime, endTime, audioContext, duration);
    
    switch (result.action) {
      case 'completeDrag':
        setIsDragging(null);
        // 🔄 **CONSOLIDATED SAVE LOGIC**: Only save if not already saved by global callback
        if (result.saveHistory && !historySavedRef.current) {
          console.log(`💾 [History] Local mouse up - saving history (SINGLE save)`);
          historySavedRef.current = true;
          // 🔄 **IMMEDIATE SAVE**: No timeout needed, save immediately with invert state
          saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: audioContext?.isInverted || false });
        } else if (result.saveHistory && historySavedRef.current) {
          console.log(`🚫 [History] Local mouse up - history already saved by global callback, skipping`);
        }
        break;
      default:
        setIsDragging(null);
        break;
    }
    
    // 🆕 **INVERT MODE PRIORITY**: In invert mode, prioritize cursor jump over handle updates
    const isInvertMode = audioContext?.isInverted;
    
    // Execute pending actions based on mode
    if (result.executePendingJump && result.pendingJumpTime !== null) {
      jumpToTime(result.pendingJumpTime);
      if (audioRef.current) {
        audioRef.current.currentTime = result.pendingJumpTime;
        setCurrentTime(result.pendingJumpTime);
      }
      console.log(`⚡ [${isInvertMode ? 'InvertMode' : 'NormalMode'}] Jumped cursor to ${result.pendingJumpTime.toFixed(2)}s`);
    }
    
    // 🔄 **HANDLE UPDATE LOGIC**: Use enhanced handlers for invert mode support
    if (result.executePendingHandleUpdate && result.pendingHandleUpdate !== null && !isInvertMode) {
      const updateData = result.pendingHandleUpdate;
      
      if (updateData.type === 'start') {
        // 🆕 **USE ENHANCED HANDLER**: Use handleStartTimeChange for invert logic
        handleStartTimeChange(updateData.newTime);
      } else if (updateData.type === 'end') {
        // 🆕 **USE ENHANCED HANDLER**: Use handleEndTimeChange for invert logic
        handleEndTimeChange(updateData.newTime);
      }
      console.log(`📍 [NormalMode] Updated ${updateData.type} handle to ${updateData.newTime.toFixed(2)}s`);
    } else if (result.executePendingHandleUpdate && result.pendingHandleUpdate !== null && isInvertMode) {
      // 🆕 **INVERT MODE CURSOR JUMP**: Instead of updating handle, jump cursor to click position
      const updateData = result.pendingHandleUpdate;
      const targetTime = updateData.newTime;
      
      jumpToTime(targetTime);
      if (audioRef.current) {
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
      
      console.log(`⚡ [InvertMode] Cursor jumped to click position: ${targetTime.toFixed(2)}s (handle update skipped)`);
    }
    
    // 🔄 **PENDING ACTIONS**: Handle pending actions only if not already handled by drag completion
    if (result.saveHistory && !historySavedRef.current) {
      console.log(`💾 [History] Pending handle update - checking if save needed (isInvertMode: ${isInvertMode})`);
      historySavedRef.current = true;
      // 🔄 **IMMEDIATE SAVE**: Save immediately without timeout
      if (isInvertMode) {
        // 🛡️ **INVERT MODE HISTORY LOGIC**: Only save if there were actual region changes
        // In invert mode, cursor jumps don't change region selection, so no history needed
        if (result.executePendingHandleUpdate && result.pendingHandleUpdate !== null) {
          // This shouldn't happen in invert mode, but if it does, don't save
          console.log(`🚫 [InvertMode] Skipping history save - no region changes in invert mode`);
        } else {
          // Pure cursor jump in invert mode - no history save needed
          console.log(`🚫 [InvertMode] Skipping history save - cursor jump only, no region changes`);
        }
      } else {
        // Normal mode: save with potential handle changes
        const finalStartTime = result.executePendingHandleUpdate && result.pendingHandleUpdate?.type === 'start'
          ? result.pendingHandleUpdate.newTime : startTime;
        const finalEndTime = result.executePendingHandleUpdate && result.pendingHandleUpdate?.type === 'end'
          ? result.pendingHandleUpdate.newTime : endTime;
        console.log(`💾 [NormalMode] Saving history with changes: start=${finalStartTime.toFixed(2)}s, end=${finalEndTime.toFixed(2)}s`);
        saveState({ startTime: finalStartTime, endTime: finalEndTime, fadeIn, fadeOut, isInverted: false });
      }
    } else if (result.saveHistory && historySavedRef.current) {
      console.log(`🚫 [History] Pending handle update - history already saved, skipping`);
    }
  }, [startTime, endTime, fadeIn, fadeOut, duration, saveState, setIsDragging, audioRef, setCurrentTime, jumpToTime, setStartTime, setEndTime, interactionManagerRef, audioContext, handleStartTimeChange, handleEndTimeChange]);

  // 🎯 **OPTIMIZED MOUSE LEAVE**
  const handleCanvasMouseLeave = useCallback(() => {
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseLeave();
    
    if (result.action === 'clearHover') {
      setHoveredHandle(null);
    }
  }, [setHoveredHandle, interactionManagerRef]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave,
    // 🆕 **SHARED HISTORY REF**: Export để share với useTimeChangeHandlers
    historySavedRef // Export để prevent duplicate saves
  };
};