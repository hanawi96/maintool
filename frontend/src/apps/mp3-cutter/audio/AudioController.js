import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  validateAudioFile, getAudioErrorMessage, getFormatDisplayName, 
  generateCompatibilityReport, createSafeAudioURL, validateAudioURL 
} from '../utils/audioUtils';
import { getAutoReturnSetting } from '../utils/safeStorage';

// 🚀 Optimized SafeAudioElement with better memoization
export const SafeAudioElement = React.memo(({
  audioRef, audioFile, onError, onLoadStart, onCanPlay, onLoadedMetadata
}) => {
  const urlValidation = useMemo(() => {
    if (!audioFile?.url) return { valid: false };
    return validateAudioURL(audioFile.url);
  }, [audioFile?.url]);
  
  if (!urlValidation.valid) return null;
  
  return (
    <audio 
      ref={audioRef} 
      preload="metadata"
      src={audioFile.url}
      style={{ display: 'none' }}
      onError={onError}
      onLoadStart={onLoadStart}
      onCanPlay={onCanPlay}
      onLoadedMetadata={onLoadedMetadata}
    />
  );
});
SafeAudioElement.displayName = 'SafeAudioElement';

// 🚀 Optimized shouldPauseAtEndTime with memoization
export const shouldPauseAtEndTime = (() => {
  let cachedResult = null;
  let cachedParams = null;
  
  return (currentTime, endTime, duration, canvasRef) => {
    const paramsKey = `${currentTime}-${endTime}-${duration}`;
    if (cachedParams === paramsKey) return cachedResult;
    
    const canvas = canvasRef?.current;
    if (!canvas || !duration || duration <= 0) {
      cachedResult = currentTime >= endTime;
    } else {
      const canvasWidth = canvas.width || 640;
      const handleW = canvasWidth < 640 ? 6 : 8;
      const availW = canvasWidth - 2 * handleW;
      const tpp = duration / availW;
      const offset = 0.5 * tpp;
      const threshold = Math.max(endTime - offset - tpp * 0.25, endTime - 0.001);
      cachedResult = currentTime >= threshold;
    }
    
    cachedParams = paramsKey;
    return cachedResult;
  };
})();

// Audio event handlers hook
export const useAudioEventHandlers = ({ 
  audioRef, 
  audioFile, 
  setDuration, 
  setEndTime, 
  setCurrentTime, 
  setIsPlaying, 
  jumpToTime, 
  startTime, 
  isInverted, 
  fileValidation,
  handleError 
}) => {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url) return;
    
    const onLoadedMetadata = () => {
      const d = audio.duration;
      
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => { setDuration(d); setEndTime(d); });
      } else {
        setTimeout(() => { setDuration(d); setEndTime(d); }, 0);
      }
    };
    
    const onEnded = () => {
      const autoReturn = getAutoReturnSetting();
      if (isInverted) {
        if (autoReturn) {
          jumpToTime(0);
          audio.play?.();
        } else {
          setIsPlaying(false);
          setCurrentTime(audio.duration);
        }
      } else {
        if (autoReturn) {
          jumpToTime(startTime);
          audio.play?.();
        } else {
          setIsPlaying(false);
          jumpToTime(startTime);
        }
      }
    };
    
    const onPlay = () => setTimeout(() => setIsPlaying(true), 16);
    const onPause = () => setTimeout(() => setIsPlaying(false), 16);

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', handleError);
    };
  }, [audioFile?.name, audioFile?.url, audioRef, setCurrentTime, setDuration, setIsPlaying, setEndTime, fileValidation, jumpToTime, startTime, isInverted, handleError]);
};

// Audio context hook
export const useAudioContext = ({ audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig }) => {
  return useMemo(() => ({
    audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig
  }), [audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig]);
};

// Active playback boundaries hook
export const useActivePlaybackBoundaries = (activeRegionId, regions, startTime, endTime) => {
  return useCallback(() => {
    if (activeRegionId && regions.length > 0 && activeRegionId !== 'main') {
      const activeRegion = regions.find(r => r.id === activeRegionId);
      if (activeRegion) {
        return {
          start: activeRegion.start,
          end: activeRegion.end,
          isRegion: true,
          regionName: activeRegion.name
        };
      }
    }
    
    return {
      start: startTime,
      end: endTime,
      isRegion: false,
      regionName: 'Main Selection'
    };
  }, [activeRegionId, regions, startTime, endTime]);
};

// Audio error handler
export const useAudioErrorHandler = (audioFile, fileValidation, setIsPlaying, dispatch) => {
  return useCallback((e) => {
    const error = e.target.error;
    const filename = audioFile?.name || 'audio file';
    const details = getAudioErrorMessage(error, filename);
    
    console.error('🔥 Audio error:', { error, filename, details });
    
    dispatch({
      type: 'SET_AUDIO_STATE',
      payload: {
        audioError: {
          type: 'playback',
          title: details.title,
          message: details.message,
          suggestion: details.suggestion,
          code: details.code,
          filename: details.filename,
          supportedFormats: details.supportedFormats,
          compatibilityInfo: fileValidation?.info?.browserSupport,
          detectedFormat: fileValidation?.info?.detectedMimeType ? 
            getFormatDisplayName(fileValidation.info.detectedMimeType) : 'Unknown'
        }
      }
    });
    
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => setIsPlaying(false));
    } else {
      setTimeout(() => setIsPlaying(false), 0);
    }
  }, [audioFile?.name, fileValidation, setIsPlaying, dispatch]);
};

// Enhanced toggle play pause
export const useEnhancedPlayPause = ({
  isPlaying,
  isPlayAllMode,
  currentTime,
  getActivePlaybackBoundaries,
  jumpToTime,
  originalTogglePlayPause,
  dispatch
}) => {
  return useCallback(() => {
    if (!isPlaying) {
      const playbackBounds = getActivePlaybackBoundaries();
      const { start: playStart, end: playEnd } = playbackBounds;
      
      if (currentTime < playStart || currentTime >= playEnd) {
        jumpToTime(playStart);
      }
    } else {
      if (isPlayAllMode) {
        dispatch({ type: 'SET_PLAY_ALL', mode: false, index: 0 });
      }
    }
    
    originalTogglePlayPause();
  }, [isPlaying, currentTime, getActivePlaybackBoundaries, jumpToTime, originalTogglePlayPause, isPlayAllMode, dispatch]);
};

// Jump handlers
export const useJumpHandlers = (getActivePlaybackBoundaries, jumpToTime) => {
  const handleJumpToStart = useCallback(() => {
    const playbackBounds = getActivePlaybackBoundaries();
    jumpToTime(playbackBounds.start);
  }, [jumpToTime, getActivePlaybackBoundaries]);
  
  const handleJumpToEnd = useCallback(() => {
    const playbackBounds = getActivePlaybackBoundaries();
    jumpToTime(playbackBounds.end);
  }, [jumpToTime, getActivePlaybackBoundaries]);

  return { handleJumpToStart, handleJumpToEnd };
}; 