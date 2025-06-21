import { useState, useRef, useCallback, useEffect } from 'react';

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
  const volumeWatchdogRef = useRef(null);

  // Set master volume setter from Web Audio API
  const setMasterVolumeSetter = useCallback((setterFn) => {
    masterVolumeSetterRef.current = setterFn;
  }, []);

  // 🎯 Volume Watchdog: Ensures HTML5 audio volume NEVER changes from 1.0
  useEffect(() => {
    const enforceVolumeAt1 = () => {
      if (audioRef.current && audioRef.current.volume !== 1.0) {
        console.warn(`🚨 Volume drift detected! Fixing ${audioRef.current.volume} → 1.0`);
        audioRef.current.volume = 1.0;
      }
    };

    // Start watchdog
    volumeWatchdogRef.current = setInterval(enforceVolumeAt1, 500); // Check every 500ms

    return () => {
      if (volumeWatchdogRef.current) {
        clearInterval(volumeWatchdogRef.current);
        volumeWatchdogRef.current = null;
      }
    };
  }, []);

  // Phát/tạm dừng audio, sync với state
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 🎯 Ensure volume is 1.0 before any playback
    if (audio.volume !== 1.0) {
      audio.volume = 1.0;
      console.log('🔒 Volume enforced to 1.0 before playback');
    }

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
    
    const wasPlaying = !audio.paused; // Check if audio was playing before jump
    const newTime = Math.max(0, Math.min(duration, time));
    
    if (Math.abs(audio.currentTime - newTime) > 0.01) {
      audio.currentTime = newTime;
      
      // 🎯 CRITICAL: If audio was playing, ensure it continues playing after time change
      if (wasPlaying) {
        // Use setTimeout to ensure currentTime change is processed first
        setTimeout(() => {
          if (audio.paused) {
            audio.play().catch(() => {
              console.warn('🚨 Failed to resume playback after jump');
            });
          }
        }, 0);
      }
    }
    setCurrentTime(newTime);
  }, [duration]);

  // Cập nhật master volume (0-2.0 range for 200% boost)
  const updateVolume = useCallback((v) => {
    const clampedVolume = Math.max(0, Math.min(2.0, v));
    setVolume(clampedVolume);
    
    // 🎯 CRITICAL: Keep HTML audio element volume at 1.0 ALWAYS (NEVER change)
    // Web Audio API master gain handles the actual volume control for preview
    if (audioRef.current) {
      audioRef.current.volume = 1.0; // LOCKED at 1.0 for consistency
      console.log('🔒 Audio element volume enforced to 1.0');
    }
    
    // Use Web Audio API master gain for volume control (preview)
    if (masterVolumeSetterRef.current) {
      masterVolumeSetterRef.current(clampedVolume);
    }
    
    // 🎯 Log volume state for debugging
    console.log('🎚️ Volume Update from useAudioPlayer:', {
      requestedVolume: v,
      clampedVolume: clampedVolume,
      htmlAudioVolume: 1.0, // Always locked
      webAudioGain: clampedVolume,
      exportVolumeWillBe: clampedVolume,
      previewMatchesExport: true
    });
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
