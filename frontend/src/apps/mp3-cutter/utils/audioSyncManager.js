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
    this.syncThrottleInterval = 50; // 20fps for smooth sync
    this.debugId = Math.random().toString(36).substr(2, 6);
    
    // 🎯 Sync preferences
    this.preferences = {
      syncStartHandle: true,  // Sync cursor when dragging start handle
      syncEndHandle: true,    // 🆕 ENABLE: Sync cursor when dragging end handle  
      syncOnlyWhenPlaying: false, // Sync even when paused
      smoothTransition: true,  // Smooth cursor transitions
      endHandleOffset: 3.0     // 🆕 NEW: Offset seconds for end handle (seek 3s before end)
    };
    
    console.log(`🔄 [AudioSyncManager] Created with ID: ${this.debugId}`, this.preferences);
  }
  
  /**
   * 🎯 Check if should sync audio cursor with handle position
   * @param {string} handleType - 'start' or 'end'
   * @param {boolean} isPlaying - Current audio playing state
   * @param {number} newTime - New time position from dragging
   * @returns {boolean} Whether to sync
   */
  shouldSync(handleType, isPlaying, newTime) {
    if (!this.isEnabled) return false;
    
    // 🎯 SMART SYNC RULES
    const rules = {
      isValidHandle: handleType === 'start' && this.preferences.syncStartHandle ||
                     handleType === 'end' && this.preferences.syncEndHandle,
      isValidTime: newTime >= 0 && !isNaN(newTime),
      isPlayingRule: !this.preferences.syncOnlyWhenPlaying || isPlaying,
      isThrottled: this._isThrottled()
    };
    
    const shouldSync = rules.isValidHandle && rules.isValidTime && 
                      rules.isPlayingRule && !rules.isThrottled;
    
    // 🆕 DEBUG: Log sync decision
    if (rules.isValidHandle && rules.isValidTime) {
      console.log(`🔄 [${this.debugId}] Sync decision for ${handleType}:`, {
        shouldSync,
        isPlaying,
        newTime: newTime.toFixed(2) + 's',
        rules
      });
    }
    
    return shouldSync;
  }
  
  /**
   * 🎯 Perform smart audio cursor sync
   * @param {number} newTime - Target time to sync to
   * @param {object} audioRef - Audio element ref
   * @param {function} setCurrentTime - React state setter
   * @param {boolean} isPlaying - Current playing state
   * @param {string} handleType - Handle being dragged
   */
  syncAudioCursor(newTime, audioRef, setCurrentTime, isPlaying, handleType) {
    if (!audioRef.current) {
      console.warn(`⚠️ [${this.debugId}] No audio element for sync`);
      return;
    }
    
    const audio = audioRef.current;
    const currentAudioTime = audio.currentTime;
    
    // 🆕 SMART TARGET CALCULATION: Apply offset for end handle
    let targetTime = newTime;
    if (handleType === 'end' && this.preferences.endHandleOffset > 0) {
      targetTime = Math.max(0, newTime - this.preferences.endHandleOffset);
      console.log(`🎯 [${this.debugId}] End handle offset applied: ${newTime.toFixed(2)}s → ${targetTime.toFixed(2)}s (${this.preferences.endHandleOffset}s offset)`);
    }
    
    const timeDifference = Math.abs(targetTime - currentAudioTime);
    
    // 🎯 SMART SYNC: Only sync if significant change (avoid micro-updates)
    if (timeDifference < 0.05) { // 50ms threshold
      console.log(`🔄 [${this.debugId}] Skipping micro-sync: ${timeDifference.toFixed(3)}s difference`);
      return;
    }
    
    console.log(`🎯 [${this.debugId}] Syncing ${handleType} → audio cursor:`, {
      handlePosition: newTime.toFixed(2) + 's',
      targetTime: targetTime.toFixed(2) + 's', 
      from: currentAudioTime.toFixed(2) + 's',
      difference: timeDifference.toFixed(3) + 's',
      offset: handleType === 'end' ? this.preferences.endHandleOffset + 's' : 'none',
      isPlaying
    });
    
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
      console.log(`▶️ [${this.debugId}] Resuming playback after sync`);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`⚠️ [${this.debugId}] Resume playback failed:`, error);
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
   */
  completeDragSync(handleType, finalTime, audioRef, setCurrentTime, isPlaying) {
    const shouldSyncStart = handleType === 'start' && this.preferences.syncStartHandle;
    const shouldSyncEnd = handleType === 'end' && this.preferences.syncEndHandle;
    
    if (shouldSyncStart || shouldSyncEnd) {
      console.log(`🏁 [${this.debugId}] Completing ${handleType} handle drag sync to ${finalTime.toFixed(2)}s`);
      
      // 🎯 FORCE FINAL SYNC: Ignore throttling for completion
      const wasThrottled = this._isThrottled();
      this.lastSyncTime = 0; // Reset throttle
      
      this.syncAudioCursor(finalTime, audioRef, setCurrentTime, isPlaying, handleType);
      
      console.log(`✅ [${this.debugId}] Drag sync completed for ${handleType} handle`);
    }
  }
  
  /**
   * 🎯 Configure sync preferences
   * @param {object} newPreferences - New preference values
   */
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    console.log(`⚙️ [${this.debugId}] Updated preferences:`, this.preferences);
  }
  
  /**
   * 🎯 Enable/disable sync manager
   * @param {boolean} enabled - Enable state
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🔄 [${this.debugId}] Sync manager ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * 🎯 Check if sync is throttled
   * @returns {boolean} Whether sync is currently throttled
   * @private
   */
  _isThrottled() {
    const now = performance.now();
    return (now - this.lastSyncTime) < this.syncThrottleInterval;
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
    console.log(`🔄 [${this.debugId}] AudioSyncManager reset`);
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
      console.warn(`⚠️ [${this.debugId}] No audio element for force sync`);
      return false;
    }
    
    // 🔥 **CALCULATE FINAL TIME**: Apply offset if provided
    const finalTime = offset > 0 ? Math.max(0, targetTime - offset) : targetTime;
    
    console.log(`🚀 [${this.debugId}] FORCE IMMEDIATE SYNC:`, {
      handleType,
      targetTime: targetTime.toFixed(2) + 's',
      offset: offset > 0 ? offset + 's' : 'none', 
      finalTime: finalTime.toFixed(2) + 's',
      skipValidation: true
    });
    
    // 🔥 **IMMEDIATE AUDIO UPDATE**: Direct update without any checks
    const audio = audioRef.current;
    audio.currentTime = finalTime;
    
    // 🔥 **IMMEDIATE STATE UPDATE**: Force immediate React state update
    setCurrentTime(finalTime);
    
    // 🔥 **RESET THROTTLE**: Allow next sync immediately
    this.lastSyncTime = 0;
    
    console.log(`✅ [${this.debugId}] Force sync completed: ${finalTime.toFixed(2)}s`);
    return true;
  }
  
  /**
   * 🆕 **REAL-TIME SYNC**: High-frequency sync cho smooth dragging
   * @param {number} newTime - New time position
   * @param {object} audioRef - Audio element ref
   * @param {function} setCurrentTime - React state setter
   * @param {string} handleType - Handle being dragged
   * @param {boolean} force - Force sync even if throttled
   */
  realTimeSync(newTime, audioRef, setCurrentTime, handleType, force = false) {
    if (!audioRef.current) return false;
    
    // 🔥 **FORCE MODE**: Skip throttling for ultra-smooth dragging
    if (force) {
      this.lastSyncTime = 0;
    } else if (this._isThrottled()) {
      return false; // Skip if throttled and not forced
    }
    
    // 🔥 **CALCULATE TARGET**: Apply offset for end handle
    let targetTime = newTime;
    if (handleType === 'end') {
      targetTime = Math.max(0, newTime - this.preferences.endHandleOffset);
    }
    
    // 🔥 **MICRO-OPTIMIZATION**: Skip if change is too small (< 1ms)
    const currentAudioTime = audioRef.current.currentTime;
    const timeDifference = Math.abs(targetTime - currentAudioTime);
    if (timeDifference < 0.001 && !force) {
      return false;
    }
    
    // 🔥 **IMMEDIATE UPDATE**: Direct audio and state update
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    
    // 🔥 **UPDATE THROTTLE**: Record sync time
    this.lastSyncTime = performance.now();
    
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