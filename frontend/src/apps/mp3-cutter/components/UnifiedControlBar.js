import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Zap, RotateCcw, RotateCw } from 'lucide-react';
import CompactTimeSelector from './UnifiedControlBar/CompactTimeSelector';
import '../styles/UnifiedControlBar.css';

// 🎯 **UNIFIED CONTROL BAR** - Single responsive row for all controls
// Layout: [PlayControls] | [Volume] | [Speed] | [TimeSelector] | [History]

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
  // 🔥 **FIX INFINITE LOG**: Refs để track render mà không gây setState
  const lastLogTimeRef = useRef(0);
  const renderCountRef = useRef(0);
  const setupCompleteRef = useRef(false);
  
  // 🔥 **SMART RENDER TRACKING**: Passive tracking không gây re-render
  const trackRender = useCallback(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    
    // 🔥 **INITIAL SETUP LOG**: Chỉ log setup lần đầu
    if (!setupCompleteRef.current && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      setTimeout(() => {
        console.log('🎛️ [UnifiedControlBar] Initial setup complete:', {
          isPlaying,
          volume: volume.toFixed(2),
          speed: playbackRate + 'x',
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          historyState: `${historyIndex}/${historyLength}`,
          disabled,
          renderCount: renderCountRef.current
        });
      }, 0);
    }
    
    // 🔥 **PERIODIC STATUS**: Log trạng thái mỗi 120s để debug
    if (now - lastLogTimeRef.current > 120000) {
      lastLogTimeRef.current = now;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle  
      setTimeout(() => {
        console.log(`🎛️ [UnifiedControlBar] Status check (120s interval):`, {
          renders: renderCountRef.current,
          isPlaying,
          volume: volume.toFixed(2),
          speed: playbackRate + 'x',
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          historyState: `${historyIndex}/${historyLength}`
        });
      }, 0);
    }
  }, [isPlaying, volume, playbackRate, startTime, endTime, historyIndex, historyLength, disabled, duration]);

  // 🔥 **PASSIVE RENDER TRACKING**: Track render chỉ để debug, không gây re-render
  useEffect(() => {
    trackRender();
  });

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
          // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
          setTimeout(() => {
            console.log('⌨️ [Keyboard] Space → Toggle Play/Pause');
          }, 0);
          break;
          
        case 'ArrowLeft':
          if (e.shiftKey) {
            onJumpToStart();
            // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
            setTimeout(() => {
              console.log('⌨️ [Keyboard] Shift+← → Jump to Start');
            }, 0);
          }
          break;
          
        case 'ArrowRight':
          if (e.shiftKey) {
            onJumpToEnd();
            // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
            setTimeout(() => {
              console.log('⌨️ [Keyboard] Shift+→ → Jump to End');
            }, 0);
          }
          break;
          
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              if (canRedo) {
                onRedo();
                // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
                setTimeout(() => {
                  console.log('⌨️ [Keyboard] Ctrl+Shift+Z → Redo');
                }, 0);
              }
            } else {
              if (canUndo) {
                onUndo();
                // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
                setTimeout(() => {
                  console.log('⌨️ [Keyboard] Ctrl+Z → Undo');
                }, 0);
              }
            }
          }
          break;
          
        case 'KeyY':
          if (e.ctrlKey || e.metaKey) {
            if (canRedo) {
              onRedo();
              // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
              setTimeout(() => {
                console.log('⌨️ [Keyboard] Ctrl+Y → Redo');
              }, 0);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlayPause, onJumpToStart, onJumpToEnd, onUndo, onRedo, canUndo, canRedo]);

  // 🎯 **OPTIMIZED HANDLERS** - Memoized to prevent re-renders
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
    setTimeout(() => {
      console.log('🔊 [UnifiedControlBar] Volume changed:', newVolume);
    }, 0);
    onVolumeChange(newVolume);
  }, [onVolumeChange]);

  const handleSpeedChange = useCallback((e) => {
    const newRate = parseFloat(e.target.value);
    // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
    setTimeout(() => {
      console.log('⚡ [UnifiedControlBar] Speed changed:', newRate);
    }, 0);
    onSpeedChange(newRate);
  }, [onSpeedChange]);

  const toggleMute = useCallback(() => {
    const isMuted = volume === 0;
    onVolumeChange(isMuted ? 1 : 0);
    // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
    setTimeout(() => {
      console.log('🔇 [UnifiedControlBar] Mute toggled:', !isMuted);
    }, 0);
  }, [volume, onVolumeChange]);

  const resetSpeed = useCallback(() => {
    onSpeedChange(1);
    // 🔥 **ASYNC LOG**: Đưa ra khỏi event handler để tránh conflict
    setTimeout(() => {
      console.log('⚡ [UnifiedControlBar] Speed reset to 1x');
    }, 0);
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
    </div>
  ), [isPlaying, onTogglePlayPause, onJumpToStart, onJumpToEnd, disabled]);

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
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            disabled={disabled}
            className="w-16 sm:w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed volume-slider"
            title={`Volume: ${Math.round(volume * 100)}%`}
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`
            }}
          />
        </div>

        {/* Volume Percentage - Compact */}
        <span className="text-xs font-mono text-slate-700 w-7 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    );
  }, [volume, handleVolumeChange, toggleMute, disabled]);

  // 🎯 **SPEED CONTROL SECTION** - Optimized with preset buttons
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
            className="w-16 sm:w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed speed-slider"
            title={`Speed: ${playbackRate}x`}
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${progressPercent}%, #e2e8f0 ${progressPercent}%, #e2e8f0 100%)`
            }}
          />
        </div>

        {/* Speed Display - Compact */}
        <span className="text-xs font-mono text-slate-700 w-8 text-right">
          {playbackRate.toFixed(1)}x
        </span>

        {/* Quick Reset - Only show if not 1x */}
        {playbackRate !== 1 && (
          <button
            onClick={resetSpeed}
            disabled={disabled}
            className="px-1.5 py-0.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors disabled:opacity-50"
            title="Reset to 1x"
          >
            1x
          </button>
        )}
      </div>
    );
  }, [playbackRate, handleSpeedChange, resetSpeed, disabled]);

  // 🎯 **HISTORY CONTROLS SECTION** - Memoized with badge counters
  const HistoryControlsSection = useMemo(() => (
    <div className="flex items-center gap-1 pl-3 border-l border-slate-300/50">
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
    <div className="unified-control-bar bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      {/* 🎯 **MAIN CONTROL ROW** - Responsive single row layout */}
      <div className="flex items-center gap-0 flex-wrap xl:flex-nowrap">
        
        {/* 1. Play Controls (Left) - Always visible */}
        {PlayControlsSection}
        
        {/* 2. Volume Control - Hidden on very small screens */}
        <div className="hidden sm:flex">
          {VolumeControlSection}
        </div>
        
        {/* 3. Speed Control - Hidden on small screens */}
        <div className="hidden md:flex">
          {SpeedControlSection}
        </div>
        
        {/* 4. Time Selector (Center - Expandable) - Main content area */}
        <div className="flex-1 px-3 min-w-0">
          <CompactTimeSelector
            startTime={startTime}
            endTime={endTime}
            duration={duration}
            onStartTimeChange={onStartTimeChange}
            onEndTimeChange={onEndTimeChange}
          />
        </div>
        
        {/* 5. History Controls (Right) - Always visible */}
        {HistoryControlsSection}
      </div>
      
      {/* 🎯 **MOBILE COLLAPSED CONTROLS** - Show hidden controls on small screens */}
      <div className="sm:hidden mt-3 pt-3 border-t border-slate-200 mobile-controls">
        <div className="flex items-center justify-center gap-6">
          {/* Mobile Volume */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-600" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              disabled={disabled}
              className="w-16 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`
              }}
            />
            <span className="text-xs text-slate-600 w-7">{Math.round(volume * 100)}%</span>
          </div>
          
          {/* Mobile Speed */}
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
            <span className="text-xs text-slate-600 w-8">{playbackRate.toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
});

UnifiedControlBar.displayName = 'UnifiedControlBar';

export default UnifiedControlBar; 