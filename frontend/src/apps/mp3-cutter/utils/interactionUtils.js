// 🎯 Interaction Utilities for Waveform
// Smart handling of mouse interactions with handles and regions

import { WAVEFORM_CONFIG } from './constants';
import { createAudioSyncManager } from './audioSyncManager';
import { createSmartClickManager, CLICK_ACTIONS } from './smartClickManager';

// 🎯 Interaction states
export const INTERACTION_STATES = {
  IDLE: 'idle',           // No interaction
  HOVERING: 'hovering',   // Hovering over handle (visual feedback only)
  DRAGGING: 'dragging'    // Actively dragging handle (changes region)
};

// 🎯 Handle types
export const HANDLE_TYPES = {
  START: 'start',
  END: 'end',
  NONE: null
};

/**
 * 🎯 Smart handle detection with responsive sizing - UPDATED FOR MODERN HANDLES
 * @param {number} x - Mouse X position relative to canvas
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} duration - Audio duration in seconds
 * @param {number} startTime - Selection start time in seconds
 * @param {number} endTime - Selection end time in seconds
 * @returns {string|null} Handle type ('start', 'end', or null)
 */
export const detectHandle = (x, canvasWidth, duration, startTime, endTime) => {
  if (duration === 0) return null;
  
  // 🎯 **MODERN HANDLE DETECTION**: Use modern handle width configuration
  const baseHandleWidth = WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH; // 🆕 **MODERN HANDLES**: 4px instead of 10px
  const mobileBreakpoint = WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT;
  const touchTolerance = WAVEFORM_CONFIG.RESPONSIVE.TOUCH_TOLERANCE;
  
  const responsiveHandleWidth = canvasWidth < mobileBreakpoint ? 
    Math.max(3, baseHandleWidth * 0.75) : baseHandleWidth; // 🎯 **ADJUSTED FOR MODERN**: Smaller mobile handles
  
  const startX = (startTime / duration) * canvasWidth;
  const endX = (endTime / duration) * canvasWidth;
  
  // 🎯 **ENHANCED TOLERANCE**: Larger tolerance for better UX with thin handles
  const tolerance = Math.max(responsiveHandleWidth / 2 + 8, touchTolerance); // 🆕 **+8px**: Better interaction area
  
  // Check start handle first (priority for overlapping cases)
  if (Math.abs(x - startX) <= tolerance) return HANDLE_TYPES.START;
  if (Math.abs(x - endX) <= tolerance) return HANDLE_TYPES.END;
  
  return HANDLE_TYPES.NONE;
};

/**
 * 🎯 Convert mouse position to time
 * @param {number} x - Mouse X position relative to canvas
 * @param {number} canvasWidth - Canvas width in pixels  
 * @param {number} duration - Audio duration in seconds
 * @returns {number} Time in seconds
 */
export const positionToTime = (x, canvasWidth, duration) => {
  if (canvasWidth === 0 || duration === 0) return 0;
  return Math.max(0, Math.min(duration, (x / canvasWidth) * duration));
};

/**
 * 🎯 Smart interaction state manager
 */
export class InteractionManager {
  constructor() {
    this.state = INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.lastHoveredHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    
    // 🆕 **ENHANCED VALIDATION**: Strict drag tracking
    this.isDraggingConfirmed = false;          // True chỉ khi thực sự đang drag
    this.mouseDownTimestamp = null;            // Track mouse down time
    this.lastMousePosition = null;             // Track mouse movement
    this.dragMoveThreshold = 3;                // Minimum pixels to confirm drag
    
    // 🆕 **REGION DRAG**: Support cho region dragging
    this.isDraggingRegion = false;             // True khi đang drag toàn bộ region
    this.regionDragStartTime = null;           // Reference time cho region drag
    this.regionDragOffset = 0;                 // Offset từ click position đến region start
    
    // 🆕 NEW: Audio sync manager for cursor synchronization
    this.audioSyncManager = createAudioSyncManager();
    
    // 🆕 NEW: Smart click manager for intelligent click behavior
    this.smartClickManager = createSmartClickManager();
    
    // 🎯 Debug tracking
    this.debugId = Math.random().toString(36).substr(2, 6);
    console.log(`🎮 [InteractionManager] Created with ID: ${this.debugId} (MODERN HANDLES)`);
    console.log(`🔄 [AudioSync] Connected to InteractionManager ${this.debugId}`);
    console.log(`🎯 [SmartClick] Connected to InteractionManager ${this.debugId}`);
  }
  
  /**
   * 🎯 Handle mouse down event with smart click analysis
   */
  handleMouseDown(x, canvasWidth, duration, startTime, endTime) {
    const handle = detectHandle(x, canvasWidth, duration, startTime, endTime);
    const clickTime = positionToTime(x, canvasWidth, duration);
    
    // 🆕 **TRACK MOUSE DOWN**: Record mouse down event for drag detection
    this.mouseDownTimestamp = performance.now();
    this.lastMousePosition = { x, y: 0 };
    this.isDraggingConfirmed = false;
    
    console.log(`🖱️ [${this.debugId}] Mouse down (MODERN):`, {
      x: x.toFixed(1),
      time: clickTime.toFixed(2) + 's',
      handle: handle || 'none',
      currentRegion: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
      timestamp: this.mouseDownTimestamp,
      modernHandles: true
    });
    
    // 🆕 NEW: Use SmartClickManager for intelligent click analysis
    const smartAction = this.smartClickManager.processClick(
      clickTime, startTime, endTime, duration, handle
    );
    
    // 🎯 Process smart action
    switch (smartAction.action) {
      case CLICK_ACTIONS.START_DRAG:
        // 🎯 **IMMEDIATE CURSOR SYNC**: Sync cursor ngay khi click handle
        this.state = INTERACTION_STATES.DRAGGING;
        this.activeHandle = smartAction.handle;
        this.dragStartPosition = x;
        this.dragStartTime = smartAction.handle === HANDLE_TYPES.START ? startTime : endTime;
        // 🆕 **NOTE**: isDraggingConfirmed still false until movement detected
        
        console.log(`🫳 [${this.debugId}] Potential drag start for ${smartAction.handle} handle (MODERN - awaiting movement confirmation)`);
        
        return {
          action: 'startDrag',
          handle: smartAction.handle,
          cursor: smartAction.cursor,
          // 🆕 **IMMEDIATE SYNC DATA**: Thông tin để sync cursor ngay lập tức
          immediateSync: {
            required: true,
            handleType: smartAction.handle,
            targetTime: smartAction.handle === HANDLE_TYPES.START ? startTime : endTime,
            offsetForEnd: smartAction.handle === HANDLE_TYPES.END ? 3.0 : 0
          }
        };
        
      case CLICK_ACTIONS.JUMP_TO_TIME:
        console.log(`⏯️ [${this.debugId}] Click in selection, jumping to time`);
        
        // 🆕 **REGION DRAG POTENTIAL**: Check if this click can potentially become region drag
        if (smartAction.regionDragPotential && this.smartClickManager.preferences.enableRegionDrag) {
          // 🔧 **SETUP POTENTIAL REGION DRAG**: Prepare for possible region drag on movement
          this.state = INTERACTION_STATES.DRAGGING; // Set drag state but await confirmation
          this.isDraggingRegion = false; // Not yet confirmed as region drag
          this.regionDragStartTime = clickTime;
          this.regionDragOffset = clickTime - startTime; // Offset từ click đến start của region
          this.dragStartPosition = x;
          this.dragStartTime = clickTime;
          
          console.log(`🔄 [${this.debugId}] JUMP_TO_TIME with region drag potential setup:`, {
            clickTime: clickTime.toFixed(2) + 's',
            regionStart: startTime.toFixed(2) + 's',
            regionEnd: endTime.toFixed(2) + 's',
            offset: this.regionDragOffset.toFixed(2) + 's',
            note: 'Will become region drag if movement detected'
          });
        }
        
        return {
          action: 'jumpToTime',
          time: smartAction.seekTime,
          regionDragPotential: smartAction.regionDragPotential || false // 🆕 **PASS FLAG**: Pass potential flag
        };
        
      case CLICK_ACTIONS.UPDATE_START:
        console.log(`📍 [${this.debugId}] Smart update: Moving start to ${smartAction.newStartTime.toFixed(2)}s`);
        return {
          action: 'updateStart',
          startTime: smartAction.newStartTime,
          endTime: smartAction.newEndTime,
          cursor: smartAction.cursor,
          reason: smartAction.reason
        };
        
      case CLICK_ACTIONS.UPDATE_END:
        console.log(`📍 [${this.debugId}] Smart update: Moving end to ${smartAction.newEndTime.toFixed(2)}s`);
        return {
          action: 'updateEnd',
          startTime: smartAction.newStartTime,
          endTime: smartAction.newEndTime,
          cursor: smartAction.cursor,
          reason: smartAction.reason
        };
        
      case CLICK_ACTIONS.CREATE_SELECTION:
        console.log(`🆕 [${this.debugId}] Creating new selection at ${clickTime.toFixed(2)}s`);
        this.state = INTERACTION_STATES.DRAGGING;
        this.activeHandle = HANDLE_TYPES.END;
        this.dragStartPosition = x;
        this.dragStartTime = clickTime;
        // 🆕 **NOTE**: isDraggingConfirmed still false until movement detected
        
        return {
          action: 'createSelection',
          startTime: smartAction.newStartTime,
          endTime: smartAction.newEndTime,
          cursor: smartAction.cursor
        };
        
      case CLICK_ACTIONS.DRAG_REGION:
        // 🆕 **REGION DRAG**: Setup region dragging
        console.log(`🔄 [${this.debugId}] Setting up region drag from ${clickTime.toFixed(2)}s`);
        this.state = INTERACTION_STATES.DRAGGING;
        this.isDraggingRegion = true;
        this.regionDragStartTime = clickTime;
        this.regionDragOffset = clickTime - startTime; // Offset từ click đến start của region
        this.dragStartPosition = x;
        this.dragStartTime = clickTime;
        // 🆕 **NOTE**: isDraggingConfirmed still false until movement detected
        
        console.log(`🔄 [${this.debugId}] Region drag setup:`, {
          clickTime: clickTime.toFixed(2) + 's',
          regionStart: startTime.toFixed(2) + 's',
          regionEnd: endTime.toFixed(2) + 's',
          offset: this.regionDragOffset.toFixed(2) + 's'
        });
        
        return {
          action: 'startRegionDrag',
          cursor: smartAction.cursor,
          regionData: {
            clickTime,
            offset: this.regionDragOffset,
            originalStart: startTime,
            originalEnd: endTime
          }
        };
        
      case CLICK_ACTIONS.NO_ACTION:
      default:
        console.log(`⚠️ [${this.debugId}] No action: ${smartAction.reason}`);
        return {
          action: 'none',
          reason: smartAction.reason
        };
    }
  }
  
  /**
   * 🎯 Handle mouse move event với enhanced drag validation
   */
  handleMouseMove(x, canvasWidth, duration, startTime, endTime, audioContext = null) {
    const currentTime = positionToTime(x, canvasWidth, duration);
    
    // 🆕 **DRAG CONFIRMATION**: Kiểm tra xem có thực sự đang drag không
    if (this.state === INTERACTION_STATES.DRAGGING && !this.isDraggingConfirmed) {
      const pixelsMoved = Math.abs(x - (this.lastMousePosition?.x || x));
      const timeSinceMouseDown = performance.now() - (this.mouseDownTimestamp || 0);
      
      // 🆕 **CONFIRM DRAG**: Chỉ confirm drag khi di chuyển đủ xa HOẶC đủ lâu
      if (pixelsMoved >= this.dragMoveThreshold || timeSinceMouseDown > 100) {
        this.isDraggingConfirmed = true;
        
        // 🆕 **REGION DRAG ACTIVATION**: If no active handle but have region drag potential, activate region drag
        if (!this.activeHandle && this.regionDragStartTime !== null && !this.isDraggingRegion) {
          this.isDraggingRegion = true; // 🔧 **ACTIVATE REGION DRAG**: Convert potential to actual region drag
          console.log(`🔄 [${this.debugId}] REGION DRAG ACTIVATED from movement (MODERN):`, {
            pixelsMoved: pixelsMoved.toFixed(1),
            timeSinceMouseDown: timeSinceMouseDown.toFixed(0) + 'ms',
            threshold: this.dragMoveThreshold + 'px',
            regionDragOffset: this.regionDragOffset.toFixed(2) + 's',
            note: 'Region drag activated from mouse movement detection'
          });
        } else {
          console.log(`✅ [${this.debugId}] Drag CONFIRMED (MODERN):`, {
            pixelsMoved: pixelsMoved.toFixed(1),
            timeSinceMouseDown: timeSinceMouseDown.toFixed(0) + 'ms',
            threshold: this.dragMoveThreshold + 'px',
            handleType: this.activeHandle || 'region',
            isDraggingRegion: this.isDraggingRegion
          });
        }
      }
    }
    
    // 🆕 **UPDATE MOUSE POSITION**: Track for next movement calculation
    this.lastMousePosition = { x, y: 0 };
    
    if (this.state === INTERACTION_STATES.DRAGGING && this.isDraggingConfirmed) {
      // 🎯 **CONFIRMED DRAGGING** - Update region chỉ khi đã confirm drag
      const roundedTime = Math.round(currentTime * 100) / 100; // 10ms precision
      
      if (this.isDraggingRegion) {
        // 🆕 **REGION DRAG**: Di chuyển toàn bộ region với ultra-smooth sync
        const regionDuration = endTime - startTime;
        const newStartTime = roundedTime - this.regionDragOffset;
        const newEndTime = newStartTime + regionDuration;
        
        // 🔒 **BOUNDARY CHECK**: Đảm bảo region không ra ngoài duration
        const adjustedStartTime = Math.max(0, Math.min(newStartTime, duration - regionDuration));
        const adjustedEndTime = adjustedStartTime + regionDuration;
        
        console.log(`🔄 [${this.debugId}] ULTRA-SMOOTH region drag (MODERN):`, {
          from: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          to: `${adjustedStartTime.toFixed(2)}s - ${adjustedEndTime.toFixed(2)}s`,
          duration: regionDuration.toFixed(2) + 's',
          mouseTime: roundedTime.toFixed(2) + 's',
          offset: this.regionDragOffset.toFixed(2) + 's'
        });
        
        // 🎯 **CONTINUOUS REGION SYNC**: Continuous sync về region với intelligent target
        let audioSynced = false;
        if (audioContext) {
          const { audioRef, setCurrentTime, isPlaying } = audioContext;
          
          // 🆕 **INTELLIGENT REGION SYNC TARGET**: Sync về position tốt nhất trong region
          let targetSyncTime;
          const regionMiddle = adjustedStartTime + (regionDuration / 2);
          
          // 🎯 **ADAPTIVE SYNC STRATEGY**: Choose best sync target based on region size
          if (regionDuration < 1.0) {
            // 🎯 **SHORT REGION**: Sync to start for short regions (easier to follow)
            targetSyncTime = adjustedStartTime;
          } else if (regionDuration < 3.0) {
            // 🎯 **MEDIUM REGION**: Sync to middle for medium regions
            targetSyncTime = regionMiddle;
          } else {
            // 🎯 **LONG REGION**: Sync slightly after start for long regions (better preview)
            targetSyncTime = adjustedStartTime + Math.min(1.0, regionDuration * 0.2);
          }
          
          // 🚀 **ULTRA-SMOOTH REAL-TIME SYNC**: Force immediate sync with no throttling
          audioSynced = this.audioSyncManager.realTimeSync(
            targetSyncTime, audioRef, setCurrentTime, 'region', true, adjustedStartTime // force = true
          );
          
          if (audioSynced) {
            console.log(`🎯 [${this.debugId}] CONTINUOUS region sync: ${targetSyncTime.toFixed(2)}s (strategy: ${regionDuration < 1.0 ? 'start' : regionDuration < 3.0 ? 'middle' : 'adaptive'})`);
          }
        }
        
        return {
          action: 'updateRegion',
          startTime: adjustedStartTime,
          endTime: adjustedEndTime,
          significant: true,
          audioSynced: audioSynced,
          isDraggingConfirmed: true,
          isRegionDrag: true, // 🆕 **FLAG**: Đánh dấu là region drag
          realTimeSync: true,
          ultraSmooth: true // 🆕 **ULTRA-SMOOTH FLAG**: For UI optimization
        };
        
      } else if (this.activeHandle === HANDLE_TYPES.START) {
        const newStartTime = Math.min(roundedTime, endTime - 0.1);
        if (Math.abs(newStartTime - startTime) > 0.01) {
          console.log(`⏮️ [${this.debugId}] CONFIRMED dragging start (MODERN): ${startTime.toFixed(2)}s → ${newStartTime.toFixed(2)}s`);
          
          // 🆕 **REAL-TIME CURSOR SYNC**: Cursor theo real-time khi drag start handle  
          let audioSynced = false;
          
          if (audioContext) {
            const { audioRef, setCurrentTime, isPlaying } = audioContext;
            
            // 🔥 **ULTRA-SMOOTH REAL-TIME SYNC**: Sử dụng realTimeSync với force mode
            audioSynced = this.audioSyncManager.realTimeSync(
              newStartTime, audioRef, setCurrentTime, 'start', true, newStartTime // force = true, pass startTime
            );
            
            if (audioSynced) {
              console.log(`🎯 [${this.debugId}] REAL-TIME sync start handle: ${newStartTime.toFixed(2)}s`);
            }
          }
          
          return {
            action: 'updateRegion',
            startTime: newStartTime,
            significant: true,
            audioSynced: audioSynced,
            isDraggingConfirmed: true, // 🆕 **VALIDATION FLAG**
            realTimeSync: true // 🆕 **REAL-TIME FLAG**
          };
        }
      } else if (this.activeHandle === HANDLE_TYPES.END) {
        const newEndTime = Math.max(roundedTime, startTime + 0.1);
        if (Math.abs(newEndTime - endTime) > 0.01) {
          console.log(`⏭️ [${this.debugId}] CONFIRMED dragging end (MODERN): ${endTime.toFixed(2)}s → ${newEndTime.toFixed(2)}s`);
          
          // 🆕 **REAL-TIME CURSOR SYNC**: Cursor theo real-time khi drag end handle với intelligent offset
          let audioSynced = false;
          
          if (audioContext && this.audioSyncManager.preferences.syncEndHandle) {
            const { audioRef, setCurrentTime, isPlaying } = audioContext;
            
            // 🔥 **ULTRA-SMOOTH REAL-TIME SYNC**: Sử dụng realTimeSync với force mode cho end handle
            audioSynced = this.audioSyncManager.realTimeSync(
              newEndTime, audioRef, setCurrentTime, 'end', true, startTime // force = true, pass startTime for boundary checking
            );
            
            if (audioSynced) {
              // 🎯 **INTELLIGENT LOGGING**: Log actual target time based on region size  
              const regionDuration = newEndTime - startTime;
              const actualTargetTime = regionDuration < 1.0 ? startTime : Math.max(startTime, newEndTime - 3.0);
              console.log(`🎯 [${this.debugId}] REAL-TIME sync end handle: ${newEndTime.toFixed(2)}s → ${actualTargetTime.toFixed(2)}s (intelligent region-aware sync)`);
            }
          }
          
          return {
            action: 'updateRegion',
            endTime: newEndTime,
            significant: true,
            audioSynced: audioSynced,
            isDraggingConfirmed: true, // 🆕 **VALIDATION FLAG**
            realTimeSync: true // 🆕 **REAL-TIME FLAG**
          };
        }
      }
      
      return { action: 'none' };
      
    } else if (this.state === INTERACTION_STATES.DRAGGING && !this.isDraggingConfirmed) {
      // 🆕 **AWAITING DRAG CONFIRMATION**: Không update region, chỉ log
      console.log(`⏳ [${this.debugId}] Awaiting drag confirmation (${Math.abs(x - (this.dragStartPosition || x)).toFixed(1)}px moved)`);
      return { action: 'none', reason: 'awaiting_drag_confirmation' };
      
    } else {
      // 🎯 **HOVER ONLY** - Visual feedback only, TUYỆT ĐỐI KHÔNG thay đổi region
      const handle = detectHandle(x, canvasWidth, duration, startTime, endTime);
      
      if (handle !== this.lastHoveredHandle) {
        console.log(`👆 [${this.debugId}] Hover changed (MODERN): ${this.lastHoveredHandle || 'none'} → ${handle || 'none'} (NO REGION CHANGE)`);
        this.lastHoveredHandle = handle;
        this.state = handle ? INTERACTION_STATES.HOVERING : INTERACTION_STATES.IDLE;
        
        // 🆕 **ENHANCED CURSOR LOGIC**: Different cursors cho different zones
        let hoverCursor = 'pointer'; // 🔧 **FIXED**: Default pointer instead of crosshair (matching WaveformCanvas)
        
        if (handle) {
          // 🎯 **HANDLE HOVER**: Resize cursor cho handles
          hoverCursor = 'ew-resize';
        } else {
          // 🆕 **CHECK REGION HOVER**: Kiểm tra xem có hover trong region không
          const timeAtPosition = positionToTime(x, canvasWidth, duration);
          const isInRegion = timeAtPosition >= startTime && timeAtPosition <= endTime && 
                            startTime < endTime; // Ensure có valid region
          
          if (isInRegion) {
            // 🔄 **REGION HOVER**: Always pointer cursor for region hover (move cursor only when actually dragging)
            hoverCursor = 'pointer'; // 🔧 **FIXED**: Pointer for hover, move only when dragging as requested
            
            console.log(`🔄 [${this.debugId}] Region hover detected - showing pointer cursor (move only when dragging)`, {
              timeAtPosition: timeAtPosition.toFixed(2) + 's',
              regionRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
              cursorType: 'pointer (hover mode)',
              note: 'Move cursor will show only when actually dragging region'
            });
          }
        }
        
        return {
          action: 'updateHover',
          handle: handle,
          cursor: hoverCursor,
          hoverOnly: true // 🆕 **EXPLICIT FLAG**: Chỉ hover, không drag
        };
      }
      
      return { action: 'none' };
    }
  }
  
  /**
   * 🎯 Handle mouse up event
   */
  handleMouseUp(startTime, endTime, audioContext = null) {
    const wasDragging = this.state === INTERACTION_STATES.DRAGGING;
    const wasConfirmedDrag = this.isDraggingConfirmed;
    const draggedHandle = this.activeHandle;
    const wasRegionDrag = this.isDraggingRegion;
    
    if (wasDragging) {
      console.log(`🫳 [${this.debugId}] Drag completed (MODERN):`, {
        handle: this.activeHandle,
        confirmed: wasConfirmedDrag,
        regionDrag: wasRegionDrag,
        finalRegion: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`
      });
      
      // 🆕 FINAL AUDIO SYNC: Different logic for region vs handle drag
      if (audioContext && wasConfirmedDrag) {
        const { audioRef, setCurrentTime, isPlaying } = audioContext;
        
        if (wasRegionDrag) {
          // 🔄 **REGION DRAG COMPLETION**: Sync to middle of new region
          const regionDuration = endTime - startTime;
          const regionMiddle = startTime + (regionDuration / 2);
          
          this.audioSyncManager.completeDragSync(
            'region', regionMiddle, audioRef, setCurrentTime, isPlaying, startTime
          );
          
          console.log(`🔄 [${this.debugId}] Region drag completed - synced to middle: ${regionMiddle.toFixed(2)}s`);
        } else if (draggedHandle) {
          // 🎯 **HANDLE DRAG COMPLETION**: Standard handle sync with intelligent boundary checking
          const finalTime = draggedHandle === HANDLE_TYPES.START ? startTime : endTime;
          
          this.audioSyncManager.completeDragSync(
            draggedHandle, finalTime, audioRef, setCurrentTime, isPlaying, startTime
          );
          
          console.log(`🎯 [${this.debugId}] Handle drag completed - ${draggedHandle} handle synced with region-aware logic`);
        }
      }
    }
    
    // 🎯 **RESET DRAG STATE**: Reset tất cả drag tracking
    this.state = this.lastHoveredHandle ? INTERACTION_STATES.HOVERING : INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    this.isDraggingConfirmed = false;
    this.mouseDownTimestamp = null;
    this.lastMousePosition = null;
    
    // 🆕 **RESET REGION DRAG**: Reset region drag state
    this.isDraggingRegion = false;
    this.regionDragStartTime = null;
    this.regionDragOffset = 0;
    
    return {
      action: wasDragging ? 'completeDrag' : 'none',
      saveHistory: wasConfirmedDrag, // 🆕 **CHỈ SAVE** khi đã confirmed drag
      cursor: this.lastHoveredHandle ? 'grab' : 'pointer', // 🔧 **FIXED**: Default pointer instead of crosshair
      audioSynced: wasDragging && audioContext && (draggedHandle || wasRegionDrag) && wasConfirmedDrag,
      wasRegionDrag: wasRegionDrag // 🆕 **FLAG**: Thông báo đã hoàn thành region drag
    };
  }
  
  /**
   * 🎯 Handle mouse leave event
   */
  handleMouseLeave() {
    console.log(`🫥 [${this.debugId}] Mouse left canvas (MODERN)`);
    
    const wasDragging = this.state === INTERACTION_STATES.DRAGGING;
    
    // 🎯 Clear hover state but preserve dragging if active
    if (!wasDragging) {
      this.state = INTERACTION_STATES.IDLE;
      this.lastHoveredHandle = HANDLE_TYPES.NONE;
    }
    
    return {
      action: 'clearHover',
      cursor: wasDragging ? 'grabbing' : 'default'
    };
  }
  
  /**
   * 🎯 Get current debug info
   */
  getDebugInfo() {
    return {
      id: this.debugId,
      state: this.state,
      activeHandle: this.activeHandle,
      lastHoveredHandle: this.lastHoveredHandle,
      isDragging: this.state === INTERACTION_STATES.DRAGGING,
      isDraggingConfirmed: this.isDraggingConfirmed, // 🆕 **ENHANCED DEBUG**
      mouseDownTimestamp: this.mouseDownTimestamp,
      lastMousePosition: this.lastMousePosition,
      // 🆕 **REGION DRAG DEBUG**
      isDraggingRegion: this.isDraggingRegion,
      regionDragStartTime: this.regionDragStartTime,
      regionDragOffset: this.regionDragOffset,
      // 🆕 **MODERN HANDLES FLAG**
      modernHandles: true,
      handleWidth: WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH
    };
  }
  
  /**
   * 🎯 Reset manager state
   */
  reset() {
    console.log(`🔄 [${this.debugId}] Resetting interaction state (MODERN)`);
    this.state = INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.lastHoveredHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    
    // 🆕 **RESET ENHANCED TRACKING**: Reset drag confirmation state
    this.isDraggingConfirmed = false;
    this.mouseDownTimestamp = null;
    this.lastMousePosition = null;
    
    // 🆕 **RESET REGION DRAG**: Reset region drag state
    this.isDraggingRegion = false;
    this.regionDragStartTime = null;
    this.regionDragOffset = 0;
    
    // 🆕 RESET AUDIO SYNC: Reset sync manager state
    if (this.audioSyncManager) {
      this.audioSyncManager.reset();
    }
  }
  
  /**
   * 🆕 NEW: Configure audio sync preferences
   * @param {object} preferences - Sync preferences
   */
  configureAudioSync(preferences) {
    if (this.audioSyncManager) {
      this.audioSyncManager.updatePreferences(preferences);
      console.log(`⚙️ [${this.debugId}] Audio sync configured:`, preferences);
    }
  }
  
  /**
   * 🆕 NEW: Configure smart click preferences
   * @param {object} preferences - Click behavior preferences
   */
  configureSmartClick(preferences) {
    if (this.smartClickManager) {
      this.smartClickManager.updatePreferences(preferences);
      console.log(`⚙️ [${this.debugId}] Smart click configured:`, preferences);
    }
  }
  
  /**
   * 🆕 NEW: Enable/disable audio sync
   * @param {boolean} enabled - Enable state
   */
  setAudioSyncEnabled(enabled) {
    if (this.audioSyncManager) {
      this.audioSyncManager.setEnabled(enabled);
      console.log(`🔄 [${this.debugId}] Audio sync ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * 🆕 NEW: Get audio sync debug info
   * @returns {object} Audio sync debug information
   */
  getAudioSyncDebugInfo() {
    return this.audioSyncManager ? this.audioSyncManager.getDebugInfo() : null;
  }
  
  /**
   * 🆕 NEW: Get smart click debug info
   * @returns {object} Smart click debug information
   */
  getSmartClickDebugInfo() {
    return this.smartClickManager ? this.smartClickManager.getDebugInfo() : null;
  }
  
  /**
   * 🎯 Get handle at position (legacy compatibility) - UPDATED FOR MODERN HANDLES
   */
  getHandleAtPosition(x, canvasWidth, duration, startTime, endTime) {
    return detectHandle(x, canvasWidth, duration || 0, startTime || 0, endTime || 0);
  }
}

// 🎯 Global interaction manager instance
export const createInteractionManager = () => new InteractionManager();