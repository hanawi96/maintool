import { useReducer, useCallback } from 'react';

// 🚀 State reducer for better state management
const appStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FADE':
      return { ...state, fadeIn: action.fadeIn ?? state.fadeIn, fadeOut: action.fadeOut ?? state.fadeOut };
    case 'SET_REGIONS':
      return { ...state, regions: action.regions };
    case 'SET_ACTIVE_REGION':
      return { ...state, activeRegionId: action.id };
    case 'SET_PLAY_ALL':
      return { ...state, isPlayAllMode: action.mode, playAllIndex: action.index };
    case 'SET_DRAGGING':
      return { ...state, draggingRegion: action.dragging };
    case 'SET_AUDIO_STATE':
      return { ...state, ...action.payload };
    case 'RESET_FILE':
      return { 
        ...state, 
        regions: [], 
        activeRegionId: null, 
        isPlayAllMode: false, 
        playAllIndex: 0,
        audioError: null,
        fileValidation: null
      };
    default:
      return state;
  }
};

// Initial state
const initialAppState = {
  fadeIn: 0,
  fadeOut: 0,
  regions: [],
  activeRegionId: null,
  isPlayAllMode: false,
  playAllIndex: 0,
  draggingRegion: null,
  audioError: null,
  fileValidation: null,
  currentEqualizerValues: Array(10).fill(0)
};

// Custom hook for app state management
export const useAppState = () => {
  const [appState, dispatch] = useReducer(appStateReducer, initialAppState);

  // 🚀 Optimized debounced setActiveRegionId
  const setActiveRegionIdDebounced = useCallback((newRegionId, source = 'unknown') => {
    if (source === 'addRegion' || source === 'regionClick') {
      // 🔧 IMMEDIATE: No delay for region clicks and new region additions
      dispatch({ type: 'SET_ACTIVE_REGION', id: newRegionId });
      return;
    }
    
    let activeRegionChangeRef = null;
    if (activeRegionChangeRef) {
      clearTimeout(activeRegionChangeRef);
    }
    
    activeRegionChangeRef = setTimeout(() => {
      dispatch({ type: 'SET_ACTIVE_REGION', id: newRegionId });
      activeRegionChangeRef = null;
    }, 1);
  }, []);

  return {
    appState,
    dispatch,
    setActiveRegionIdDebounced
  };
};

export { appStateReducer }; 