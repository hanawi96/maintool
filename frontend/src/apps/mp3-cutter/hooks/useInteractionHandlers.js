import { useCallback, useRef, useMemo } from 'react';

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
  interactionManagerRef
}) => {
  // 🔥 **PERFORMANCE REF**: Throttling reference
  const lastMouseTimeRef = useRef(0);

  // 🚀 **MEMOIZED AUDIO CONTEXT**
  const audioContext = useMemo(() => ({
    audioRef,
    setCurrentTime,
    isPlaying
  }), [audioRef, setCurrentTime, isPlaying]);

  // 🎯 **OPTIMIZED MOUSE DOWN** - Minimal logic for 60fps
  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const eventInfo = {
      isHandleEvent: e.isHandleEvent || false,
      handleType: e.handleType || null
    };
    
    const manager = interactionManagerRef.current;
    if (manager && canvasRef.current) {
      const globalDragCallback = (result) => {
        if (result.action === 'saveHistoryOnGlobalMouseUp' && result.saveHistory) {
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
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setIsDragging, interactionManagerRef, audioContext, saveState, fadeIn, fadeOut]);

  // 🎯 **60FPS MOUSE MOVE** - Ultra optimized
  const handleCanvasMouseMove = useCallback((e) => {
    const now = performance.now();
    if (now - lastMouseTimeRef.current < 16) return; // 60fps cap
    lastMouseTimeRef.current = now;
    
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseMove(x, canvas.width, duration, startTime, endTime, audioContext);
    
    // 🚀 **DIRECT UPDATES** - No processing delays
    switch (result.action) {
      case 'updateRegion':
        if (result.isDraggingConfirmed) {
          if (result.isRegionDrag && isDragging !== 'region') setIsDragging('region');
          if (result.startTime !== undefined) setStartTime(result.startTime);
          if (result.endTime !== undefined) setEndTime(result.endTime);
          if (manager && (result.startTime !== undefined || result.endTime !== undefined)) {
            const newStartTime = result.startTime !== undefined ? result.startTime : startTime;
            const newEndTime = result.endTime !== undefined ? result.endTime : endTime;
            manager.updateGlobalDragContext(newStartTime, newEndTime);
          }
        }
        break;
      case 'updateHover':
        setHoveredHandle(result.handle);
        break;
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setHoveredHandle, setIsDragging, interactionManagerRef, audioContext, isDragging]);

  // 🎯 **OPTIMIZED MOUSE UP**
  const handleCanvasMouseUp = useCallback(() => {
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseUp(startTime, endTime, audioContext);
    
    switch (result.action) {
      case 'completeDrag':
        setIsDragging(null);
        if (result.saveHistory) {
          setTimeout(() => saveState({ startTime, endTime, fadeIn, fadeOut }), 100);
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
    
    if (result.saveHistory) {
      setTimeout(() => {
        const finalStartTime = result.executePendingHandleUpdate && result.pendingHandleUpdate?.type === 'start' 
          ? result.pendingHandleUpdate.newTime : startTime;
        const finalEndTime = result.executePendingHandleUpdate && result.pendingHandleUpdate?.type === 'end' 
          ? result.pendingHandleUpdate.newTime : endTime;
        saveState({ startTime: finalStartTime, endTime: finalEndTime, fadeIn, fadeOut });
      }, 100);
    }
  }, [startTime, endTime, fadeIn, fadeOut, saveState, setIsDragging, audioRef, setCurrentTime, jumpToTime, setStartTime, setEndTime, interactionManagerRef, audioContext]);

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