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
  
  // 🆕 Track the activeRegionId at the moment of mouse down to detect selection vs active click
  const activeRegionAtMouseDownRef = useRef(null);

  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    cachedRectRef.current = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - cachedRectRef.current.left;
    
    console.log('🎯 useInteractionHandlers: handleCanvasMouseDown called!', {
      isHandleEvent: e.isHandleEvent,
      isMainSelectionClick: e.isMainSelectionClick,
      clickX: x,
      activeRegionId,
      regionsCount: regions.length
    });
    
    // 🆕 Capture activeRegionId at mouse down to detect if this is a selection click or active click
    activeRegionAtMouseDownRef.current = activeRegionId;
    
    // 🆕 Store click position for potential cursor jumping/endpoint jumping
    // Skip storing position if this is a main selection click (to prevent double jumping)
    if (!e.isHandleEvent && !e.isMainSelectionClick) {
      lastClickPositionRef.current = x;
      console.log('✅ useInteractionHandlers: Click position stored for potential jumping:', x);
    } else if (e.isMainSelectionClick) {
      console.log('🚫 useInteractionHandlers: Main selection click detected - skipping position storage to prevent double jumping');
      lastClickPositionRef.current = null;
    } else if (e.isHandleEvent) {
      console.log('🚫 useInteractionHandlers: Handle event detected - skipping position storage');
      lastClickPositionRef.current = null;
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
      handleType: e.handleType || null,
      isMainSelectionClick: e.isMainSelectionClick || false
    });
    if (
      result.action === 'startDrag' ||
      (result.action === 'pendingJump' && result.regionDragPotential) ||
      result.action === 'createSelection'
    ) {
      historySavedRef.current = false;
    }    if (
      result.action === 'startDrag' ||
      (result.action === 'pendingJump' && result.regionDragPotential) ||
      result.action === 'createSelection'
    ) {
      historySavedRef.current = false;
    }
    if (result.action === 'startDrag') {
      // Handle both regular drag and main selection drag
      if (result.mainSelectionDrag) {
        setIsDragging('region-potential'); // Start with potential, will become 'region' when confirmed
      } else {
        setIsDragging(result.handle);
      }
    }
    else if (result.action === 'pendingJump' && result.regionDragPotential) setIsDragging('region-potential');
    else if (result.action === 'createSelection') {
      setStartTime(result.startTime);
      setEndTime(result.endTime);
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setIsDragging, interactionManagerRef, audioContext, saveState, fadeIn, fadeOut, handleStartTimeChange, handleEndTimeChange, historySavedRef, activeRegionId, regions]);

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
    
    console.log('🎯 useInteractionHandlers: handleCanvasMouseUp called!', {
      wasDragging,
      hasClickPosition: !!lastClickPositionRef.current,
      activeRegionId,
      activeAtMouseDown: activeRegionAtMouseDownRef.current,
      regionsCount: regions.length
    });
    
    // 🆕 Enhanced cursor jumping and endpoint jumping logic - Apply to ALL active regions including main
    if (!wasDragging && lastClickPositionRef.current !== null && activeRegionId && regions.length > 0) {
      console.log('🔥 useInteractionHandlers: Entering cursor/endpoint jumping logic...');
      const canvas = canvasRef.current;
      if (canvas) {
        // 🔧 Check if region was ALREADY active at mouse down (not a selection click)
        const wasAlreadyActive = activeRegionAtMouseDownRef.current === activeRegionId;
        const isSelectionClick = activeRegionAtMouseDownRef.current !== activeRegionId;
        
        console.log('🎯 Click analysis:', {
          activeRegionId,
          activeAtMouseDown: activeRegionAtMouseDownRef.current,
          wasAlreadyActive,
          isSelectionClick,
          shouldJumpCursor: wasAlreadyActive,
          hasClickPosition: !!lastClickPositionRef.current
        });
        
        // 🚫 Skip for selection clicks - let region selection handler take care of it
        if (isSelectionClick) {
          console.log('🚫 Selection click detected - skipping jumping logic, letting region selection handle it');
          lastClickPositionRef.current = null;
          activeRegionAtMouseDownRef.current = null;
          return;
        }
        
        // ✅ Proceed with cursor/endpoint jumping only for already-active regions
        if (wasAlreadyActive) {
          console.log('✅ useInteractionHandlers: Proceeding with cursor/endpoint jumping for already-active region');
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
            
            // 🆕 Additional validation: Only apply endpoint jumping for clicks OUTSIDE any region areas
            // This ensures we don't interfere with region selection or internal region clicks
            const regionStartX = startX + (regionStart / duration) * areaWidth;
            const regionEndX = startX + (regionEnd / duration) * areaWidth;
            const startHandleLeft = regionStartX - handleW;
            const startHandleRight = regionStartX;
            const endHandleLeft = regionEndX;
            const endHandleRight = regionEndX + handleW;
            
            const isInStartHandle = clickX >= startHandleLeft && clickX <= startHandleRight;
            const isInEndHandle = clickX >= endHandleLeft && clickX <= endHandleRight;
            
            // 🔍 Check if click is within ANY region area (not just active region)
            let isClickInAnyRegionArea = false;
            if (regions.length > 0) {
              for (const region of regions) {
                const regStartX = startX + (region.start / duration) * areaWidth;
                const regEndX = startX + (region.end / duration) * areaWidth;
                const regAreaLeft = regStartX - handleW;
                const regAreaRight = regEndX + handleW;
                
                if (clickX >= regAreaLeft && clickX <= regAreaRight) {
                  isClickInAnyRegionArea = true;
                  console.log('🎯 Click detected within region area:', region.id || region.name);
                  break;
                }
              }
            }
            
            // 🔍 Check if click is within main selection area
            const mainStartX = startX + (startTime / duration) * areaWidth;
            const mainEndX = startX + (endTime / duration) * areaWidth;
            const mainAreaLeft = mainStartX - handleW;
            const mainAreaRight = mainEndX + handleW;
            const isClickInMainArea = clickX >= mainAreaLeft && clickX <= mainAreaRight;
            
            if (isClickInMainArea && activeRegionId === 'main') {
              isClickInAnyRegionArea = true;
              console.log('🎯 Click detected within main selection area');
            }
            
            console.log('🎯 Active region click analysis:', {
              activeRegionId,
              clickTime: clickTime.toFixed(2),
              regionStart: regionStart.toFixed(2),
              regionEnd: regionEnd.toFixed(2),
              isInStartHandle,
              isInEndHandle,
              isInsideRegion: clickTime >= regionStart && clickTime <= regionEnd,
              isBeforeStart: clickTime < regionStart,
              isAfterEnd: clickTime > regionEnd,
              isClickInAnyRegionArea,
              isClickInMainArea,
              shouldApplyEndpointJumping: !isClickInAnyRegionArea && !isInStartHandle && !isInEndHandle
            });
            
            // Skip if clicking on handles
            if (isInStartHandle || isInEndHandle) {
              console.log('🚫 Click in handle area, skipping cursor/endpoint jumping');
              lastClickPositionRef.current = null;
              activeRegionAtMouseDownRef.current = null;
              return;
            }
            
            // 🆕 NEW CONDITION: Only apply logic if click is NOT within any region area
            // This ensures endpoint jumping only works for clicks in empty waveform areas
            if (isClickInAnyRegionArea) {
              // ✅ Click INSIDE region area - jump cursor to click point (normal behavior)
              if (clickTime >= regionStart && clickTime <= regionEnd) {
                console.log('🎯 Click INSIDE already-active region - jumping cursor to click point:', clickTime.toFixed(2));
                jumpToTime(clickTime);
              } else {
                console.log('🚫 Click within region area but outside active region - no action (let region selection handle)');
              }
              lastClickPositionRef.current = null;
              activeRegionAtMouseDownRef.current = null;
              return;
            }
            
            // 🆕 NEW LOGIC: Click in EMPTY AREA outside all regions - apply endpoint jumping to active region
            console.log('🔧 Click in EMPTY AREA - applying endpoint jumping to active region');
            
            // 🎯 Determine which endpoint to move based on click position relative to active region
            const isBeforeStart = clickTime < regionStart;
            const isAfterEnd = clickTime > regionEnd;
            
            // 🔧 Calculate safe boundary for endpoint jumping
            let newTime = clickTime;
            let updateType = null;
            
            if (isBeforeStart) {
              // Click before active region start - move start point to click position
              newTime = Math.max(0, Math.min(clickTime, regionEnd - 0.1));
              updateType = 'start';
              console.log('📍 Moving active region START point to click position:', newTime.toFixed(2));
            } else if (isAfterEnd) {
              // Click after active region end - move end point to click position
              newTime = Math.max(regionStart + 0.1, Math.min(clickTime, duration));
              updateType = 'end';
              console.log('📍 Moving active region END point to click position:', newTime.toFixed(2));
            } else {
              // Click within active region - just jump cursor
              console.log('🎯 Click within active region in empty area - jumping cursor to click point:', clickTime.toFixed(2));
              jumpToTime(clickTime);
              lastClickPositionRef.current = null;
              activeRegionAtMouseDownRef.current = null;
              return;
            }
            
            // 🆕 Apply endpoint jumping to BOTH main selection AND regions
            if (updateType) {
              if (activeRegionId === 'main') {
                // Update main selection
                if (updateType === 'start') {
                  handleStartTimeChange(newTime);
                  console.log('✅ Updated main selection START to:', newTime.toFixed(2));
                } else {
                  handleEndTimeChange(newTime);
                  console.log('✅ Updated main selection END to:', newTime.toFixed(2));
                }
              } else {
                // Update region
                if (onRegionUpdate) {
                  const updatedRegion = {
                    ...activeRegion,
                    [updateType]: newTime
                  };
                  onRegionUpdate(activeRegionId, updatedRegion.start, updatedRegion.end);
                  console.log('✅ Updated region', activeRegionId, updateType.toUpperCase(), 'to:', newTime.toFixed(2));
                }
              }
              
              lastClickPositionRef.current = null;
              activeRegionAtMouseDownRef.current = null;
              return;
            }
          }
        }
      }
    } else {
      console.log('🚫 useInteractionHandlers: Skipping cursor/endpoint jumping logic - conditions not met:', {
        wasDragging,
        hasClickPosition: !!lastClickPositionRef.current,
        activeRegionId: !!activeRegionId,
        hasRegions: regions.length > 0
      });
    }
    
    // 🔧 Reset tracking refs
    console.log('🔧 useInteractionHandlers: Resetting tracking refs');
    lastClickPositionRef.current = null;
    activeRegionAtMouseDownRef.current = null;
    
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
