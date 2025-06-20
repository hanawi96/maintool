import React from 'react';
import { Scissors } from 'lucide-react';
import CutDownload from './CutDownload';

const Export = ({ 
  outputFormat, 
  onFormatChange, 
  audioFile, 
  startTime, 
  endTime, 
  fadeIn, 
  fadeOut,
  playbackRate = 1,
  pitch = 0,
  volume = 1, // 🎯 Add volume prop
  equalizer = null, // 🎚️ Add equalizer prop
  isInverted = false,
  normalizeVolume = false,
  onNormalizeVolumeChange,
  disabled = false,
  // 🆕 Region props for total duration calculation
  regions = [],
  activeRegionId = null
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 text-slate-800 flex items-center gap-2">
        <Scissors className="w-4 h-4" />
        Export Audio
      </h3>
        <div className="space-y-3">        <CutDownload
          audioFile={audioFile}
          startTime={startTime}
          endTime={endTime}
          outputFormat={outputFormat}
          fadeIn={fadeIn}
          fadeOut={fadeOut}
          playbackRate={playbackRate}
          pitch={pitch}
          volume={volume} // 🎯 Pass volume prop
          equalizer={equalizer} // 🎚️ Pass equalizer prop
          isInverted={isInverted}
          normalizeVolume={normalizeVolume}
          onNormalizeVolumeChange={onNormalizeVolumeChange}
          onFormatChange={onFormatChange}
          disabled={disabled}
          // 🆕 Region props for total duration calculation
          regions={regions}
          activeRegionId={activeRegionId}
        />
      </div>
    </div>
  );
};

export default Export;