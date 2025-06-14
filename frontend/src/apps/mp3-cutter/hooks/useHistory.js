import { useState, useCallback } from 'react';

export const useHistory = (maxEntries = 20) => {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveState = useCallback((state) => {
    setHistory(prev => {
      const cutIndex = Math.max(0, historyIndex + 1 - maxEntries + 1);
      const newHistory = prev.slice(cutIndex, historyIndex + 1).concat([state]);
      return newHistory.length > maxEntries ? newHistory.slice(1) : newHistory;
    });
    setHistoryIndex(idx => Math.min(idx + 1, maxEntries - 1));
  }, [historyIndex, maxEntries]);

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
