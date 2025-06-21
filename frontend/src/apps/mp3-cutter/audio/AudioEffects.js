import { useCallback, useRef, useEffect } from 'react';

// Fade effect handlers
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