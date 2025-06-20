import { useCallback, useRef } from 'react';

export const useInteractionHandlers = ({
  canvasRef,
  duration,
  startTime,
  endTime,
  audioRef,
  isPlaying,
  fadeIn,
  fadeOut,
  isDragging,
  hoveredHandle,
  setStartTime,
  setEndTime,
  setIsDragging,
  setHoveredHandle,
  setCurrentTime,
  handleStartTimeChange,
  handleEndTimeChange,
  jumpToTime,
  saveState,
  saveHistoryNow,
  historySavedRef,
  interactionManagerRef,
  audioContext
}) => {
  const cachedRectRef = useRef(null);
  const rafIdRef = useRef(null);
  const latestEventRef = useRef(null);

  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    cachedRectRef.current = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - cachedRectRef.current.left;
    const manager = interactionManagerRef.current;
    if (manager && canvasRef.current) {
      manager.setupGlobalDragContext(
        cachedRectRef.current, canvasRef.current.width, duration, startTime, endTime, audioContext,
        result => {
          if (result.action === 'saveHistoryOnGlobalMouseUp' && result.saveHistory && !historySavedRef.current) {
            historySavedRef.current = true;
            saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: audioContext?.isInverted || false });
          }
          if (result.startTime !== undefined) handleStartTimeChange(result.startTime);
          if (result.endTime !== undefined) handleEndTimeChange(result.endTime);
        }
      );
    }
    const result = manager.handleMouseDown(x, canvasRef.current.width, duration, startTime, endTime, {
      isHandleEvent: e.isHandleEvent || false,
      handleType: e.handleType || null
    });
    // Only reset historySavedRef when a real drag or selection is about to start
    if (
      result.action === 'startDrag' ||
      (result.action === 'pendingJump' && result.regionDragPotential) ||
      result.action === 'createSelection'
    ) {
      historySavedRef.current = false;
    }
    if (result.action === 'startDrag') setIsDragging(result.handle);
    else if (result.action === 'pendingJump' && result.regionDragPotential) setIsDragging('region-potential');
    else if (result.action === 'createSelection') {
      setStartTime(result.startTime);
      setEndTime(result.endTime);
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setIsDragging, interactionManagerRef, audioContext, saveState, fadeIn, fadeOut, handleStartTimeChange, handleEndTimeChange, historySavedRef]);

  const processMouseMove = useCallback(() => {
    const e = latestEventRef.current;
    if (!e || !canvasRef.current || duration <= 0) return;
    const rect = cachedRectRef.current || canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseMove(x, canvasRef.current.width, duration, startTime, endTime, audioContext);
    
    // 🎯 During dragging, use enhanced handlers to trigger active region updates
    if (result.action === 'updateRegion') {
      if (result.startTime !== undefined) handleStartTimeChange(result.startTime);
      if (result.endTime !== undefined) handleEndTimeChange(result.endTime);
    }
    if (result.action === 'hover' || result.cursor === 'ew-resize') setHoveredHandle(result.handle || null);
    rafIdRef.current = null;
  }, [canvasRef, duration, startTime, endTime, setHoveredHandle, interactionManagerRef, audioContext, handleStartTimeChange, handleEndTimeChange, isDragging]);

  const handleCanvasMouseMove = useCallback((e) => {
    latestEventRef.current = e;
    if (!rafIdRef.current) rafIdRef.current = window.requestAnimationFrame(processMouseMove);
  }, [processMouseMove]);
  const handleCanvasMouseUp = useCallback(() => {
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseUp(startTime, endTime, audioContext, duration);
    const wasDragging = isDragging !== null; // Track if we were in a drag state
    setIsDragging(null);
    
    // If we were dragging, save history now that the drag is complete
    if (wasDragging) {
      saveHistoryNow();
    } else if (result.saveHistory && !historySavedRef.current) {
      // For non-drag actions that need history saving
      historySavedRef.current = true;
      saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: audioContext?.isInverted || false });
    }
    
    if (result.executePendingJump && result.pendingJumpTime !== null) {
      jumpToTime(result.pendingJumpTime);
      if (audioRef.current) {
        audioRef.current.currentTime = result.pendingJumpTime;
        setCurrentTime(result.pendingJumpTime);
      }
    }
    if (result.executePendingHandleUpdate && result.pendingHandleUpdate !== null) {
      const updateData = result.pendingHandleUpdate;
      if (audioContext?.isInverted) {
        jumpToTime(updateData.newTime);
        if (audioRef.current) {
          audioRef.current.currentTime = updateData.newTime;
          setCurrentTime(updateData.newTime);
        }
      } else {
        if (updateData.type === 'start') handleStartTimeChange(updateData.newTime);
        else if (updateData.type === 'end') handleEndTimeChange(updateData.newTime);
      }
    }
  }, [startTime, endTime, fadeIn, fadeOut, duration, saveState, saveHistoryNow, isDragging, setIsDragging, audioRef, setCurrentTime, jumpToTime, setStartTime, setEndTime, interactionManagerRef, audioContext, handleStartTimeChange, handleEndTimeChange, historySavedRef]);

  const handleCanvasMouseLeave = useCallback(() => {
    const manager = interactionManagerRef.current;
    if (manager.handleMouseLeave().action === 'clearHover') setHoveredHandle(null);
  }, [setHoveredHandle, interactionManagerRef]);
  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave
  };
};
