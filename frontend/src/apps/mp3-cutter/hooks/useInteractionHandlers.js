import { useCallback, useRef, useMemo } from 'react';

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

  // 🎯 **MOUSE DOWN HANDLER**
  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // 🎯 Use InteractionManager for smart handling
    const result = interactionManagerRef.current.handleMouseDown(
      x, canvasRef.current.width, duration, startTime, endTime
    );
    
    // 🎯 Process action based on result
    const processAction = () => {
      switch (result.action) {
        case 'startDrag':
          setIsDragging(result.handle);
          
          // 🆕 **IMMEDIATE CURSOR SYNC**: Sync cursor ngay lập tức khi click handle
          if (result.immediateSync && result.immediateSync.required) {
            const { handleType, targetTime, offsetForEnd } = result.immediateSync;
            
            // 🔥 **USE AUDIO SYNC MANAGER**: Sử dụng forceImmediateSync cho consistency
            const manager = interactionManagerRef.current;
            if (manager && manager.audioSyncManager) {
              const syncSuccess = manager.audioSyncManager.forceImmediateSync(
                targetTime, audioRef, setCurrentTime, handleType, offsetForEnd
              );
              
              if (!syncSuccess) {
                console.warn(`⚠️ [HandleClick] Audio sync manager failed for ${handleType} handle`);
              }
            } else {
              // 🔄 **FALLBACK**: Manual sync nếu không có AudioSyncManager
              let syncTime = targetTime;
              if (handleType === 'end' && offsetForEnd > 0) {
                syncTime = Math.max(0, targetTime - offsetForEnd);
              }
              
              if (audioRef.current) {
                audioRef.current.currentTime = syncTime;
                setCurrentTime(syncTime);
              }
            }
          }
          break;
          
        case 'pendingJump':
          // 🆕 **DELAYED JUMP**: Setup pending jump để tránh shock khi drag region
          break;
          
        case 'createSelection':
          setStartTime(result.startTime);
          setEndTime(result.endTime);
          setIsDragging(result.handle || 'end');
          break;
          
        case 'startRegionDrag':
          // 🆕 **REGION DRAG**: Setup region dragging
          setIsDragging('region'); // Special drag type for region
          
          // 🆕 **IMMEDIATE CURSOR SYNC**: Sync to region START for consistent behavior
          if (audioRef.current && result.regionData) {
            const { originalStart } = result.regionData;
            audioRef.current.currentTime = originalStart;
            setCurrentTime(originalStart);
          }
          break;
          
        case 'pendingHandleUpdate':
          // 🆕 **DELAYED HANDLE UPDATE**: Setup pending handle update
          break;
          
        case 'none':
        default:
          break;
      }
    };
    
    // 🚀 **IMMEDIATE PROCESSING**: Process action ngay lập tức
    processAction();
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setIsDragging, audioRef, setCurrentTime, interactionManagerRef]);

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
            if (result.isRegionDrag && result.isDragging !== 'region') {
              setIsDragging('region');
            }
            
            if (result.startTime !== undefined) setStartTime(result.startTime);
            if (result.endTime !== undefined) setEndTime(result.endTime);
            
            // 🆕 **SYNC FALLBACK**: Manual sync if real-time sync fails
            if (!result.audioSynced && audioRef.current && !isPlaying) {
              let syncTime;
              if (result.isRegionDrag) {
                syncTime = result.startTime; // Use region start for region drag
              } else {
                syncTime = result.startTime !== undefined ? result.startTime : 
                          result.endTime !== undefined ? Math.max(0, result.endTime - 3.0) : null;
              }
              
              if (syncTime !== null) {
                audioRef.current.currentTime = syncTime;
                setCurrentTime(syncTime);
              }
            }
          }
          break;
          
        case 'updateHover':
          // 🆕 **SMOOTH HOVER**: Process hover immediately
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
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setHoveredHandle, audioRef, setCurrentTime, isPlaying, interactionManagerRef, audioContext]);

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
          setIsDragging(null);
          break;
      }
      
      // 🆕 **EXECUTE DELAYED JUMP**: Execute pending jump nếu không có drag movement
      if (result.executePendingJump && result.pendingJumpTime !== null) {
        // 🚀 **IMMEDIATE CURSOR SYNC**: Jump cursor now that it's safe
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
          
          // 🚀 **IMMEDIATE CURSOR SYNC**: Sync audio cursor to new start position
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
          
          // 🚀 **IMMEDIATE CURSOR SYNC**: Sync to preview position (3s before end)
          if (audioRef.current) {
            const previewTime = Math.max(0, updateData.newTime - 3.0);
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
  }, [startTime, endTime, fadeIn, fadeOut, saveState, setIsDragging, audioRef, setCurrentTime, isPlaying, jumpToTime, setStartTime, setEndTime, interactionManagerRef, audioContext]);

  // 🎯 **MOUSE LEAVE HANDLER**
  const handleCanvasMouseLeave = useCallback(() => {
    const manager = interactionManagerRef.current;
    
    // 🎯 Use InteractionManager for smart handling
    const result = manager.handleMouseLeave();
    
    // 🎯 Process action based on result
    const processAction = () => {
      if (result.action === 'clearHover') {
        setHoveredHandle(null);
      }
    };
    
    // 🎯 DEBOUNCED UPDATES for mouse leave
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processAction);
    } else {
      setTimeout(processAction, 0);
    }
  }, [setHoveredHandle, interactionManagerRef]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave
  };
}; 