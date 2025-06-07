import React from 'react';
import { Scissors } from 'lucide-react';
import FormatSelector from './FormatSelector';
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
  disabled = false 
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 text-slate-800 flex items-center gap-2">
        <Scissors className="w-4 h-4" />
        Export Audio
      </h3>
      
      <div className="space-y-3">
        <FormatSelector
          selectedFormat={outputFormat}
          onFormatChange={onFormatChange}
        />
        
        <CutDownload
          audioFile={audioFile}
          startTime={startTime}
          endTime={endTime}
          outputFormat={outputFormat}
          fadeIn={fadeIn}
          fadeOut={fadeOut}
          playbackRate={playbackRate}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default Export;