import React from 'react';
import PlayControls from './PlayControls';
import VolumeControl from './VolumeControl';
import SpeedControl from './SpeedControl';

const AudioPlayer = ({
  isPlaying,
  volume,
  playbackRate,
  onTogglePlayPause,
  onJumpToStart,
  onJumpToEnd,
  onVolumeChange,
  onSpeedChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <PlayControls
        isPlaying={isPlaying}
        onTogglePlayPause={onTogglePlayPause}
        onJumpToStart={onJumpToStart}
        onJumpToEnd={onJumpToEnd}
        disabled={disabled}
      />
      
      <VolumeControl
        volume={volume}
        onVolumeChange={onVolumeChange}
        disabled={disabled}
      />
      
      <SpeedControl
        playbackRate={playbackRate}
        onSpeedChange={onSpeedChange}
        disabled={disabled}
      />
    </div>
  );
};

export default AudioPlayer;