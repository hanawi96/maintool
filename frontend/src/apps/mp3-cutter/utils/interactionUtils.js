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
 * @param {Object} eventInfo - Additional event information (optional)
 * @returns {string|null} Handle type ('start', 'end', or null)
 */
export const detectHandle = (x, canvasWidth, duration, startTime, endTime, eventInfo = null) => {
  if (duration === 0 || canvasWidth === 0) return null;
  
  // 🆕 **DIRECT HANDLE EVENT**: Nếu event đến từ handle trực tiếp, return ngay
  if (eventInfo?.isHandleEvent && eventInfo?.handleType) {
    console.log(`🎯 [DIRECT-HANDLE-DETECT] Direct handle event detected:`, {
      handleType: eventInfo.handleType,
      mouseX: x.toFixed(1),
      note: 'Bypassing detection - using direct handle type from event'
    });
    return eventInfo.handleType;
  }
  
  // 🎯 **MODERN HANDLE DETECTION**: Use modern handle width configuration
  const baseHandleWidth = WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH; // 8px modern handles
  const mobileBreakpoint = WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT;
  
  const responsiveHandleWidth = canvasWidth < mobileBreakpoint ? 
    Math.max(6, baseHandleWidth * 0.8) : baseHandleWidth; // Smaller mobile handles
  
  const startX = (startTime / duration) * canvasWidth;
  const endX = (endTime / duration) * canvasWidth;
  
  // 🔧 **CRITICAL ANALYSIS**: Phân tích chi tiết visual vs detection
  // Visual rendering (from WaveformUI):
  // - Start handle: left = startX - width = startX - 8, so visual range is [startX-8, startX]
  // - End handle: left = endX - width = endX - 8, so visual range is [endX-8, endX]
  
  // 🆕 **CORRECTED VISUAL CENTERS**: Sửa lại để match chính xác với visual positioning
  // Start handle: Visual center nằm ở giữa [startX-8, startX] = startX - 4
  const startHandleVisualCenter = startX - (responsiveHandleWidth / 2); // startX - 4 ✅ ĐÚNG
  
  // End handle: Visual center nằm ở giữa [endX-8, endX] = endX - 4 (UPDATED để match start handle pattern)
  const endHandleVisualCenter = endX - (responsiveHandleWidth / 2);     // endX - 4 ✅ MATCH START HANDLE
  
  // 🆕 **UNIFORM DETECTION TOLERANCE**: Sử dụng tolerance giống nhau cho cả 2 handles
  const halfWidth = responsiveHandleWidth / 2; // 4px
  const bufferZone = 6; // Buffer zone for easier clicking
  const detectionTolerance = halfWidth + bufferZone; // 10px total cho cả 2 handles
  
  // 🆕 **ENHANCED END HANDLE TOLERANCE**: End handle cần tolerance lớn hơn vì user hay click vào phần giữa/phải
  const endHandleDetectionTolerance = detectionTolerance + 2; // 12px cho end handle (thêm 2px)
  
  // 🚀 **COMPREHENSIVE DEBUG**: Log tất cả thông tin để verify - ALWAYS LOG cho end handle
  const shouldLogDebug = Math.random() < 0.2 || eventInfo?.handleType === 'end'; // Always log for end handle
  
  if (shouldLogDebug) {
    const startVisualLeft = startX - responsiveHandleWidth;
    const startVisualRight = startX;
    const endVisualLeft = endX - responsiveHandleWidth; // 🔧 **UPDATED**: End handle bây giờ cũng shifted left
    const endVisualRight = endX; // 🔧 **UPDATED**: End handle right edge bây giờ là endX
    
    const startDetectionLeft = startHandleVisualCenter - detectionTolerance;
    const startDetectionRight = startHandleVisualCenter + detectionTolerance;
    const endDetectionLeft = endHandleVisualCenter - endHandleDetectionTolerance;
    const endDetectionRight = endHandleVisualCenter + endHandleDetectionTolerance;
    
    // 🆕 **ENHANCED END HANDLE DEBUG**: Đặc biệt log cho end handle
    const isEndHandleEvent = eventInfo?.handleType === 'end';
    const endHandleDebugLevel = isEndHandleEvent ? '🔴 [END-HANDLE-CRITICAL]' : '🔍 [HANDLE-DEBUG]';
    
    console.log(`${endHandleDebugLevel} COMPREHENSIVE ANALYSIS:`, {
      mouseX: x.toFixed(1),
      responsiveHandleWidth: responsiveHandleWidth + 'px',
      detectionTolerance: detectionTolerance + 'px (STANDARD)',
      endHandleDetectionTolerance: endHandleDetectionTolerance + 'px (ENHANCED FOR END HANDLE)',
      bufferZone: bufferZone + 'px (INCREASED FOR EASIER CLICKING)',
      isEndHandleEvent: isEndHandleEvent,
      
      // VISUAL POSITIONS (where handles are actually drawn)
      startHandleVisual: `[${startVisualLeft.toFixed(1)}, ${startVisualRight.toFixed(1)}] (width: ${responsiveHandleWidth}px)`,
      endHandleVisual: `[${endVisualLeft.toFixed(1)}, ${endVisualRight.toFixed(1)}] (width: ${responsiveHandleWidth}px)`,
      
      // DETECTION POSITIONS (where we detect mouse) - DIFFERENT TOLERANCE FOR END HANDLE
      startDetection: `[${startDetectionLeft.toFixed(1)}, ${startDetectionRight.toFixed(1)}] (center: ${startHandleVisualCenter.toFixed(1)}, tolerance: ${detectionTolerance})`,
      endDetection: `[${endDetectionLeft.toFixed(1)}, ${endDetectionRight.toFixed(1)}] (center: ${endHandleVisualCenter.toFixed(1)}, tolerance: ${endHandleDetectionTolerance})`,
      
      // MOUSE POSITION ANALYSIS
      mouseInStartVisual: x >= startVisualLeft && x <= startVisualRight,
      mouseInEndVisual: x >= endVisualLeft && x <= endVisualRight,
      mouseInStartDetection: Math.abs(x - startHandleVisualCenter) <= detectionTolerance,
      mouseInEndDetection: Math.abs(x - endHandleVisualCenter) <= endHandleDetectionTolerance, // ENHANCED TOLERANCE
      
      // DISTANCE ANALYSIS - CRUCIAL FOR END HANDLE DEBUG
      distToStartCenter: Math.abs(x - startHandleVisualCenter).toFixed(1) + 'px',
      distToEndCenter: Math.abs(x - endHandleVisualCenter).toFixed(1) + 'px',
      distanceToleranceCheck: {
        startWithinTolerance: Math.abs(x - startHandleVisualCenter) <= detectionTolerance,
        endWithinTolerance: Math.abs(x - endHandleVisualCenter) <= endHandleDetectionTolerance // ENHANCED CHECK
      },
      
      // 🆕 **END HANDLE SPECIFIC DEBUG**
      endHandleSpecific: {
        endX: endX.toFixed(1) + 'px',
        endHandleLeft: (endX - responsiveHandleWidth).toFixed(1) + 'px', // 🔧 **UPDATED**: left = endX - width
        endHandleRight: endX.toFixed(1) + 'px', // 🔧 **UPDATED**: right = endX
        endHandleCenter: endHandleVisualCenter.toFixed(1) + 'px', // center = endX - width/2
        mouseDistanceFromEndCenter: Math.abs(x - endHandleVisualCenter).toFixed(1) + 'px',
        enhancedTolerance: endHandleDetectionTolerance + 'px',
        shouldDetectEnd: Math.abs(x - endHandleVisualCenter) <= endHandleDetectionTolerance ? '✅ YES' : '❌ NO',
        detectionFormula: `|${x.toFixed(1)} - ${endHandleVisualCenter.toFixed(1)}| = ${Math.abs(x - endHandleVisualCenter).toFixed(1)} <= ${endHandleDetectionTolerance} = ${Math.abs(x - endHandleVisualCenter) <= endHandleDetectionTolerance}`,
        userIssueFix: 'Now uses same positioning pattern as start handle + enhanced tolerance for easier clicking'
      },
      
      // VERDICT
      shouldDetectStart: Math.abs(x - startHandleVisualCenter) <= detectionTolerance,
      shouldDetectEnd: Math.abs(x - endHandleVisualCenter) <= endHandleDetectionTolerance, // ENHANCED
      
      // DETAILED POSITION INFO
      timePositions: {
        startTime: startTime.toFixed(2) + 's',
        endTime: endTime.toFixed(2) + 's',
        startX: startX.toFixed(1) + 'px',
        endX: endX.toFixed(1) + 'px'
      }
    });
  }
  
  // 🎯 **PRECISE DETECTION**: Check với visual centers - ENHANCED FOR END HANDLE
  const startDetected = Math.abs(x - startHandleVisualCenter) <= detectionTolerance;
  const endDetected = Math.abs(x - endHandleVisualCenter) <= endHandleDetectionTolerance; // ENHANCED TOLERANCE
  
  if (startDetected) {
    console.log(`✅ [HANDLE-DETECT] START HANDLE DETECTED at ${x.toFixed(1)}px (center: ${startHandleVisualCenter.toFixed(1)}px, tolerance: ${detectionTolerance}px)`);
    return HANDLE_TYPES.START;
  }
  if (endDetected) {
    // 🆕 **ENHANCED END HANDLE LOG**: Log chi tiết hơn cho end handle
    console.log(`✅ [END-HANDLE-DETECT] END HANDLE DETECTED at ${x.toFixed(1)}px (center: ${endHandleVisualCenter.toFixed(1)}px, tolerance: ${endHandleDetectionTolerance}px)`, {
      endX: endX.toFixed(1),
      endHandleLeft: endX.toFixed(1),
      endHandleRight: (endX + responsiveHandleWidth).toFixed(1),
      mouseDistance: Math.abs(x - endHandleVisualCenter).toFixed(1),
      enhancedTolerance: endHandleDetectionTolerance,
      detectionSuccessful: true,
      eventSource: eventInfo?.isHandleEvent ? 'DIRECT_HANDLE_EVENT' : 'MOUSE_DETECTION',
      userIssueFix: 'Enhanced tolerance allows clicking anywhere on end handle'
    });
    return HANDLE_TYPES.END;
  }
  
  // 🆕 **LOG WHEN NO DETECTION**: Debug khi không detect được handle nào
  if (shouldLogDebug && (x > Math.min(startX - responsiveHandleWidth, endX) && x < Math.max(startX, endX + responsiveHandleWidth))) {
    console.log(`❌ [NO-HANDLE-DETECT] No handle detected near handles area:`, {
      mouseX: x.toFixed(1),
      startDistance: Math.abs(x - startHandleVisualCenter).toFixed(1) + 'px',
      endDistance: Math.abs(x - endHandleVisualCenter).toFixed(1) + 'px',
      startTolerance: detectionTolerance + 'px',
      endTolerance: endHandleDetectionTolerance + 'px (ENHANCED)',
      nearHandleArea: true,
      reason: 'Mouse in handle area but outside detection tolerance',
      suggestion: 'Consider increasing tolerance further if still having issues'
    });
  }
  
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
    
    // 🛡️ **MOUSE RE-ENTRY PROTECTION**: Track mouse leave timing
    this.lastMouseLeaveTime = null;            // Track when mouse left canvas
    
    // 🆕 **REGION DRAG**: Support cho region dragging
    this.isDraggingRegion = false;             // True khi đang drag toàn bộ region
    this.regionDragStartTime = null;           // Reference time cho region drag
    this.regionDragOffset = 0;                 // Offset từ click position đến region start
    
    // 🆕 **PENDING JUMP**: Support cho delayed cursor movement
    this.pendingJumpTime = null;               // Time to jump to after mouse up (if no drag)
    this.hasPendingJump = false;               // Flag to track pending jump
    
    // 🆕 **PENDING HANDLE UPDATES**: Support cho delayed handle movement
    this.pendingHandleUpdate = null;           // {type: 'start'|'end', newTime: number, reason: string}
    this.hasPendingHandleUpdate = false;       // Flag to track pending handle update
    
    // 🆕 NEW: Audio sync manager for cursor synchronization
    this.audioSyncManager = createAudioSyncManager();
    
    // 🆕 NEW: Smart click manager for intelligent click behavior
    this.smartClickManager = createSmartClickManager();
    
    // 🔧 **GLOBAL MOUSE UP PROTECTION**: Add global mouse up listener to catch outside releases
    this.globalMouseUpHandler = null;
    this.isGlobalListenerActive = false;
    
    // 🆕 **DEBUG ID**: Unique debug identifier
    this.debugId = Math.random().toString(36).substring(2, 8);
    
    // 🚀 **SETUP GLOBAL MOUSE UP LISTENER**: Catch mouse up outside canvas
    this.setupGlobalMouseUpListener();
  }
  
  /**
   * 🚨 **SETUP GLOBAL MOUSE UP LISTENER**: Catch mouse up events outside canvas
   */
  setupGlobalMouseUpListener() {
    this.globalMouseUpHandler = (e) => {
      // Only handle if we're currently in a drag state
      if (this.state === INTERACTION_STATES.DRAGGING && this.isDraggingConfirmed) {
        console.log(`🌍 [${this.debugId}] GLOBAL mouse up detected outside canvas - preventing ghost drag:`, {
          dragState: this.state,
          confirmed: this.isDraggingConfirmed,
          activeHandle: this.activeHandle,
          isDraggingRegion: this.isDraggingRegion,
          mouseEvent: 'outside_canvas',
          ghostDragPrevention: true
        });
        
        // 🚨 **FORCE COMPLETE RESET**: Reset all drag states
        this.state = INTERACTION_STATES.IDLE;
        this.activeHandle = HANDLE_TYPES.NONE;
        this.lastHoveredHandle = HANDLE_TYPES.NONE;
        this.dragStartPosition = null;
        this.dragStartTime = null;
        this.isDraggingConfirmed = false;
        this.mouseDownTimestamp = null;
        this.lastMousePosition = null;
        this.isDraggingRegion = false;
        this.regionDragStartTime = null;
        this.regionDragOffset = 0;
        
        // Clear pending actions
        this.pendingJumpTime = null;
        this.hasPendingJump = false;
        this.pendingHandleUpdate = null;
        this.hasPendingHandleUpdate = false;
        
        // Disable global listener until next drag starts
        this.disableGlobalMouseUpListener();
        
        console.log(`🛡️ [${this.debugId}] Ghost drag PREVENTED by global mouse up - all states reset`);
      }
    };
    
    // Don't attach immediately - only when drag starts
  }
  
  /**
   * 🔧 **ENABLE GLOBAL MOUSE UP LISTENER**: Activate when drag starts
   */
  enableGlobalMouseUpListener() {
    if (!this.isGlobalListenerActive && this.globalMouseUpHandler) {
      document.addEventListener('mouseup', this.globalMouseUpHandler, { capture: true, passive: true });
      this.isGlobalListenerActive = true;
      console.log(`🌍 [${this.debugId}] Global mouse up listener ENABLED - will catch outside releases`);
    }
  }
  
  /**
   * 🔧 **DISABLE GLOBAL MOUSE UP LISTENER**: Deactivate when drag ends
   */
  disableGlobalMouseUpListener() {
    if (this.isGlobalListenerActive && this.globalMouseUpHandler) {
      document.removeEventListener('mouseup', this.globalMouseUpHandler, { capture: true });
      this.isGlobalListenerActive = false;
      console.log(`🌍 [${this.debugId}] Global mouse up listener DISABLED`);
    }
  }
  
  /**
   * 🎯 Handle mouse down events with smart logic
   * @param {number} x - Mouse X position relative to canvas
   * @param {number} canvasWidth - Canvas width in pixels
   * @param {number} duration - Audio duration in seconds
   * @param {number} startTime - Selection start time in seconds
   * @param {number} endTime - Selection end time in seconds
   * @param {Object} eventInfo - Additional event information (optional)
   * @returns {Object} Action result object
   */
  handleMouseDown(x, canvasWidth, duration, startTime, endTime, eventInfo = null) {
    // 🚨 **RESET PREVIOUS STATE**: Clear any previous interaction state
    this.state = INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.lastHoveredHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    this.isDraggingConfirmed = false;
    this.isDraggingRegion = false;
    this.regionDragStartTime = null;
    this.regionDragOffset = 0;
    
    // Clear pending actions
    this.pendingJumpTime = null;
    this.hasPendingJump = false;
    this.pendingHandleUpdate = null;
    this.hasPendingHandleUpdate = false;
    
    // 🆕 **ENHANCED DEBUG**: Log with event info
    const debugInfo = {
      mouseX: x.toFixed(1),
      isHandleEvent: eventInfo?.isHandleEvent || false,
      handleType: eventInfo?.handleType || 'none',
      canvasWidth: canvasWidth,
      duration: duration.toFixed(2) + 's',
      selection: `${startTime.toFixed(2)}-${endTime.toFixed(2)}s`,
      debugId: this.debugId
    };
    
    console.log(`🖱️ [${this.debugId}] Mouse down START (MODERN):`, debugInfo);
    
    // 🎯 **SMART HANDLE DETECTION**: Updated to use eventInfo
    const detectedHandle = detectHandle(x, canvasWidth, duration, startTime, endTime, eventInfo);
    const currentTimePosition = positionToTime(x, canvasWidth, duration);
    
    // Record interaction start
    this.mouseDownTimestamp = performance.now();
    this.lastMousePosition = { x, y: 0 };
    this.dragStartPosition = { x, y: 0 };
    
    // 🛡️ **PROTECTION AGAINST EDGE HOVER TRIGGERS**: Ngăn handle movement khi đã ở edge
    const isStartAtEdge = Math.abs(startTime - 0) < 0.1; // Start handle gần đầu file
    const isEndAtEdge = Math.abs(endTime - duration) < 0.1; // End handle gần cuối file
    
    // 🛡️ **BEFORE START PROTECTION**: Nếu click/hover trước start và start đã ở edge
    if (currentTimePosition < startTime && isStartAtEdge && Math.abs(currentTimePosition - startTime) < 1.0) {
      console.log(`🛡️ [${this.debugId}] BLOCKING potential start handle movement: start already at edge (${startTime.toFixed(2)}s), ignoring click at ${currentTimePosition.toFixed(2)}s`);
      return {
        action: 'none',
        reason: 'PROTECTED: Start handle already at edge, blocking potential movement',
        protected: true
      };
    }
    
    // 🛡️ **AFTER END PROTECTION**: Nếu click/hover sau end và end đã ở edge  
    if (currentTimePosition > endTime && isEndAtEdge && Math.abs(currentTimePosition - endTime) < 1.0) {
      console.log(`🛡️ [${this.debugId}] BLOCKING potential end handle movement: end already at edge (${endTime.toFixed(2)}s), ignoring click at ${currentTimePosition.toFixed(2)}s`);
      return {
        action: 'none',
        reason: 'PROTECTED: End handle already at edge, blocking potential movement',
        protected: true
      };
    }
    
    // 🆕 **TRACK MOUSE DOWN**: Record mouse down event for drag detection
    this.isDraggingConfirmed = false;
    
    console.log(`🎯 [${this.debugId}] Mouse down (MODERN) WITH PROTECTION:`, {
      x: x.toFixed(1),
      time: currentTimePosition.toFixed(2) + 's',
      handle: detectedHandle || 'none',
      currentRegion: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
      timestamp: this.mouseDownTimestamp,
      modernHandles: true,
      protectionStatus: {
        isStartAtEdge,
        isEndAtEdge,
        clickBeforeStart: currentTimePosition < startTime,
        clickAfterEnd: currentTimePosition > endTime
      }
    });
    
    // 🆕 NEW: Use SmartClickManager for intelligent click analysis
    const smartAction = this.smartClickManager.processClick(
      currentTimePosition, startTime, endTime, duration, detectedHandle
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
        console.log(`⏯️ [${this.debugId}] Click in selection, DELAYING jump until mouse up (anti-shock)`);
        
        // 🆕 **DELAY CURSOR MOVEMENT**: Store pending jump thay vì jump ngay để tránh shock khi drag
        this.pendingJumpTime = smartAction.seekTime;
        this.hasPendingJump = true;
        
        // 🆕 **REGION DRAG POTENTIAL**: Check if this click can potentially become region drag
        if (smartAction.regionDragPotential && this.smartClickManager.preferences.enableRegionDrag) {
          // 🔧 **SETUP POTENTIAL REGION DRAG**: Prepare for possible region drag on movement
          this.state = INTERACTION_STATES.DRAGGING; // Set drag state but await confirmation
          this.isDraggingRegion = false; // Not yet confirmed as region drag
          this.regionDragStartTime = currentTimePosition;
          this.regionDragOffset = currentTimePosition - startTime; // Offset từ click đến start của region
          this.dragStartPosition = x;
          this.dragStartTime = currentTimePosition;
          
          console.log(`🔄 [${this.debugId}] JUMP_TO_TIME with region drag potential setup:`, {
            clickTime: currentTimePosition.toFixed(2) + 's',
            regionStart: startTime.toFixed(2) + 's',
            regionEnd: endTime.toFixed(2) + 's',
            offset: this.regionDragOffset.toFixed(2) + 's',
            pendingJump: this.pendingJumpTime.toFixed(2) + 's',
            note: 'Will become region drag if movement detected, or jump on mouse up'
          });
        } else {
          console.log(`⏳ [${this.debugId}] PENDING jump to: ${this.pendingJumpTime.toFixed(2)}s (will execute on mouse up if no drag)`);
        }
        
        return {
          action: 'pendingJump', // 🆕 **NEW ACTION**: Indicate pending jump instead of immediate
          time: smartAction.seekTime,
          regionDragPotential: smartAction.regionDragPotential || false,
          pendingJumpTime: this.pendingJumpTime // 🆕 **PASS PENDING TIME**: For debugging
        };
        
      case CLICK_ACTIONS.UPDATE_START:
        console.log(`📍 [${this.debugId}] DELAYING start handle update until mouse up (anti-shock)`);
        
        // 🆕 **DELAY HANDLE MOVEMENT**: Store pending update thay vì update ngay để tránh shock khi drag
        this.pendingHandleUpdate = {
          type: 'start',
          newTime: smartAction.newStartTime,
          oldTime: startTime,
          endTime: smartAction.newEndTime,
          reason: smartAction.reason
        };
        this.hasPendingHandleUpdate = true;
        
        console.log(`⏳ [${this.debugId}] PENDING start handle update:`, {
          from: startTime.toFixed(2) + 's',
          to: smartAction.newStartTime.toFixed(2) + 's',
          reason: smartAction.reason,
          note: 'Will execute on mouse up if no drag'
        });
        
        return {
          action: 'pendingHandleUpdate', // 🆕 **NEW ACTION**: Indicate pending handle update
          handleType: 'start',
          newTime: smartAction.newStartTime,
          oldTime: startTime,
          reason: smartAction.reason
        };
        
      case CLICK_ACTIONS.UPDATE_END:
        console.log(`📍 [${this.debugId}] DELAYING end handle update until mouse up (anti-shock)`);
        
        // 🆕 **DELAY HANDLE MOVEMENT**: Store pending update thay vì update ngay để tránh shock khi drag
        this.pendingHandleUpdate = {
          type: 'end',
          newTime: smartAction.newEndTime,
          oldTime: endTime,
          startTime: smartAction.newStartTime,
          reason: smartAction.reason
        };
        this.hasPendingHandleUpdate = true;
        
        console.log(`⏳ [${this.debugId}] PENDING end handle update:`, {
          from: endTime.toFixed(2) + 's',
          to: smartAction.newEndTime.toFixed(2) + 's',
          reason: smartAction.reason,
          note: 'Will execute on mouse up if no drag'
        });
        
        return {
          action: 'pendingHandleUpdate', // 🆕 **NEW ACTION**: Indicate pending handle update
          handleType: 'end',
          newTime: smartAction.newEndTime,
          oldTime: endTime,
          reason: smartAction.reason
        };
        
      case CLICK_ACTIONS.CREATE_SELECTION:
        console.log(`🆕 [${this.debugId}] Creating new selection at ${currentTimePosition.toFixed(2)}s`);
        this.state = INTERACTION_STATES.DRAGGING;
        this.activeHandle = HANDLE_TYPES.END;
        this.dragStartPosition = x;
        this.dragStartTime = currentTimePosition;
        // 🆕 **NOTE**: isDraggingConfirmed still false until movement detected
        
        return {
          action: 'createSelection',
          startTime: smartAction.newStartTime,
          endTime: smartAction.newEndTime,
          cursor: smartAction.cursor
        };
        
      case CLICK_ACTIONS.DRAG_REGION:
        // 🆕 **REGION DRAG**: Setup region dragging
        console.log(`🔄 [${this.debugId}] Setting up region drag from ${currentTimePosition.toFixed(2)}s`);
        this.state = INTERACTION_STATES.DRAGGING;
        this.isDraggingRegion = true;
        this.regionDragStartTime = currentTimePosition;
        this.regionDragOffset = currentTimePosition - startTime; // Offset từ click đến start của region
        this.dragStartPosition = x;
        this.dragStartTime = currentTimePosition;
        // 🆕 **NOTE**: isDraggingConfirmed still false until movement detected
        
        console.log(`🔄 [${this.debugId}] Region drag setup:`, {
          clickTime: currentTimePosition.toFixed(2) + 's',
          regionStart: startTime.toFixed(2) + 's',
          regionEnd: endTime.toFixed(2) + 's',
          offset: this.regionDragOffset.toFixed(2) + 's'
        });
        
        return {
          action: 'startRegionDrag',
          cursor: smartAction.cursor,
          regionData: {
            clickTime: currentTimePosition,
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
    
    // 🛡️ **MOUSE RE-ENTRY PROTECTION**: Ngăn immediate interactions sau mouse leave
    const timeSinceMouseLeave = this.lastMouseLeaveTime ? performance.now() - this.lastMouseLeaveTime : Infinity;
    const isRecentlyReEntered = timeSinceMouseLeave < 300; // 300ms cooldown
    
    // 🆕 **DRAG CONFIRMATION**: Kiểm tra xem có thực sự đang drag không
    if (this.state === INTERACTION_STATES.DRAGGING && !this.isDraggingConfirmed) {
      const pixelsMoved = Math.abs(x - (this.lastMousePosition?.x || x));
      const timeSinceMouseDown = performance.now() - (this.mouseDownTimestamp || 0);
      
      // 🆕 **CONFIRM DRAG**: Chỉ confirm drag khi di chuyển đủ xa HOẶC đủ lâu
      if (pixelsMoved >= this.dragMoveThreshold || timeSinceMouseDown > 100) {
        this.isDraggingConfirmed = true;
        
        // 🆕 **CANCEL PENDING JUMP**: Cancel pending jump khi confirm drag để tránh jump đột ngột
        if (this.hasPendingJump) {
          console.log(`🚫 [${this.debugId}] CANCELING pending jump (${this.pendingJumpTime.toFixed(2)}s) - drag movement detected`);
          this.pendingJumpTime = null;
          this.hasPendingJump = false;
        }
        
        // 🆕 **CANCEL PENDING HANDLE UPDATE**: Cancel pending handle update khi confirm drag để tránh shock
        if (this.hasPendingHandleUpdate) {
          console.log(`🚫 [${this.debugId}] CANCELING pending handle update (${this.pendingHandleUpdate.type}: ${this.pendingHandleUpdate.newTime.toFixed(2)}s) - drag movement detected`);
          this.pendingHandleUpdate = null;
          this.hasPendingHandleUpdate = false;
        }
        
        // 🆕 **REGION DRAG ACTIVATION**: If no active handle but have region drag potential, activate region drag
        if (!this.activeHandle && this.regionDragStartTime !== null && !this.isDraggingRegion) {
          this.isDraggingRegion = true; // 🔧 **ACTIVATE REGION DRAG**: Convert potential to actual region drag
          console.log(`🔄 [${this.debugId}] REGION DRAG ACTIVATED from movement (MODERN):`, {
            pixelsMoved: pixelsMoved.toFixed(1),
            timeSinceMouseDown: timeSinceMouseDown.toFixed(0) + 'ms',
            threshold: this.dragMoveThreshold + 'px',
            regionDragOffset: this.regionDragOffset.toFixed(2) + 's',
            note: 'Region drag activated from mouse movement detection - pending jump canceled'
          });
        } else {
          console.log(`✅ [${this.debugId}] Drag CONFIRMED (MODERN):`, {
            pixelsMoved: pixelsMoved.toFixed(1),
            timeSinceMouseDown: timeSinceMouseDown.toFixed(0) + 'ms',
            threshold: this.dragMoveThreshold + 'px',
            handleType: this.activeHandle || 'region',
            isDraggingRegion: this.isDraggingRegion,
            pendingJumpCanceled: true
          });
          
          // 🌍 **ENABLE GLOBAL PROTECTION**: Enable global mouse up listener for ghost drag protection
          this.enableGlobalMouseUpListener();
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
        
        // 🎯 **SIMPLIFIED REGION SYNC**: Always sync to region start as requested
        let audioSynced = false;
        if (audioContext) {
          const { audioRef, setCurrentTime, isPlaying } = audioContext;
          
          // 🆕 **REGION START SYNC**: Always sync to start of region for consistent behavior
          const targetSyncTime = adjustedStartTime; // 🎯 **SIMPLIFIED**: Always use region start
          
          console.log(`🔄 [${this.debugId}] ULTRA-SMOOTH region drag (MODERN):`, {
            from: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
            to: `${adjustedStartTime.toFixed(2)}s - ${adjustedEndTime.toFixed(2)}s`,
            duration: regionDuration.toFixed(2) + 's',
            mouseTime: roundedTime.toFixed(2) + 's',
            offset: this.regionDragOffset.toFixed(2) + 's',
            syncTarget: `${targetSyncTime.toFixed(2)}s (ALWAYS_START)` // 🆕 **CLEAR SYNC TARGET**
          });
          
          // 🚀 **ULTRA-SMOOTH REAL-TIME SYNC**: Force immediate sync with no throttling - always to start
          audioSynced = this.audioSyncManager.realTimeSync(
            targetSyncTime, audioRef, setCurrentTime, 'region', true, adjustedStartTime // force = true
          );
          
          if (audioSynced) {
            console.log(`🎯 [${this.debugId}] CONTINUOUS region sync to START: ${targetSyncTime.toFixed(2)}s (simplified strategy: ALWAYS_START)`);
          } else {
            console.warn(`⚠️ [${this.debugId}] Region sync FAILED - real-time sync unsuccessful for START: ${targetSyncTime.toFixed(2)}s`);
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
      
      // 🛡️ **RE-ENTRY PROTECTION**: Skip handle detection nếu vừa re-enter
      if (isRecentlyReEntered) {
        console.log(`🛡️ [${this.debugId}] MOUSE RE-ENTRY PROTECTION: Skipping handle detection (${timeSinceMouseLeave.toFixed(0)}ms since mouse leave < 300ms)`);
        return { action: 'none', reason: 'mouse_re_entry_protection' };
      }
      
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
            // 🤚 **REGION HOVER**: Grab cursor (bàn tay xòe ra) khi hover vào region - theo yêu cầu user
            hoverCursor = 'grab'; // 🤚 **GRAB CURSOR**: "Hình bàn tay xòe ra" như user yêu cầu
            
            console.log(`🤚 [${this.debugId}] Region hover detected - showing GRAB cursor (bàn tay xòe ra)`, {
              timeAtPosition: timeAtPosition.toFixed(2) + 's',
              regionRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
              cursorType: 'grab (bàn tay xòe ra - user requirement)',
              note: 'User requested open hand cursor when hovering over region - IMPLEMENTED'
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
    const hasPendingJump = this.hasPendingJump; // 🆕 **PENDING JUMP**: Check before reset
    const pendingJumpTime = this.pendingJumpTime; // 🆕 **STORE VALUE**: Store before reset
    
    if (wasDragging) {
      console.log(`🫳 [${this.debugId}] Drag completed (MODERN):`, {
        handle: this.activeHandle,
        confirmed: wasConfirmedDrag,
        regionDrag: wasRegionDrag,
        finalRegion: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
        hadPendingJump: hasPendingJump,
        pendingJumpCanceled: wasConfirmedDrag // 🆕 **CANCELED IF DRAG**: Jump bị hủy nếu có drag
      });
      
      // 🆕 FINAL AUDIO SYNC: Different logic for region vs handle drag
      if (audioContext && wasConfirmedDrag) {
        const { audioRef, setCurrentTime, isPlaying } = audioContext;
        
        if (wasRegionDrag) {
          // 🔄 **REGION DRAG COMPLETION**: Sync to START of new region as requested (not middle)
          const targetSyncTime = startTime; // 🎯 **SYNC TO START**: Always use startTime for region completion
          
          this.audioSyncManager.completeDragSync(
            'region', targetSyncTime, audioRef, setCurrentTime, isPlaying, startTime
          );
          
          console.log(`🔄 [${this.debugId}] Region drag completed - synced to START: ${targetSyncTime.toFixed(2)}s (not middle as before)`);
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
    
    // 🆕 **EXECUTE PENDING JUMP**: Execute delayed jump nếu không có confirmed drag
    let executePendingJump = false;
    let executePendingHandleUpdate = false; // 🆕 **PENDING HANDLE UPDATE**: Track pending handle update execution
    let pendingHandleUpdateData = null;     // 🆕 **STORE DATA**: Store before reset
    
    if (hasPendingJump && !wasConfirmedDrag && pendingJumpTime !== null) {
      executePendingJump = true;
      console.log(`⚡ [${this.debugId}] EXECUTING delayed jump to: ${pendingJumpTime.toFixed(2)}s (no drag detected - safe to jump)`);
    } else if (hasPendingJump && wasConfirmedDrag) {
      console.log(`🚫 [${this.debugId}] CANCELED delayed jump to: ${pendingJumpTime?.toFixed(2)}s (drag was confirmed - anti-shock protection)`);
    }
    
    // 🆕 **EXECUTE PENDING HANDLE UPDATE**: Execute delayed handle update nếu không có confirmed drag
    if (this.hasPendingHandleUpdate && !wasConfirmedDrag && this.pendingHandleUpdate !== null) {
      executePendingHandleUpdate = true;
      pendingHandleUpdateData = { ...this.pendingHandleUpdate }; // Store copy before reset
      console.log(`⚡ [${this.debugId}] EXECUTING delayed handle update: ${pendingHandleUpdateData.type} to ${pendingHandleUpdateData.newTime.toFixed(2)}s (no drag detected - safe to update)`);
    } else if (this.hasPendingHandleUpdate && wasConfirmedDrag) {
      console.log(`🚫 [${this.debugId}] CANCELED delayed handle update: ${this.pendingHandleUpdate?.type} to ${this.pendingHandleUpdate?.newTime?.toFixed(2)}s (drag was confirmed - anti-shock protection)`);
    }
    
    // 🆕 **RESET PENDING JUMP**: Reset pending jump state
    this.pendingJumpTime = null;
    this.hasPendingJump = false;
    
    // 🆕 **RESET PENDING HANDLE UPDATES**: Reset pending handle update state
    this.pendingHandleUpdate = null;
    this.hasPendingHandleUpdate = false;
    
    // 🌍 **DISABLE GLOBAL PROTECTION**: Disable global mouse up listener after normal completion
    this.disableGlobalMouseUpListener();
    
    return {
      action: wasDragging ? 'completeDrag' : 'none',
      saveHistory: wasConfirmedDrag, // 🆕 **CHỈ SAVE** khi đã confirmed drag
      cursor: this.lastHoveredHandle ? 'ew-resize' : 'pointer', // 🔧 **CURSOR LOGIC**: ew-resize for handle hover, pointer for default
      audioSynced: wasDragging && audioContext && (draggedHandle || wasRegionDrag) && wasConfirmedDrag,
      wasRegionDrag: wasRegionDrag, // 🆕 **FLAG**: Thông báo đã hoàn thành region drag
      // 🆕 **PENDING JUMP RESULT**: Return pending jump info
      executePendingJump: executePendingJump,
      pendingJumpTime: executePendingJump ? pendingJumpTime : null,
      // 🆕 **PENDING HANDLE UPDATE**: Return pending handle update info
      executePendingHandleUpdate: executePendingHandleUpdate,
      pendingHandleUpdate: pendingHandleUpdateData
    };
  }
  
  /**
   * 🎯 Handle mouse leave event
   */
  handleMouseLeave() {
    console.log(`🫥 [${this.debugId}] Mouse left canvas (MODERN)`);
    
    // 🛡️ **TRACK MOUSE LEAVE TIME**: Record timing cho re-entry protection
    this.lastMouseLeaveTime = performance.now();
    
    const wasDragging = this.state === INTERACTION_STATES.DRAGGING;
    const wasConfirmedDrag = this.isDraggingConfirmed;
    
    // 🔧 **SMART RESET LOGIC**: Only reset if NOT actively dragging with confirmed drag
    if (wasDragging && wasConfirmedDrag) {
      // 🚀 **MAINTAIN DRAG STATE**: Keep drag state when actively dragging for seamless re-entry
      console.log(`🔄 [${this.debugId}] MAINTAINING drag state - active drag in progress (can re-enter and continue)`, {
        activeHandle: this.activeHandle,
        isDraggingRegion: this.isDraggingRegion,
        note: 'Drag state preserved for seamless mouse re-entry'
      });
      
      // 🛡️ **CLEAR ONLY HOVER**: Clear hover state but keep drag state
      this.lastHoveredHandle = HANDLE_TYPES.NONE;
      
      return {
        action: 'clearHover',
        cursor: 'default',
        forceReset: false, // 🚀 **NO FORCE RESET**: Keep drag state active
        wasDragging: wasDragging,
        wasConfirmedDrag: wasConfirmedDrag,
        maintainDragState: true // 🆕 **FLAG**: Indicate drag state is maintained
      };
    } else {
      // 🚨 **RESET NON-CONFIRMED DRAGS**: Reset if not confirmed drag or not dragging
      console.log(`🛡️ [${this.debugId}] RESET interaction states - no confirmed drag in progress`);
      
      // 🔧 **STANDARD RESET**: Reset all states for non-drag scenarios
      this.state = INTERACTION_STATES.IDLE;
      this.lastHoveredHandle = HANDLE_TYPES.NONE;
      this.activeHandle = HANDLE_TYPES.NONE;
      this.dragStartPosition = null;
      this.dragStartTime = null;
      this.isDraggingConfirmed = false;
      this.mouseDownTimestamp = null;
      this.lastMousePosition = null;
      
      // 🔧 **RESET REGION DRAG**: Reset region drag states
      this.isDraggingRegion = false;
      this.regionDragStartTime = null;
      this.regionDragOffset = 0;
      
      // 🛡️ **CLEAR PENDING ACTIONS**: Clear pending actions để tránh trigger khi mouse re-enter
      if (this.hasPendingJump) {
        console.log(`🚫 [${this.debugId}] CLEARING pending jump (${this.pendingJumpTime?.toFixed(2)}s) - mouse left canvas`);
        this.pendingJumpTime = null;
        this.hasPendingJump = false;
      }
      
      if (this.hasPendingHandleUpdate) {
        console.log(`🚫 [${this.debugId}] CLEARING pending handle update (${this.pendingHandleUpdate?.type}: ${this.pendingHandleUpdate?.newTime?.toFixed(2)}s) - mouse left canvas`);
        this.pendingHandleUpdate = null;
        this.hasPendingHandleUpdate = false;
      }
      
      return {
        action: 'clearHover',
        cursor: 'default',
        forceReset: true, // 🚨 **FORCE RESET**: Reset for non-drag scenarios
        wasDragging: wasDragging,
        wasConfirmedDrag: wasConfirmedDrag,
        ghostDragPrevented: true
      };
    }
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
      // 🆕 **PENDING JUMP DEBUG**
      hasPendingJump: this.hasPendingJump,
      pendingJumpTime: this.pendingJumpTime,
      // 🆕 **PENDING HANDLE UPDATES**: Support cho delayed handle movement
      hasPendingHandleUpdate: this.hasPendingHandleUpdate,
      pendingHandleUpdate: this.pendingHandleUpdate,
      // 🆕 **MODERN HANDLES FLAG**
      modernHandles: true,
      handleWidth: WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH
    };
  }
  
  /**
   * 🎯 Reset manager state
   */
  reset() {
    console.log(`🔄 [${this.debugId}] Resetting interaction state (MODERN + DELAYED JUMP + RE-ENTRY PROTECTION)`);
    this.state = INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.lastHoveredHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    
    // 🆕 **RESET ENHANCED TRACKING**: Reset drag confirmation state
    this.isDraggingConfirmed = false;
    this.mouseDownTimestamp = null;
    this.lastMousePosition = null;
    
    // 🛡️ **RESET RE-ENTRY PROTECTION**: Reset mouse leave timing
    this.lastMouseLeaveTime = null;
    
    // 🆕 **RESET REGION DRAG**: Reset region drag state
    this.isDraggingRegion = false;
    this.regionDragStartTime = null;
    this.regionDragOffset = 0;
    
    // 🆕 **RESET PENDING JUMP**: Reset pending jump state
    this.pendingJumpTime = null;
    this.hasPendingJump = false;
    
    // 🆕 **RESET PENDING HANDLE UPDATES**: Reset pending handle update state
    this.pendingHandleUpdate = null;
    this.hasPendingHandleUpdate = false;
    
    // 🆕 RESET AUDIO SYNC: Reset sync manager state
    if (this.audioSyncManager) {
      this.audioSyncManager.reset();
    }
    
    // 🌍 **CLEANUP GLOBAL LISTENER**: Ensure global mouse up listener is disabled
    this.disableGlobalMouseUpListener();
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
   * 🎯 Get handle at specific position for cursor management
   * @param {number} x - Mouse X position relative to canvas
   * @param {number} canvasWidth - Canvas width in pixels
   * @param {number} duration - Audio duration in seconds
   * @param {number} startTime - Selection start time in seconds
   * @param {number} endTime - Selection end time in seconds
   * @param {Object} eventInfo - Additional event information (optional)
   * @returns {string|null} Handle type ('start', 'end', or null)
   */
  getHandleAtPosition(x, canvasWidth, duration, startTime, endTime, eventInfo = null) {
    // 🔧 **USE SAME DETECTION LOGIC**: Sử dụng cùng logic với handleMouseDown
    return detectHandle(x, canvasWidth, duration, startTime, endTime, eventInfo);
  }
}

// 🎯 Global interaction manager instance
export const createInteractionManager = () => new InteractionManager();