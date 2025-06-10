import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Zap, RotateCcw, RotateCw, Repeat, RefreshCw } from 'lucide-react';
import CompactTimeSelector from './CompactTimeSelector';
import { getAutoReturnSetting, setAutoReturnSetting } from '../../utils/safeStorage';
import '../../styles/UnifiedControlBar.css';

// 🎯 **UNIFIED CONTROL BAR** - Single responsive row for all controls
// Layout: [PlayControls] | [Volume] | [Speed] | [InvertSelection] | [TimeSelector] | [History]

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
  
  // 🆕 **AUTO-RETURN TOGGLE**: Handler để toggle auto-return setting
  const toggleAutoReturn = useCallback(() => {
    const newValue = !autoReturnEnabled;
    setAutoReturnEnabled(newValue);
    setAutoReturnSetting(newValue);
    console.log(`🔄 [AutoReturn] Toggle: ${autoReturnEnabled ? 'ON' : 'OFF'} → ${newValue ? 'ON' : 'OFF'}`);
  }, [autoReturnEnabled]);
  
  // 🆕 **INVERT SELECTION HANDLER**: Smart handler for inverting selection
  const handleInvertSelection = useCallback(() => {
    if (!onInvertSelection || duration <= 0 || startTime >= endTime) return;
    
    console.log(`🔄 [InvertSelection] Button clicked - toggling invert mode`);
    console.log(`📍 [InvertSelection] Current selection: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
    
    // 🚀 **SIMPLE TOGGLE**: Just call the handler, no calculations needed
    onInvertSelection();
    
    console.log(`✅ [InvertSelection] Invert toggle command sent`);
  }, [onInvertSelection, duration, startTime, endTime]);
  
  // 🔥 **SINGLE SETUP LOG**: Only log initial setup once, asynchronously
  useEffect(() => {
    if (!setupCompleteRef.current && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Move out of render cycle
      setTimeout(() => {
        console.log('🎛️ [UnifiedControlBar] Initial setup complete:', {
          isPlaying,
          volume: volume.toFixed(2),
          speed: playbackRate + 'x',
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          historyState: `${historyIndex}/${historyLength}`,
          disabled
        });
      }, 0);
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
            : 'bg-slate-100 hover:bg-slate-200 border border-slate-300'
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

  // 🎯 **VOLUME CONTROL SECTION** - Optimized with callbacks
  const VolumeControlSection = useMemo(() => {
    const isMuted = volume === 0;
    
    return (
      <div className="flex items-center gap-2 px-3 border-r border-slate-300/50">
        {/* Volume Icon */}
        <button
          onClick={toggleMute}
          disabled={disabled}
          className="p-1 rounded hover:bg-slate-100 transition-colors group"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-red-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-slate-600 group-hover:text-slate-800" />
          )}
        </button>

        {/* Volume Slider - Responsive */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={volume}
            onChange={handleVolumeChange}
            disabled={disabled}
            className="w-18 sm:w-22 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed volume-slider"
            title={`Volume: ${Math.round(volume * 100)}%`}
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`
            }}
          />
        </div>

        {/* Volume Percentage - Enhanced font */}
        <span className="text-sm font-mono text-slate-700 w-8 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    );
  }, [volume, handleVolumeChange, toggleMute, disabled]);

  // 🎯 **SPEED CONTROL SECTION** - Enhanced with invert selection button
  const SpeedControlSection = useMemo(() => {
    const progressPercent = ((playbackRate - 0.5) / (2 - 0.5)) * 100;

    return (
      <div className="flex items-center gap-2 px-3 border-r border-slate-300/50">
        {/* Speed Icon */}
        <Zap className="w-4 h-4 text-slate-600" />

        {/* Speed Slider - Responsive */}
        <div className="relative">
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={playbackRate}
            onChange={handleSpeedChange}
            disabled={disabled}
            className="w-18 sm:w-22 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed speed-slider"
            title={`Speed: ${playbackRate}x`}
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${progressPercent}%, #e2e8f0 ${progressPercent}%, #e2e8f0 100%)`
            }}
          />
        </div>

        {/* Speed Display - Enhanced font */}
        <span className="text-sm font-mono text-slate-700 w-9 text-right">
          {playbackRate.toFixed(1)}x
        </span>

        {/* Quick Reset - Enhanced font */}
        {playbackRate !== 1 && (
          <button
            onClick={resetSpeed}
            disabled={disabled}
            className="px-2 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors disabled:opacity-50"
            title="Reset to 1x"
          >
            1x
          </button>
        )}

        {/* 🆕 **INVERT SELECTION BUTTON** - New button for inverting selection */}
        <button
          onClick={handleInvertSelection}
          disabled={disabled || duration <= 0 || startTime >= endTime}
          className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors group"
          title="Invert Selection - Toggle active/inactive regions"
        >
          <RefreshCw className="w-4 h-4 text-slate-700 group-hover:text-slate-900 group-disabled:text-slate-400" />
        </button>
      </div>
    );
  }, [playbackRate, handleSpeedChange, resetSpeed, disabled, handleInvertSelection, duration, startTime, endTime]);

  // 🎯 **HISTORY CONTROLS SECTION** - Memoized with badge counters, updated borders
  const HistoryControlsSection = useMemo(() => (
    <div className="flex items-center gap-1 px-3 border-r border-slate-300/50">
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || disabled}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors relative group"
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
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors relative group"
        title="Redo"
      >
        <RotateCw className="w-4 h-4 text-slate-700" />
        {canRedo && (
          <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {historyLength - 1 - historyIndex}
          </span>
        )}
      </button>
    </div>
  ), [canUndo, canRedo, onUndo, onRedo, historyIndex, historyLength, disabled]);

  return (
    <div className="unified-control-bar bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {/* 🎯 **MAIN CONTROL ROW** - Updated layout theo yêu cầu user mới */}
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
        
        {/* 5. Spacer - Push time selector to right */}
        <div className="flex-1 hidden xl:block"></div>
        
        {/* 6. ✅ Start Time + End Time - Moved to end */}
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
      
      {/* 🎯 **MOBILE RESPONSIVE** - Tối ưu responsive cho mobile */}
      <div className="sm:hidden mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-center gap-4">
          {/* Mobile Volume - Compact size */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-600" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={volume}
              onChange={handleVolumeChange}
              disabled={disabled}
              className="w-16 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`
              }}
            />
            <span className="text-sm text-slate-600 w-8 text-center">{Math.round(volume * 100)}%</span>
          </div>
        </div>
        
        {/* Mobile Speed Row - Hidden trên mobile quá nhỏ */}
        <div className="md:hidden mt-3 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-600" />
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={playbackRate}
              onChange={handleSpeedChange}
              disabled={disabled}
              className="w-16 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((playbackRate - 0.5) / 1.5) * 100}%, #e2e8f0 ${((playbackRate - 0.5) / 1.5) * 100}%, #e2e8f0 100%)`
              }}
            />
            <span className="text-sm text-slate-600 w-9 text-center">{playbackRate.toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
});

UnifiedControlBar.displayName = 'UnifiedControlBar';

export default UnifiedControlBar; 