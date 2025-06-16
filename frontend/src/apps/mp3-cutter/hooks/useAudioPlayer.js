import { useState, useRef, useCallback } from 'react';

/**
 * Audio Player Hook - Enhanced with master volume support (0-2.0 range)
 */
export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1); // Master volume 0-2.0 (200% boost)
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef(null);
  const masterVolumeSetterRef = useRef(null); // Will be set from useRealTimeFadeEffects

  // Set master volume setter from Web Audio API
  const setMasterVolumeSetter = useCallback((setterFn) => {
    masterVolumeSetterRef.current = setterFn;
  }, []);

  // Phát/tạm dừng audio, sync với state
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Chỉ set lại currentTime nếu lệch quá nhiều
      if (Math.abs(audio.currentTime - currentTime) > 0.01) {
        audio.currentTime = currentTime;
      }
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [isPlaying, currentTime]);

  // Nhảy đến vị trí bất kỳ, clamp theo duration
  const jumpToTime = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(duration, time));
    if (Math.abs(audio.currentTime - newTime) > 0.01) {
      audio.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [duration]);

  // Cập nhật master volume (0-2.0 range for 200% boost)
  const updateVolume = useCallback((v) => {
    const clampedVolume = Math.max(0, Math.min(2.0, v));
    setVolume(clampedVolume);
    
    // Keep HTML audio element volume at 1.0, let Web Audio API handle the gain
    if (audioRef.current) {
      audioRef.current.volume = 1.0;
    }
    
    // Use Web Audio API master gain for volume control
    if (masterVolumeSetterRef.current) {
      masterVolumeSetterRef.current(clampedVolume);
    }
  }, []);

  // Cập nhật tốc độ phát
  const updatePlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  // Chỉ expose những gì thực sự cần thiết
  return {
    isPlaying, currentTime, duration, volume, playbackRate,
    togglePlayPause, jumpToTime, updateVolume, updatePlaybackRate,
    audioRef, setCurrentTime, setDuration, setIsPlaying,
    setMasterVolumeSetter, // New: for Web Audio integration
  };
};
