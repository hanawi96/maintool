// 🎯 AudioSyncManager - Ultra Optimized (maintain logic & UI 100%)
const SYNC_CONST = {
  FPS_60: 16,        // 60fps
  FPS_500: 2,        // 500fps (region drag)
  END_OFFSET: 3,     // End handle offset in seconds
  MICRO_SYNC: 0.05,  // 50ms
  MICRO_REGION: 0.0005, // Region drag: 0.5ms
  MICRO_OTHER: 0.001,   // Other: 1ms
  REGION_MIN: 1.0,      // 1s
};

const DEFAULT_PREFS = {
  syncStartHandle: true,
  syncEndHandle: true,
  syncOnlyWhenPlaying: true,
  smoothTransition: true,
  endHandleOffset: SYNC_CONST.END_OFFSET
};

// --------- Utility ---------
const isValidTime = (t) => !isNaN(t) && t >= 0;
const safeSetTime = (setter, t) => {
  if (window.requestIdleCallback) window.requestIdleCallback(() => setter(t));
  else setTimeout(() => setter(t), 0);
};
const restorePlay = (audio, wasPlaying) => {
  if (wasPlaying && audio.paused) audio.play?.().catch(() => {});
};
// Tính target time theo handleType, invert, offset, region size
function getTargetTime({ handleType, newTime, isInverted, startTime, offset }) {
  if (handleType === 'start')
    return isInverted ? Math.max(0, newTime - 3) : newTime;
  if (handleType === 'end') {
    if (isInverted) return newTime;
    const regionSize = newTime - startTime;
    if (offset > 0) {
      if (regionSize < SYNC_CONST.REGION_MIN) return startTime;
      return Math.max(startTime, newTime - offset);
    }
    return newTime;
  }
  if (handleType === 'region')
    return isInverted ? Math.max(0, startTime - 3) : startTime;
  return newTime;
}

// --------- Class ---------
export class AudioSyncManager {
  constructor() {
    this.isEnabled = true;
    this.lastSyncTime = 0;
    this.preferences = { ...DEFAULT_PREFS };
  }

  _throttleInterval(handleType) {
    return handleType === 'region' ? SYNC_CONST.FPS_500 : SYNC_CONST.FPS_60;
  }
  _isThrottled(handleType = 'standard') {
    return performance.now() - this.lastSyncTime < this._throttleInterval(handleType);
  }

  shouldSync(handleType, isPlaying, newTime) {
    if (!this.isEnabled) return false;
    const { syncStartHandle, syncEndHandle, syncOnlyWhenPlaying } = this.preferences;
    const validHandle =
      (handleType === 'start' && syncStartHandle) ||
      (handleType === 'end' && syncEndHandle) ||
      (handleType === 'region');
    return (
      validHandle &&
      isValidTime(newTime) &&
      (!syncOnlyWhenPlaying || isPlaying) &&
      !this._isThrottled(handleType)
    );
  }

  syncAudioCursor(newTime, audioRef, setCurrentTime, isPlaying, handleType, startTime = 0, isInverted = false) {
    const audio = audioRef.current;
    if (!audio) return;
    const { endHandleOffset } = this.preferences;
    const targetTime = getTargetTime({ handleType, newTime, isInverted, startTime, offset: endHandleOffset });
    if (Math.abs(targetTime - audio.currentTime) < SYNC_CONST.MICRO_SYNC) return;
    audio.currentTime = targetTime;
    safeSetTime(setCurrentTime, targetTime);
    this.lastSyncTime = performance.now();
    if (isPlaying) restorePlay(audio, true);
  }

  completeDragSync(handleType, finalTime, audioRef, setCurrentTime, isPlaying, startTime = 0, isInverted = false) {
    if (!this.isEnabled) return;
    const { syncStartHandle, syncEndHandle } = this.preferences;
    const shouldSync =
      (handleType === 'start' && syncStartHandle) ||
      (handleType === 'end' && syncEndHandle) ||
      handleType === 'region';
    if (shouldSync) {
      this.lastSyncTime = 0; // force sync
      const time = handleType === 'region'
        ? (isInverted ? Math.max(0, startTime - 3) : startTime)
        : finalTime;
      this.syncAudioCursor(time, audioRef, setCurrentTime, isPlaying, handleType, startTime, isInverted);
    }
  }

  updatePreferences(newPreferences) {
    Object.assign(this.preferences, newPreferences);
  }
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      preferences: this.preferences,
      lastSyncTime: this.lastSyncTime,
      isThrottled: this._isThrottled()
    };
  }
  reset() {
    this.lastSyncTime = 0;
  }

  forceImmediateSync(targetTime, audioRef, setCurrentTime, handleType = 'unknown', offset = 0) {
    const audio = audioRef.current;
    if (!audio) return false;
    const wasPlaying = !audio.paused;
    const finalTime = offset > 0 ? Math.max(0, targetTime - offset) : targetTime;
    try {
      audio.currentTime = finalTime;
      restorePlay(audio, wasPlaying);
      setCurrentTime(finalTime);
      this.lastSyncTime = 0;
      return true;
    } catch {
      return false;
    }
  }

  realTimeSync(newTime, audioRef, setCurrentTime, handleType, force = false, startTime = 0, isInverted = false) {
    const audio = audioRef.current;
    if (!audio) return false;
    const wasPlaying = !audio.paused;
    const now = performance.now();
    let throttle;
    if (wasPlaying)
      throttle = handleType === 'region' ? 8 : 16;
    else
      throttle = handleType === 'region' ? 2 : 8;
    if (!force && now - this.lastSyncTime < throttle) return false;
    const { endHandleOffset } = this.preferences;
    const targetTime = getTargetTime({ handleType, newTime, isInverted, startTime, offset: endHandleOffset });
    const currentAudioTime = audio.currentTime;
    const minChange = handleType === 'region' ? SYNC_CONST.MICRO_REGION : SYNC_CONST.MICRO_OTHER;
    if (Math.abs(targetTime - currentAudioTime) < minChange && !force) return false;
    try {
      audio.currentTime = targetTime;
      restorePlay(audio, wasPlaying);
      setCurrentTime(targetTime);
      this.lastSyncTime = now;
      return true;
    } catch {
      return false;
    }
  }
}

// --------- Factory & Utils ---------
export const createAudioSyncManager = () => new AudioSyncManager();

export const isValidAudioTime = (time, duration) =>
  !isNaN(time) && time >= 0 && time <= duration;

export const getOptimalSyncInterval = (isPlaying, isDragging) => {
  if (isDragging && isPlaying) return 33; // 30fps
  if (isDragging) return 50;              // 20fps
  if (isPlaying) return 100;              // 10fps
  return 200;                             // 5fps
};
