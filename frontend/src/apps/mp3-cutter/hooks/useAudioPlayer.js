import { useState, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef(null);
  const lastLogTimeRef = useRef(0);

  // 🎯 Reduced logging frequencyygit s
  const logState = (action) => {
    const now = Date.now();
    if (now - lastLogTimeRef.current > 1000) { // Max 1 log per secondd
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
    console.log('🚀 [useAudioPlayer] IMMEDIATE Jump to:', clampedTime.toFixed(2));
    
    // 🔥 **IMMEDIATE SYNC**: Update audio và state ngay lập tức không delay
    audio.currentTime = clampedTime;
    
    // 🔥 **SYNCHRONOUS STATE UPDATE**: Update state ngay lập tức thay vì async
    setCurrentTime(clampedTime);
    
    // 🚀 **FORCE IMMEDIATE REDRAW**: Trigger redraw ngay lập tức cho visual feedback
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        // 🎯 **DOUBLE UPDATE**: Đảm bảo state được sync hoàn toàn
        if (audioRef.current && Math.abs(audioRef.current.currentTime - clampedTime) > 0.01) {
          audioRef.current.currentTime = clampedTime;
          setCurrentTime(clampedTime);
          console.log('🔄 [useAudioPlayer] Double-sync completed for smooth cursor');
        }
      });
    }
    
    console.log('✅ [useAudioPlayer] IMMEDIATE cursor sync completed:', clampedTime.toFixed(2));
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