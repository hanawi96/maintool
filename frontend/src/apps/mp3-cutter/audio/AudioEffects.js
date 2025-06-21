import { useCallback, useRef, useEffect } from 'react';

// 🆕 Enhanced fade handlers for regions support
export const useEnhancedFadeHandlers = ({ 
  fadeIn, 
  fadeOut, 
  startTime, 
  endTime, 
  isInverted, 
  duration, 
  updateFadeConfig, 
  saveState, 
  dispatch,
  // 🆕 Region props
  regions = [],
  activeRegionId = null
}) => {
  // 🚀 Get current fade values based on active region
  const getCurrentFadeValues = useCallback(() => {
    if (!activeRegionId || activeRegionId === 'main') {
      return { fadeIn, fadeOut };
    }
    
    const activeRegion = regions.find(r => r.id === activeRegionId);
    return activeRegion ? { 
      fadeIn: activeRegion.fadeIn || 0, 
      fadeOut: activeRegion.fadeOut || 0 
    } : { fadeIn: 0, fadeOut: 0 };
  }, [activeRegionId, regions, fadeIn, fadeOut]);

  // 🚀 Apply fade to active region or globally
  const applyFade = useCallback((type, value, applyToAll = false) => {
    console.log(`🎛️ Applying ${type} fade: ${value}s, applyToAll: ${applyToAll}, activeRegion: ${activeRegionId}`);
    
    if (applyToAll && regions.length > 0) {
      // Apply to all regions + main selection
      console.log(`🌐 Applying ${type} fade to ALL ${regions.length} regions + main selection`);
      const updatedRegions = regions.map(region => ({
        ...region,
        [type === 'in' ? 'fadeIn' : 'fadeOut']: value
      }));
      
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
      
      // Also update main selection
      const newMainFadeIn = type === 'in' ? value : fadeIn;
      const newMainFadeOut = type === 'out' ? value : fadeOut;
      dispatch({ type: 'SET_FADE', fadeIn: newMainFadeIn, fadeOut: newMainFadeOut });
      updateFadeConfig({ fadeIn: newMainFadeIn, fadeOut: newMainFadeOut, startTime, endTime, isInverted, duration });
      
      console.log(`✅ Applied ${type} fade to all regions + main:`, { 
        regionsUpdated: updatedRegions.length, 
        mainFade: { fadeIn: newMainFadeIn, fadeOut: newMainFadeOut } 
      });
      
    } else if (!activeRegionId || activeRegionId === 'main') {
      // Apply to main selection only
      console.log(`🎯 Applying ${type} fade to MAIN selection only`);
      const newFadeIn = type === 'in' ? value : fadeIn;
      const newFadeOut = type === 'out' ? value : fadeOut;
      
      dispatch({ type: 'SET_FADE', fadeIn: newFadeIn, fadeOut: newFadeOut });
      updateFadeConfig({ fadeIn: newFadeIn, fadeOut: newFadeOut, startTime, endTime, isInverted, duration });
      
      console.log(`✅ Applied ${type} fade to main selection:`, { fadeIn: newFadeIn, fadeOut: newFadeOut });
      
    } else {
      // Apply to specific region only
      console.log(`🎯 Applying ${type} fade to REGION ${activeRegionId} only (no audio effect)`);
      const updatedRegions = regions.map(region => 
        region.id === activeRegionId 
          ? { ...region, [type === 'in' ? 'fadeIn' : 'fadeOut']: value }
          : region
      );
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
      
      const updatedRegion = updatedRegions.find(r => r.id === activeRegionId);
      console.log(`✅ Applied ${type} fade to region ${activeRegionId}:`, { 
        fadeIn: updatedRegion?.fadeIn || 0, 
        fadeOut: updatedRegion?.fadeOut || 0 
      });
    }
  }, [activeRegionId, regions, fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig, dispatch]);

  const handleFadeInChange = useCallback((value, applyToAll = false, operation = 'normal', data = null) => {
    if (operation === 'restore-main' && data) {
      // Restore main selection fade
      console.log(`🔄 Restoring main fade:`, data);
      dispatch({ type: 'SET_FADE', fadeIn: data.fadeIn, fadeOut: data.fadeOut });
      updateFadeConfig({ fadeIn: data.fadeIn, fadeOut: data.fadeOut, startTime, endTime, isInverted, duration });
    } else if (operation === 'restore-regions' && data) {
      // Restore individual region fades
      console.log(`🔄 Restoring region fades:`, data);
      const updatedRegions = regions.map(region => {
        const backupRegion = data.regions.find(r => r.id === region.id);
        if (backupRegion) {
          return { ...region, [data.fadeType]: backupRegion.value };
        }
        return region;
      });
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
    } else {
      // Normal fade operation
      applyFade('in', value, applyToAll);
    }
  }, [applyFade, dispatch, updateFadeConfig, startTime, endTime, isInverted, duration, regions]);
  
  const handleFadeOutChange = useCallback((value, applyToAll = false, operation = 'normal', data = null) => {
    if (operation === 'restore-main' && data) {
      // Restore main selection fade
      console.log(`🔄 Restoring main fade:`, data);
      dispatch({ type: 'SET_FADE', fadeIn: data.fadeIn, fadeOut: data.fadeOut });
      updateFadeConfig({ fadeIn: data.fadeIn, fadeOut: data.fadeOut, startTime, endTime, isInverted, duration });
    } else if (operation === 'restore-regions' && data) {
      // Restore individual region fades
      console.log(`🔄 Restoring region fades:`, data);
      const updatedRegions = regions.map(region => {
        const backupRegion = data.regions.find(r => r.id === region.id);
        if (backupRegion) {
          return { ...region, [data.fadeType]: backupRegion.value };
        }
        return region;
      });
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
    } else {
      // Normal fade operation
      applyFade('out', value, applyToAll);
    }
  }, [applyFade, dispatch, updateFadeConfig, startTime, endTime, isInverted, duration, regions]);
  
  const handleFadeInDragEnd = useCallback((finalFadeIn, applyToAll = false, operation = 'normal', data = null) => {
    if (operation === 'restore-main' || operation === 'restore-regions') {
      // Restore operations don't need dragEnd handling
      return;
    }
    applyFade('in', finalFadeIn, applyToAll);
    saveState({ startTime, endTime, fadeIn: applyToAll || !activeRegionId || activeRegionId === 'main' ? finalFadeIn : fadeIn, fadeOut, isInverted });
  }, [applyFade, startTime, endTime, fadeIn, fadeOut, isInverted, saveState, activeRegionId]);
  
  const handleFadeOutDragEnd = useCallback((finalFadeOut, applyToAll = false, operation = 'normal', data = null) => {
    if (operation === 'restore-main' || operation === 'restore-regions') {
      // Restore operations don't need dragEnd handling
      return;
    }
    applyFade('out', finalFadeOut, applyToAll);
    saveState({ startTime, endTime, fadeIn, fadeOut: applyToAll || !activeRegionId || activeRegionId === 'main' ? finalFadeOut : fadeOut, isInverted });
  }, [applyFade, startTime, endTime, fadeIn, fadeOut, isInverted, saveState, activeRegionId]);

  const handleFadeInToggle = useCallback((applyToAll = false) => { 
    const currentValues = getCurrentFadeValues();
    const v = currentValues.fadeIn > 0 ? 0 : 3.0; 
    handleFadeInChange(v, applyToAll);
    handleFadeInDragEnd(v, applyToAll);
  }, [getCurrentFadeValues, handleFadeInChange, handleFadeInDragEnd]);
  
  const handleFadeOutToggle = useCallback((applyToAll = false) => { 
    const currentValues = getCurrentFadeValues();
    const v = currentValues.fadeOut > 0 ? 0 : 3.0; 
    handleFadeOutChange(v, applyToAll);
    handleFadeOutDragEnd(v, applyToAll);
  }, [getCurrentFadeValues, handleFadeOutChange, handleFadeOutDragEnd]);

  const handlePresetApply = useCallback((newFadeIn, newFadeOut, applyToAll = false) => { 
    handleFadeInChange(newFadeIn, applyToAll);
    handleFadeOutChange(newFadeOut, applyToAll);
    saveState({ startTime, endTime, fadeIn: applyToAll || !activeRegionId || activeRegionId === 'main' ? newFadeIn : fadeIn, fadeOut: applyToAll || !activeRegionId || activeRegionId === 'main' ? newFadeOut : fadeOut, isInverted }); 
  }, [handleFadeInChange, handleFadeOutChange, startTime, endTime, fadeIn, fadeOut, isInverted, saveState, activeRegionId]);

  return {
    handleFadeInChange,
    handleFadeOutChange,
    handleFadeInDragEnd,
    handleFadeOutDragEnd,
    handleFadeInToggle,
    handleFadeOutToggle,
    handlePresetApply,
    getCurrentFadeValues
  };
};

// 🚀 Smart fade config sync
export const useSmartFadeConfigSync = ({ fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig }) => {
  const synced = useRef({});
  useEffect(() => {
    if (!synced.current || synced.current.startTime !== startTime || synced.current.endTime !== endTime) {
      updateFadeConfig({ fadeIn, fadeOut, startTime, endTime, isInverted, duration });
      synced.current = { startTime, endTime };
    }
  }, [startTime, endTime, fadeIn, fadeOut, updateFadeConfig, isInverted, duration]);
};

// Pitch change handler
export const usePitchHandler = (updatePitch, setPitchValue) => {
  // 🚀 Optimized pitch change handler
  const handlePitchChange = useCallback((newPitch) => {
    updatePitch(newPitch);
    
    if (setPitchValue(newPitch)) {
      console.log(`✅ Main: Pitch updated to ${newPitch}st (zero interruption)`);
    } else {
      console.log('🎵 Main: Pitch will be applied when audio connects');
    }
  }, [updatePitch, setPitchValue]);

  return { handlePitchChange };
};

// Equalizer handlers
export const useEqualizerHandlers = ({
  isEqualizerConnected,
  updateEqualizerBand,
  updateEqualizerValues,
  resetEqualizer,
  currentEqualizerValues,
  getEqualizerState,
  dispatch
}) => {
  // 🚀 Optimized equalizer change handler
  const handleEqualizerChange = useCallback((type, data) => {
    if (!isEqualizerConnected) return;

    switch (type) {
      case 'band':
        const { index, value } = data;
        updateEqualizerBand(index, value);
        dispatch({
          type: 'SET_AUDIO_STATE',
          payload: {
            currentEqualizerValues: currentEqualizerValues.map((v, i) => i === index ? value : v)
          }
        });
        break;
      
      case 'preset':
        updateEqualizerValues(data.values);
        dispatch({
          type: 'SET_AUDIO_STATE',
          payload: { currentEqualizerValues: [...data.values] }
        });
        break;
      
      case 'reset':
        resetEqualizer();
        dispatch({
          type: 'SET_AUDIO_STATE',
          payload: { currentEqualizerValues: Array(10).fill(0) }
        });
        break;
      
      default:
        console.warn('🎵 Unknown equalizer action type:', type);
        break;
    }
  }, [isEqualizerConnected, updateEqualizerBand, updateEqualizerValues, resetEqualizer, currentEqualizerValues, dispatch]);

  // 🚀 Optimized getCurrentEqualizerState
  const getCurrentEqualizerState = useCallback(() => {
    if (currentEqualizerValues.some(v => v !== 0)) {
      return currentEqualizerValues;
    }
    
    if (!isEqualizerConnected || !getEqualizerState) return null;
    
    const eqState = getEqualizerState();
    return eqState?.bands ? eqState.bands.map(band => band.gain) : null;
  }, [currentEqualizerValues, isEqualizerConnected, getEqualizerState]);

  return {
    handleEqualizerChange,
    getCurrentEqualizerState
  };
};

// Audio effects connection manager
export const useAudioEffectsConnection = ({
  audioRef,
  audioFile,
  isWebAudioSupported,
  connectAudioElement,
  disconnectAudioElement,
  setMasterVolumeSetter,
  setMasterVolume,
  volume,
  setFadeActive,
  isPlaying,
  fadeAudioContext,
  audioConnected,
  isEqualizerConnected,
  pitchValue,
  setPitchValue
}) => {
  // Web Audio connection
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url || !isWebAudioSupported) return;
    
    const t = setTimeout(() => {
      connectAudioElement(audio).then((connected) => {
        if (setMasterVolumeSetter && setMasterVolume) {
          setMasterVolumeSetter(setMasterVolume);
          setMasterVolume(volume);
        }
      });
    }, 100);
    return () => clearTimeout(t);
  }, [audioFile?.url, audioRef, connectAudioElement, isWebAudioSupported, setMasterVolumeSetter, setMasterVolume, volume]);

  // Apply pending pitch when audio connection is established
  useEffect(() => {
    const canApplyPitch = fadeAudioContext && (audioConnected || isEqualizerConnected);
    if (canApplyPitch && pitchValue !== 0) {
      setPitchValue(pitchValue);
    }
  }, [fadeAudioContext, audioConnected, isEqualizerConnected, pitchValue, setPitchValue]);

  // Set fade active
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isWebAudioSupported) return;
    setFadeActive(isPlaying, audio);
  }, [isPlaying, audioRef, setFadeActive, isWebAudioSupported]);

  // Audio file change effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url) {
      if (audioConnected) {
        disconnectAudioElement();
      }
      return;
    }
  }, [audioFile?.url, audioFile?.name, audioRef, audioConnected, disconnectAudioElement]);
};

// 🔄 Legacy fade handlers for backward compatibility
export const useFadeHandlers = ({ 
  fadeIn, 
  fadeOut, 
  startTime, 
  endTime, 
  isInverted, 
  duration, 
  updateFadeConfig, 
  saveState, 
  dispatch 
}) => {
  // 🚀 Optimized fade handlers
  const updateFade = useCallback((type, value) => {
    const newFadeIn = type === 'in' ? value : fadeIn;
    const newFadeOut = type === 'out' ? value : fadeOut;
    
    dispatch({ type: 'SET_FADE', fadeIn: newFadeIn, fadeOut: newFadeOut });
    updateFadeConfig({ fadeIn: newFadeIn, fadeOut: newFadeOut, startTime, endTime, isInverted, duration });
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig, dispatch]);

  const handleFadeInChange = useCallback(newFadeIn => updateFade('in', newFadeIn), [updateFade]);
  const handleFadeOutChange = useCallback(newFadeOut => updateFade('out', newFadeOut), [updateFade]);
  
  const handleFadeInDragEnd = useCallback(finalFadeIn => {
    saveState({ startTime, endTime, fadeIn: finalFadeIn, fadeOut, isInverted });
  }, [startTime, endTime, fadeOut, saveState, isInverted]);
  
  const handleFadeOutDragEnd = useCallback(finalFadeOut => {
    saveState({ startTime, endTime, fadeIn, fadeOut: finalFadeOut, isInverted });
  }, [startTime, endTime, fadeIn, saveState, isInverted]);

  const handleFadeInToggle = useCallback(() => { 
    const v = fadeIn > 0 ? 0 : 3.0; 
    updateFade('in', v); 
    saveState({ startTime, endTime, fadeIn: v, fadeOut, isInverted }); 
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);
  
  const handleFadeOutToggle = useCallback(() => { 
    const v = fadeOut > 0 ? 0 : 3.0; 
    updateFade('out', v); 
    saveState({ startTime, endTime, fadeIn, fadeOut: v, isInverted }); 
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);

  const handlePresetApply = useCallback((newFadeIn, newFadeOut) => { 
    dispatch({ type: 'SET_FADE', fadeIn: newFadeIn, fadeOut: newFadeOut });
    updateFadeConfig({ fadeIn: newFadeIn, fadeOut: newFadeOut, startTime, endTime, isInverted, duration }); 
    saveState({ startTime, endTime, fadeIn: newFadeIn, fadeOut: newFadeOut, isInverted }); 
  }, [startTime, endTime, updateFadeConfig, saveState, isInverted, duration, dispatch]);

  return {
    handleFadeInChange,
    handleFadeOutChange,
    handleFadeInDragEnd,
    handleFadeOutDragEnd,
    handleFadeInToggle,
    handleFadeOutToggle,
    handlePresetApply
  };
};

// 🆕 Enhanced volume handlers for regions support
export const useEnhancedVolumeHandlers = ({ 
  volume, 
  updateVolume,
  // 🆕 Region props
  regions = [],
  activeRegionId = null,
  dispatch
}) => {
  // 🚀 Get current volume values based on active region
  const getCurrentVolumeValues = useCallback(() => {
    const result = !activeRegionId || activeRegionId === 'main' 
      ? { volume } 
      : (() => {
          const activeRegion = regions.find(r => r.id === activeRegionId);
          return activeRegion ? { 
            volume: activeRegion.volume !== undefined ? activeRegion.volume : 1.0
          } : { volume: 1.0 };
        })();
    
    return result;
  }, [activeRegionId, regions, volume]);

  // 🚀 Apply volume to active region or globally
  const applyVolume = useCallback((value, applyToAll = false) => {
    console.log(`🔊 Applying volume: ${value}, applyToAll: ${applyToAll}, activeRegion: ${activeRegionId}`);
    
    if (applyToAll && regions.length > 0) {
      // Apply to all regions + main selection
      console.log(`🌐 Applying volume to ALL ${regions.length} regions + main selection`);
      const updatedRegions = regions.map(region => ({
        ...region,
        volume: value
      }));
      
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
      
      // 🔧 CRITICAL FIX: Use updateVolume for main selection
      updateVolume(value);
      
      console.log(`✅ Applied volume to all regions + main:`, { 
        regionsUpdated: updatedRegions.length, 
        mainVolume: value 
      });
      
    } else if (!activeRegionId || activeRegionId === 'main') {
      // Apply to main selection only
      console.log(`🎯 Applying volume to MAIN selection only`);
      // 🔧 CRITICAL FIX: Use updateVolume instead of dispatch
      updateVolume(value);
      
      console.log(`✅ Applied volume to main selection:`, { volume: value });
      
    } else {
      // Apply to specific region only
      console.log(`🎯 Applying volume to REGION ${activeRegionId} only`);
      const updatedRegions = regions.map(region => 
        region.id === activeRegionId 
          ? { ...region, volume: value }
          : region
      );
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
      
      const updatedRegion = updatedRegions.find(r => r.id === activeRegionId);
      console.log(`✅ Applied volume to region ${activeRegionId}:`, { 
        volume: updatedRegion?.volume || 1.0
      });
    }
  }, [activeRegionId, regions, updateVolume, dispatch]);

  const handleVolumeChange = useCallback((value, applyToAll = false, operation = 'normal', data = null) => {
    if (operation === 'restore-main' && data) {
      // Restore main selection volume
      console.log(`🔄 Restoring main volume:`, data);
      // 🔧 CRITICAL FIX: Use updateVolume instead of dispatch
      updateVolume(data.volume);
    } else if (operation === 'restore-regions' && data) {
      // Restore individual region volumes
      console.log(`🔄 Restoring region volumes:`, data);
      const updatedRegions = regions.map(region => {
        const backupRegion = data.regions.find(r => r.id === region.id);
        if (backupRegion) {
          return { ...region, volume: backupRegion.value };
        }
        return region;
      });
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
    } else {
      // Normal volume operation
      applyVolume(value, applyToAll);
    }
  }, [applyVolume, updateVolume, dispatch, regions]);

  return {
    handleVolumeChange,
    getCurrentVolumeValues
  };
};

// 🆕 Enhanced speed handlers for regions support
export const useEnhancedSpeedHandlers = ({ 
  playbackRate, 
  updatePlaybackRate,
  // 🆕 Region props
  regions = [],
  activeRegionId = null,
  dispatch // 🔧 Cần dispatch cho regions
}) => {
  // 🚀 Get current speed values based on active region
  const getCurrentSpeedValues = useCallback(() => {
    if (!activeRegionId || activeRegionId === 'main') {
      // 🔧 CRITICAL: Validate main playbackRate
      if (typeof playbackRate !== 'number' || !isFinite(playbackRate) || isNaN(playbackRate)) {
        console.error('🚨 INVALID main playbackRate in getCurrentSpeedValues:', {
          value: playbackRate,
          type: typeof playbackRate,
          activeRegionId
        });
        return { playbackRate: 1.0 }; // Safe fallback
      }
      return { playbackRate: Math.max(0.25, Math.min(4.0, playbackRate)) };
    }
    
    const activeRegion = regions.find(r => r.id === activeRegionId);
    if (activeRegion) {
      const regionSpeed = activeRegion.playbackRate;
      
      // 🔧 CRITICAL: Validate region playbackRate
      if (regionSpeed !== undefined) {
        if (typeof regionSpeed !== 'number' || !isFinite(regionSpeed) || isNaN(regionSpeed)) {
          console.error('🚨 INVALID region playbackRate in getCurrentSpeedValues:', {
            regionId: activeRegionId,
            value: regionSpeed,
            type: typeof regionSpeed
          });
          return { playbackRate: 1.0 }; // Safe fallback
        }
        return { playbackRate: Math.max(0.25, Math.min(4.0, regionSpeed)) };
      }
    }
    
    return { playbackRate: 1.0 }; // Safe default
  }, [activeRegionId, regions, playbackRate]);

  // 🚀 Apply speed to active region or globally
  const applySpeed = useCallback((value, applyToAll = false) => {
    // 🔧 CRITICAL: Validate speed value to prevent non-finite errors
    if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
      console.error('🚨 INVALID speed value detected in applySpeed:', {
        value,
        type: typeof value,
        isFinite: isFinite(value),
        isNaN: isNaN(value),
        applyToAll,
        activeRegionId,
        stackTrace: new Error().stack
      });
      // Fallback to safe default
      value = 1.0;
    }
    
    // Clamp to safe range
    const clampedValue = Math.max(0.25, Math.min(4.0, value));
    
    if (Math.abs(clampedValue - value) > 0.001) {
      console.warn('🔧 Speed value clamped in applySpeed:', { original: value, clamped: clampedValue });
    }
    
    if (applyToAll && regions.length > 0) {
      // Apply to all regions + main selection
      const updatedRegions = regions.map(region => ({
        ...region,
        playbackRate: clampedValue
      }));
      
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
      
      // 🔧 CRITICAL FIX: Use updatePlaybackRate for main selection
      updatePlaybackRate(clampedValue);
      
    } else if (!activeRegionId || activeRegionId === 'main') {
      // Apply to main selection only
      updatePlaybackRate(clampedValue);
      
    } else {
      // Apply to specific region only
      const updatedRegions = regions.map(region => 
        region.id === activeRegionId 
          ? { ...region, playbackRate: clampedValue }
          : region
      );
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
    }
  }, [activeRegionId, regions, updatePlaybackRate, dispatch]);

  const handleSpeedChange = useCallback((value, applyToAll = false, operation = 'normal', data = null) => {
    if (operation === 'restore-main' && data) {
      // Restore main selection speed
      const restoreValue = data.playbackRate;
      
      // 🔧 CRITICAL: Validate restore value
      if (typeof restoreValue !== 'number' || !isFinite(restoreValue) || isNaN(restoreValue)) {
        console.error('🚨 INVALID restore speed value:', {
          value: restoreValue,
          data,
          stackTrace: new Error().stack
        });
        updatePlaybackRate(1.0); // Safe fallback
      } else {
        updatePlaybackRate(Math.max(0.25, Math.min(4.0, restoreValue)));
      }
    } else if (operation === 'restore-regions' && data) {
      // Restore individual region speeds
      const updatedRegions = regions.map(region => {
        const backupRegion = data.regions.find(r => r.id === region.id);
        if (backupRegion) {
          let restoreValue = backupRegion.value;
          
          // 🔧 CRITICAL: Validate restore value
          if (typeof restoreValue !== 'number' || !isFinite(restoreValue) || isNaN(restoreValue)) {
            console.error('🚨 INVALID restore region speed value:', {
              regionId: region.id,
              value: restoreValue,
              backupRegion,
              stackTrace: new Error().stack
            });
            restoreValue = 1.0; // Safe fallback
          } else {
            restoreValue = Math.max(0.25, Math.min(4.0, restoreValue));
          }
          
          return { ...region, playbackRate: restoreValue };
        }
        return region;
      });
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
    } else {
      // Normal speed operation
      applySpeed(value, applyToAll);
    }
  }, [applySpeed, updatePlaybackRate, dispatch, regions]);

  return {
    getCurrentSpeedValues,
    handleSpeedChange
  };
};

// 🆕 Enhanced pitch handlers for regions support
export const useEnhancedPitchHandlers = ({ 
  pitch, 
  updatePitch,
  setPitchValue,
  // 🆕 Region props
  regions = [],
  activeRegionId = null,
  dispatch
}) => {
  // 🚀 Get current pitch values based on active region
  const getCurrentPitchValues = useCallback(() => {
    if (!activeRegionId || activeRegionId === 'main') {
      // 🔧 CRITICAL: Validate main pitch
      if (typeof pitch !== 'number' || !isFinite(pitch) || isNaN(pitch)) {
        console.error('🚨 INVALID main pitch in getCurrentPitchValues:', {
          value: pitch,
          type: typeof pitch,
          activeRegionId
        });
        return { pitch: 0.0 }; // Safe fallback
      }
      return { pitch: Math.max(-12, Math.min(12, pitch)) };
    }
    
    const activeRegion = regions.find(r => r.id === activeRegionId);
    if (activeRegion) {
      const regionPitch = activeRegion.pitch;
      
      // 🔧 CRITICAL: Validate region pitch
      if (regionPitch !== undefined) {
        if (typeof regionPitch !== 'number' || !isFinite(regionPitch) || isNaN(regionPitch)) {
          console.error('🚨 INVALID region pitch in getCurrentPitchValues:', {
            regionId: activeRegionId,
            value: regionPitch,
            type: typeof regionPitch
          });
          return { pitch: 0.0 }; // Safe fallback
        }
        return { pitch: Math.max(-12, Math.min(12, regionPitch)) };
      }
    }
    
    // Fallback to main pitch if region not found or no pitch set
    return { pitch: typeof pitch === 'number' && isFinite(pitch) && !isNaN(pitch) ? Math.max(-12, Math.min(12, pitch)) : 0.0 };
  }, [activeRegionId, regions, pitch]);

  // 🚀 Apply pitch to active region or globally
  const applyPitch = useCallback((value, applyToAll = false) => {
    // 🔧 CRITICAL: Validate pitch value to prevent non-finite errors
    if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
      console.error('🚨 INVALID pitch value detected in applyPitch:', {
        value,
        type: typeof value,
        isFinite: isFinite(value),
        isNaN: isNaN(value),
        applyToAll,
        activeRegionId,
        stackTrace: new Error().stack
      });
      // Fallback to safe default
      value = 0.0;
    }
    
    // Clamp to safe range
    const clampedValue = Math.max(-12, Math.min(12, value));
    
    if (Math.abs(clampedValue - value) > 0.001) {
      console.warn('🔧 Pitch value clamped in applyPitch:', { original: value, clamped: clampedValue });
    }
    
    if (applyToAll && regions.length > 0) {
      // Apply to all regions + main selection
      const updatedRegions = regions.map(region => ({
        ...region,
        pitch: clampedValue
      }));
      
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
      
      // 🔧 CRITICAL FIX: Use updatePitch for main selection
      updatePitch(clampedValue);
      
    } else if (!activeRegionId || activeRegionId === 'main') {
      // Apply to main selection only
      updatePitch(clampedValue);
      
    } else {
      // Apply to specific region only
      const updatedRegions = regions.map(region => 
        region.id === activeRegionId 
          ? { ...region, pitch: clampedValue }
          : region
      );
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
    }
  }, [activeRegionId, regions, updatePitch, dispatch]);

  const handlePitchChange = useCallback((value, applyToAll = false, operation = 'normal', data = null) => {
    if (operation === 'restore-main' && data) {
      // Restore main selection pitch
      const restoreValue = data.pitch;
      
      // 🔧 CRITICAL: Validate restore value
      if (typeof restoreValue !== 'number' || !isFinite(restoreValue) || isNaN(restoreValue)) {
        console.error('🚨 INVALID restore pitch value:', {
          value: restoreValue,
          data,
          stackTrace: new Error().stack
        });
        updatePitch(0.0); // Safe fallback
      } else {
        updatePitch(Math.max(-12, Math.min(12, restoreValue)));
      }
    } else if (operation === 'restore-regions' && data) {
      // Restore individual region pitches
      const updatedRegions = regions.map(region => {
        const backupRegion = data.regions.find(r => r.id === region.id);
        if (backupRegion) {
          let restoreValue = backupRegion.value;
          
          // 🔧 CRITICAL: Validate restore value
          if (typeof restoreValue !== 'number' || !isFinite(restoreValue) || isNaN(restoreValue)) {
            console.error('🚨 INVALID restore region pitch value:', {
              regionId: region.id,
              value: restoreValue,
              backupRegion,
              stackTrace: new Error().stack
            });
            restoreValue = 0.0; // Safe fallback
          } else {
            restoreValue = Math.max(-12, Math.min(12, restoreValue));
          }
          
          return { ...region, pitch: restoreValue };
        }
        return region;
      });
      dispatch({ type: 'SET_REGIONS', regions: updatedRegions });
    } else {
      // Normal pitch operation
      applyPitch(value, applyToAll);
    }
  }, [applyPitch, updatePitch, dispatch, regions]);

  return {
    getCurrentPitchValues,
    handlePitchChange
  };
}; 