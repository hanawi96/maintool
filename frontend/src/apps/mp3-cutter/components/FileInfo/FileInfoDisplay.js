import React from 'react';
import { Music, Clock } from 'lucide-react';
import { formatTimeUnified, formatFileSize } from '../../utils/timeFormatter';

const FileInfoDisplay = ({ audioFile, duration, currentTime, isPlaying }) => {
  if (!audioFile) return null;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-slate-200/50 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        
        {/* File Name & Basic Info */}
        <div className="flex items-center gap-3">
          <Music className="w-5 h-5 text-indigo-600" />
          <div>
            <div className="text-sm font-semibold text-slate-800 truncate max-w-xs">
              {audioFile.name || 'Audio File'}
            </div>
            <div className="text-xs text-slate-500">
              {formatFileSize(audioFile.size)}
            </div>
          </div>
        </div>

        {/* Duration & Format */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs text-slate-500">Duration</div>
            <div className="text-sm font-mono text-slate-800">{formatTimeUnified(duration)}</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-slate-500">Format</div>
            <div className="text-sm font-semibold text-slate-800">
              {audioFile.type?.split('/')[1]?.toUpperCase() || 'AUDIO'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-slate-500">Current Time</div>
            <div className="text-sm font-mono text-purple-600">{formatTimeUnified(currentTime)}</div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
          <span className="text-xs text-slate-600">
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FileInfoDisplay;