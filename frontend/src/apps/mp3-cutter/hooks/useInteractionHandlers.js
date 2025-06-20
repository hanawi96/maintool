import { useCallback, useRef } from 'react';
import { WAVEFORM_CONFIG } from '../utils/constants';

// Helper function to match WaveformCanvas.js responsive handle width calculation
const getResponsiveHandleWidth = (width) =>
  width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT
    ? Math.max(3, WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH * 0.75)
    : WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH;

const getWaveformArea = (width) => {
  const handleW = getResponsiveHandleWidth(width);
  return {
    startX: handleW,
    endX: width - handleW,
    areaWidth: width - 2 * handleW,
    handleW
  };
};

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
  audioContext,
  regions = [],
  activeRegionId = null,
  onRegionUpdate = null
}) => {
  const cachedRectRef = useRef(null);
  const rafIdRef = useRef(null);
  const latestEventRef = useRef(null);
  const lastClickPositionRef = useRef(null);

  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    cachedRectRef.current = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - cachedRectRef.current.left;
    
    if (!e.isHandleEvent) {
      lastClickPositionRef.current = x;
    }
    
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
    
    if (result.action === 'updateRegion') {
      if (result.startTime !== undefined) handleStartTimeChange(result.startTime);
      if (result.endTime !== undefined) handleEndTimeChange(result.endTime);
    }
    if (result.action === 'hover' || result.cursor === 'ew-resize') setHoveredHandle(result.handle || null);
    rafIdRef.current = null;
  }, [canvasRef, duration, startTime, endTime, setHoveredHandle, interactionManagerRef, audioContext, handleStartTimeChange, handleEndTimeChange]);

  const handleCanvasMouseMove = useCallback((e) => {
    latestEventRef.current = e;
    if (!rafIdRef.current) rafIdRef.current = window.requestAnimationFrame(processMouseMove);
  }, [processMouseMove]);
  const handleCanvasMouseUp = useCallback(() => {
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseUp(startTime, endTime, audioContext, duration);
    const wasDragging = isDragging !== null;
    setIsDragging(null);
    
    if (!wasDragging && lastClickPositionRef.current !== null && activeRegionId && regions.length > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasWidth = canvas.offsetWidth || canvas.width || 800;
        const clickX = lastClickPositionRef.current;
        
        const { startX, areaWidth, handleW } = getWaveformArea(canvasWidth);
        const clickTime = ((clickX - startX) / areaWidth) * duration;
        
        let activeRegion = null;
        if (activeRegionId === 'main') {
          activeRegion = { id: 'main', start: startTime, end: endTime };
        } else {
          activeRegion = regions.find(r => r.id === activeRegionId);
        }
        
        if (activeRegion && clickTime >= 0 && clickTime <= duration) {
          const { start: regionStart, end: regionEnd } = activeRegion;
          
          const regionStartX = startX + (regionStart / duration) * areaWidth;
          const regionEndX = startX + (regionEnd / duration) * areaWidth;
          const startHandleLeft = regionStartX - handleW;
          const startHandleRight = regionStartX;
          const endHandleLeft = regionEndX;
          const endHandleRight = regionEndX + handleW;
          
          const isInStartHandle = clickX >= startHandleLeft && clickX <= startHandleRight;
          const isInEndHandle = clickX >= endHandleLeft && clickX <= endHandleRight;
          
          console.log('🎯 Region endpoint jumping check:', {
            activeRegionId,
            clickTime: clickTime.toFixed(2),
            clickX,
            canvasWidth,
            startX,
            areaWidth,
            handleW,
            isInStartHandle,
            isInEndHandle,
            regionStart: regionStart.toFixed(2),
            regionEnd: regionEnd.toFixed(2)
          });
          
          if (isInStartHandle || isInEndHandle) {
            console.log('🚫 Click in handle area, skipping endpoint jumping');
            lastClickPositionRef.current = null;
            return;
          }
          
          if (clickTime < regionStart || clickTime > regionEnd) {
            const distanceToStart = Math.abs(clickTime - regionStart);
            const distanceToEnd = Math.abs(clickTime - regionEnd);
            const isCloserToStart = distanceToStart < distanceToEnd;
            
            console.log('🎯 Click outside active region, jumping endpoint:', {
              region: activeRegion.id,
              regionStart: regionStart.toFixed(2),
              regionEnd: regionEnd.toFixed(2),
              clickTime: clickTime.toFixed(2),
              distanceToStart: distanceToStart.toFixed(2),
              distanceToEnd: distanceToEnd.toFixed(2),
              jumpingEndpoint: isCloserToStart ? 'start' : 'end'
            });
            
            let newTime = clickTime;
            if (isCloserToStart) {
              newTime = Math.max(0, Math.min(clickTime, regionEnd - 0.1));
            } else {
              newTime = Math.max(regionStart + 0.1, Math.min(clickTime, duration));
            }
            
            if (activeRegionId === 'main') {
              if (isCloserToStart) {
                console.log('🎯 Jumping main start to:', newTime.toFixed(2));
                handleStartTimeChange(newTime);
              } else {
                console.log('🎯 Jumping main end to:', newTime.toFixed(2));
                handleEndTimeChange(newTime);
              }
            } else {
              console.log('🎯 Jumping region endpoint:', {
                regionId: activeRegionId,
                endpoint: isCloserToStart ? 'start' : 'end',
                newTime: newTime.toFixed(2)
              });
              
              if (onRegionUpdate) {
                const updatedRegion = {
                  ...activeRegion,
                  [isCloserToStart ? 'start' : 'end']: newTime
                };
                onRegionUpdate(activeRegionId, updatedRegion.start, updatedRegion.end);
              }
            }
            
            lastClickPositionRef.current = null;
            return;
          }
        }
      }
    }
    
    lastClickPositionRef.current = null;
    
    if (wasDragging) {
      saveHistoryNow();
    } else if (result.saveHistory && !historySavedRef.current) {
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
  }, [startTime, endTime, fadeIn, fadeOut, duration, saveState, saveHistoryNow, setIsDragging, audioRef, setCurrentTime, jumpToTime, interactionManagerRef, audioContext, handleStartTimeChange, handleEndTimeChange, historySavedRef, activeRegionId, regions, canvasRef, onRegionUpdate, isDragging]);

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
