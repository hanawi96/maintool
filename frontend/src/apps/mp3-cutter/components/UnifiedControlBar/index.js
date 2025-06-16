import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Zap, RotateCcw, RotateCw, Repeat, Shuffle, TrendingUp, TrendingDown, Music
} from 'lucide-react';
import CompactTimeSelector from './CompactTimeSelector';
import { getAutoReturnSetting, setAutoReturnSetting } from '../../utils/safeStorage';
import '../../styles/UnifiedControlBar.css';
import FadeSliderPopup from './FadeSliderPopup';
import VolumeSliderPopup from './VolumeSliderPopup';
import SpeedSliderPopup from './SpeedSliderPopup';
import PitchSliderPopup from './PitchSliderPopup';

const popupList = ['fadeIn', 'fadeOut', 'volume', 'speed', 'pitch'];

const UnifiedControlBar = React.memo(({
  isPlaying, volume, playbackRate, pitch = 0, onTogglePlayPause, onJumpToStart, onJumpToEnd, onVolumeChange, onSpeedChange, onPitchChange,
  startTime, endTime, duration, onStartTimeChange, onEndTimeChange,
  onInvertSelection, isInverted = false,
  fadeIn = 0, fadeOut = 0, onFadeInToggle, onFadeOutToggle, onFadeInChange, onFadeOutChange,
  canUndo, canRedo, onUndo, onRedo, historyIndex, historyLength,
  disabled = false
}) => {
  // Auto-return loop state
  const [autoReturnEnabled, setAutoReturnEnabled] = useState(() => getAutoReturnSetting());
  // Popup state
  const [popupState, setPopupState] = useState('');
  // Button refs
  const refs = {
    fadeIn: useRef(null),
    fadeOut: useRef(null),
    volume: useRef(null),
    speed: useRef(null),
    pitch: useRef(null),
  };
  // Logic condition
  const canEditRegion = !disabled && duration > 0 && startTime < endTime;

  // Auto-return logic
  const toggleAutoReturn = useCallback(() => {
    setAutoReturnEnabled(v => {
      setAutoReturnSetting(!v);
      return !v;
    });
  }, []);

  // Popup toggler
  const togglePopup = useCallback((type) => {
    setPopupState(prev => (prev === type ? '' : type));
  }, []);

  const closePopup = useCallback((type) => {
    setPopupState(prev => (prev === type ? '' : prev));
  }, []);

  // Invert selection
  const handleInvertSelection = useCallback(() => {
    if (onInvertSelection && canEditRegion) onInvertSelection();
  }, [onInvertSelection, canEditRegion]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); onTogglePlayPause(); break;
        case 'ArrowLeft': if (e.shiftKey) { e.preventDefault(); onJumpToStart(); } break;
        case 'ArrowRight': if (e.shiftKey) { e.preventDefault(); onJumpToEnd(); } break;
        case 'KeyZ':
          if ((e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (e.shiftKey && canRedo) onRedo();
            else if (canUndo) onUndo();
          }
          break;
        case 'KeyY':
          if ((e.ctrlKey || e.metaKey) && canRedo) { e.preventDefault(); onRedo(); }
          break;
        default: break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlayPause, onJumpToStart, onJumpToEnd, onUndo, onRedo, canUndo, canRedo]);

  // Volume/speed handler
  const handleVolumeChange = useCallback((e) => onVolumeChange(parseFloat(e.target.value)), [onVolumeChange]);
  const handleSpeedChange = useCallback((e) => onSpeedChange(parseFloat(e.target.value)), [onSpeedChange]);
  const toggleMute = useCallback(() => onVolumeChange(volume === 0 ? 1 : 0), [volume, onVolumeChange]);
  const resetSpeed = useCallback(() => onSpeedChange(1), [onSpeedChange]);

  // Popup render shortcut
  const popupProps = {
    fadeIn: {
      type: 'in',
      value: fadeIn,
      onChange: onFadeInChange,
      onClose: () => closePopup('fadeIn'),
      isVisible: popupState === 'fadeIn',
      buttonRef: refs.fadeIn
    },
    fadeOut: {
      type: 'out',
      value: fadeOut,
      onChange: onFadeOutChange,
      onClose: () => closePopup('fadeOut'),
      isVisible: popupState === 'fadeOut',
      buttonRef: refs.fadeOut
    },
    volume: {
      value: volume,
      onChange: onVolumeChange,
      onClose: () => closePopup('volume'),
      isVisible: popupState === 'volume',
      buttonRef: refs.volume
    },
    speed: {
      value: playbackRate,
      onChange: onSpeedChange,
      onClose: () => closePopup('speed'),
      isVisible: popupState === 'speed',
      buttonRef: refs.speed
    },
    pitch: {
      value: pitch,
      onChange: onPitchChange,
      onClose: () => closePopup('pitch'),
      isVisible: popupState === 'pitch',
      buttonRef: refs.pitch
    },
  };

  return (
    <>
      <div className="unified-control-bar bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 1. Jump to Start */}
          <button
            onClick={onJumpToStart} disabled={disabled}
            className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors group"
            title="Jump to Start (Shift + ←)">
            <SkipBack className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
          </button>

          {/* 2. Play/Pause */}
          <button
            onClick={onTogglePlayPause} disabled={disabled}
            className="p-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 rounded-xl transition-all duration-200 shadow-md group"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
            {isPlaying
              ? <Pause className="w-5 h-5 text-white drop-shadow-sm" />
              : <Play className="w-5 h-5 text-white drop-shadow-sm" />}
          </button>

          {/* 3. Jump to End */}
          <button
            onClick={onJumpToEnd} disabled={disabled}
            className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors group"
            title="Jump to End (Shift + →)">
            <SkipForward className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
          </button>

          {/* 4. Auto-Return */}
          <button
            onClick={toggleAutoReturn} disabled={disabled}
            className={`relative p-2 rounded-lg transition-all group ${
              autoReturnEnabled
                ? 'bg-green-100 hover:bg-green-200 border border-green-300'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={`Auto-Return Loop: ${autoReturnEnabled ? 'ON' : 'OFF'}`}>
            <Repeat className={`w-4 h-4 ${autoReturnEnabled ? 'text-green-700' : 'text-slate-700'} group-hover:text-green-800`} />
            {autoReturnEnabled && <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>}
          </button>

          {/* 5. Undo */}
          <button
            onClick={onUndo} disabled={!canUndo || disabled}
            className={`relative p-2 rounded-lg transition-colors group ${
              canUndo
                ? 'bg-indigo-100 hover:bg-indigo-200 border border-indigo-300'
                : 'bg-slate-100 hover:bg-slate-200 disabled:opacity-40'
            }`}
            title="Undo">
            <RotateCcw className={`w-4 h-4 ${canUndo ? 'text-indigo-700' : 'text-slate-700'}`} />
            {historyIndex > 0 &&
              <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{historyIndex}</span>}
          </button>

          {/* 6. Redo */}
          <button
            onClick={onRedo} disabled={!canRedo || disabled}
            className={`relative p-2 rounded-lg transition-colors group ${
              canRedo
                ? 'bg-purple-100 hover:bg-purple-200 border border-purple-300'
                : 'bg-slate-100 hover:bg-slate-200 disabled:opacity-40'
            }`}
            title="Redo">
            <RotateCw className={`w-4 h-4 ${canRedo ? 'text-purple-700' : 'text-slate-700'}`} />
            {canRedo &&
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {historyLength - 1 - historyIndex}
              </span>}
          </button>

          {/* 7. Invert Selection */}
          <button
            onClick={handleInvertSelection}
            disabled={!canEditRegion}
            data-inverted={isInverted}
            className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors relative group"
            title={`Invert Selection: ${isInverted ? 'ON' : 'OFF'}`}>
            <Shuffle className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
          </button>

          {/* 8. Fade In */}
          <button
            ref={refs.fadeIn}
            onClick={() => togglePopup('fadeIn')}
            disabled={!canEditRegion}
            className={`relative p-2 rounded-lg group ${
              fadeIn > 0
                ? 'bg-emerald-100 hover:bg-emerald-200 border border-emerald-300'
                : popupState === 'fadeIn'
                ? 'bg-slate-200 border border-slate-400'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={`Fade In: ${fadeIn > 0 ? `${fadeIn.toFixed(1)}s` : 'Click to adjust'}`}>
            <TrendingUp className={`w-4 h-4 ${fadeIn > 0 ? 'text-emerald-700' : 'text-slate-700'} group-hover:text-emerald-800`} />
            {fadeIn > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></div>}
          </button>

          {/* 9. Fade Out */}
          <button
            ref={refs.fadeOut}
            onClick={() => togglePopup('fadeOut')}
            disabled={!canEditRegion}
            className={`relative p-2 rounded-lg group ${
              fadeOut > 0
                ? 'bg-orange-100 hover:bg-orange-200 border border-orange-300'
                : popupState === 'fadeOut'
                ? 'bg-slate-200 border border-slate-400'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={`Fade Out: ${fadeOut > 0 ? `${fadeOut.toFixed(1)}s` : 'Click to adjust'}`}>
            <TrendingDown className={`w-4 h-4 ${fadeOut > 0 ? 'text-orange-700' : 'text-slate-700'} group-hover:text-orange-800`} />
            {fadeOut > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>}
          </button>

          {/* 10. Volume */}
          <button
            ref={refs.volume}
            onClick={() => togglePopup('volume')}
            disabled={disabled}
            className={`relative p-2 rounded-lg group ${
              popupState === 'volume'
                ? 'bg-slate-200 border border-slate-400'
                : volume === 0
                ? 'bg-red-100 hover:bg-red-200 border border-red-300'
                : volume > 1
                ? 'bg-orange-100 hover:bg-orange-200 border border-orange-300'
                : 'bg-blue-100 hover:bg-blue-200 border border-blue-300'
            }`}
            title={`Volume: ${Math.round(volume * 100)}% - Click to adjust${volume > 1 ? ' (BOOST)' : ''}`}>
            {volume === 0
              ? <VolumeX className="w-4 h-4 text-red-600 group-hover:text-red-700" />
              : <Volume2 className={`w-4 h-4 ${volume > 1 ? 'text-orange-600 group-hover:text-orange-700' : 'text-blue-600 group-hover:text-blue-700'}`} />}
            {volume !== 0 && <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${volume > 1 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ opacity: Math.min(1, volume) }}></div>}
          </button>

          {/* 11. Speed */}
          <button
            ref={refs.speed}
            onClick={() => togglePopup('speed')}
            disabled={disabled}
            className={`relative p-2 rounded-lg group ${
              popupState === 'speed'
                ? 'bg-slate-200 border border-slate-400'
                : playbackRate !== 1
                ? 'bg-purple-100 hover:bg-purple-200 border border-purple-300'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={`Speed: ${playbackRate.toFixed(1)}x - Click to adjust`}>
            <Zap className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
            {playbackRate !== 1 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"></div>}
          </button>

          {/* 12. Pitch */}
          <button
            ref={refs.pitch}
            onClick={() => togglePopup('pitch')}
            disabled={disabled}
            className={`relative p-2 rounded-lg group ${
              popupState === 'pitch'
                ? 'bg-slate-200 border border-slate-400'
                : pitch !== 0
                ? 'bg-teal-100 hover:bg-teal-200 border border-teal-300'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={`Pitch: ${pitch > 0 ? '+' : ''}${pitch.toFixed(1)}st - Click to adjust`}>
            <Music className="w-4 h-4 text-teal-600 group-hover:text-teal-700" />
            {pitch !== 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-teal-500 rounded-full"></div>}
          </button>

          {/* 13. Time Selector */}
          <div className="ml-auto">
            <CompactTimeSelector
              startTime={startTime}
              endTime={endTime}
              duration={duration}
              onStartTimeChange={onStartTimeChange}
              onEndTimeChange={onEndTimeChange}
            />
          </div>
        </div>
      </div>

      {/* Popups */}
      <FadeSliderPopup {...popupProps.fadeIn} />
      <FadeSliderPopup {...popupProps.fadeOut} />
      <VolumeSliderPopup {...popupProps.volume} />
      <SpeedSliderPopup {...popupProps.speed} />
      <PitchSliderPopup {...popupProps.pitch} />
    </>
  );
});

UnifiedControlBar.displayName = 'UnifiedControlBar';
export default UnifiedControlBar;
