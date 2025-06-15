// 🎯 Interaction Utilities for Waveform (Optimized & Slim)
// Xử lý tương tác chuột cho waveform & region selection, giữ logic & UI 100% không đổi

import { WAVEFORM_CONFIG } from './constants';
import { createAudioSyncManager } from './audioSyncManager';
import { createSmartClickManager, CLICK_ACTIONS } from './smartClickManager';

// 🎯 Interaction states & handle types (no change)
export const INTERACTION_STATES = { IDLE: 'idle', HOVERING: 'hovering', DRAGGING: 'dragging' };
export const HANDLE_TYPES = { START: 'start', END: 'end', NONE: null };

// -- UTILITIES ---------------------------------------------------

const getResponsiveHandleWidth = (canvasWidth) => {
  const { MODERN_HANDLE_WIDTH, RESPONSIVE } = WAVEFORM_CONFIG;
  return canvasWidth < RESPONSIVE.MOBILE_BREAKPOINT
    ? Math.max(6, MODERN_HANDLE_WIDTH * 0.8)
    : MODERN_HANDLE_WIDTH;
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// -- SMART HANDLE DETECTION --------------------------------------

export const detectHandle = (
  x, canvasWidth, duration, startTime, endTime, eventInfo = null, isInverted = false
) => {
  if (!duration || !canvasWidth) return null;
  if (eventInfo?.isHandleEvent && eventInfo?.handleType) return eventInfo.handleType;

  const handleW = getResponsiveHandleWidth(canvasWidth);
  const wfStartX = handleW, wfEndX = canvasWidth - handleW, wfW = wfEndX - wfStartX;
  const rStartX = wfStartX + (startTime / duration) * wfW;
  const rEndX = wfStartX + (endTime / duration) * wfW;

  // Modern (invert mode supported)
  const startHandleX = isInverted ? rStartX : rStartX - handleW;
  const endHandleX = isInverted ? rEndX - handleW : rEndX;

  const inRange = (x, a, b) => x >= a && x <= b;
  if (inRange(x, startHandleX, startHandleX + handleW)) return HANDLE_TYPES.START;
  if (inRange(x, endHandleX, endHandleX + handleW)) return HANDLE_TYPES.END;
  return HANDLE_TYPES.NONE;
};

export const positionToTime = (x, canvasWidth, duration) => {
  if (!canvasWidth || !duration) return 0;
  const handleW = getResponsiveHandleWidth(canvasWidth);
  const wfStartX = handleW, wfEndX = canvasWidth - handleW, wfW = wfEndX - wfStartX;
  const clampedX = clamp(x, wfStartX, wfEndX);
  return clamp(((clampedX - wfStartX) / wfW) * duration, 0, duration);
};

// -- INTERACTION MANAGER ----------------------------------------

export class InteractionManager {
  constructor() {
    // Core state
    this.state = INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.lastHoveredHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;

    // Grouped state for drag/region/pending
    this.isDraggingConfirmed = false;
    this.mouseDownTimestamp = null;
    this.lastMousePosition = null;
    this.dragMoveThreshold = 0.5;
    this.lastMouseLeaveTime = null;
    this.isDraggingRegion = false;
    this.regionDragStartTime = null;
    this.regionDragOffset = 0;
    this.pending = {
      jumpTime: null,
      handleUpdate: null,
      jumpBlockedByInvert: false,
      hasJump: false,
      hasHandleUpdate: false,
    };

    // External/context
    this.audioSyncManager = createAudioSyncManager();
    this.smartClickManager = createSmartClickManager();

    this.canvasBounds = null;
    this.canvasWidth = 0;
    this.audioDuration = 0;
    this.audioContext = null;
    this.onGlobalDragUpdate = null;
    this.debugId = Math.random().toString(36).substring(2, 8);

    // Event listeners (only bind once)
    this._bindedMouseUp = this._onGlobalMouseUp.bind(this);
    this._bindedMouseMove = this._onGlobalMouseMove.bind(this);
    this._isGlobalUp = false;
    this._isGlobalMove = false;
  }

  // -- GLOBAL LISTENER SETUP/TEARDOWN -------------------------------------

  _onGlobalMouseUp() {
    if (this.state === INTERACTION_STATES.DRAGGING && this.isDraggingConfirmed) {
      this._triggerHistorySave();
      this._resetDragState();
      this._toggleGlobalListener('up', false);
      this._toggleGlobalListener('move', false);
    }
  }
  _onGlobalMouseMove(e) {
    if (
      this.state === INTERACTION_STATES.DRAGGING &&
      this.isDraggingConfirmed &&
      this.canvasBounds && this.canvasWidth && this.audioDuration
    ) {
      const canvasX = e.clientX - this.canvasBounds.left;
      if (this.onGlobalDragUpdate) {
        const result = this.handleMouseMove(
          canvasX, this.canvasWidth, this.audioDuration,
          this.onGlobalDragUpdate.startTime, this.onGlobalDragUpdate.endTime,
          this.audioContext
        );
        if (result.action === 'updateRegion' && result.isDraggingConfirmed)
          this.onGlobalDragUpdate.callback(result);
      }
    }
  }
  _toggleGlobalListener(type, enable) {
    if (type === 'up') {
      if (enable && !this._isGlobalUp) {
        document.addEventListener('mouseup', this._bindedMouseUp, { capture: true, passive: true });
        this._isGlobalUp = true;
      } else if (!enable && this._isGlobalUp) {
        document.removeEventListener('mouseup', this._bindedMouseUp, { capture: true });
        this._isGlobalUp = false;
      }
    } else if (type === 'move') {
      if (enable && !this._isGlobalMove) {
        document.addEventListener('mousemove', this._bindedMouseMove, { passive: true });
        this._isGlobalMove = true;
      } else if (!enable && this._isGlobalMove) {
        document.removeEventListener('mousemove', this._bindedMouseMove, { passive: true });
        this._isGlobalMove = false;
      }
    }
  }

  _triggerHistorySave() {
    if (this.onGlobalDragUpdate?.callback) {
      this.onGlobalDragUpdate.callback({
        action: 'saveHistoryOnGlobalMouseUp',
        saveHistory: true,
        isDraggingConfirmed: this.isDraggingConfirmed,
        activeHandle: this.activeHandle,
        wasRegionDrag: this.isDraggingRegion,
        globalMouseUp: true,
      });
    }
  }
  _resetDragState() {
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
    this.pending = {
      jumpTime: null,
      handleUpdate: null,
      jumpBlockedByInvert: false,
      hasJump: false,
      hasHandleUpdate: false,
    };
  }

  // -- INTERACTION HANDLERS -----------------------------------------------

  handleMouseDown(x, canvasWidth, duration, startTime, endTime, eventInfo = null) {
    this._resetDragState();
    const isInverted = this.audioContext?.isInverted || false;
    const detectedHandle = detectHandle(x, canvasWidth, duration, startTime, endTime, eventInfo, isInverted);
    const currentTime = positionToTime(x, canvasWidth, duration);

    const isStartAtEdge = Math.abs(startTime) < 0.1;
    const isEndAtEdge = Math.abs(endTime - duration) < 0.1;

    if (currentTime < startTime && isStartAtEdge && Math.abs(currentTime - startTime) < 1.0)
      return { action: 'none', reason: 'PROTECTED: Start handle at edge', protected: true };

    if (
      currentTime > endTime && isEndAtEdge && Math.abs(currentTime - endTime) < 0.3 &&
      detectedHandle !== HANDLE_TYPES.END
    )
      return { action: 'none', reason: 'PROTECTED: End handle at edge', protected: true };

    this.mouseDownTimestamp = performance.now();
    this.lastMousePosition = { x, y: 0 };
    this.dragStartPosition = { x, y: 0 };

    // Smart click logic
    const smartAction = this.smartClickManager.processClick(
      currentTime, startTime, endTime, duration, detectedHandle, true, isInverted
    );
    switch (smartAction.action) {
      case CLICK_ACTIONS.START_DRAG:
        this.state = INTERACTION_STATES.DRAGGING;
        this.activeHandle = smartAction.handle;
        this.dragStartPosition = x;
        this.dragStartTime = smartAction.handle === HANDLE_TYPES.START ? startTime : endTime;
        return {
          action: 'startDrag', handle: smartAction.handle, cursor: smartAction.cursor, pointerCapture: true,
          immediateSync: {
            required: true,
            handleType: smartAction.handle,
            targetTime: smartAction.handle === HANDLE_TYPES.START ? startTime : endTime,
            offsetForEnd: smartAction.handle === HANDLE_TYPES.END ? 3.0 : 0,
          },
        };
      case CLICK_ACTIONS.JUMP_TO_TIME:
        this.pending.jumpTime = smartAction.seekTime;
        this.pending.hasJump = true;
        this.pending.jumpBlockedByInvert = false;
        if (smartAction.regionDragPotential && this.smartClickManager.preferences.enableRegionDrag) {
          this.state = INTERACTION_STATES.DRAGGING;
          this.regionDragStartTime = currentTime;
          this.regionDragOffset = currentTime - startTime;
          this.dragStartPosition = x;
          this.dragStartTime = currentTime;
        }
        return { action: 'pendingJump', time: smartAction.seekTime, regionDragPotential: !!smartAction.regionDragPotential };
      case CLICK_ACTIONS.UPDATE_START:
        this.pending.handleUpdate = {
          type: 'start', newTime: smartAction.newStartTime, oldTime: startTime, endTime: smartAction.newEndTime,
          reason: smartAction.reason,
        };
        this.pending.hasHandleUpdate = true;
        return { action: 'pendingHandleUpdate', handleType: 'start', newTime: smartAction.newStartTime, oldTime: startTime };
      case CLICK_ACTIONS.UPDATE_END:
        this.pending.handleUpdate = {
          type: 'end', newTime: smartAction.newEndTime, oldTime: endTime, startTime: smartAction.newStartTime,
          reason: smartAction.reason,
        };
        this.pending.hasHandleUpdate = true;
        return { action: 'pendingHandleUpdate', handleType: 'end', newTime: smartAction.newEndTime, oldTime: endTime };
      case CLICK_ACTIONS.CREATE_SELECTION:
        this.state = INTERACTION_STATES.DRAGGING;
        this.activeHandle = HANDLE_TYPES.END;
        this.dragStartPosition = x;
        this.dragStartTime = currentTime;
        return { action: 'createSelection', startTime: smartAction.newStartTime, endTime: smartAction.newEndTime, cursor: smartAction.cursor };
      case CLICK_ACTIONS.DRAG_REGION:
        this.state = INTERACTION_STATES.DRAGGING;
        this.isDraggingRegion = true;
        this.regionDragStartTime = currentTime;
        this.regionDragOffset = currentTime - startTime;
        this.dragStartPosition = x;
        this.dragStartTime = currentTime;
        return { action: 'startRegionDrag', cursor: smartAction.cursor, regionData: { clickTime: currentTime, offset: this.regionDragOffset, originalStart: startTime, originalEnd: endTime } };
      case CLICK_ACTIONS.NO_ACTION:
      default:
        if (smartAction.regionDragPotential && this.smartClickManager.preferences.enableRegionDrag) {
          const clickTime = positionToTime(x, canvasWidth, duration);
          this.regionDragStartTime = clickTime;
          this.regionDragOffset = clickTime - startTime;
          this.state = INTERACTION_STATES.DRAGGING;
          this.activeHandle = null;
          this.isDraggingRegion = false;
          this.isDraggingConfirmed = false;
          return { action: 'startDrag', handle: null, reason: `${smartAction.reason} - Region drag potential enabled`, blockedByInvertMode: smartAction.blockedByInvertMode || false, regionDragPotential: true };
        }
        return { action: 'none', reason: smartAction.reason, blockedByInvertMode: smartAction.blockedByInvertMode || false };
    }
  }

  handleMouseMove(x, canvasWidth, duration, startTime, endTime, audioContext = null) {
    const currentTime = positionToTime(x, canvasWidth, duration);
    const now = performance.now();
    const isRecentlyReEntered = this.lastMouseLeaveTime ? now - this.lastMouseLeaveTime < 300 : false;

    if (this.state === INTERACTION_STATES.DRAGGING && !this.isDraggingConfirmed) {
      const pixelsMoved = Math.abs(x - (this.lastMousePosition?.x || x));
      const tElapsed = now - (this.mouseDownTimestamp || 0);
      if (pixelsMoved >= this.dragMoveThreshold || tElapsed > 25) {
        this.isDraggingConfirmed = true;
        if (this.pending.hasJump) this._clearPendingJump();
        if (this.pending.hasHandleUpdate) this._clearPendingHandleUpdate();
        if (!this.activeHandle && this.regionDragStartTime != null && !this.isDraggingRegion)
          this.isDraggingRegion = true;
      }
    }
    this.lastMousePosition = { x, y: 0 };

    if (this.state === INTERACTION_STATES.DRAGGING && this.isDraggingConfirmed) {
      const roundedTime = Math.round(currentTime * 100) / 100;
      if (this.isDraggingRegion) {
        const regionDur = endTime - startTime;
        const newStart = clamp(roundedTime - this.regionDragOffset, 0, duration - regionDur);
        const newEnd = newStart + regionDur;
        let audioSynced = false;
        if (audioContext) audioSynced = this.audioSyncManager.realTimeSync(newStart, audioContext.audioRef, audioContext.setCurrentTime, 'region', true, newStart, audioContext.isInverted);
        return { action: 'updateRegion', startTime: newStart, endTime: newEnd, significant: true, audioSynced, isDraggingConfirmed: true, isRegionDrag: true, realTimeSync: true, ultraSmooth: true };
      } else if (this.activeHandle === HANDLE_TYPES.START) {
        const newStart = clamp(roundedTime, 0, endTime - 0.05);
        if (Math.abs(newStart - startTime) > 0.005) {
          let audioSynced = false;
          if (audioContext) audioSynced = this.audioSyncManager.realTimeSync(newStart, audioContext.audioRef, audioContext.setCurrentTime, 'start', true, newStart, audioContext.isInverted);
          return { action: 'updateRegion', startTime: newStart, significant: true, audioSynced, isDraggingConfirmed: true, realTimeSync: true };
        }
      } else if (this.activeHandle === HANDLE_TYPES.END) {
        const newEnd = clamp(roundedTime, startTime + 0.05, duration);
        if (Math.abs(newEnd - endTime) > 0.005) {
          let audioSynced = false;
          if (audioContext && this.audioSyncManager.preferences.syncEndHandle)
            audioSynced = this.audioSyncManager.realTimeSync(newEnd, audioContext.audioRef, audioContext.setCurrentTime, 'end', true, startTime, audioContext.isInverted);
          return { action: 'updateRegion', endTime: newEnd, significant: true, audioSynced, isDraggingConfirmed: true, realTimeSync: true };
        }
      }
      return { action: 'none' };
    }
    if (this.state === INTERACTION_STATES.DRAGGING && !this.isDraggingConfirmed)
      return { action: 'none', reason: 'awaiting_drag_confirmation' };

    // Hover only
    if (isRecentlyReEntered) return { action: 'none', reason: 'mouse_re_entry_protection' };

    const handle = detectHandle(x, canvasWidth, duration, startTime, endTime, null, audioContext?.isInverted || false);
    if (handle !== this.lastHoveredHandle) {
      this.lastHoveredHandle = handle;
      this.state = handle ? INTERACTION_STATES.HOVERING : INTERACTION_STATES.IDLE;
      let hoverCursor = 'pointer';
      if (handle) hoverCursor = 'ew-resize';
      else {
        const tAtPos = positionToTime(x, canvasWidth, duration);
        const isInRegion = tAtPos >= startTime && tAtPos <= endTime && startTime < endTime;
        if (isInRegion) hoverCursor = audioContext?.isInverted ? 'pointer' : 'grab';
      }
      return { action: 'updateHover', handle, cursor: hoverCursor, hoverOnly: true };
    }
    return { action: 'none' };
  }

  handleMouseUp(startTime, endTime, audioContext = null, duration = null) {
    const wasDragging = this.state === INTERACTION_STATES.DRAGGING;
    const wasConfirmedDrag = this.isDraggingConfirmed;
    const draggedHandle = this.activeHandle;
    const wasRegionDrag = this.isDraggingRegion;
    const hasPendingJump = this.pending.hasJump;
    const pendingJumpTime = this.pending.jumpTime;

    const isFullDurationRegion = duration !== null && Math.abs(startTime) < 0.01 && Math.abs(endTime - duration) < 0.01;
    const execPendingHandle = this.pending.hasHandleUpdate && !wasConfirmedDrag && this.pending.handleUpdate !== null;
    const shouldSaveHistory = (wasConfirmedDrag && !(wasRegionDrag && isFullDurationRegion)) || execPendingHandle;

    if (wasDragging && audioContext && wasConfirmedDrag) {
      const { audioRef, setCurrentTime, isPlaying } = audioContext;
      if (wasRegionDrag)
        this.audioSyncManager.completeDragSync('region', startTime, audioRef, setCurrentTime, isPlaying, startTime, audioContext.isInverted);
      else if (draggedHandle)
        this.audioSyncManager.completeDragSync(draggedHandle, draggedHandle === HANDLE_TYPES.START ? startTime : endTime, audioRef, setCurrentTime, isPlaying, startTime, audioContext.isInverted);
    }

    this.state = this.lastHoveredHandle ? INTERACTION_STATES.HOVERING : INTERACTION_STATES.IDLE;
    this.activeHandle = HANDLE_TYPES.NONE;
    this.dragStartPosition = null;
    this.dragStartTime = null;
    this.isDraggingConfirmed = false;
    this.mouseDownTimestamp = null;
    this.lastMousePosition = null;
    this.isDraggingRegion = false;
    this.regionDragStartTime = null;
    this.regionDragOffset = 0;

    let executePendingJump = false, pendingHandleUpdateData = null;
    if (hasPendingJump && !wasConfirmedDrag && pendingJumpTime !== null && !this.pending.jumpBlockedByInvert)
      executePendingJump = true;
    if (execPendingHandle) pendingHandleUpdateData = { ...this.pending.handleUpdate };
    this._clearPendingJump();
    this._clearPendingHandleUpdate();
    if (this.audioSyncManager) this.audioSyncManager.reset();

    return {
      action: wasDragging ? 'completeDrag' : 'none',
      saveHistory: shouldSaveHistory,
      cursor: this.lastHoveredHandle ? 'ew-resize' : 'pointer',
      wasRegionDrag,
      executePendingJump,
      pendingJumpTime: executePendingJump ? pendingJumpTime : null,
      executePendingHandleUpdate: execPendingHandle,
      pendingHandleUpdate: pendingHandleUpdateData,
    };
  }

  handleMouseLeave() {
    this.lastMouseLeaveTime = performance.now();
    const wasDragging = this.state === INTERACTION_STATES.DRAGGING;
    const wasConfirmedDrag = this.isDraggingConfirmed;
    if (wasDragging && wasConfirmedDrag) {
      this.lastHoveredHandle = HANDLE_TYPES.NONE;
      return { action: 'clearHover', cursor: 'default', forceReset: false, wasDragging, wasConfirmedDrag, maintainDragState: true, continueDragOutside: true };
    } else {
      this.lastHoveredHandle = HANDLE_TYPES.NONE;
      this._clearPendingJump();
      this._clearPendingHandleUpdate();
      return { action: 'clearHover', cursor: 'default', forceReset: false, wasDragging, wasConfirmedDrag, pendingActionsCleared: true };
    }
  }

  // -- STATE UTILS ---------------------------------------------------

  getHandleAtPosition(x, canvasWidth, duration, startTime, endTime, eventInfo = null) {
    const isInverted = this.audioContext?.isInverted || false;
    return detectHandle(x, canvasWidth, duration, startTime, endTime, eventInfo, isInverted);
  }

  setupGlobalDragContext(canvasBounds, canvasWidth, duration, startTime, endTime, audioContext, callback) {
    this.canvasBounds = canvasBounds;
    this.canvasWidth = canvasWidth;
    this.audioDuration = duration;
    this.audioContext = audioContext;
    this.onGlobalDragUpdate = { startTime, endTime, callback };
  }
  updateGlobalDragContext(startTime, endTime) {
    if (this.onGlobalDragUpdate) {
      this.onGlobalDragUpdate.startTime = startTime;
      this.onGlobalDragUpdate.endTime = endTime;
    }
  }

  // -- PENDING STATE UTILS -------------------------------------------

  _clearPendingJump() {
    this.pending.jumpTime = null;
    this.pending.hasJump = false;
    this.pending.jumpBlockedByInvert = false;
  }
  _clearPendingHandleUpdate() {
    this.pending.handleUpdate = null;
    this.pending.hasHandleUpdate = false;
  }

  // -- API: RESET, CONFIG, DEBUG --------------------------------------

  reset() {
    this._resetDragState();
    if (this.audioSyncManager) this.audioSyncManager.reset();
  }
  configureAudioSync(preferences) { this.audioSyncManager?.updatePreferences(preferences); }
  configureSmartClick(preferences) { this.smartClickManager?.updatePreferences(preferences); }
  setAudioSyncEnabled(enabled) { this.audioSyncManager?.setEnabled(enabled); }
  getAudioSyncDebugInfo() { return this.audioSyncManager?.getDebugInfo() || null; }
  getSmartClickDebugInfo() { return this.smartClickManager?.getDebugInfo() || null; }
  getDebugInfo() {
    return {
      id: this.debugId,
      state: this.state,
      activeHandle: this.activeHandle,
      lastHoveredHandle: this.lastHoveredHandle,
      isDragging: this.state === INTERACTION_STATES.DRAGGING,
      isDraggingConfirmed: this.isDraggingConfirmed,
      mouseDownTimestamp: this.mouseDownTimestamp,
      lastMousePosition: this.lastMousePosition,
      isDraggingRegion: this.isDraggingRegion,
      regionDragStartTime: this.regionDragStartTime,
      regionDragOffset: this.regionDragOffset,
      ...this.pending,
      modernHandles: true,
      handleWidth: WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH,
    };
  }
}

// 🎯 Export create function (unchanged)
export const createInteractionManager = () => new InteractionManager();
