import React from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

const HistoryControls = ({ 
  canUndo, 
  canRedo, 
  onUndo, 
  onRedo, 
  historyIndex,
  historyLength 
}) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors relative group"
        title="Undo"
      >
        <RotateCcw className="w-4 h-4 text-slate-700" />
        {historyIndex > 0 && (
          <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {historyIndex}
          </span>
        )}
      </button>
      
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors relative group"
        title="Redo"
      >
        <RotateCw className="w-4 h-4 text-slate-700" />
        {canRedo && (
          <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {historyLength - 1 - historyIndex}
          </span>
        )}
      </button>
    </div>
  );
};

export default HistoryControls;