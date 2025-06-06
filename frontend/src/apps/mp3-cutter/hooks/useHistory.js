import { useState, useCallback } from 'react';

export const useHistory = (maxEntries = 20) => {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveState = useCallback((state) => {
    setHistory(prev => {
      const newHistory = prev.slice(Math.max(0, historyIndex + 1 - maxEntries + 1), historyIndex + 1);
      newHistory.push(state);
      
      if (newHistory.length > maxEntries) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, maxEntries - 1));
  }, [historyIndex, maxEntries]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      return history[historyIndex - 1];
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      return history[historyIndex + 1];
    }
    return null;
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length
  };
};