// 🎯 SmartClickManager - Ultra Optimized (100% logic & UI giữ nguyên)

export const CLICK_ZONES = {
  ON_START_HANDLE: 'on_start_handle',
  ON_END_HANDLE: 'on_end_handle', 
  BEFORE_START: 'before_start',
  INSIDE_SELECTION: 'inside_selection',
  AFTER_END: 'after_end',
  OUTSIDE_DURATION: 'outside_duration'
};

export const CLICK_ACTIONS = {
  START_DRAG: 'startDrag',
  JUMP_TO_TIME: 'jumpToTime',
  UPDATE_START: 'updateStart',
  UPDATE_END: 'updateEnd',
  CREATE_SELECTION: 'createSelection',
  DRAG_REGION: 'dragRegion',
  NO_ACTION: 'noAction'
};

const DEFAULT_PREFS = {
  enableSmartUpdate: true,
  requireMinSelection: 0.1,
  allowZeroDuration: false,
  preserveAudioSync: true,
  enableRegionDrag: true,
  preventAccidentalHandleMove: true,
  requireDragConfirmation: true,
  enableHoverProtection: true
};

// 🚫 DISABLED: Constants no longer used since we disabled UPDATE_START/UPDATE_END logic
// const MOVE_DIST_THRESHOLD = 1.0;
// const EDGE_GAP = 0.1;
// const SMALL_MOVE = 0.5;
// const REENTRY_COOLDOWN = 500;

export class SmartClickManager {
  constructor() {
    this.lastInteractionTime = null;
    this.preferences = { ...DEFAULT_PREFS };
    this.debugId = Math.random().toString(36).substr(2, 6);
  }

  analyzeClickZone(clickTime, startTime, endTime, duration, handleAtPosition) {
    if (handleAtPosition === 'start') return CLICK_ZONES.ON_START_HANDLE;
    if (handleAtPosition === 'end') return CLICK_ZONES.ON_END_HANDLE;
    if (clickTime < 0 || clickTime > duration) return CLICK_ZONES.OUTSIDE_DURATION;
    if (clickTime < startTime) return CLICK_ZONES.BEFORE_START;
    if (clickTime > endTime) return CLICK_ZONES.AFTER_END;
    return CLICK_ZONES.INSIDE_SELECTION;
  }

  processClick(clickTime, startTime, endTime, duration, handleAtPosition, isActualClick = true, isInverted = false) {
    const clickZone = this.analyzeClickZone(clickTime, startTime, endTime, duration, handleAtPosition);
    return this.determineAction(clickZone, clickTime, startTime, endTime, duration, isActualClick, isInverted);
  }

  determineAction(zone, clickTime, startTime, endTime, duration = Infinity, isActualClick = true, isInverted = false) {
    // Base action object, UI giữ nguyên
    let action = {
      zone,
      action: CLICK_ACTIONS.NO_ACTION,
      newStartTime: startTime,
      newEndTime: endTime,
      seekTime: null,
      handle: null,
      cursor: 'pointer',
      regionDragPotential: false
    };

    // DRAG handle
    if (zone === CLICK_ZONES.ON_START_HANDLE || zone === CLICK_ZONES.ON_END_HANDLE) {
      action.action = CLICK_ACTIONS.START_DRAG;
      action.handle = zone === CLICK_ZONES.ON_START_HANDLE ? 'start' : 'end';
      action.cursor = 'ew-resize';
      return action;
    }

    // Click outside duration
    if (zone === CLICK_ZONES.OUTSIDE_DURATION) {
      action.cursor = 'default';
      return action;
    }

    // Click trong selection (region)
    if (zone === CLICK_ZONES.INSIDE_SELECTION) {
      if (isInverted) {
        action.cursor = 'grab';
        action.regionDragPotential = true;
        return action; // Block jump in invert, still allow drag region
      }
      action.action = CLICK_ACTIONS.JUMP_TO_TIME;
      action.seekTime = clickTime;
      action.regionDragPotential = true;
      return action;
    }

    // Click trước start handle
    if (zone === CLICK_ZONES.BEFORE_START) {
      if (isInverted) {
        action.action = CLICK_ACTIONS.JUMP_TO_TIME;
        action.seekTime = clickTime;
        return action;
      }
      // 🚫 DISABLED: Let useInteractionHandlers handle endpoint jumping logic
      // if (this.preferences.enableSmartUpdate && shouldAllowHandleUpdate(zone, clickTime, startTime, endTime, duration, isActualClick, this.preferences, this)) {
      //   action.action = CLICK_ACTIONS.UPDATE_START;
      //   action.newStartTime = clickTime;
      // } else {
        action.action = CLICK_ACTIONS.JUMP_TO_TIME;
        action.seekTime = clickTime;
      // }
      return validateDuration(action, this.preferences.requireMinSelection);
    }

    // Click sau end handle
    if (zone === CLICK_ZONES.AFTER_END) {
      if (isInverted) {
        action.action = CLICK_ACTIONS.JUMP_TO_TIME;
        action.seekTime = clickTime;
        return action;
      }
      // 🚫 DISABLED: Let useInteractionHandlers handle endpoint jumping logic
      // if (this.preferences.enableSmartUpdate && shouldAllowHandleUpdate(zone, clickTime, startTime, endTime, duration, isActualClick, this.preferences, this)) {
      //   action.action = CLICK_ACTIONS.UPDATE_END;
      //   action.newEndTime = clickTime;
      // } else {
        action.action = CLICK_ACTIONS.JUMP_TO_TIME;
        action.seekTime = clickTime;
      // }
      return validateDuration(action, this.preferences.requireMinSelection);
    }

    // Default fallback
    action.cursor = 'default';
    return action;
  }

  updatePreferences(newPreferences) {
    Object.assign(this.preferences, newPreferences);
  }

  getDebugInfo() {
    return {
      id: this.debugId,
      preferences: this.preferences,
      supportedZones: Object.values(CLICK_ZONES),
      supportedActions: Object.values(CLICK_ACTIONS)
    };
  }
}

// --- Helper function: validate duration for update actions ---
function validateDuration(action, minSelection) {
  if (
    (action.action === CLICK_ACTIONS.UPDATE_START || action.action === CLICK_ACTIONS.UPDATE_END)
  ) {
    const duration = action.newEndTime - action.newStartTime;
    if (duration < minSelection) {
      action.action = CLICK_ACTIONS.NO_ACTION;
    }
  }
  return action;
}

// --- Helper: Allow handle update? All logic giữ nguyên ---
// 🚫 DISABLED: Function no longer used since we disabled UPDATE_START/UPDATE_END
// function shouldAllowHandleUpdate(zone, clickTime, startTime, endTime, duration, isActualClick, prefs, context) {
//   if (!isActualClick && prefs.enableHoverProtection) return false;
//   const startAtEdge = Math.abs(startTime) < EDGE_GAP;
//   const endAtEdge = Math.abs(endTime - duration) < EDGE_GAP;
//   if (zone === CLICK_ZONES.BEFORE_START) {
//     const dist = Math.abs(clickTime - startTime);
//     if (dist >= MOVE_DIST_THRESHOLD) return true;
//     if (startAtEdge && dist < SMALL_MOVE) return false;
//     return true;
//   }
//   if (zone === CLICK_ZONES.AFTER_END) {
//     const dist = Math.abs(clickTime - endTime);
//     if (dist >= MOVE_DIST_THRESHOLD) return true;
//     if (endAtEdge && dist < SMALL_MOVE) return false;
//     return true;
//   }
//   if (!isActualClick) {
//     const now = performance.now();
//     const last = context.lastInteractionTime;
//     if (last && now - last < REENTRY_COOLDOWN) return false;
//   } else {
//     context.lastInteractionTime = performance.now();
//   }
//   return true;
// }

// --- Utils giữ nguyên ---
export const createSmartClickManager = () => new SmartClickManager();

export const isValidClickTime = (time, duration) =>
  !isNaN(time) && time >= 0 && time <= duration;

export const calculateSelectionDuration = (startTime, endTime) =>
  Math.max(0, endTime - startTime);

