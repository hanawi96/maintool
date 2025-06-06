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
 * 🎯 Smart handle detection with responsive sizing
 * @param {number} x - Mouse X position relative to canvas
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} duration - Audio duration in seconds
 * @param {number} startTime - Selection start time in seconds
 * @param {number} endTime - Selection end time in seconds
 * @returns {string|null} Handle type ('start', 'end', or null)
 */
export const detectHandle = (x, canvasWidth, duration, startTime, endTime) => {
  if (duration === 0) return null;
  
  // 🎯 RESPONSIVE: Use same handle width calculation as WaveformCanvas
  const baseHandleWidth = WAVEFORM_CONFIG.HANDLE_WIDTH;
  const mobileBreakpoint = WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT;
  const touchTolerance = WAVEFORM_CONFIG.RESPONSIVE.TOUCH_TOLERANCE;
  
  const responsiveHandleWidth = canvasWidth < mobileBreakpoint ? 
    Math.max(8, baseHandleWidth * 0.8) : baseHandleWidth;
  
  const startX = (startTime / duration) * canvasWidth;
  const endX = (endTime / duration) * canvasWidth;
  
  // 🎯 Enhanced tolerance for better UX
  const tolerance = Math.max(responsiveHandleWidth / 2, touchTolerance);
  
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
    
    // 🆕 NEW: Audio sync manager for cursor synchronization
    this.audioSyncManager = createAudioSyncManager();
    
    // 🆕 NEW: Smart click manager for intelligent click behavior
    this.smartClickManager = createSmartClickManager();
    
    // 🎯 Debug tracking
    this.debugId = Math.random().toString(36).substr(2, 6);
    console.log(`🎮 [InteractionManager] Created with ID: ${this.debugId}`);
    console.log(`🔄 [AudioSync] Connected to InteractionManager ${this.debugId}`);
    console.log(`🎯 [SmartClick] Connected to InteractionManager ${this.debugId}`);
  }
  
  /**
   * 🎯 Handle mouse down event with smart click analysis
   */
  handleMouseDown(x, canvasWidth, duration, startTime, endTime) {
    const handle = detectHandle(x, canvasWidth, duration, startTime, endTime);
    const clickTime = positionToTime(x, canvasWidth, duration);
    
    console.log(`🖱️ [${this.debugId}] Mouse down:`, {
      x: x.toFixed(1),
      time: clickTime.toFixed(2) + 's',
      handle: handle || 'none',
      currentRegion: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`
    });
    
    // 🆕 NEW: Use SmartClickManager for intelligent click analysis
    const smartAction = this.smartClickManager.processClick(
      clickTime, startTime, endTime, duration, handle
    );
    
    // 🎯 Process smart action
    switch (smartAction.action) {
      case CLICK_ACTIONS.START_DRAG:
        // 🎯 START DRAGGING HANDLE
        this.state = INTERACTION_STATES.DRAGGING;
        this.activeHandle = smartAction.handle;
        this.dragStartPosition = x;
        this.dragStartTime = smartAction.handle === HANDLE_TYPES.START ? startTime : endTime;
        
        console.log(`🫳 [${this.debugId}] Started dragging ${smartAction.handle} handle`);
        
        return {
          action: 'startDrag',
          handle: smartAction.handle,
          cursor: smartAction.cursor
        };
        
      case CLICK_ACTIONS.JUMP_TO_TIME:
        console.log(`⏯️ [${this.debugId}] Click in selection, jumping to time`);
        return {
          action: 'jumpToTime',
          time: smartAction.seekTime
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
        
        return {
          action: 'createSelection',
          startTime: smartAction.newStartTime,
          endTime: smartAction.newEndTime,
          cursor: smartAction.cursor
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
   * 🎯 Handle mouse move event
   */
  handleMouseMove(x, canvasWidth, duration, startTime, endTime, audioContext = null) {
    const currentTime = positionToTime(x, canvasWidth, duration);
    
    if (this.state === INTERACTION_STATES.DRAGGING) {
      // 🎯 ACTIVE DRAGGING - Update region
      const roundedTime = Math.round(currentTime * 100) / 100; // 10ms precision
      
      if (this.activeHandle === HANDLE_TYPES.START) {
        const newStartTime = Math.min(roundedTime, endTime - 0.1);
        if (Math.abs(newStartTime - startTime) > 0.01) {
          console.log(`⏮️ [${this.debugId}] Dragging start: ${startTime.toFixed(2)}s → ${newStartTime.toFixed(2)}s`);
          
          // 🆕 AUDIO SYNC: Sync cursor when dragging start handle
          if (audioContext) {
            const { audioRef, setCurrentTime, isPlaying } = audioContext;
            if (this.audioSyncManager.shouldSync('start', isPlaying, newStartTime)) {
              this.audioSyncManager.syncAudioCursor(
                newStartTime, audioRef, setCurrentTime, isPlaying, 'start'
              );
            }
          }
          
          return {
            action: 'updateRegion',
            startTime: newStartTime,
            significant: true,
            audioSynced: true // 🆕 Flag indicating audio was synced
          };
        }
      } else if (this.activeHandle === HANDLE_TYPES.END) {
        const newEndTime = Math.max(roundedTime, startTime + 0.1);
        if (Math.abs(newEndTime - endTime) > 0.01) {
          console.log(`⏭️ [${this.debugId}] Dragging end: ${endTime.toFixed(2)}s → ${newEndTime.toFixed(2)}s`);
          
          // 🆕 AUDIO SYNC: Sync cursor when dragging end handle (optional)
          if (audioContext && this.audioSyncManager.preferences.syncEndHandle) {
            const { audioRef, setCurrentTime, isPlaying } = audioContext;
            if (this.audioSyncManager.shouldSync('end', isPlaying, newEndTime)) {
              this.audioSyncManager.syncAudioCursor(
                newEndTime, audioRef, setCurrentTime, isPlaying, 'end'
              );
            }
          }
          
          return {
            action: 'updateRegion',
            endTime: newEndTime,
            significant: true,
            audioSynced: this.audioSyncManager.preferences.syncEndHandle
          };
        }
      }
      
      return { action: 'none' };
    } else {
      // 🎯 HOVER ONLY - Visual feedback only, NO region changes
      const handle = detectHandle(x, canvasWidth, duration, startTime, endTime);
      
      if (handle !== this.lastHoveredHandle) {
        console.log(`👆 [${this.debugId}] Hover changed: ${this.lastHoveredHandle || 'none'} → ${handle || 'none'}`);
        this.lastHoveredHandle = handle;
        this.state = handle ? INTERACTION_STATES.HOVERING : INTERACTION_STATES.IDLE;
        
        return {
          action: 'updateHover',
          handle: handle,
          cursor: handle ? 'grab' : 'crosshair'
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
    const draggedHandle = this.activeHandle;
    
    if (wasDragging) {
      console.log(`🫳 [${this.debugId}] Drag completed for ${this.activeHandle} handle`);
      console.log(`📊 [${this.debugId}] Final region: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
      
      // 🆕 FINAL AUDIO SYNC: Ensure audio cursor is at correct position
      if (audioContext && draggedHandle) {
        const { audioRef, setCurrentTime, isPlaying } = audioContext;
        const finalTime = draggedHandle === HANDLE_TYPES.START ? startTime : endTime;
        
        this.audioSyncManager.completeDragSync(
          draggedHandle, finalTime, audioRef, setCurrentTime, isPlaying
        );
      }
    }
    
    // 🎯 Reset dragging state
    this.state = this.lastHoveredHandle ? INTERACTION_STATES.HOVERING : INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    
    return {
      action: wasDragging ? 'completeDrag' : 'none',
      saveHistory: wasDragging,
      cursor: this.lastHoveredHandle ? 'grab' : 'crosshair',
      audioSynced: wasDragging && audioContext && draggedHandle // 🆕 Audio sync flag
    };
  }
  
  /**
   * 🎯 Handle mouse leave event
   */
  handleMouseLeave() {
    console.log(`🫥 [${this.debugId}] Mouse left canvas`);
    
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
      isDragging: this.state === INTERACTION_STATES.DRAGGING
    };
  }
  
  /**
   * 🎯 Reset manager state
   */
  reset() {
    console.log(`🔄 [${this.debugId}] Resetting interaction state`);
    this.state = INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.lastHoveredHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    
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
   * 🎯 Get handle at position (legacy compatibility)
   */
  getHandleAtPosition(x, canvasWidth, duration, startTime, endTime) {
    return detectHandle(x, canvasWidth, duration || 0, startTime || 0, endTime || 0);
  }
}

// 🎯 Global interaction manager instance
export const createInteractionManager = () => new InteractionManager(); 