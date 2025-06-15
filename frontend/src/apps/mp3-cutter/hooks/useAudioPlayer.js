import { useState, useRef, useCallback } from 'react';

/**
 * Audio Player Hook - Siêu nhẹ, sync tối ưu, không đổi logic
 */
export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef(null);

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

  // Cập nhật volume
  const updateVolume = useCallback((v) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
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
  };
};
