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
    
    // 🎯 Click behavior preferences
    this.preferences = {
      enableSmartUpdate: true,        // Enable smart start/end updates
      requireMinSelection: 0.1,       // Minimum selection duration (seconds)
      allowZeroDuration: false,       // Allow zero-duration selections
      preserveAudioSync: true,        // Maintain audio sync during updates
      enableRegionDrag: true          // 🆕 NEW: Enable region dragging
    };
    
    console.log(`🎯 [SmartClickManager] Created with ID: ${this.debugId}`);
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
    // 🎯 HANDLE DETECTION: Priority check
    if (handleAtPosition === 'start') return CLICK_ZONES.ON_START_HANDLE;
    if (handleAtPosition === 'end') return CLICK_ZONES.ON_END_HANDLE;
    
    // 🎯 BOUNDARY CHECKS: Duration limits
    if (clickTime < 0 || clickTime > duration) return CLICK_ZONES.OUTSIDE_DURATION;
    
    // 🎯 POSITION ANALYSIS: Relative to selection
    if (clickTime < startTime) return CLICK_ZONES.BEFORE_START;
    if (clickTime > endTime) return CLICK_ZONES.AFTER_END;
    if (clickTime >= startTime && clickTime <= endTime) return CLICK_ZONES.INSIDE_SELECTION;
    
    // 🎯 FALLBACK: Should not reach here
    return CLICK_ZONES.OUTSIDE_DURATION;
  }
  
  /**
   * 🎯 Determine smart action based on click zone
   * @param {string} clickZone - Result from analyzeClickZone
   * @param {number} clickTime - Time position of click
   * @param {number} startTime - Current start time
   * @param {number} endTime - Current end time
   * @returns {object} Action details with type and parameters
   */
  determineAction(clickZone, clickTime, startTime, endTime) {
    const actionDetails = {
      zone: clickZone,
      action: CLICK_ACTIONS.NO_ACTION,
      newStartTime: startTime,
      newEndTime: endTime,
      seekTime: null,
      handle: null,
      cursor: 'crosshair',
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
        if (this.preferences.enableRegionDrag) {
          actionDetails.action = CLICK_ACTIONS.DRAG_REGION;
          actionDetails.seekTime = clickTime;
          actionDetails.cursor = 'move';
          actionDetails.reason = 'Dragging entire region';
        } else {
          actionDetails.action = CLICK_ACTIONS.JUMP_TO_TIME;
          actionDetails.seekTime = clickTime;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = 'Seeking within selection';
        }
        break;
        
      case CLICK_ZONES.BEFORE_START:
        if (this.preferences.enableSmartUpdate) {
          actionDetails.action = CLICK_ACTIONS.UPDATE_START;
          actionDetails.newStartTime = clickTime;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = `Moving start from ${startTime.toFixed(2)}s to ${clickTime.toFixed(2)}s`;
        } else {
          actionDetails.action = CLICK_ACTIONS.CREATE_SELECTION;
          actionDetails.newStartTime = clickTime;
          actionDetails.newEndTime = clickTime;
          actionDetails.cursor = 'crosshair';
          actionDetails.reason = 'Creating new selection';
        }
        break;
        
      case CLICK_ZONES.AFTER_END:
        if (this.preferences.enableSmartUpdate) {
          actionDetails.action = CLICK_ACTIONS.UPDATE_END;
          actionDetails.newEndTime = clickTime;
          actionDetails.cursor = 'pointer';
          actionDetails.reason = `Moving end from ${endTime.toFixed(2)}s to ${clickTime.toFixed(2)}s`;
        } else {
          actionDetails.action = CLICK_ACTIONS.CREATE_SELECTION;
          actionDetails.newStartTime = clickTime;
          actionDetails.newEndTime = clickTime;
          actionDetails.cursor = 'crosshair';
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
   * @returns {object} Complete action details
   */
  processClick(clickTime, startTime, endTime, duration, handleAtPosition) {
    // 🎯 ANALYZE: Determine click zone
    const clickZone = this.analyzeClickZone(
      clickTime, startTime, endTime, duration, handleAtPosition
    );
    
    // 🎯 DETERMINE: Choose appropriate action
    const actionDetails = this.determineAction(
      clickZone, clickTime, startTime, endTime
    );
    
    // 🎯 ENHANCED LOGGING: Debug information
    console.log(`🎯 [${this.debugId}] Smart click processed:`, {
      input: {
        clickTime: clickTime.toFixed(2) + 's',
        currentSelection: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
        handle: handleAtPosition || 'none'
      },
      analysis: {
        zone: clickZone,
        action: actionDetails.action
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