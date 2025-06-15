import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Zap, RotateCcw, RotateCw, Repeat, Shuffle, TrendingUp, TrendingDown } from 'lucide-react';
import CompactTimeSelector from './CompactTimeSelector';
import { getAutoReturnSetting, setAutoReturnSetting } from '../../utils/safeStorage';
import '../../styles/UnifiedControlBar.css';
import FadeSliderPopup from './FadeSliderPopup';
import VolumeSliderPopup from './VolumeSliderPopup';
import SpeedSliderPopup from './SpeedSliderPopup';

// 🎯 **UNIFIED CONTROL BAR** - Single responsive row for all controls
// Layout: [PlayControls] | [Volume] | [Speed] | [InvertSelection] | [FadeControls] | [TimeSelector] | [History]

const UnifiedControlBar = React.memo(({
  // Audio Player props
  isPlaying,
  volume,
  playbackRate,
  onTogglePlayPause,
  onJumpToStart,
  onJumpToEnd,
  onVolumeChange,
  onSpeedChange,
  
  // Time Selector props
  startTime,
  endTime,
  duration,
  onStartTimeChange,
  onEndTimeChange,
  
  // 🆕 **INVERT SELECTION**: New prop for invert selection handler
  onInvertSelection,
  // 🆕 **INVERT STATE**: Prop to track if invert mode is active
  isInverted = false,
  
  // 🆕 **FADE EFFECTS**: Props for fade in/out controls
  fadeIn = 0,
  fadeOut = 0,
  onFadeInToggle,
  onFadeOutToggle,
  onFadeInChange,
  onFadeOutChange,
  
  // History props
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyIndex,
  historyLength,
  
  // Common props
  disabled = false
}) => {
  // 🔥 **OPTIMIZED**: Removed all logging refs to prevent spam
  const setupCompleteRef = useRef(false);
  
  // 🆕 **AUTO-RETURN STATE**: State quản lý auto-return loop setting
  const [autoReturnEnabled, setAutoReturnEnabled] = React.useState(() => getAutoReturnSetting());
  
  // 🆕 **POPUP STATE**: State để quản lý popup hiển thị
  const [popupState, setPopupState] = useState({
    fadeInVisible: false,
    fadeOutVisible: false,
    volumeVisible: false,
    speedVisible: false
  });
  const fadeInButtonRef = useRef(null);
  const fadeOutButtonRef = useRef(null);
  const volumeButtonRef = useRef(null);
  const speedButtonRef = useRef(null);
  
  // 🆕 **AUTO-RETURN TOGGLE**: Toggle để bật/tắt auto-return
  const toggleAutoReturn = useCallback(() => {
    const newValue = !autoReturnEnabled;
    setAutoReturnEnabled(newValue);
    setAutoReturnSetting(newValue);
  }, [autoReturnEnabled]);
  
  // 🆕 **INVERT SELECTION HANDLER**: Smart handler for inverting selection
  const handleInvertSelection = useCallback(() => {
    if (!onInvertSelection || duration <= 0 || startTime >= endTime) return;
    // 🚀 **SIMPLE TOGGLE**: Just call the handler, no calculations needed
    onInvertSelection();
    
  }, [onInvertSelection, duration, startTime, endTime]);

  // 🆕 **POPUP HANDLERS**: Xử lý show/hide popup
  const handleFadeInClick = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      fadeInVisible: !prev.fadeInVisible,
      fadeOutVisible: false, // Đóng fade out popup nếu đang mở
      volumeVisible: false, // Đóng volume popup nếu đang mở
      speedVisible: false // Đóng speed popup nếu đang mở
    }));
  }, []);

  const handleFadeOutClick = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      fadeOutVisible: !prev.fadeOutVisible,
      fadeInVisible: false, // Đóng fade in popup nếu đang mở
      volumeVisible: false, // Đóng volume popup nếu đang mở
      speedVisible: false // Đóng speed popup nếu đang mở
    }));
  }, []);

  const handleVolumeClick = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      volumeVisible: !prev.volumeVisible,
      fadeInVisible: false, // Đóng fade in popup nếu đang mở
      fadeOutVisible: false, // Đóng fade out popup nếu đang mở
      speedVisible: false // Đóng speed popup nếu đang mở
    }));
  }, []);

  const handleSpeedClick = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      speedVisible: !prev.speedVisible,
      fadeInVisible: false, // Đóng fade in popup nếu đang mở
      fadeOutVisible: false, // Đóng fade out popup nếu đang mở
      volumeVisible: false // Đóng volume popup nếu đang mở
    }));
  }, []);

  const closeFadeInPopup = useCallback(() => {
    setPopupState(prev => ({ ...prev, fadeInVisible: false }));
  }, []);

  const closeFadeOutPopup = useCallback(() => {
    setPopupState(prev => ({ ...prev, fadeOutVisible: false }));
  }, []);

  const closeVolumePopup = useCallback(() => {
    setPopupState(prev => ({ ...prev, volumeVisible: false }));
  }, []);

  const closeSpeedPopup = useCallback(() => {
    setPopupState(prev => ({ ...prev, speedVisible: false }));
  }, []);

  // 🔥 **SINGLE SETUP LOG**: Only log initial setup once, asynchronously (production optimized)
  useEffect(() => {
    if (!setupCompleteRef.current && duration > 0) {
      setupCompleteRef.current = true;
      // Initial setup complete - production optimized
    }
  }, [duration, isPlaying, volume, playbackRate, startTime, endTime, historyIndex, historyLength, disabled]);

  // 🎯 **KEYBOARD SHORTCUTS** - Global keyboard handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Prevent default for our shortcuts
      const shortcuts = ['Space', 'ArrowLeft', 'ArrowRight'];
      if (shortcuts.includes(e.code) || (e.shiftKey && shortcuts.includes(e.code))) {
        e.preventDefault();
      }
      
      switch (e.code) {
        case 'Space':
          onTogglePlayPause();
          break;
          
        case 'ArrowLeft':
          if (e.shiftKey) {
            onJumpToStart();
          }
          break;
          
        case 'ArrowRight':
          if (e.shiftKey) {
            onJumpToEnd();
          }
          break;
          
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              if (canRedo) {
                onRedo();
              }
            } else {
              if (canUndo) {
                onUndo();
              }
            }
          }
          break;
          
        case 'KeyY':
          if (e.ctrlKey || e.metaKey) {
            if (canRedo) {
              onRedo();
            }
          }
          break;
          
        default:
          // No action for other keys
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlayPause, onJumpToStart, onJumpToEnd, onUndo, onRedo, canUndo, canRedo]);

  // 🎯 **OPTIMIZED HANDLERS** - Memoized to prevent re-renders
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
  }, [onVolumeChange]);

  const handleSpeedChange = useCallback((e) => {
    const newRate = parseFloat(e.target.value);
    onSpeedChange(newRate);
  }, [onSpeedChange]);

  const toggleMute = useCallback(() => {
    const isMuted = volume === 0;
    onVolumeChange(isMuted ? 1 : 0);
  }, [volume, onVolumeChange]);

  const resetSpeed = useCallback(() => {
    onSpeedChange(1);
  }, [onSpeedChange]);

  // 🎯 **PLAY CONTROLS SECTION** - Memoized for performance
  const PlayControlsSection = useMemo(() => (
    <div className="flex items-center gap-2 pr-3 border-r border-slate-300/50">
      {/* Jump to Start */}
      <button
        onClick={onJumpToStart}
        disabled={disabled}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        title="Jump to Start (Shift + ←)"
      >
        <SkipBack className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
      </button>
      
      {/* Play/Pause - Prominent button */}
      <button
        onClick={onTogglePlayPause}
        disabled={disabled}
        className="p-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-md group"
        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white drop-shadow-sm" />
        ) : (
          <Play className="w-5 h-5 text-white drop-shadow-sm" />
        )}
      </button>
      
      {/* Jump to End */}
      <button
        onClick={onJumpToEnd}
        disabled={disabled}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
        title="Jump to End (Shift + →)"
      >
        <SkipForward className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
      </button>
      
      {/* 🔄 Auto-Return Toggle */}
      <button
        onClick={toggleAutoReturn}
        disabled={disabled}
        className={`relative p-2 rounded-lg transition-all duration-200 group ${
          autoReturnEnabled 
            ? 'bg-green-100 hover:bg-green-200 border border-green-300' 
            : 'bg-slate-100 hover:bg-slate-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={`Auto-Return Loop: ${autoReturnEnabled ? 'ON - Will loop region' : 'OFF - Will stop at end'}`}
      >
        <Repeat className={`w-4 h-4 transition-colors ${
          autoReturnEnabled 
            ? 'text-green-700 group-hover:text-green-800' 
            : 'text-slate-700 group-hover:text-slate-900'
        }`} />
        {/* 🎯 Visual indicator khi enabled */}
        {autoReturnEnabled && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
        )}
      </button>
    </div>
  ), [isPlaying, onTogglePlayPause, onJumpToStart, onJumpToEnd, disabled, toggleAutoReturn, autoReturnEnabled]);

  // 🎯 **VOLUME CONTROL SECTION** - Chỉ hiển thị button với popup
  const VolumeControlSection = useMemo(() => {
    const isMuted = volume === 0;
    
    return (
      <div className="flex items-center gap-2 px-3 border-r border-slate-300/50">
        {/* Volume Button - Với popup */}
        <button
          ref={volumeButtonRef}
          onClick={handleVolumeClick}
          disabled={disabled}
          className={`relative p-2 rounded-lg transition-all duration-200 group ${
            popupState.volumeVisible
              ? 'bg-slate-200 border border-slate-400'
              : isMuted
              ? 'bg-red-100 hover:bg-red-200 border border-red-300'
              : 'bg-slate-100 hover:bg-slate-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={`Volume: ${Math.round(volume * 100)}% - Click to adjust`}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-600 group-hover:text-red-700" />
          ) : (
            <Volume2 className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
          )}
          {/* 🎯 Visual indicator cho volume level */}
          {!isMuted && (
            <div 
              className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full shadow-sm"
              style={{ opacity: volume }}
            ></div>
          )}
        </button>
      </div>
    );
  }, [volume, handleVolumeClick, disabled, popupState.volumeVisible]);
  // 🎯 **SPEED CONTROL SECTION** - Chỉ hiển thị button với popup
  const SpeedControlSection = useMemo(() => {
    return (
      <div className="flex items-center gap-2 px-3 border-r border-slate-300/50">
        {/* Speed Button - Với popup */}
        <button
          ref={speedButtonRef}
          onClick={handleSpeedClick}
          disabled={disabled}
          className={`relative p-2 rounded-lg transition-all duration-200 group ${
            popupState.speedVisible
              ? 'bg-slate-200 border border-slate-400'
              : playbackRate !== 1
              ? 'bg-purple-100 hover:bg-purple-200 border border-purple-300'
              : 'bg-slate-100 hover:bg-slate-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={`Speed: ${playbackRate.toFixed(1)}x - Click to adjust`}
        >
          <Zap className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
          {/* 🎯 Visual indicator cho speed level */}
          {playbackRate !== 1 && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full shadow-sm"></div>
          )}
        </button>
      </div>
    );
  }, [playbackRate, handleSpeedClick, disabled, popupState.speedVisible]);
  // 🎯 **HISTORY CONTROLS SECTION** - Undo/Redo + Invert Selection + Fade Controls
  const HistoryControlsSection = useMemo(() => (
    <div className="flex items-center gap-1 px-3 border-r border-slate-300/50">
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || disabled}
        className={`p-2 ${
          canUndo && !disabled
            ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300'
            : 'bg-slate-100 hover:bg-slate-200'
        } disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors relative group`}
        title="Undo"
      >
        <RotateCcw className="w-4 h-4 text-slate-700" />
        {historyIndex > 0 && (
          <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {historyIndex}
          </span>
        )}
      </button>
      
      {/* Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo || disabled}
        className={`p-2 ${
          canRedo && !disabled
            ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300'
            : 'bg-slate-100 hover:bg-slate-200'
        } disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors relative group`}
        title="Redo"
      >
        <RotateCw className="w-4 h-4 text-slate-700" />
        {canRedo && (
          <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {historyLength - 1 - historyIndex}
          </span>
        )}
      </button>

      {/* Invert Selection - Moved here, next to undo/redo */}
      <button
        onClick={handleInvertSelection}
        disabled={disabled || duration <= 0 || startTime >= endTime}
        data-inverted={isInverted}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors relative group"
        title={`Invert Selection: ${isInverted ? 'ON - Playing outside selection' : 'OFF - Playing inside selection'}`}
      >
        <Shuffle className="w-4 h-4 text-slate-700 group-hover:text-slate-900 group-disabled:text-slate-400" />
      </button>

      {/* 🆕 Fade In Toggle - Với popup */}
      <button
        ref={fadeInButtonRef}
        onClick={handleFadeInClick}
        disabled={disabled || duration <= 0 || startTime >= endTime}
        className={`relative p-2 rounded-lg transition-all duration-200 group ${
          fadeIn > 0 
            ? 'bg-emerald-100 hover:bg-emerald-200 border border-emerald-300' 
            : popupState.fadeInVisible
            ? 'bg-slate-200 border border-slate-400'
            : 'bg-slate-100 hover:bg-slate-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={`Fade In: ${fadeIn > 0 ? `${fadeIn.toFixed(1)}s` : 'Click to adjust'}`}
      >
        <TrendingUp className={`w-4 h-4 transition-colors ${
          fadeIn > 0 
            ? 'text-emerald-700 group-hover:text-emerald-800' 
            : 'text-slate-700 group-hover:text-slate-900'
        }`} />
        {/* 🎯 Visual indicator khi enabled */}
        {fadeIn > 0 && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full shadow-sm"></div>
        )}
      </button>

      {/* 🆕 Fade Out Toggle - Với popup */}
      <button
        ref={fadeOutButtonRef}
        onClick={handleFadeOutClick}
        disabled={disabled || duration <= 0 || startTime >= endTime}
        className={`relative p-2 rounded-lg transition-all duration-200 group ${
          fadeOut > 0 
            ? 'bg-orange-100 hover:bg-orange-200 border border-orange-300' 
            : popupState.fadeOutVisible
            ? 'bg-slate-200 border border-slate-400'
            : 'bg-slate-100 hover:bg-slate-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={`Fade Out: ${fadeOut > 0 ? `${fadeOut.toFixed(1)}s` : 'Click to adjust'}`}
      >
        <TrendingDown className={`w-4 h-4 transition-colors ${
          fadeOut > 0 
            ? 'text-orange-700 group-hover:text-orange-800' 
            : 'text-slate-700 group-hover:text-slate-900'
        }`} />
        {/* 🎯 Visual indicator khi enabled */}
        {fadeOut > 0 && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full shadow-sm"></div>
        )}
      </button>
    </div>
  ), [canUndo, canRedo, onUndo, onRedo, historyIndex, historyLength, disabled, handleInvertSelection, duration, startTime, endTime, isInverted, handleFadeInClick, handleFadeOutClick, fadeIn, fadeOut, popupState, closeFadeInPopup, closeFadeOutPopup, onFadeInChange, onFadeOutChange]);

  return (
    <>
      <div className="unified-control-bar bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        {/* 🎯 **MAIN CONTROL ROW** - Updated layout theo yêu cầu user: time selector ở cuối, float left */}
        <div className="flex items-center gap-1 flex-wrap xl:flex-nowrap">
          
          {/* 1. ✅ Jump to Start + Play/Pause + Jump to End */}
          {PlayControlsSection}
          
          {/* 2. ✅ Undo/Redo - Moved after playback controls */}
          {HistoryControlsSection}
          
          {/* 3. ✅ Volume Control */}
          <div className="hidden sm:flex">
            {VolumeControlSection}
          </div>
            {/* 4. ✅ Speed Control */}
          <div className="hidden md:flex">
            {SpeedControlSection}
          </div>
          
          {/* 5. ✅ Start Time + End Time - Time selector controls */}
          <div className="px-4">
            <CompactTimeSelector
              startTime={startTime}
              endTime={endTime}
              duration={duration}
              onStartTimeChange={onStartTimeChange}
              onEndTimeChange={onEndTimeChange}
            />
          </div>
        </div>
          {/* 🎯 **MOBILE RESPONSIVE** - Tối ưu responsive với border ngăn cách */}
        <div className="sm:hidden mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-center gap-4">
            {/* Mobile Volume - Button only */}
            <div className="flex items-center gap-2 px-3 border-r border-slate-300/50">
              <button
                onClick={handleVolumeClick}
                disabled={disabled}
                className={`p-2 rounded-lg transition-all duration-200 group ${
                  popupState.volumeVisible
                    ? 'bg-slate-200 border border-slate-400'
                    : volume === 0
                    ? 'bg-red-100 hover:bg-red-200 border border-red-300'
                    : 'bg-slate-100 hover:bg-slate-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={`Volume: ${Math.round(volume * 100)}% - Tap to adjust`}
              >
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-600" />
                ) : (
                  <Volume2 className="w-4 h-4 text-blue-600" />
                )}
              </button>
            </div>
          </div>
            {/* Mobile Speed Row */}
          <div className="md:hidden mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-center">
            {/* Speed Control - Button only */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeedClick}
                disabled={disabled}
                className={`p-2 rounded-lg transition-all duration-200 group ${
                  popupState.speedVisible
                    ? 'bg-slate-200 border border-slate-400'
                    : playbackRate !== 1
                    ? 'bg-purple-100 hover:bg-purple-200 border border-purple-300'
                    : 'bg-slate-100 hover:bg-slate-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={`Speed: ${playbackRate.toFixed(1)}x - Tap to adjust`}
              >
                <Zap className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 **PORTAL POPUPS**: Render qua Portal để tránh z-index conflicts */}
      <FadeSliderPopup
        type="in"
        value={fadeIn}
        onChange={onFadeInChange}
        onClose={closeFadeInPopup}
        isVisible={popupState.fadeInVisible}
        buttonRef={fadeInButtonRef}
      />
      
      <FadeSliderPopup
        type="out"
        value={fadeOut}
        onChange={onFadeOutChange}
        onClose={closeFadeOutPopup}
        isVisible={popupState.fadeOutVisible}
        buttonRef={fadeOutButtonRef}
      />

      <VolumeSliderPopup
        value={volume}
        onChange={onVolumeChange}
        onClose={closeVolumePopup}
        isVisible={popupState.volumeVisible}
        buttonRef={volumeButtonRef}
      />

      <SpeedSliderPopup
        value={playbackRate}
        onChange={onSpeedChange}
        onClose={closeSpeedPopup}
        isVisible={popupState.speedVisible}
        buttonRef={speedButtonRef}
      />
    </>
  );
});

UnifiedControlBar.displayName = 'UnifiedControlBar';

export default UnifiedControlBar; 