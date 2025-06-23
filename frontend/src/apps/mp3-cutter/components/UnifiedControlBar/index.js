import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Zap, RotateCcw, RotateCw, Repeat, Shuffle, TrendingUp, TrendingDown, Music, Sliders,
  Plus, Minus, Trash2, PlayCircle
} from 'lucide-react';
import CompactTimeSelector from './CompactTimeSelector';
import { getAutoReturnSetting, setAutoReturnSetting } from '../../utils/safeStorage';
import '../../styles/UnifiedControlBar.css';
import FadeSliderPopup from './FadeSliderPopup';
import VolumeSliderPopup from './VolumeSliderPopup';
import SpeedSliderPopup from './SpeedSliderPopup';
import PitchSliderPopup from './PitchSliderPopup';
import EqualizerPopup from './EqualizerPopup';

const UnifiedControlBar = React.memo(({
  isPlaying, volume, playbackRate, pitch = 0, onTogglePlayPause, onJumpToStart, onJumpToEnd, onVolumeChange, onSpeedChange, onPitchChange,
  startTime, endTime, duration, onStartTimeChange, onEndTimeChange,
  // 🔧 Raw main selection times for logic calculation
  mainSelectionStartTime, mainSelectionEndTime,
  onInvertSelection, isInverted = false,
  fadeIn = 0, fadeOut = 0, onFadeInToggle, onFadeOutToggle, onFadeInChange, onFadeOutChange,
  // 🆕 Enhanced fade support
  getCurrentFadeValues = null,
  // 🆕 Enhanced volume support
  getCurrentVolumeValues = null,
  // 🆕 Enhanced speed support
  getCurrentSpeedValues = null,
  // 🆕 Enhanced pitch support
  getCurrentPitchValues = null,
  canUndo, canRedo, onUndo, onRedo, historyIndex, historyLength,
  disabled = false,
  onEqualizerChange = null, // 🎚️ New prop for realtime equalizer updates
  equalizerState = null, // 🎚️ Current equalizer state for visual indicators
  // 🆕 Region management props
  regions = [], // Array of regions
  activeRegionId = null, // 🆕 Currently active region ID (can be 'main' or region.id)
  canAddNewRegion = false, // 🆕 Whether can add new region based on available spaces
  onAddRegion = null, // Callback to add new region
  onDeleteRegion = null, // Callback to delete active region
  onClearAllRegions = null, // Callback to clear all regions
  onPlayAllRegions = null // Callback to play all regions
}) => {
  // Auto-return loop state
  const [autoReturnEnabled, setAutoReturnEnabled] = useState(() => getAutoReturnSetting());
  // Popup state
  const [popupState, setPopupState] = useState('');  // Button refs
  const refs = {
    fadeIn: useRef(null),
    fadeOut: useRef(null),
    volume: useRef(null),
    speed: useRef(null),
    pitch: useRef(null),
    equalizer: useRef(null),
  };  // Logic condition
  const canEditRegion = !disabled && duration > 0 && startTime < endTime;
    // 🔧 SEPARATE LOGIC: Invert selection only available when no regions exist
  const canInvertSelection = canEditRegion && regions.length === 0;

  // 🎚️ Check if equalizer has non-default values
  const isEqualizerActive = equalizerState && Array.isArray(equalizerState) && 
    equalizerState.some(value => value !== 0);
  // 🆕 Get current values based on active region for visual indicators (memoized for performance)
  const currentFadeValues = useMemo(() => {
    return getCurrentFadeValues ? getCurrentFadeValues() : { fadeIn, fadeOut };
  }, [getCurrentFadeValues, fadeIn, fadeOut]);
  
  const currentVolumeValue = useMemo(() => {
    return getCurrentVolumeValues ? getCurrentVolumeValues().volume : volume;
  }, [getCurrentVolumeValues, volume]);
  
  const currentSpeedValue = useMemo(() => {
    return getCurrentSpeedValues ? getCurrentSpeedValues().playbackRate : playbackRate;
  }, [getCurrentSpeedValues, playbackRate]);
  
  const currentPitchValue = useMemo(() => {
    return getCurrentPitchValues ? getCurrentPitchValues().pitch : pitch;
  }, [getCurrentPitchValues, pitch]);
  
  // 🔧 Debug log for region switch
  useEffect(() => {
    console.log('🎛️ [UnifiedControlBar] Values for visual indicators:', {
      activeRegionId: activeRegionId || 'main',
      currentFadeValues,
      currentVolumeValue,
      currentSpeedValue,
      currentPitchValue,
      mainValues: { fadeIn, fadeOut, volume, playbackRate, pitch }
    });
  }, [activeRegionId, currentFadeValues, currentVolumeValue, currentSpeedValue, currentPitchValue, fadeIn, fadeOut, volume, playbackRate, pitch]);// 🆕 Region management logic
  const canAddRegion = canAddNewRegion && !!onAddRegion; // 🆕 Now depends on available spaces
  
  // 🔧 Calculate total deletable items (regions + main selection when exists)
  // Use raw main selection times for accurate calculation
  const rawStartTime = mainSelectionStartTime ?? startTime;
  const rawEndTime = mainSelectionEndTime ?? endTime;
  const mainSelectionExists = duration > 0 && rawStartTime < rawEndTime;
  const totalDeletableItems = regions.length + (mainSelectionExists ? 1 : 0);
  
  // 🆕 Disable delete button when main region is active (main region cannot be deleted)
  const isMainRegionActive = activeRegionId === 'main';
  const canDeleteRegion = !disabled && totalDeletableItems > 1 && onDeleteRegion && !isMainRegionActive;
  const canClearAllRegions = !disabled && regions.length >= 2 && onClearAllRegions;

  // Auto-return logic
  const toggleAutoReturn = useCallback(() => {
    setAutoReturnEnabled(v => {
      setAutoReturnSetting(!v);
      return !v;
    });
  }, []);

  // 🔧 Confirmation for Clear All Regions to prevent accidents
  const handleClearAllRegions = useCallback(() => {
    const regionCount = regions.length;
    const confirmed = window.confirm(
      `🗑️ Delete ALL ${regionCount} regions?\n\n` +
      `This action cannot be undone. Only the main selection will remain.\n\n` +
      `Click OK to delete all regions, or Cancel to keep them.`
    );
    
    if (confirmed && onClearAllRegions) {
      onClearAllRegions();
    }
  }, [regions.length, onClearAllRegions]);

  // Popup toggler
  const togglePopup = useCallback((type) => {
    setPopupState(prev => (prev === type ? '' : type));
  }, []);

  const closePopup = useCallback((type) => {
    setPopupState(prev => (prev === type ? '' : prev));
  }, []);

  // Invert selection
  const handleInvertSelection = useCallback(() => {
    if (onInvertSelection && canInvertSelection) onInvertSelection();
  }, [onInvertSelection, canInvertSelection]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); onTogglePlayPause(); break;        case 'ArrowLeft': if (e.shiftKey) { e.preventDefault(); onJumpToStart(); } break;
        case 'ArrowRight': if (e.shiftKey) { e.preventDefault(); onJumpToEnd(); } break;
        case 'KeyN':
          if ((e.ctrlKey || e.metaKey) && canAddRegion) { 
            e.preventDefault(); 
            onAddRegion(); 
          }
          break;
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
    return () => document.removeEventListener('keydown', handleKeyDown);  }, [onTogglePlayPause, onJumpToStart, onJumpToEnd, onUndo, onRedo, canUndo, canRedo, canAddRegion, onAddRegion]);

  // Popup render shortcut
  const popupProps = {
    fadeIn: {
      type: 'in',
      value: fadeIn,
      onChange: onFadeInChange,
      onClose: () => closePopup('fadeIn'),
      isVisible: popupState === 'fadeIn',
      buttonRef: refs.fadeIn,
      // 🆕 Region support props
      regions,
      activeRegionId,
      getCurrentFadeValues: getCurrentFadeValues,
      // 🔧 CRITICAL FIX: Add main fade values for backup/restore
      fadeIn,
      fadeOut
    },
    fadeOut: {
      type: 'out',
      value: fadeOut,
      onChange: onFadeOutChange,
      onClose: () => closePopup('fadeOut'),
      isVisible: popupState === 'fadeOut',
      buttonRef: refs.fadeOut,
      // 🆕 Region support props
      regions,
      activeRegionId,
      getCurrentFadeValues: getCurrentFadeValues,
      // 🔧 CRITICAL FIX: Add main fade values for backup/restore
      fadeIn,
      fadeOut
    },
    volume: {
      value: volume,
      onChange: onVolumeChange,
      onClose: () => closePopup('volume'),
      isVisible: popupState === 'volume',
      buttonRef: refs.volume,
      // 🆕 Region support props
      regions,
      activeRegionId,
      getCurrentVolumeValues: getCurrentVolumeValues,
      // 🔧 CRITICAL FIX: Add main volume for backup/restore
      volume
    },
    speed: {
      value: playbackRate,
      onChange: onSpeedChange,
      onClose: () => closePopup('speed'),
      isVisible: popupState === 'speed',
      buttonRef: refs.speed,
      // 🆕 Enhanced speed support
      regions,
      activeRegionId,
      getCurrentSpeedValues: getCurrentSpeedValues,
      playbackRate // 🔧 Main speed for backup/restore
    },
    pitch: {
      value: pitch,
      onChange: onPitchChange,
      onClose: () => closePopup('pitch'),
      isVisible: popupState === 'pitch',
      buttonRef: refs.pitch,
      // 🆕 Enhanced pitch support
      regions,
      activeRegionId,
      getCurrentPitchValues: getCurrentPitchValues,
      pitch // 🔧 Main pitch for backup/restore
    },
    equalizer: {
      onClose: () => closePopup('equalizer'),
      isVisible: popupState === 'equalizer',
      buttonRef: refs.equalizer,
      onEqualizerChange: onEqualizerChange // 🎚️ Pass equalizer callback
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
            disabled={!canInvertSelection}
            data-inverted={isInverted}
            className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors relative group"
            title={`Invert Selection: ${isInverted ? 'ON' : 'OFF'}`}>
            <Shuffle className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
          </button>          {/* 8. Fade In */}
          <button
            ref={refs.fadeIn}
            onClick={() => togglePopup('fadeIn')}
            disabled={!canEditRegion}
            className={`relative p-2 rounded-lg group ${
              currentFadeValues.fadeIn > 0
                ? 'bg-emerald-100 hover:bg-emerald-200 border border-emerald-300'
                : popupState === 'fadeIn'
                ? 'bg-slate-200 border border-slate-400'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}            title={`Fade In: ${currentFadeValues.fadeIn > 0 ? `${currentFadeValues.fadeIn.toFixed(1)}s` : 'Click to adjust'}`}>
            <TrendingUp className={`w-4 h-4 ${currentFadeValues.fadeIn > 0 ? 'text-emerald-700' : 'text-emerald-600'} group-hover:text-emerald-800`} />            {currentFadeValues.fadeIn > 0 && (
              <span className="absolute text-white text-[7px] rounded px-0.5 py-0 font-medium leading-tight min-w-[14px] text-center -top-0.5 -right-0.5 bg-emerald-500">
                {currentFadeValues.fadeIn.toFixed(1)}s
              </span>
            )}
          </button>

          {/* 9. Fade Out */}
          <button
            ref={refs.fadeOut}
            onClick={() => togglePopup('fadeOut')}
            disabled={!canEditRegion}
            className={`relative p-2 rounded-lg group ${
              currentFadeValues.fadeOut > 0
                ? 'bg-orange-100 hover:bg-orange-200 border border-orange-300'
                : popupState === 'fadeOut'
                ? 'bg-slate-200 border border-slate-400'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}            title={`Fade Out: ${currentFadeValues.fadeOut > 0 ? `${currentFadeValues.fadeOut.toFixed(1)}s` : 'Click to adjust'}`}>
            <TrendingDown className={`w-4 h-4 ${currentFadeValues.fadeOut > 0 ? 'text-orange-700' : 'text-orange-600'} group-hover:text-orange-800`} />            {currentFadeValues.fadeOut > 0 && (
              <span className="absolute text-white text-[7px] rounded px-0.5 py-0 font-medium leading-tight min-w-[14px] text-center -top-0.5 -right-0.5 bg-orange-500">
                {currentFadeValues.fadeOut.toFixed(1)}s
              </span>
            )}
          </button>          {/* 10. Volume */}
          <button
            ref={refs.volume}
            onClick={() => togglePopup('volume')}
            disabled={disabled}
            className={`relative p-2 rounded-lg group ${
              popupState === 'volume'
                ? 'bg-slate-200 border border-slate-400'
                : currentVolumeValue === 0
                ? 'bg-red-100 hover:bg-red-200 border border-red-300'
                : currentVolumeValue !== 1
                ? currentVolumeValue > 1
                  ? 'bg-orange-100 hover:bg-orange-200 border border-orange-300'
                  : 'bg-blue-100 hover:bg-blue-200 border border-blue-300'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}            title={`Volume: ${Math.round(currentVolumeValue * 100)}% - Click to adjust${currentVolumeValue > 1 ? ' (BOOST)' : ''}`}>            {currentVolumeValue === 0
              ? <VolumeX className={`w-4 h-4 text-red-600 group-hover:text-red-700`} />
              : <Volume2 className={`w-4 h-4 ${currentVolumeValue > 1 ? 'text-orange-600 group-hover:text-orange-700' : currentVolumeValue !== 1 ? 'text-blue-600 group-hover:text-blue-700' : 'text-blue-600 group-hover:text-blue-700'}`} />}{currentVolumeValue !== 0 && currentVolumeValue !== 1 && (
              <span className={`absolute text-white text-[7px] rounded px-0.5 py-0 font-medium leading-tight min-w-[14px] text-center -top-0.5 -right-0.5 ${currentVolumeValue > 1 ? 'bg-orange-500' : 'bg-blue-500'}`}>
                {Math.round(currentVolumeValue * 100)}%
              </span>
            )}
          </button>          {/* 11. Speed */}
          <button
            ref={refs.speed}
            onClick={() => togglePopup('speed')}
            disabled={disabled}
            className={`relative p-2 rounded-lg group ${
              popupState === 'speed'
                ? 'bg-slate-200 border border-slate-400'
                : currentSpeedValue !== 1
                ? 'bg-purple-100 hover:bg-purple-200 border border-purple-300'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={`Speed: ${currentSpeedValue.toFixed(1)}x - Click to adjust`}>            <Zap className={`w-4 h-4 text-purple-600 group-hover:text-purple-700`} />            {currentSpeedValue !== 1 && (
              <span className="absolute text-white text-[7px] rounded px-0.5 py-0 font-medium leading-tight min-w-[14px] text-center -top-0.5 -right-0.5 bg-purple-500">
                {currentSpeedValue.toFixed(1)}x
              </span>
            )}
          </button>          {/* 12. Pitch */}
          <button
            ref={refs.pitch}
            onClick={() => togglePopup('pitch')}
            disabled={disabled}
            className={`relative p-2 rounded-lg group ${
              popupState === 'pitch'
                ? 'bg-slate-200 border border-slate-400'
                : currentPitchValue !== 0
                ? 'bg-teal-100 hover:bg-teal-200 border border-teal-300'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={`Pitch: ${currentPitchValue > 0 ? '+' : ''}${currentPitchValue.toFixed(1)}st - Click to adjust`}>            <Music className={`w-4 h-4 text-teal-600 group-hover:text-teal-700`} />            {currentPitchValue !== 0 && (
              <span className="absolute text-white text-[7px] rounded px-0.5 py-0 font-medium leading-tight min-w-[14px] text-center -top-0.5 -right-0.5 bg-teal-500">
                {currentPitchValue > 0 ? '+' : ''}{currentPitchValue.toFixed(1)}
              </span>
            )}
          </button>{/* 13. Equalizer */}
          <button
            ref={refs.equalizer}
            onClick={() => togglePopup('equalizer')}
            disabled={disabled}
            className={`relative p-2 rounded-lg group ${
              popupState === 'equalizer'
                ? 'bg-slate-200 border border-slate-400'
                : isEqualizerActive
                ? 'bg-cyan-100 hover:bg-cyan-200 border border-cyan-300'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title="Equalizer - Click to adjust frequency bands">
            <Sliders className={`w-4 h-4 ${isEqualizerActive ? 'text-cyan-700' : 'text-cyan-600'} group-hover:text-cyan-700`} />
            {isEqualizerActive && <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full"></div>}
          </button>          {/* 🆕 14. Add Region */}
          <button
            onClick={onAddRegion}
            disabled={!canAddRegion}
            className={`relative p-2 rounded-lg group transition-all duration-200 ml-2 ${
              canAddRegion
                ? 'bg-gradient-to-r from-emerald-100 to-green-100 hover:from-emerald-200 hover:to-green-200 border border-emerald-300 hover:border-emerald-400 shadow-sm hover:shadow-md'
                : 'bg-slate-100 opacity-50 cursor-not-allowed border border-slate-300'
            }`}
            title={canAddRegion 
              ? "➕ ADD NEW REGION (Ctrl+N)" 
              : "Add New Region - Need >1s space outside current selection"
            }>            <Plus className={`w-4 h-4 ${canAddRegion ? 'text-emerald-700 group-hover:text-emerald-800' : 'text-slate-500'}`} />
            {regions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-semibold">
                {regions.length}
              </span>
            )}
          </button>

          {/* 🆕 15. Play All Items - Show when there are regions OR main selection */}
          {(regions.length > 0 || (duration > 0 && startTime < endTime)) && (
            <button
              onClick={onPlayAllRegions}
              disabled={disabled}
              className="relative p-2 rounded-lg group transition-all duration-200 bg-gradient-to-r from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 border border-purple-300 hover:border-purple-400 shadow-sm hover:shadow-md"              title={`🎵 PLAY ALL ITEMS (${regions.length} regions) - Play main selection + regions in sequence`}>              <PlayCircle className="w-4 h-4 text-purple-700 group-hover:text-purple-800" />
              {regions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-semibold">
                  {regions.length}
                </span>
              )}
            </button>
          )}

          {/* 🚧 SEPARATOR */}
          <div className="border-l border-slate-300 h-8 mx-1"></div>

          {/* 🆕 16. Delete Region */}
          <button
            onClick={onDeleteRegion}
            disabled={!canDeleteRegion}
            className={`relative p-2 rounded-lg group transition-all duration-200 ${
              canDeleteRegion
                ? 'bg-gradient-to-r from-red-100 to-rose-100 hover:from-red-200 hover:to-rose-200 border border-red-300 hover:border-red-400 shadow-sm hover:shadow-md'
                : 'bg-slate-100 opacity-50 cursor-not-allowed'
            }`}
            title={
              isMainRegionActive 
                ? "➖ CANNOT DELETE MAIN REGION (Main region is permanent and cannot be deleted)"
                : canDeleteRegion 
                ? `➖ DELETE ACTIVE REGION ONLY (${totalDeletableItems} items total)` 
                : '(Need 2+ items total and select a region to delete)'
            }>
            <Minus className={`w-4 h-4 ${canDeleteRegion ? 'text-red-700 group-hover:text-red-800' : 'text-slate-500'}`} />
            {canDeleteRegion && totalDeletableItems > 2 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            )}
          </button>

          {/* 🆕 17. Clear All Regions */}
          <button
            onClick={handleClearAllRegions}
            disabled={!canClearAllRegions}
            className={`relative p-2 rounded-lg group transition-all duration-200 ${
              canClearAllRegions
                ? 'bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border border-orange-300 hover:border-orange-400 shadow-sm hover:shadow-md'
                : 'bg-slate-100 opacity-50 cursor-not-allowed'
            }`}
            title={`🗑️ CLEAR ALL REGIONS ${canClearAllRegions ? `(DELETE ALL ${regions.length} regions)` : '(Need 2+ regions)'}`}>
            <Trash2 className={`w-4 h-4 ${canClearAllRegions ? 'text-orange-700 group-hover:text-orange-800' : 'text-slate-500'}`} />
            {canClearAllRegions && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-semibold">
                {regions.length}
              </span>
            )}
          </button>

          {/* 18. Time Selector */}
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
      </div>      {/* Popups */}
      <FadeSliderPopup {...popupProps.fadeIn} />
      <FadeSliderPopup {...popupProps.fadeOut} />
      <VolumeSliderPopup {...popupProps.volume} />
      <SpeedSliderPopup {...popupProps.speed} />
      <PitchSliderPopup {...popupProps.pitch} />
      <EqualizerPopup {...popupProps.equalizer} />
    </>
  );
});

UnifiedControlBar.displayName = 'UnifiedControlBar';
export default UnifiedControlBar;
