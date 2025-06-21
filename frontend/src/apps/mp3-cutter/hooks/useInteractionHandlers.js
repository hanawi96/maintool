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

// Helper: calculate region area boundaries (reduces redundancy)
const getRegionAreaBounds = (region, startX, areaWidth, handleW, duration) => {
  const regionStartX = startX + (region.start / duration) * areaWidth;
  const regionEndX = startX + (region.end / duration) * areaWidth;
  return {
    startX: regionStartX,
    endX: regionEndX,
    width: regionEndX - regionStartX,
    areaLeft: regionStartX - handleW,
    areaRight: regionEndX + handleW,
    handleStartLeft: regionStartX - handleW,
    handleStartRight: regionStartX,
    handleEndLeft: regionEndX,
    handleEndRight: regionEndX + handleW
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
  const dragStartPositionRef = useRef(null); // 🆕 Track drag start to detect actual dragging
  const hasDraggedRef = useRef(false); // 🆕 Track if actual dragging occurred
  const currentMousePositionRef = useRef(null); // 🆕 Track current mouse position for accurate endpoint jumping
  
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
    
    // 🆕 Reset drag tracking
    dragStartPositionRef.current = x;
    hasDraggedRef.current = false;
    
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
    
    // 🆕 Update current mouse position
    currentMousePositionRef.current = x;
    
    // 🆕 Detect if actual dragging is occurring
    if (dragStartPositionRef.current !== null) {
      const dragDistance = Math.abs(x - dragStartPositionRef.current);
      const boundsCheck = x >= 0 && x <= (canvasRef.current.width || 800);
      if (dragDistance > 3 && boundsCheck) { // 3px threshold for drag detection
        hasDraggedRef.current = true;
        console.log('🔄 Real drag detected, distance:', dragDistance, 'bounds check:', boundsCheck);
      }
    }
    
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
    
    // 🔧 CRITICAL FIX: Check dragging state BEFORE resetting it
    const wasDragging = isDragging !== null;
    const hadRealDrag = hasDraggedRef.current; // 🆕 Check if actual dragging occurred
    
    // 🔧 CRITICAL FIX: Reset dragging state AFTER checking
    setIsDragging(null);
    
    console.log('🎯 useInteractionHandlers: handleCanvasMouseUp called!', {
      wasDragging,
      hadRealDrag, // 🆕 Log real drag status
      hasClickPosition: !!lastClickPositionRef.current,
      activeRegionId,
      activeAtMouseDown: activeRegionAtMouseDownRef.current,
      regionsCount: regions.length
    });
    
    // 🆕 Reset drag tracking
    dragStartPositionRef.current = null;
    hasDraggedRef.current = false;
    
    // 🆕 Track if endpoint jumping was applied to prevent overriding cursor position
    let endpointJumpingApplied = false;
    
    // 🆕 MAIN FIX: Handle drag from outside region to move endpoint and cursor to mouse up position
    if (hadRealDrag && lastClickPositionRef.current !== null && activeRegionId) {
      console.log('🔥 useInteractionHandlers: Real drag detected, checking if we should apply endpoint jumping...', {
        activeRegionId,
        regionsCount: regions.length,
        isMainOnly: activeRegionId === 'main' && regions.length === 0,
        hadRealDrag
      });
      
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasWidth = canvas.offsetWidth || canvas.width || 800;
        const { startX, areaWidth, handleW } = getWaveformArea(canvasWidth);
        
        // 🔧 FIXED: Use current mouse position for accurate endpoint jumping
        const mouseUpX = currentMousePositionRef.current;
        
        if (mouseUpX !== null && mouseUpX >= 0 && mouseUpX <= canvasWidth) {
          const mouseUpTime = ((mouseUpX - startX) / areaWidth) * duration;
          
          let activeRegion = null;
          if (activeRegionId === 'main') {
            activeRegion = { id: 'main', start: startTime, end: endTime };
          } else {
            activeRegion = regions.find(r => r.id === activeRegionId);
          }
          
          if (activeRegion && mouseUpTime >= 0 && mouseUpTime <= duration) {
            const { start: regionStart, end: regionEnd } = activeRegion;
            
            console.log('🎯 Drag endpoint analysis:', {
              activeRegionId,
              mouseUpX: mouseUpX.toFixed(2),
              mouseUpTime: mouseUpTime.toFixed(2),
              regionStart: regionStart.toFixed(2),
              regionEnd: regionEnd.toFixed(2),
              isBeforeStart: mouseUpTime < regionStart,
              isAfterEnd: mouseUpTime > regionEnd,
              isMainOnly: activeRegionId === 'main' && regions.length === 0
            });
            
            // 🎯 Determine which endpoint to move based on mouse up position relative to active region
            const isBeforeStart = mouseUpTime < regionStart;
            const isAfterEnd = mouseUpTime > regionEnd;
            
            if (isBeforeStart || isAfterEnd) {
              // 🔧 Calculate safe boundary for endpoint jumping
              let newTime = mouseUpTime;
              let updateType = null;
              
              if (isBeforeStart) {
                // Mouse up before active region start - move start point to mouse up position
                newTime = Math.max(0, Math.min(mouseUpTime, regionEnd - 0.1));
                updateType = 'start';
                console.log('🎯 Drag ended BEFORE active region start - applying endpoint jumping to move start point');
              } else if (isAfterEnd) {
                // Mouse up after active region end - move end point to mouse up position
                newTime = Math.max(regionStart + 0.1, Math.min(mouseUpTime, duration));
                updateType = 'end';
                console.log('🎯 Drag ended AFTER active region end - applying endpoint jumping to move end point');
              }
              
              // 🆕 Apply endpoint jumping to BOTH main selection AND regions
              if (updateType) {
                if (activeRegionId === 'main') {
                  // Update main selection
                  if (updateType === 'start') {
                    handleStartTimeChange(newTime);
                    console.log('✅ Updated main selection START to:', newTime.toFixed(2));
                    // Jump cursor to start position
                    jumpToTime(newTime);
                    console.log('🎯 Set cursor to new start position:', newTime.toFixed(2));
                    endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
                  } else {
                    handleEndTimeChange(newTime);
                    console.log('✅ Updated main selection END to:', newTime.toFixed(2));
                    // 🎯 Set cursor 3 seconds before endpoint (like drag handle right)
                    const regionDuration = newTime - regionStart;
                    const cursorPosition = regionDuration < 3 ? regionStart : Math.max(regionStart, newTime - 3);
                    jumpToTime(cursorPosition);
                    console.log('🎯 Set cursor position for main selection END:', cursorPosition.toFixed(2), '(3 seconds before endpoint)');
                    endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
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
                    
                    // 🎯 Set cursor position for region updates (like drag handle)
                    if (updateType === 'start') {
                      jumpToTime(newTime);
                      console.log('🎯 Set cursor to new start position:', newTime.toFixed(2));
                      endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
                    } else {
                      // Set cursor 3 seconds before endpoint (like drag handle right)
                      const regionDuration = newTime - updatedRegion.start;
                      const cursorPosition = regionDuration < 3 ? updatedRegion.start : Math.max(updatedRegion.start, newTime - 3);
                      jumpToTime(cursorPosition);
                      console.log('🎯 Set cursor position for region END:', cursorPosition.toFixed(2), '(3 seconds before endpoint)');
                      endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
                    }
                  } else {
                    console.warn('⚠️ onRegionUpdate not provided, cannot update region');
                  }
                }
              }
            } else {
              // Mouse up within active region - just jump cursor to mouse up position
              console.log('🎯 Drag ended within active region - jumping cursor to mouse up position:', mouseUpTime.toFixed(2));
              jumpToTime(mouseUpTime);
              endpointJumpingApplied = true;
            }
          } else {
            console.log('🚫 Invalid active region or mouse up time outside bounds');
          }
        } else {
          console.log('🚫 Invalid mouse up position:', mouseUpX);
        }
      } else {
        console.log('🚫 Canvas not found, skipping drag endpoint jumping');
      }
    }
    // 🆕 Enhanced cursor jumping and endpoint jumping logic - Apply to ALL active regions including main
    // 🔧 CRITICAL FIX: Use hadRealDrag instead of wasDragging for the main condition
    // 🔧 MAIN FIX: Allow endpoint jumping for main region even when regions.length === 0
    else if (!hadRealDrag && lastClickPositionRef.current !== null && activeRegionId) {
      console.log('🔥 useInteractionHandlers: Entering cursor/endpoint jumping logic (no real drag detected)...', {
        activeRegionId,
        regionsCount: regions.length,
        isMainOnly: activeRegionId === 'main' && regions.length === 0,
        wasDragging,
        hadRealDrag
      });
      
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
          hasClickPosition: !!lastClickPositionRef.current,
          hadRealDrag,
          isMainOnly: activeRegionId === 'main' && regions.length === 0
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
            const regionBounds = getRegionAreaBounds(activeRegion, startX, areaWidth, handleW, duration);
            
            const isInStartHandle = clickX >= regionBounds.handleStartLeft && clickX <= regionBounds.handleStartRight;
            const isInEndHandle = clickX >= regionBounds.handleEndLeft && clickX <= regionBounds.handleEndRight;
            
            // 🔍 Check if click is within ANY region area (not just active region)
            let isClickInAnyRegionArea = false;
            if (regions.length > 0) {
              for (const region of regions) {
                const bounds = getRegionAreaBounds(region, startX, areaWidth, handleW, duration);
                
                if (clickX >= bounds.areaLeft && clickX <= bounds.areaRight) {
                  isClickInAnyRegionArea = true;
                  console.log('🎯 Click detected within region area:', region.id || region.name);
                  break;
                }
              }
            }
            
            // 🔍 Check if click is within main selection area
            const mainBounds = getRegionAreaBounds(
              { start: startTime, end: endTime }, 
              startX, areaWidth, handleW, duration
            );
            const isClickInMainArea = clickX >= mainBounds.areaLeft && clickX <= mainBounds.areaRight;
            
            if (isClickInMainArea && activeRegionId === 'main') {
              isClickInAnyRegionArea = true;
              console.log('🎯 Click detected within main selection area');
            }
            
            console.log('🎯 Active region click analysis:', {
              activeRegionId,
              clickTime: clickTime.toFixed(2),
              regionStart: regionStart.toFixed(2),
              regionEnd: regionEnd.toFixed(2),
              clickX: clickX,
              isInStartHandle,
              isInEndHandle,
              isInsideRegion: clickTime >= regionStart && clickTime <= regionEnd,
              isBeforeStart: clickTime < regionStart,
              isAfterEnd: clickTime > regionEnd,
              isClickInAnyRegionArea,
              isClickInMainArea,
              shouldApplyEndpointJumping: !isClickInAnyRegionArea && !isInStartHandle && !isInEndHandle,
              hadRealDrag,
              isMainOnly: activeRegionId === 'main' && regions.length === 0
            });
            
            // Skip if clicking on handles
            if (isInStartHandle || isInEndHandle) {
              console.log('🚫 Click in handle area, skipping cursor/endpoint jumping');
              lastClickPositionRef.current = null;
              activeRegionAtMouseDownRef.current = null;
              return;
            }
            
            // 🆕 UPDATED CONDITION: Apply endpoint jumping for clicks OUTSIDE region areas OR for main-only scenarios
            if (isClickInAnyRegionArea) {
              // ✅ Click INSIDE region area - jump cursor to click point (normal behavior)
              if (clickTime >= regionStart && clickTime <= regionEnd) {
                console.log('🎯 Click INSIDE already-active region - jumping cursor to click point:', clickTime.toFixed(2));
                console.log('🔍 DEBUG: Before jumpToTime - audio.currentTime:', audioRef?.current?.currentTime?.toFixed(2));
                jumpToTime(clickTime);
                console.log('🔍 DEBUG: After jumpToTime - audio.currentTime:', audioRef?.current?.currentTime?.toFixed(2));
                
                // 🔧 CRITICAL FIX: Clear pending operations to prevent double jumping
                lastClickPositionRef.current = null;
                activeRegionAtMouseDownRef.current = null;
                return;
              } else {
                console.log('🚫 Click within region area but outside active region - no action (let region selection handle)');
              }
              lastClickPositionRef.current = null;
              activeRegionAtMouseDownRef.current = null;
              return;
            }
            
            // 🆕 ENDPOINT JUMPING LOGIC: Works for empty area clicks OR main-only scenarios
            const isMainOnly = activeRegionId === 'main' && regions.length === 0;
            
            if (isMainOnly) {
              console.log('🔧 Main-only scenario - applying endpoint jumping for clicks outside main region');
            } else {
              console.log('🔧 Click in EMPTY AREA - applying endpoint jumping to active region');
            }
            
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
              console.log('🎯 Click BEFORE active region start - applying endpoint jumping to move start point');
            } else if (isAfterEnd) {
              // Click after active region end - move end point to click position
              newTime = Math.max(regionStart + 0.1, Math.min(clickTime, duration));
              updateType = 'end';
              console.log('🎯 Click AFTER active region end - applying endpoint jumping to move end point');
            } else {
              // Click within active region - just jump cursor
              console.log('🎯 Click within active region - jumping cursor to click point:', clickTime.toFixed(2));
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
                  // Jump cursor to start position
                  jumpToTime(newTime);
                  console.log('🎯 Set cursor to new start position:', newTime.toFixed(2));
                  endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
                } else {
                  handleEndTimeChange(newTime);
                  console.log('✅ Updated main selection END to:', newTime.toFixed(2));
                  // 🎯 Set cursor 3 seconds before endpoint (like drag handle right)
                  const regionDuration = newTime - regionStart;
                  const cursorPosition = regionDuration < 3 ? regionStart : Math.max(regionStart, newTime - 3);
                  jumpToTime(cursorPosition);
                  console.log('🎯 Set cursor position for main selection END:', cursorPosition.toFixed(2), '(3 seconds before endpoint)');
                  endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
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
                  
                  // 🎯 Set cursor position for region updates (like drag handle)
                  if (updateType === 'start') {
                    jumpToTime(newTime);
                    console.log('🎯 Set cursor to new start position:', newTime.toFixed(2));
                    endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
                  } else {
                    // Set cursor 3 seconds before endpoint (like drag handle right)
                    const regionDuration = newTime - updatedRegion.start;
                    const cursorPosition = regionDuration < 3 ? updatedRegion.start : Math.max(updatedRegion.start, newTime - 3);
                    jumpToTime(cursorPosition);
                    console.log('🎯 Set cursor position for region END:', cursorPosition.toFixed(2), '(3 seconds before endpoint)');
                    endpointJumpingApplied = true; // 🎯 Mark that endpoint jumping was applied
                  }
                } else {
                  console.warn('⚠️ onRegionUpdate not provided, cannot update region');
                }
              }
            }
          } else {
            console.log('🚫 Invalid active region or click time outside bounds');
          }
        } else {
          console.log('🚫 Region was not already active, skipping cursor/endpoint jumping');
        }
      } else {
        console.log('🚫 Canvas not found, skipping cursor/endpoint jumping');
      }
    } else if (hadRealDrag) {
      console.log('🚫 Real drag detected, skipping cursor/endpoint jumping');
    } else if (!lastClickPositionRef.current) {
      console.log('🚫 No click position stored, skipping cursor/endpoint jumping');
    } else if (!activeRegionId) {
      console.log('🚫 No active region, skipping cursor/endpoint jumping');
    } else {
      console.log('🔧 DEBUG: Cursor jumping conditions not met', {
        hadRealDrag,
        hasClickPosition: !!lastClickPositionRef.current,
        activeRegionId,
        wasDragging
      });
    }
    
    // Clean up
    lastClickPositionRef.current = null;
    activeRegionAtMouseDownRef.current = null;
    currentMousePositionRef.current = null;
    
    // 🎯 MAIN FIX: Only execute pending operations if endpoint jumping was NOT applied
    if (!endpointJumpingApplied) {
      // Handle pending operations from interaction manager
      if (result.executePendingJump && result.pendingJumpTime !== null) {
        console.log('🎯 Executing pending jump to:', result.pendingJumpTime);
        setCurrentTime(result.pendingJumpTime);
      }
      
      if (result.executePendingHandleUpdate && result.pendingHandleUpdate) {
        const updateData = result.pendingHandleUpdate;
        console.log('🎯 Executing pending handle update:', updateData);
        setCurrentTime(updateData.newTime);
      }
    } else {
      console.log('🚫 Skipping pending operations - endpoint jumping was applied, preserving cursor position');
    }
    
    if (result.saveHistory) saveHistoryNow();
  }, [startTime, endTime, duration, saveHistoryNow, setIsDragging, setCurrentTime, jumpToTime, interactionManagerRef, audioContext, handleStartTimeChange, handleEndTimeChange, activeRegionId, regions, canvasRef, onRegionUpdate, isDragging, audioRef]);

  const handleCanvasMouseLeave = useCallback(() => {
    const manager = interactionManagerRef.current;
    if (manager.handleMouseLeave().action === 'clearHover') setHoveredHandle(null);
  }, [setHoveredHandle, interactionManagerRef]);
  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave,
    // 🆕 Expose drag tracking refs for debugging if needed
    dragStartPositionRef,
    hasDraggedRef,
    currentMousePositionRef
  };
};
