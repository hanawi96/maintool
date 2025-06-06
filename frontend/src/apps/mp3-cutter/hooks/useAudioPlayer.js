import { useState, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef(null);
  const lastLogTimeRef = useRef(0);

  // 🎯 Reduced logging frequency
  const logState = (action) => {
    const now = Date.now();
    if (now - lastLogTimeRef.current > 1000) { // Max 1 log per second
      console.log(`🎵 [useAudioPlayer] ${action} - Playing:`, isPlaying, 'Time:', currentTime.toFixed(2));
      lastLogTimeRef.current = now;
    }
  };

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn('⚠️ [useAudioPlayer] No audio element');
      return;
    }

    if (isPlaying) {
      console.log('⏸️ [useAudioPlayer] Pausing');
      audio.pause();
      setIsPlaying(false);
    } else {
      console.log('▶️ [useAudioPlayer] Playing from:', currentTime.toFixed(2));
      audio.currentTime = currentTime;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ [useAudioPlayer] Playback started');
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('❌ [useAudioPlayer] Play failed:', error);
            setIsPlaying(false);
          });
      }
    }
  }, [isPlaying, currentTime]);

  const jumpToTime = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn('⚠️ [useAudioPlayer] No audio for jump');
      return;
    }
    
    const clampedTime = Math.max(0, Math.min(duration, time));
    console.log('🎯 [useAudioPlayer] Jump to:', clampedTime.toFixed(2));
    
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [duration]);

  const updateVolume = useCallback((newVolume) => {
    console.log('🔊 [useAudioPlayer] Volume:', newVolume);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const updatePlaybackRate = useCallback((newRate) => {
    console.log('⚡ [useAudioPlayer] Rate:', newRate);
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  }, []);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    
    // Actions
    togglePlayPause,
    jumpToTime,
    updateVolume,
    updatePlaybackRate,
    
    // Internal
    audioRef,
    setCurrentTime,
    setDuration,
    setIsPlaying
  };
};