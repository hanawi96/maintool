// 🎯 Smart Click Manager - Intelligent click behavior for waveform
// Determines the appropriate action based on click position relative to handles

/**
 * 🎯 Click position analysis results
 */
export const CLICK_ZONES = {
  ON_START_HANDLE: 'on_start_handle',
  ON_END_HANDLE: 'on_end_handle', 
  BEFORE_START: 'before_start',        // Click trước start handle
  INSIDE_SELECTION: 'inside_selection', // Click trong selection
  AFTER_END: 'after_end',              // Click sau end handle
  OUTSIDE_DURATION: 'outside_duration'  // Click ngoài duration
};

/**
 * 🎯 Smart click actions
 */
export const CLICK_ACTIONS = {
  START_DRAG: 'startDrag',           // Drag handle
  JUMP_TO_TIME: 'jumpToTime',        // Seek audio
  UPDATE_START: 'updateStart',       // Update start time
  UPDATE_END: 'updateEnd',           // Update end time  
  CREATE_SELECTION: 'createSelection', // Create new selection
  DRAG_REGION: 'dragRegion',         // 🆕 NEW: Drag entire region
  NO_ACTION: 'noAction'              // Do nothing
};

/**
 * 🎯 Smart Click Manager Class
 * Analyzes click position and determines appropriate action
 */
export class SmartClickManager {
  constructor() {
    this.debugId = Math.random().toString(36).substr(2, 6);
    
    // 🛡️ **PROTECTION TIMING**: Track interaction timing for re-entry protection
    this.lastInteractionTime = null; // Track last mouse interaction time
    
    // 🎯 Click behavior preferences
    this.preferences = {
      enableSmartUpdate: true,        // Enable smart start/end updates
      requireMinSelection: 0.1,       // Minimum selection duration (seconds)
      allowZeroDuration: false,       // Allow zero-duration selections
      preserveAudioSync: true,        // Maintain audio sync during updates
      enableRegionDrag: true,         // 🆕 NEW: Enable region dragging
      
      // 🔧 **PROTECTION AGAINST ACCIDENTAL MOVES**: Thêm protection settings
      preventAccidentalHandleMove: true,  // 🆕 **PROTECTION**: Ngăn chặn handle move khi chỉ hover
      requireDragConfirmation: true,      // 🆕 **DRAG CONFIRMATION**: Yêu cầu confirm drag trước khi move handles
      enableHoverProtection: true         // 🆕 **HOVER PROTECTION**: Bảo vệ handles khỏi hover events
    };
    
    console.log(`🎯 [SmartClickManager] Created with ENHANCED PROTECTION enabled - ID: ${this.debugId}`);
  }
  
  /**
   * 🎯 Analyze click position and determine zone
   * @param {number} clickTime - Time position of click (seconds)
   * @param {number} startTime - Current start time (seconds)
   * @param {number} endTime - Current end time (seconds)
   * @param {number} duration - Total audio duration (seconds)
   * @param {string} handleAtPosition - Handle detected at click position ('start'/'end'/null)
   * @returns {string} Click zone classification
   */
  analyzeClickZone(clickTime, startTime, endTime, duration, handleAtPosition) {
    // 🔧 **ENHANCED DEBUG**: Log all input parameters
    console.log(`🎯 [${this.debugId}] ClickZone Analysis:`, {
      clickTime: clickTime.toFixed(2) + 's',
      startTime: startTime.toFixed(2) + 's', 
      endTime: endTime.toFixed(2) + 's',
      duration: duration.toFixed(2) + 's',
      handleAtPosition: handleAtPosition || 'none',
      hasValidSelection: startTime < endTime
    });
    
    // 🎯 HANDLE DETECTION: Priority check
    if (handleAtPosition === 'start') {
      console.log(`🎯 [${this.debugId}] ClickZone Result: ON_START_HANDLE`);
      return CLICK_ZONES.ON_START_HANDLE;
    }
    if (handleAtPosition === 'end') {
      console.log(`🎯 [${this.debugId}] ClickZone Result: ON_END_HANDLE`);
      return CLICK_ZONES.ON_END_HANDLE;
    }
    
    // 🎯 BOUNDARY CHECKS: Duration limits
    if (clickTime < 0 || clickTime > duration) {
      console.log(`🎯 [${this.debugId}] ClickZone Result: OUTSIDE_DURATION (clickTime: ${clickTime.toFixed(2)}s, duration: ${duration.toFixed(2)}s)`);
      return CLICK_ZONES.OUTSIDE_DURATION;
    }
    
    // 🎯 POSITION ANALYSIS: Relative to selection
    if (clickTime < startTime) {
      console.log(`🎯 [${this.debugId}] ClickZone Result: BEFORE_START (${clickTime.toFixed(2)}s < ${startTime.toFixed(2)}s)`);
      return CLICK_ZONES.BEFORE_START;
    }
    if (clickTime > endTime) {
      console.log(`🎯 [${this.debugId}] ClickZone Result: AFTER_END (${clickTime.toFixed(2)}s > ${endTime.toFixed(2)}s)`);
      return CLICK_ZONES.AFTER_END;
    }
    if (clickTime >= startTime && clickTime <= endTime) {
      console.log(`🎯 [${this.debugId}] ClickZone Result: INSIDE_SELECTION (${startTime.toFixed(2)}s <= ${clickTime.toFixed(2)}s <= ${endTime.toFixed(2)}s) - REGION DRAG POTENTIAL!`);
      return CLICK_ZONES.INSIDE_SELECTION;
    }
    
    // 🎯 FALLBACK: Should not reach here
    console.warn(`⚠️ [${this.debugId}] ClickZone Result: OUTSIDE_DURATION (fallback case - should not happen)`);
    return CLICK_ZONES.OUTSIDE_DURATION;
  }
  
  /**
   * 🎯 Determine smart action based on click zone
   * @param {string} clickZone - Result from analyzeClickZone
   * @param {number} clickTime - Time position of click
   * @param {number} startTime - Current start time
   * @param {number} endTime - Current end time
   * @param {number} duration - Total duration cho protection logic
   * @param {boolean} isActualClick - Có phải actual click hay chỉ hover
   * @returns {object} Action details with type and parameters
   */
  determineAction(clickZone, clickTime, startTime, endTime, duration = Infinity, isActualClick = true) {
    const actionDetails = {
      zone: clickZone,
      action: CLICK_ACTIONS.NO_ACTION,
      newStartTime: startTime,
      newEndTime: endTime,
      seekTime: null,
      handle: null,
      cursor: 'pointer',
      reason: 'Unknown'
    };
    
    console.log(`🎯 [${this.debugId}] Analyzing click:`, {
      zone: clickZone,
      time: clickTime.toFixed(2) + 's',
      selection: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`
    });
    
    switch (clickZone) {
      case CLICK_ZONES.ON_START_HANDLE:
        actionDetails.action = CLICK_ACTIONS.START_DRAG;
        actionDetails.handle = 'start';
        actionDetails.cursor = 'ew-resize';
        actionDetails.reason = 'Dragging start handle';
        break;
        
      case CLICK_ZONES.ON_END_HANDLE:
        actionDetails.action = CLICK_ACTIONS.START_DRAG;
        actionDetails.handle = 'end';
        actionDetails.cursor = 'ew-resize';
        actionDetails.reason = 'Dragging end handle';
        break;
        
      case CLICK_ZONES.INSIDE_SELECTION:
        // 🆕 **ENHANCED LOGIC**: Click trong region có thể jump hoặc enable drag potential
        // Default action là JUMP_TO_TIME, nhưng cần chuẩn bị cho region drag potential
        actionDetails.action = CLICK_ACTIONS.JUMP_TO_TIME;
        actionDetails.seekTime = clickTime;
        actionDetails.cursor = 'pointer';
        actionDetails.reason = 'Jumping to clicked position within selection';
        
        // 🆕 **REGION DRAG POTENTIAL**: Mark để có thể trigger region drag khi có movement
        actionDetails.regionDragPotential = true; // 🔧 **ENABLE REGION DRAG**: Flag để interactionManager biết có thể drag region
        
        // 🔧 **DEBUG INFO**: Log jump action with drag potential
        console.log(`⏯️ [${this.debugId}] INSIDE_SELECTION click → JUMP_TO_TIME with region drag potential: ${clickTime.toFixed(2)}s`);
        break;
        
      case CLICK_ZONES.BEFORE_START:
        // 🔧 **PROTECTION CHECK**: Kiểm tra có nên cho phép handle update không
        if (!this.shouldAllowHandleUpdate(clickZone, clickTime, startTime, endTime, duration, isActualClick)) {
          actionDetails.action = CLICK_ACTIONS.NO_ACTION;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = 'PROTECTED: Handle update blocked by protection logic';
          console.log(`🛡️ [${this.debugId}] BEFORE_START update BLOCKED by protection`);
          break;
        }
        
        if (this.preferences.enableSmartUpdate) {
          actionDetails.action = CLICK_ACTIONS.UPDATE_START;
          actionDetails.newStartTime = clickTime;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = `Moving start from ${startTime.toFixed(2)}s to ${clickTime.toFixed(2)}s`;
          console.log(`✅ [${this.debugId}] BEFORE_START update ALLOWED: ${startTime.toFixed(2)}s → ${clickTime.toFixed(2)}s`);
        } else {
          actionDetails.action = CLICK_ACTIONS.CREATE_SELECTION;
          actionDetails.newStartTime = clickTime;
          actionDetails.newEndTime = clickTime;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = 'Creating new selection';
        }
        break;
        
      case CLICK_ZONES.AFTER_END:
        // 🔧 **PROTECTION CHECK**: Kiểm tra có nên cho phép handle update không
        if (!this.shouldAllowHandleUpdate(clickZone, clickTime, startTime, endTime, duration, isActualClick)) {
          actionDetails.action = CLICK_ACTIONS.NO_ACTION;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = 'PROTECTED: Handle update blocked by protection logic';
          console.log(`🛡️ [${this.debugId}] AFTER_END update BLOCKED by protection`);
          break;
        }
        
        if (this.preferences.enableSmartUpdate) {
          actionDetails.action = CLICK_ACTIONS.UPDATE_END;
          actionDetails.newEndTime = clickTime;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = `Moving end from ${endTime.toFixed(2)}s to ${clickTime.toFixed(2)}s`;
          console.log(`✅ [${this.debugId}] AFTER_END update ALLOWED: ${endTime.toFixed(2)}s → ${clickTime.toFixed(2)}s`);
        } else {
          actionDetails.action = CLICK_ACTIONS.CREATE_SELECTION;
          actionDetails.newStartTime = clickTime;
          actionDetails.newEndTime = clickTime;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = 'Creating new selection';
        }
        break;
        
      case CLICK_ZONES.OUTSIDE_DURATION:
        actionDetails.action = CLICK_ACTIONS.NO_ACTION;
        actionDetails.cursor = 'default';
        actionDetails.reason = 'Click outside valid duration';
        break;
        
      default:
        actionDetails.cursor = 'default';
        actionDetails.reason = 'Unhandled click zone';
        break;
    }
    
    // 🎯 VALIDATION: Check minimum selection duration
    if (actionDetails.action === CLICK_ACTIONS.UPDATE_START || 
        actionDetails.action === CLICK_ACTIONS.UPDATE_END) {
      const newDuration = actionDetails.newEndTime - actionDetails.newStartTime;
      
      if (newDuration < this.preferences.requireMinSelection) {
        console.warn(`⚠️ [${this.debugId}] Selection too short: ${newDuration.toFixed(3)}s < ${this.preferences.requireMinSelection}s`);
        actionDetails.action = CLICK_ACTIONS.NO_ACTION;
        actionDetails.reason = `Selection duration would be too short (${newDuration.toFixed(3)}s)`;
      }
    }
    
    console.log(`🎯 [${this.debugId}] Action determined:`, {
      action: actionDetails.action,
      reason: actionDetails.reason,
      newRegion: actionDetails.action.includes('UPDATE') ? 
        `${actionDetails.newStartTime.toFixed(2)}s - ${actionDetails.newEndTime.toFixed(2)}s` : 'unchanged'
    });
    
    return actionDetails;
  }
  
  /**
   * 🎯 Process smart click with full analysis
   * @param {number} clickTime - Time position of click
   * @param {number} startTime - Current start time
   * @param {number} endTime - Current end time  
   * @param {number} duration - Total audio duration
   * @param {string} handleAtPosition - Handle detected at position
   * @param {boolean} isActualClick - Có phải actual click hay chỉ hover (default: true)
   * @returns {object} Complete action details
   */
  processClick(clickTime, startTime, endTime, duration, handleAtPosition, isActualClick = true) {
    // 🎯 ANALYZE: Determine click zone
    const clickZone = this.analyzeClickZone(
      clickTime, startTime, endTime, duration, handleAtPosition
    );
    
    // 🎯 DETERMINE: Choose appropriate action WITH protection logic
    const actionDetails = this.determineAction(
      clickZone, clickTime, startTime, endTime, duration, isActualClick
    );
    
    // 🎯 ENHANCED LOGGING: Debug information with protection status
    console.log(`🎯 [${this.debugId}] Smart click processed WITH PROTECTION:`, {
      input: {
        clickTime: clickTime.toFixed(2) + 's',
        currentSelection: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
        handle: handleAtPosition || 'none',
        isActualClick: isActualClick,
        duration: duration.toFixed(2) + 's'
      },
      analysis: {
        zone: clickZone,
        action: actionDetails.action,
        protected: actionDetails.reason.includes('PROTECTED')
      },
      result: {
        newSelection: `${actionDetails.newStartTime.toFixed(2)}s - ${actionDetails.newEndTime.toFixed(2)}s`,
        seekTime: actionDetails.seekTime ? actionDetails.seekTime.toFixed(2) + 's' : null,
        reason: actionDetails.reason
      }
    });
    
    return actionDetails;
  }
  
  /**
   * 🎯 Update preferences
   * @param {object} newPreferences - New preference values
   */
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    console.log(`⚙️ [${this.debugId}] Updated preferences:`, this.preferences);
  }
  
  /**
   * 🎯 Get debug information
   * @returns {object} Debug details
   */
  getDebugInfo() {
    return {
      id: this.debugId,
      preferences: this.preferences,
      supportedZones: Object.values(CLICK_ZONES),
      supportedActions: Object.values(CLICK_ACTIONS)
    };
  }

  /**
   * 🔧 **PROTECTION CHECK**: Kiểm tra có nên cho phép handle update hay không
   * @param {string} clickZone - Zone được click
   * @param {number} clickTime - Time position click
   * @param {number} startTime - Current start time
   * @param {number} endTime - Current end time  
   * @param {number} duration - Total duration
   * @param {boolean} isActualClick - Có phải actual click event hay chỉ hover
   * @returns {boolean} True nếu handle update được phép
   */
  shouldAllowHandleUpdate(clickZone, clickTime, startTime, endTime, duration, isActualClick = true) {
    // 🚫 **HOVER PROTECTION**: Nếu chỉ hover và protection enabled, không cho phép update
    if (!isActualClick && this.preferences.enableHoverProtection) {
      console.log(`🛡️ [${this.debugId}] HOVER PROTECTION: Blocking handle update for hover event`);
      return false;
    }
    
    // 🔧 **EDGE POSITION PROTECTION**: Kiểm tra xem handles có ở edge positions không
    const isStartAtEdge = Math.abs(startTime - 0) < 0.1; // Start handle gần đầu file (< 0.1s)
    const isEndAtEdge = Math.abs(endTime - duration) < 0.1; // End handle gần cuối file (< 0.1s)
    
    // 🛡️ **ENHANCED EDGE PROTECTION**: Tăng cường protection với threshold lớn hơn
    const edgeProtectionThreshold = 2.0; // Tăng từ 1.0s lên 2.0s cho protection mạnh hơn
    
    // 🔧 **BEFORE_START PROTECTION**: Protect start handle khi đã ở edge
    if (clickZone === CLICK_ZONES.BEFORE_START && isStartAtEdge && this.preferences.preventAccidentalHandleMove) {
      // 🛡️ **DISTANCE CHECK**: Kiểm tra khoảng cách click với start handle
      const distanceFromStart = Math.abs(clickTime - startTime);
      if (distanceFromStart < edgeProtectionThreshold) {
        console.log(`🛡️ [${this.debugId}] ENHANCED EDGE PROTECTION: Start handle at edge (${startTime.toFixed(2)}s), click too close (${distanceFromStart.toFixed(2)}s < ${edgeProtectionThreshold}s), blocking BEFORE_START update`);
        return false;
      }
    }
    
    // 🔧 **AFTER_END PROTECTION**: Protect end handle khi đã ở edge  
    if (clickZone === CLICK_ZONES.AFTER_END && isEndAtEdge && this.preferences.preventAccidentalHandleMove) {
      // 🛡️ **DISTANCE CHECK**: Kiểm tra khoảng cách click với end handle
      const distanceFromEnd = Math.abs(clickTime - endTime);
      if (distanceFromEnd < edgeProtectionThreshold) {
        console.log(`🛡️ [${this.debugId}] ENHANCED EDGE PROTECTION: End handle at edge (${endTime.toFixed(2)}s), click too close (${distanceFromEnd.toFixed(2)}s < ${edgeProtectionThreshold}s), blocking AFTER_END update`);
        return false;
      }
    }
    
    // 🔧 **MINIMAL MOVEMENT PROTECTION**: Tránh movement quá nhỏ
    const minMovementThreshold = 1.0; // Tăng từ 0.5s lên 1.0s cho protection mạnh hơn
    if (clickZone === CLICK_ZONES.BEFORE_START) {
      const movementDistance = Math.abs(startTime - clickTime);
      if (movementDistance < minMovementThreshold) {
        console.log(`🛡️ [${this.debugId}] ENHANCED MINIMAL MOVEMENT PROTECTION: Start movement too small (${movementDistance.toFixed(2)}s < ${minMovementThreshold}s)`);
        return false;
      }
    }
    
    if (clickZone === CLICK_ZONES.AFTER_END) {
      const movementDistance = Math.abs(endTime - clickTime);
      if (movementDistance < minMovementThreshold) {
        console.log(`🛡️ [${this.debugId}] ENHANCED MINIMAL MOVEMENT PROTECTION: End movement too small (${movementDistance.toFixed(2)}s < ${minMovementThreshold}s)`);
        return false;
      }
    }
    
    // 🛡️ **ADDITIONAL PROTECTION**: Check cho mouse re-entry scenarios
    if (!isActualClick) {
      // 🔧 **MOUSE RE-ENTRY PROTECTION**: Extra protection cho hover events sau mouse leave
      const currentTime = performance.now();
      const timeSinceLastInteraction = this.lastInteractionTime ? currentTime - this.lastInteractionTime : Infinity;
      
      // 🛡️ **COOLDOWN PERIOD**: 500ms cooldown sau mouse interactions
      if (timeSinceLastInteraction < 500) {
        console.log(`🛡️ [${this.debugId}] MOUSE RE-ENTRY PROTECTION: Too soon after last interaction (${timeSinceLastInteraction.toFixed(0)}ms < 500ms), blocking hover update`);
        return false;
      }
    } else {
      // 🔧 **TRACK LAST INTERACTION**: Track actual clicks cho re-entry protection
      this.lastInteractionTime = performance.now();
    }
    
    return true;
  }
}

/**
 * 🎯 Create SmartClickManager instance
 * @returns {SmartClickManager} New instance
 */
export const createSmartClickManager = () => {
  return new SmartClickManager();
};

/**
 * 🎯 Utility: Validate time boundaries
 * @param {number} time - Time to validate
 * @param {number} duration - Audio duration
 * @returns {boolean} Whether time is valid
 */
export const isValidClickTime = (time, duration) => {
  return !isNaN(time) && time >= 0 && time <= duration;
};

/**
 * 🎯 Utility: Calculate selection duration
 * @param {number} startTime - Start time
 * @param {number} endTime - End time
 * @returns {number} Duration in seconds
 */
export const calculateSelectionDuration = (startTime, endTime) => {
  return Math.max(0, endTime - startTime);
}; 