import { useState, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef(null);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn('⚠️ [useAudioPlayer] No audio element');
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.currentTime = currentTime;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
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
        }
      });
    }
  }, [duration]);

  const updateVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const updatePlaybackRate = useCallback((newRate) => {
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