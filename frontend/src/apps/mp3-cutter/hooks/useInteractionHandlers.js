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
  
  // Utilities
  jumpToTime,
  saveState,
  interactionManagerRef,
  
  // 🆕 **AUDIO CONTEXT**: Receive from parent instead of creating locally
  audioContext // Full audio context with isInverted
}) => {
  // 🔥 **PERFORMANCE REF**: Throttling reference
  const lastMouseTimeRef = useRef(0);
  
  // 🆕 **HISTORY TRACKING**: Prevent duplicate history saves
  const historySavedRef = useRef(false);

  // 🆕 **USE AUDIO CONTEXT FROM PARENT**: Use the audioContext parameter that includes isInverted
  // Removed duplicate audioContext creation - using parameter instead

  // 🎯 **OPTIMIZED MOUSE DOWN** - Minimal logic for 60fps
  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    
    // 🆕 **RESET HISTORY TRACKING**: Reset for new interaction
    historySavedRef.current = false;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const eventInfo = {
      isHandleEvent: e.isHandleEvent || false,
      handleType: e.handleType || null
    };
    
    const manager = interactionManagerRef.current;
    if (manager && canvasRef.current) {
      const globalDragCallback = (result) => {
        if (result.action === 'saveHistoryOnGlobalMouseUp' && result.saveHistory && !historySavedRef.current) {
          console.log(`💾 [History] Global mouse up - saving history (first save)`);
          historySavedRef.current = true;
          setTimeout(() => saveState({ startTime, endTime, fadeIn, fadeOut }), 100);
          return;
        }
        if (result.startTime !== undefined) setStartTime(result.startTime);
        if (result.endTime !== undefined) setEndTime(result.endTime);
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
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setIsDragging, interactionManagerRef, audioContext, saveState, fadeIn, fadeOut]);

  // 🎯 **OPTIMIZED MOUSE MOVE**
  const handleCanvasMouseMove = useCallback((e) => {
    const now = performance.now();
    if (now - lastMouseTimeRef.current < 16) return; // 60fps limit
    lastMouseTimeRef.current = now;
    
    if (!canvasRef.current || duration <= 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseMove(x, canvasRef.current.width, duration, startTime, endTime, audioContext);
    
    switch (result.action) {
      case 'updateRegion':
        if (result.startTime !== undefined) setStartTime(result.startTime);
        if (result.endTime !== undefined) setEndTime(result.endTime);
        break;
      case 'hover':
        setHoveredHandle(result.handle);
        break;
      default:
        // No action needed for other cases
        break;
    }
    
    // 🎯 **CURSOR UPDATE**: Set hovered handle based on cursor
    setHoveredHandle(result.cursor === 'ew-resize' && result.handle ? result.handle : null);
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setHoveredHandle, interactionManagerRef, audioContext]);

  // 🎯 **OPTIMIZED MOUSE UP**
  const handleCanvasMouseUp = useCallback(() => {
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseUp(startTime, endTime, audioContext, duration);
    
    switch (result.action) {
      case 'completeDrag':
        setIsDragging(null);
        if (result.saveHistory && !historySavedRef.current) {
          console.log(`💾 [History] Mouse up - saving history (first save)`);
          historySavedRef.current = true;
          setTimeout(() => saveState({ startTime, endTime, fadeIn, fadeOut }), 100);
        } else if (result.saveHistory && historySavedRef.current) {
          console.log(`🚫 [History] Mouse up - history already saved, skipping duplicate`);
        }
        break;
      default:
        setIsDragging(null);
        break;
    }
    
    // Execute pending actions
    if (result.executePendingJump && result.pendingJumpTime !== null) {
      jumpToTime(result.pendingJumpTime);
      if (audioRef.current) {
        audioRef.current.currentTime = result.pendingJumpTime;
        setCurrentTime(result.pendingJumpTime);
      }
    }
    
    if (result.executePendingHandleUpdate && result.pendingHandleUpdate !== null) {
      const updateData = result.pendingHandleUpdate;
      if (updateData.type === 'start') {
        setStartTime(updateData.newTime);
        if (audioRef.current) {
          audioRef.current.currentTime = updateData.newTime;
          setCurrentTime(updateData.newTime);
        }
      } else if (updateData.type === 'end') {
        setEndTime(updateData.newTime);
        const previewTime = Math.max(0, updateData.newTime - 3.0);
        if (audioRef.current) {
          audioRef.current.currentTime = previewTime;
          setCurrentTime(previewTime);
        }
      }
    }
    
    if (result.saveHistory && !historySavedRef.current) {
      console.log(`💾 [History] Pending handle update - saving history (first save)`);
      historySavedRef.current = true;
      setTimeout(() => {
        const finalStartTime = result.executePendingHandleUpdate && result.pendingHandleUpdate?.type === 'start' 
          ? result.pendingHandleUpdate.newTime : startTime;
        const finalEndTime = result.executePendingHandleUpdate && result.pendingHandleUpdate?.type === 'end' 
          ? result.pendingHandleUpdate.newTime : endTime;
        saveState({ startTime: finalStartTime, endTime: finalEndTime, fadeIn, fadeOut });
      }, 100);
    } else if (result.saveHistory && historySavedRef.current) {
      console.log(`🚫 [History] Pending handle update - history already saved, skipping duplicate`);
    }
  }, [startTime, endTime, fadeIn, fadeOut, duration, saveState, setIsDragging, audioRef, setCurrentTime, jumpToTime, setStartTime, setEndTime, interactionManagerRef, audioContext]);

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
    handleCanvasMouseLeave
  };
}; 