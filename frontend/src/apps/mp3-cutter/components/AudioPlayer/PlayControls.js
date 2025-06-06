import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

const PlayControls = ({ 
  isPlaying, 
  onTogglePlayPause, 
  onJumpToStart, 
  onJumpToEnd,
  disabled = false 
}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onJumpToStart}
        disabled={disabled}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Jump to Start"
      >
        <SkipBack className="w-4 h-4 text-slate-700" />
      </button>
      
      <button
        onClick={onTogglePlayPause}
        disabled={disabled}
        className="p-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-md text-white"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      
      <button
        onClick={onJumpToEnd}
        disabled={disabled}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        title="Jump to End"
      >
        <SkipForward className="w-4 h-4 text-slate-700" />
      </button>
    </div>
  );
};

export default PlayControls;