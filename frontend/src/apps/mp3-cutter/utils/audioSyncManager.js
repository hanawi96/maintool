// 🎯 Audio Sync Manager - Smart cursor synchronization during dragging
// Manages real-time audio cursor updates when dragging handles

/**
 * 🎯 Smart Audio Sync Manager
 * Handles real-time synchronization between dragging handles and audio playback cursor
 */
export class AudioSyncManager {
  constructor() {
    this.isEnabled = true;
    this.lastSyncTime = 0;
    this.syncThrottleInterval = 16; // 🚀 **IMPROVED**: 60fps instead of 20fps for ultra-smooth sync
    this.regionDragThrottleInterval = 2; // 🆕 **ULTRA-SMOOTH REGION DRAG**: 500fps for region drag
    this.debugId = Math.random().toString(36).substr(2, 6);
    
    // 🎯 Sync preferences
    this.preferences = {
      syncStartHandle: true,       // Sync start handle cursor
      syncEndHandle: true,         // Sync end handle cursor
      syncOnlyWhenPlaying: true,   // 🔥 **FIXED**: Only sync when playing - prevents tooltip contamination during handle drag
      smoothTransition: true,      // Enable smooth transitions
      endHandleOffset: 3           // Seconds offset for end handle
    };
  }
  
  /**
   * 🎯 Check if should sync audio cursor with handle position
   * @param {string} handleType - 'start' or 'end' or 'region'
   * @param {boolean} isPlaying - Current audio playing state
   * @param {number} newTime - New time position from dragging
   * @returns {boolean} Whether to sync
   */
  shouldSync(handleType, isPlaying, newTime) {
    if (!this.isEnabled) return false;
    
    // 🎯 SMART SYNC RULES
    const rules = {
      isValidHandle: (handleType === 'start' && this.preferences.syncStartHandle) ||
                     (handleType === 'end' && this.preferences.syncEndHandle) ||
                     (handleType === 'region'), // 🆕 **REGION SUPPORT**: Always allow region sync
      isValidTime: newTime >= 0 && !isNaN(newTime),
      isPlayingRule: !this.preferences.syncOnlyWhenPlaying || isPlaying,
      isThrottled: this._isThrottled(handleType) // 🆕 **INTELLIGENT THROTTLING**: Pass handleType
    };
    
    const shouldSync = rules.isValidHandle && rules.isValidTime && 
                      rules.isPlayingRule && !rules.isThrottled;
    
    return shouldSync;
  }
  
  /**
   * 🎯 Perform smart audio cursor sync
   * @param {number} newTime - Target time to sync to
   * @param {object} audioRef - Audio element ref
   * @param {function} setCurrentTime - React state setter
   * @param {boolean} isPlaying - Current playing state
   * @param {string} handleType - Handle being dragged
   * @param {number} startTime - Current start time of region (for boundary checking)
   * @param {boolean} isInverted - Whether invert selection mode is active
   */
  syncAudioCursor(newTime, audioRef, setCurrentTime, isPlaying, handleType, startTime = 0, isInverted = false) {
    if (!audioRef.current) {
      return;
    }
    
    const audio = audioRef.current;
    const currentAudioTime = audio.currentTime;
    
    // 🆕 SMART TARGET CALCULATION: Apply intelligent offset for different handle types
    let targetTime = newTime;
    
    if (handleType === 'start') {
      if (isInverted) {
        // 🆕 **INVERT MODE**: Cursor 3s before start handle
        targetTime = Math.max(0, newTime - 3);
      } else {
        // 🎯 **NORMAL MODE**: Cursor at start handle position
        targetTime = newTime;
      }
    } else if (handleType === 'end') {
      if (isInverted) {
        // 🆕 **INVERT MODE - END HANDLE**: Cursor luôn ở end point khi drag handle right
        targetTime = newTime;
        console.log(`🎯 [InvertMode-EndHandle] Sync cursor to end point: ${targetTime.toFixed(2)}s`);
      } else if (this.preferences.endHandleOffset > 0) {
        // 🔥 **NORMAL MODE - INTELLIGENT REGION SIZE CHECK**: Calculate region duration
        const regionDuration = newTime - startTime;
        
        if (regionDuration < 1.0) {
          // 🚫 **SMALL REGION**: Region < 1s → cursor stays at startTime
          targetTime = startTime;
        } else {
          // 🎯 **NORMAL REGION**: Apply offset but ensure cursor doesn't go before startTime
          const proposedTime = newTime - this.preferences.endHandleOffset;
          targetTime = Math.max(startTime, proposedTime); // ✅ Never go before startTime
        }
      }
    } else if (handleType === 'region') {
      if (isInverted) {
        // 🆕 **INVERT MODE - REGION**: Cursor 3s before start of region
        targetTime = Math.max(0, startTime - 3);
      } else {
        // 🎯 **NORMAL MODE - REGION**: Cursor at start of region
        targetTime = startTime;
      }
    }
    
    const timeDifference = Math.abs(targetTime - currentAudioTime);
    
    // 🎯 SMART SYNC: Only sync if significant change (avoid micro-updates)
    if (timeDifference < 0.05) { // 50ms threshold
      return;
    }
    
    // 🎯 IMMEDIATE SYNC: Update audio element with target time
    audio.currentTime = targetTime;
    
    // 🎯 BATCH STATE UPDATE: Update React state with target time
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        setCurrentTime(targetTime);
      });
    } else {
      setTimeout(() => {
        setCurrentTime(targetTime);
      }, 0);
    }
    
    // 🎯 UPDATE THROTTLE: Record sync time
    this.lastSyncTime = performance.now();
    
    // 🆕 PLAYING STATE MANAGEMENT: Handle play/pause scenarios
    if (isPlaying && audio.paused) {
      // 🎯 RESUME PLAYBACK: If was playing but got paused during sync
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Resume playback failed
        });
      }
    }
  }
  
  /**
   * 🎯 Handle drag completion - final sync
   * @param {string} handleType - Handle that was dragged
   * @param {number} finalTime - Final time position
   * @param {object} audioRef - Audio element ref
   * @param {function} setCurrentTime - React state setter
   * @param {boolean} isPlaying - Current playing state
   * @param {number} startTime - Current start time of region (for boundary checking)
   * @param {boolean} isInverted - Whether invert selection mode is active
   */
  completeDragSync(handleType, finalTime, audioRef, setCurrentTime, isPlaying, startTime = 0, isInverted = false) {
    const shouldSyncStart = handleType === 'start' && this.preferences.syncStartHandle;
    const shouldSyncEnd = handleType === 'end' && this.preferences.syncEndHandle;
    const shouldSyncRegion = handleType === 'region'; // 🆕 **REGION SYNC**
    
    if (shouldSyncStart || shouldSyncEnd || shouldSyncRegion) {
      // 🎯 FORCE FINAL SYNC: Ignore throttling for completion
      this.lastSyncTime = 0; // Reset throttle
        // 🆕 **REGION SYNC**: Region drag completion - sync with invert mode awareness
      if (handleType === 'region') {
        if (isInverted) {
          // 🆕 **INVERT MODE**: Cursor 3s before start time of region
          const targetTime = Math.max(0, startTime - 3);
          this.syncAudioCursor(targetTime, audioRef, setCurrentTime, isPlaying, 'region', startTime, isInverted);
        } else {
          // 🎯 **NORMAL MODE**: Cursor at start time of region
          this.syncAudioCursor(startTime, audioRef, setCurrentTime, isPlaying, 'region', startTime, isInverted);
        }
      } else {
        // 🔥 **INTELLIGENT SYNC**: Pass startTime for boundary checking in end handle sync
        this.syncAudioCursor(finalTime, audioRef, setCurrentTime, isPlaying, handleType, startTime, isInverted);
      }
    }
  }
  
  /**
   * 🎯 Configure sync preferences
   * @param {object} newPreferences - New preference values
   */
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
  }
  
  /**
   * 🎯 Enable/disable sync manager
   * @param {boolean} enabled - Enable state
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
  
  /**
   * 🎯 Check if sync is throttled
   * @param {string} handleType - Type of handle/operation being synced  
   * @returns {boolean} Whether sync is currently throttled
   * @private
   */
  _isThrottled(handleType = 'standard') {
    const now = performance.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    
    // 🆕 **ULTRA-SMOOTH REGION DRAG**: Use different throttling for region drag
    if (handleType === 'region') {
      const isThrottled = timeSinceLastSync < this.regionDragThrottleInterval;
      return isThrottled;
    }
    
    // 🎯 **STANDARD THROTTLING**: For other operations
    return timeSinceLastSync < this.syncThrottleInterval;
  }
  
  /**
   * 🎯 Get current state for debugging
   * @returns {object} Debug information
   */
  getDebugInfo() {
    return {
      id: this.debugId,
      isEnabled: this.isEnabled,
      preferences: this.preferences,
      lastSyncTime: this.lastSyncTime,
      isThrottled: this._isThrottled()
    };
  }
  
  /**
   * 🎯 Reset manager state
   */
  reset() {
    this.lastSyncTime = 0;
  }
  
  /**
   * 🆕 **FORCE IMMEDIATE SYNC**: Immediate sync bỏ qua tất cả throttling và validation
   * @param {number} targetTime - Target time to sync to
   * @param {object} audioRef - Audio element ref
   * @param {function} setCurrentTime - React state setter
   * @param {string} handleType - Handle type for logging
   * @param {number} offset - Offset to apply (for end handle)
   */
  forceImmediateSync(targetTime, audioRef, setCurrentTime, handleType = 'unknown', offset = 0) {
    if (!audioRef.current) {
      return false;
    }
    
    // 🔥 **PRESERVE PLAY STATE**: Store current playing state before any changes
    const wasPlaying = !audioRef.current.paused;
    
    // 🔥 **CALCULATE FINAL TIME**: Apply offset if provided
    const finalTime = offset > 0 ? Math.max(0, targetTime - offset) : targetTime;
    
    // 🔥 **SAFE IMMEDIATE AUDIO UPDATE**: Direct update with play state protection
    try {
      const audio = audioRef.current;
      audio.currentTime = finalTime;
      
      // 🎵 **RESTORE PLAY STATE**: If was playing, ensure it continues playing
      if (wasPlaying && audio.paused) {
        audio.play().catch(e => {
          // Failed to restore play state
        });
      }
      
      // 🔥 **IMMEDIATE STATE UPDATE**: Force immediate React state update
      setCurrentTime(finalTime);
      
    } catch (error) {
      return false;
    }
    
    // 🔥 **RESET THROTTLE**: Allow next sync immediately
    this.lastSyncTime = 0;
    
    return true;
  }
  
  /**
   * 🆕 **REAL-TIME SYNC**: High-frequency sync cho smooth dragging
   * @param {number} newTime - New time position
   * @param {object} audioRef - Audio element ref
   * @param {function} setCurrentTime - React state setter
   * @param {string} handleType - Handle being dragged
   * @param {boolean} force - Force sync even if throttled
   * @param {number} startTime - Current start time of region (for boundary checking)
   * @param {boolean} isInverted - Whether invert selection mode is active
   */
  realTimeSync(newTime, audioRef, setCurrentTime, handleType, force = false, startTime = 0, isInverted = false) {
    if (!audioRef.current) return false;
    
    // 🔥 **PRESERVE PLAY STATE**: Store current playing state before any changes
    const wasPlaying = !audioRef.current.paused;
    
    // 🔥 **SMART THROTTLING FOR PLAY STATE**: More aggressive throttling when playing to prevent pause
    const currentTime = performance.now();
    const timeSinceLastSync = currentTime - this.lastSyncTime;
    
    // 🎯 **PLAY-STATE-AWARE THROTTLING**: Different thresholds based on play state
    let throttleThreshold;
    if (wasPlaying) {
      // 🎵 **PLAYING STATE**: More conservative to prevent browser pause
      throttleThreshold = handleType === 'region' ? 8 : 16; // 125fps region, 60fps others
    } else {
      // ⏸️ **PAUSED STATE**: More aggressive for responsiveness  
      throttleThreshold = handleType === 'region' ? 2 : 8; // 500fps region, 125fps others
    }
    
    // 🔥 **FORCE MODE**: Skip throttling for ultra-smooth dragging (but respect play state)
    if (!force && timeSinceLastSync < throttleThreshold) {
      return false; // Skip if throttled
    }
    
    // 🔥 **CALCULATE TARGET**: Apply intelligent offset cho different handle types
    let targetTime = newTime;
    
    if (handleType === 'start') {
      if (isInverted) {
        // 🆕 **INVERT MODE**: Cursor 3s before start handle (real-time during drag)
        targetTime = Math.max(0, newTime - 3);
      } else {
        // 🎯 **NORMAL MODE**: Cursor at start handle position
        targetTime = newTime;
      }
    } else if (handleType === 'end') {
      if (isInverted) {
        // 🆕 **INVERT MODE - END HANDLE**: Cursor luôn ở end point khi drag handle right
        targetTime = newTime;
        console.log(`🎯 [InvertMode-EndHandle] RealTime sync cursor to end point: ${targetTime.toFixed(2)}s`);
      } else if (this.preferences.endHandleOffset > 0) {
        // 🔥 **NORMAL MODE - INTELLIGENT REGION SIZE CHECK**: Calculate region duration
        const regionDuration = newTime - startTime;
        
        if (regionDuration < 1.0) {
          // 🚫 **SMALL REGION**: Region < 1s → cursor stays at startTime
          targetTime = startTime;
        } else {
          // 🎯 **NORMAL REGION**: Apply offset but ensure cursor doesn't go before startTime  
          const proposedTime = newTime - this.preferences.endHandleOffset;
          targetTime = Math.max(startTime, proposedTime); // ✅ Never go before startTime
        }
      }
    } else if (handleType === 'region') {
      if (isInverted) {
        // 🆕 **INVERT MODE - REGION DRAG**: Cursor 3s before start of region
        targetTime = Math.max(0, startTime - 3);
      } else {
        // 🎯 **NORMAL MODE - REGION DRAG**: Cursor at start of region
        targetTime = startTime;
      }
    }
    
    // 🔥 **MICRO-OPTIMIZATION**: Skip if change is too small (< 1ms) but allow for region drag
    const currentAudioTime = audioRef.current.currentTime;
    const timeDifference = Math.abs(targetTime - currentAudioTime);
    const minChange = handleType === 'region' ? 0.0005 : 0.001; // 🆕 **ULTRA-SENSITIVE**: Lower threshold for region drag
    
    if (timeDifference < minChange && !force) {
      return false;
    }
    
    // 🔥 **SAFE AUDIO UPDATE**: Update currentTime without affecting play state
    try {
      audioRef.current.currentTime = targetTime;
      
      // 🎵 **RESTORE PLAY STATE**: If was playing, ensure it continues playing
      if (wasPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(e => {
          // Failed to restore play state
        });
      }
      
      setCurrentTime(targetTime);
      
    } catch (error) {
      return false;
    }
    
    // 🔥 **UPDATE THROTTLE**: Record sync time
    this.lastSyncTime = currentTime;
    
    return true;
  }
}

/**
 * 🎯 Create new AudioSyncManager instance
 * @returns {AudioSyncManager} New manager instance
 */
export const createAudioSyncManager = () => {
  return new AudioSyncManager();
};

/**
 * 🎯 Utility function to check if time is within valid range
 * @param {number} time - Time to validate
 * @param {number} duration - Audio duration
 * @returns {boolean} Whether time is valid
 */
export const isValidAudioTime = (time, duration) => {
  return !isNaN(time) && time >= 0 && time <= duration;
};

/**
 * 🎯 Calculate optimal sync interval based on context
 * @param {boolean} isPlaying - Current playing state
 * @param {boolean} isDragging - Current dragging state
 * @returns {number} Optimal sync interval in ms
 */
export const getOptimalSyncInterval = (isPlaying, isDragging) => {
  if (isDragging && isPlaying) return 33; // 30fps for smooth drag during playback
  if (isDragging) return 50;              // 20fps for drag during pause
  if (isPlaying) return 100;              // 10fps for normal playback
  return 200;                             // 5fps for idle state
};