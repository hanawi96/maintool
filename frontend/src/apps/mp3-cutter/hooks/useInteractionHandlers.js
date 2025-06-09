import { useCallback, useRef, useMemo, useEffect } from 'react';

// 🎯 **INTERACTION HANDLERS HOOK**: Extract interaction logic for better code organization
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

  // 🚀 **OPTIMIZE OBJECT CREATION**: Memoize audioContext to prevent recreation
  const audioContext = useMemo(() => ({
    audioRef,
    setCurrentTime,
    isPlaying
  }), [audioRef, setCurrentTime, isPlaying]);

  // 🔧 **DEBUG HOVER STATE**: Track hover state changes for cursor debugging
  useEffect(() => {
    if (hoveredHandle !== null) {
      console.log(`🎯 [HoverState] Handle hover set to: ${hoveredHandle} - should trigger cursor update to ew-resize`);
    } else {
      console.log(`🎯 [HoverState] Handle hover cleared - should trigger cursor update to pointer`);
    }
  }, [hoveredHandle]);

  // 🎯 **MOUSE DOWN HANDLER**
  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // 🆕 **EXTRACT EVENT INFO**: Extract additional event information
    const eventInfo = {
      isHandleEvent: e.isHandleEvent || false,
      handleType: e.handleType || null,
      originalEvent: e.originalEvent || e
    };
    
    console.log('🖱️ [MOUSE-DOWN] Event info extracted:', {
      isHandleEvent: eventInfo.isHandleEvent,
      handleType: eventInfo.handleType,
      mouseX: x.toFixed(1),
      eventSource: eventInfo.isHandleEvent ? 'HANDLE' : 'CANVAS'
    });
    
    // 🎯 Use InteractionManager for smart handling with eventInfo
    const result = interactionManagerRef.current.handleMouseDown(
      x, canvasRef.current.width, duration, startTime, endTime, eventInfo
    );
    
    // 🎯 Process action based on result
    const processAction = () => {
      switch (result.action) {
        case 'startDrag':
          setIsDragging(result.handle);
          
          // 🚫 **REMOVE IMMEDIATE CURSOR SYNC**: Don't sync cursor on mousedown - only on mouseup
          console.log(`🎯 [HandleMouseDown] Handle drag started: ${result.handle} - cursor sync DELAYED until mouseup`);
          break;
          
        case 'pendingJump':
          // 🆕 **DELAYED JUMP**: Setup pending jump để tránh shock khi drag region
          console.log(`⏳ [HandleMouseDown] Pending jump setup - cursor sync DELAYED until mouseup`);
          
          // 🔧 **FIX REGION DRAG POTENTIAL**: Xử lý regionDragPotential trong case pendingJump
          if (result.regionDragPotential) {
            // 🎯 **IMMEDIATE CURSOR FEEDBACK**: Set drag state for immediate cursor change to move arrow
            setIsDragging('region-potential'); // Special state for immediate cursor feedback
            console.log(`🔄 [RegionDragPotential] Set cursor to region-potential for IMMEDIATE move cursor feedback (4-way arrow) - FIXED in pendingJump case`);
            
            // 🔧 **ENHANCED DEBUG**: Extra debug để track state change
            console.log(`🎯 [StateDebug] isDragging state changed to 'region-potential' for immediate move cursor`);
            
            // 🆕 **CURSOR UPDATE VERIFICATION**: Verify cursor will be updated
            console.log(`🔄 [CursorTrigger] State change should trigger cursor update in WaveformCanvas detectCursorType()`);
            
            // 🆕 **FORCE CURSOR UPDATE DEBUG**: Log để verify cursor sẽ được update
            console.log(`🎯 [CursorDebug] isDragging='region-potential' should trigger useEffect in WaveformCanvas for immediate cursor change`);
          }
          break;
          
        case 'createSelection':
          setStartTime(result.startTime);
          setEndTime(result.endTime);
          setIsDragging(result.handle || 'end');
          console.log(`🆕 [HandleMouseDown] Selection created - drag handle: ${result.handle || 'end'}`);
          break;
          
        case 'startRegionDrag':
          // 🆕 **REGION DRAG**: Setup region dragging - cursor đổi ngay lập tức
          setIsDragging('region'); // Special drag type for region
          
          // 🚫 **NO IMMEDIATE CURSOR SYNC**: Don't move audio cursor on mousedown for region drag
          console.log(`🔄 [HandleMouseDown] Region drag started - cursor will stay at current position until mouseup`);
          break;
          
        case 'pendingHandleUpdate':
          // 🆕 **DELAYED HANDLE UPDATE**: Setup pending handle update
          console.log(`⏳ [HandleMouseDown] Pending handle update setup - will execute on mouseup`);
          break;
          
        case 'none':
        default:
          // 🔥 **REGION DRAG POTENTIAL**: Check if this is a potential region drag (fallback case)
          if (result.regionDragPotential) {
            // 🎯 **IMMEDIATE CURSOR FEEDBACK**: Set drag state for immediate cursor change to move arrow
            setIsDragging('region-potential'); // Special state for immediate cursor feedback
            console.log(`🔄 [RegionDragPotential] Set cursor to region-potential for IMMEDIATE move cursor feedback (4-way arrow) - fallback case`);
            
            // 🆕 **CURSOR UPDATE VERIFICATION**: Verify cursor will be updated
            console.log(`🔄 [CursorTrigger] State change should trigger cursor update in WaveformCanvas detectCursorType()`);
          }
          break;
      }
    };
    
    // 🚀 **IMMEDIATE PROCESSING**: Process action ngay lập tức
    processAction();
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setIsDragging, interactionManagerRef]);

  // 🎯 **MOUSE MOVE HANDLER**
  const handleCanvasMouseMove = useCallback((e) => {
    const now = performance.now();
    
    // 🚀 **SIMPLIFIED THROTTLING**: 60fps max cho tất cả interactions
    const throttleInterval = 16; // 60fps - sufficient for smooth UX
    
    if (now - lastMouseTimeRef.current < throttleInterval) return;
    lastMouseTimeRef.current = now;
    
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // 🎯 Use InteractionManager for smart handling WITH audio sync
    const manager = interactionManagerRef.current;
    const result = manager.handleMouseMove(
      x, canvas.width, duration, startTime, endTime, audioContext
    );
    
    // 🆕 **ENHANCED VALIDATION**: Chỉ process action nếu logic hợp lệ
    const processAction = () => {
      switch (result.action) {
        case 'updateRegion':
          // 🆕 **STRICT VALIDATION**: CHỈ update region nếu đã confirmed drag
          if (result.isDraggingConfirmed) {
            // 🆕 **REGION DRAG ACTIVATION**: Set drag state when region drag is activated
            if (result.isRegionDrag && isDragging !== 'region') {
              setIsDragging('region'); // Upgrade from region-potential to region
              console.log(`🔄 [RegionDragActivation] Upgraded from ${isDragging} to region - drag confirmed`);
            }
            
            if (result.startTime !== undefined) setStartTime(result.startTime);
            if (result.endTime !== undefined) setEndTime(result.endTime);
            
            // 🚫 **NO AUDIO SYNC DURING DRAG**: Audio cursor stays at current position during drag
            console.log(`🔄 [RegionUpdate] Region updated during drag - audio cursor unchanged`);
          }
          break;
          
        case 'updateHover':
          // 🆕 **SMOOTH HOVER**: Process hover immediately
          // 🔧 **ENHANCED HOVER LOGGING**: Track hover state changes for cursor debugging
          if (result.handle !== hoveredHandle) {
            console.log(`🔄 [HoverStateChange] Handle hover: ${hoveredHandle || 'none'} → ${result.handle || 'none'}`);
          }
          setHoveredHandle(result.handle);
          break;
          
        default:
          break;
      }
    };
    
    // 🚀 **IMMEDIATE PROCESSING**: Process ALL actions immediately
    if (result.significant && result.isDraggingConfirmed) {
      processAction(); // Immediate for confirmed dragging
    } else if (result.action === 'updateHover') {
      processAction(); // 🚀 **IMMEDIATE HOVER**: Process hover immediately
    } else if (result.action !== 'none') {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(processAction);
      } else {
        setTimeout(processAction, 0);
      }
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setHoveredHandle, setIsDragging, interactionManagerRef, audioContext, isDragging, hoveredHandle]); // 🔧 **REMOVED UNNECESSARY DEPENDENCIES**

  // 🎯 **MOUSE UP HANDLER**
  const handleCanvasMouseUp = useCallback(() => {
    const manager = interactionManagerRef.current;
    
    // 🎯 Use InteractionManager for smart handling WITH final audio sync
    const result = manager.handleMouseUp(startTime, endTime, audioContext);
    
    // 🎯 Process action based on result
    const processAction = () => {
      switch (result.action) {
        case 'completeDrag':
          setIsDragging(null);
          
          // 🎯 Save history after drag completion
          if (result.saveHistory) {
            setTimeout(() => {
              saveState({ startTime, endTime, fadeIn, fadeOut });
            }, 100);
          }
          break;
          
        default:
          // 🔥 **RESET POTENTIAL DRAG**: Reset any potential drag state on mouse up
          if (isDragging === 'region-potential') {
            console.log(`🔄 [RegionDragReset] Reset from region-potential to null - no drag confirmed`);
          }
          setIsDragging(null);
          break;
      }
      
      // 🆕 **EXECUTE DELAYED JUMP**: Execute pending jump nếu không có drag movement
      if (result.executePendingJump && result.pendingJumpTime !== null) {
        // 🚀 **DELAYED CURSOR SYNC**: Jump cursor ONLY on mouseup as requested
        console.log(`🎯 [DelayedCursorSync] Moving audio cursor to ${result.pendingJumpTime.toFixed(2)}s on mouseup`);
        jumpToTime(result.pendingJumpTime);
        
        // 🚀 **FORCE IMMEDIATE UPDATE**: Đảm bảo cursor update ngay lập tức
        if (audioRef.current) {
          audioRef.current.currentTime = result.pendingJumpTime;
          setCurrentTime(result.pendingJumpTime);
        }
      }
      
      // 🆕 **EXECUTE DELAYED HANDLE UPDATE**: Execute pending handle update
      if (result.executePendingHandleUpdate && result.pendingHandleUpdate !== null) {
        const updateData = result.pendingHandleUpdate;
        
        if (updateData.type === 'start') {
          // 🚀 **UPDATE START HANDLE**: Update start time and sync cursor
          setStartTime(updateData.newTime);
          
          // 🚀 **DELAYED CURSOR SYNC**: Sync audio cursor to new start position ONLY on mouseup
          console.log(`🎯 [DelayedHandleSync] Moving audio cursor to start handle: ${updateData.newTime.toFixed(2)}s on mouseup`);
          if (audioRef.current) {
            audioRef.current.currentTime = updateData.newTime;
            setCurrentTime(updateData.newTime);
          }
          
          // 🚀 **SAVE HISTORY**: Save state after handle update
          setTimeout(() => {
            saveState({ startTime: updateData.newTime, endTime, fadeIn, fadeOut });
          }, 100);
          
        } else if (updateData.type === 'end') {
          // 🚀 **UPDATE END HANDLE**: Update end time and sync cursor with preview
          setEndTime(updateData.newTime);
          
          // 🚀 **DELAYED CURSOR SYNC**: Sync to preview position (3s before end) ONLY on mouseup
          const previewTime = Math.max(0, updateData.newTime - 3.0);
          console.log(`🎯 [DelayedHandleSync] Moving audio cursor to end handle preview: ${previewTime.toFixed(2)}s on mouseup`);
          if (audioRef.current) {
            audioRef.current.currentTime = previewTime;
            setCurrentTime(previewTime);
          }
          
          // 🚀 **SAVE HISTORY**: Save state after handle update
          setTimeout(() => {
            saveState({ startTime, endTime: updateData.newTime, fadeIn, fadeOut });
          }, 100);
        }
      }
    };
    
    // 🎯 BATCH UPDATES
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processAction);
    } else {
      setTimeout(processAction, 0);
    }
  }, [startTime, endTime, fadeIn, fadeOut, saveState, setIsDragging, audioRef, setCurrentTime, jumpToTime, setStartTime, setEndTime, interactionManagerRef, audioContext, isDragging]); // 🔧 **REMOVED isPlaying DEPENDENCY**

  // 🎯 **MOUSE LEAVE HANDLER**
  const handleCanvasMouseLeave = useCallback(() => {
    const manager = interactionManagerRef.current;
    
    // 🎯 Use InteractionManager for smart handling
    const result = manager.handleMouseLeave();
    
    // 🎯 Process action based on result
    const processAction = () => {
      if (result.action === 'clearHover') {
        setHoveredHandle(null);
        
        // 🔧 **SMART RESET**: Only force reset if NOT maintaining drag state
        if (result.forceReset && !result.maintainDragState) {
          setIsDragging(null); // Reset drag state only when safe
          console.log(`🛡️ [ForceReset] All interaction states reset on mouse leave - no active drag`);
        } else if (result.maintainDragState) {
          // 🚀 **MAINTAIN DRAG**: Keep drag state for seamless re-entry
          console.log(`🔄 [MaintainDrag] Drag state preserved on mouse leave - can re-enter and continue dragging`);
          // Don't reset isDragging - keep it active for re-entry
        }
      }
    };
    
    // 🎯 IMMEDIATE PROCESSING for mouse leave
    processAction();
  }, [setHoveredHandle, setIsDragging, interactionManagerRef]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave
  };
}; 