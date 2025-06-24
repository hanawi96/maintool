import { useState, useCallback } from 'react';

export const useHistory = (maxEntries = 20) => {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveState = useCallback((state) => {
    const completeState = {
      startTime: state.startTime || 0,
      endTime: state.endTime || 0,
      fadeIn: state.fadeIn || 0,
      fadeOut: state.fadeOut || 0,
      isInverted: state.isInverted || false,
      regions: state.regions || [],
      activeRegionId: state.activeRegionId || null
    };

    
    setHistory(prev => {
      const cutIndex = Math.max(0, historyIndex + 1 - maxEntries + 1);
      const newHistory = prev.slice(cutIndex, historyIndex + 1).concat([completeState]);
      const finalHistory = newHistory.length > maxEntries ? newHistory.slice(1) : newHistory;
      

      
      return finalHistory;
    });
    setHistoryIndex(idx => Math.min(idx + 1, maxEntries - 1));
  }, [historyIndex, maxEntries, history.length]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(idx => idx - 1);
      return history[historyIndex - 1];
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(idx => idx + 1);
      return history[historyIndex + 1];
    }
    return null;
  }, [historyIndex, history]);

  return {
    saveState,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    historyIndex,
    historyLength: history.length,
  };
};
