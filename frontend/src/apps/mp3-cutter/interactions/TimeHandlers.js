import { useMemo, useCallback, useRef } from 'react';

// Time display handlers
export const useTimeDisplayHandlers = ({
  activeRegionId,
  regions,
  startTime,
  endTime,
  timeDisplayValues,
  handleStartTimeChange,
  handleEndTimeChange,
  getRegionBoundaries,
  dispatch,
  // 🆕 Add saveState support for region time changes
  saveState,
  fadeIn = 0,
  fadeOut = 0
}) => {
  // 🆕 Add debouncing for region history saves
  const regionHistoryTimeoutRef = useRef(null);

  // 🚀 Memoized time display values
  const getTimeDisplayValues = useMemo(() => {
    if (activeRegionId && regions.length > 0) {
      if (activeRegionId === 'main') {
        return {
          displayStartTime: startTime,
          displayEndTime: endTime,
          isRegionTime: false,
          regionName: 'Main Selection'
        };
      }
      
      const activeRegion = regions.find(r => r.id === activeRegionId);
      if (activeRegion) {
        return {
          displayStartTime: activeRegion.start,
          displayEndTime: activeRegion.end,
          isRegionTime: true,
          regionName: activeRegion.name
        };
      }
    }
    
    return {
      displayStartTime: startTime,
      displayEndTime: endTime,
      isRegionTime: false,
      regionName: null
    };
  }, [activeRegionId, regions, startTime, endTime]);

  // 🚀 Optimized time change handlers with history support
  const handleTimeDisplayChange = useCallback((type, newTime) => {
    console.log(`🕐 TimeSelector Change: ${type} = ${newTime.toFixed(1)}s`, {
      isRegionTime: timeDisplayValues.isRegionTime,
      activeRegionId,
      source: 'CompactTimeSelector'
    });

    if (timeDisplayValues.isRegionTime && activeRegionId) {
      // Handle region time changes
      const updatedRegions = regions.map(region => {
        if (region.id !== activeRegionId) return region;
        
        const boundaries = getRegionBoundaries(activeRegionId, type);
        const safeTime = Math.max(boundaries.min, Math.min(newTime, boundaries.max));
        
        console.log(`🔧 Region Update: ${activeRegionId} ${type}: ${region[type].toFixed(1)}s -> ${safeTime.toFixed(1)}s`);
        return { ...region, [type]: safeTime };
      });

      dispatch({
        type: 'SET_REGIONS',
        regions: updatedRegions
      });

      // 🆕 CRITICAL FIX: Debounced history save for region time changes
      if (saveState) {
        // Clear existing timeout
        if (regionHistoryTimeoutRef.current) {
          clearTimeout(regionHistoryTimeoutRef.current);
        }

        // Set new timeout for debounced save
        regionHistoryTimeoutRef.current = setTimeout(() => {
          console.log(`💾 Saving history for region time change: ${type} = ${newTime.toFixed(1)}s`);
          saveState({ 
            startTime, 
            endTime, 
            fadeIn, 
            fadeOut, 
            regions: updatedRegions, 
            activeRegionId 
          });
          regionHistoryTimeoutRef.current = null;
        }, 300); // 300ms debounce for region changes
      }
    } else {
      // Handle main selection time changes (already has history support)
      console.log(`🔧 Main Selection Update: ${type} = ${newTime.toFixed(1)}s`);
      if (type === 'start') {
        handleStartTimeChange(newTime);
      } else {
        handleEndTimeChange(newTime);
      }
    }
  }, [timeDisplayValues.isRegionTime, activeRegionId, handleStartTimeChange, handleEndTimeChange, getRegionBoundaries, regions, dispatch, saveState, startTime, endTime, fadeIn, fadeOut]);

  const handleDisplayStartTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('start', newTime);
  }, [handleTimeDisplayChange]);

  const handleDisplayEndTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('end', newTime);
  }, [handleTimeDisplayChange]);

  // 🆕 Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (regionHistoryTimeoutRef.current) {
      clearTimeout(regionHistoryTimeoutRef.current);
      regionHistoryTimeoutRef.current = null;
    }
  }, []);

  return {
    getTimeDisplayValues,
    handleDisplayStartTimeChange,
    handleDisplayEndTimeChange,
    cleanup
  };
};

// Main selection boundaries
export const useMainSelectionBoundaries = (getEnhancedCollisionBoundaries) => {
  // 🚀 Memoized main selection boundaries
  const getMainSelectionBoundaries = useCallback((handleType, currentStartTime, currentEndTime) => {
    return getEnhancedCollisionBoundaries('main', 'main', handleType, 
      handleType === 'start' ? currentStartTime : currentEndTime,
      currentStartTime, currentEndTime);
  }, [getEnhancedCollisionBoundaries]);

  return { getMainSelectionBoundaries };
};

// Region boundaries
export const useRegionBoundaries = (regions, getEnhancedCollisionBoundaries, duration, handleEdgePositions) => {
  // 🚀 Optimized region boundaries
  const getRegionBoundaries = useCallback((targetRegionId, handleType) => {
    const targetRegion = regions.find(r => r.id === targetRegionId);
    if (!targetRegion) return { min: 0, max: duration };
    
    return getEnhancedCollisionBoundaries('region', targetRegionId, handleType,
      handleType === 'start' ? targetRegion.start : targetRegion.end,
      targetRegion.start, targetRegion.end);
  }, [regions, getEnhancedCollisionBoundaries, duration]);

  // 🚀 Optimized region body boundaries
  const getRegionBodyBoundaries = useCallback((targetRegionId) => {
    const targetRegion = regions.find(r => r.id === targetRegionId);
    if (!targetRegion) return { min: 0, max: duration };
    
    const regionDuration = targetRegion.end - targetRegion.start;
    let minStart = 0;
    let maxStart = duration - regionDuration;
    
    for (const edge of handleEdgePositions) {
      if (edge.regionId === targetRegionId) continue;
      
      if (edge.position <= targetRegion.start && edge.position > minStart) {
        minStart = edge.position;
      }
      
      if (edge.position >= targetRegion.end && edge.position - regionDuration < maxStart) {
        maxStart = edge.position - regionDuration;
      }
    }
    
    maxStart = Math.max(minStart, Math.min(maxStart, duration - regionDuration));
    return { min: Math.max(0, minStart), max: Math.max(0, maxStart) };
  }, [regions, handleEdgePositions, duration]);

  return {
    getRegionBoundaries,
    getRegionBodyBoundaries
  };
};

// Handle change handlers
export const useHandleChangeHandlers = ({
  regions,
  startTime,
  endTime,
  isInverted,
  isDragging,
  getMainSelectionBoundaries,
  originalHandleStartTimeChange,
  originalHandleEndTimeChange,
  jumpToTime,
  setActiveRegionIdDebounced
}) => {
  // 🚀 Optimized handle change handlers
  const handleStartTimeChange = useCallback((newStartTime) => {
    if (regions.length > 0) {
      setActiveRegionIdDebounced('main', 'dragMainHandle');
    }
    
    const boundaries = getMainSelectionBoundaries('start', startTime, endTime);
    const safeStartTime = Math.max(boundaries.min, Math.min(newStartTime, boundaries.max));
    
    originalHandleStartTimeChange(safeStartTime);
    jumpToTime(isInverted ? Math.max(0, safeStartTime - 3) : safeStartTime);
  }, [originalHandleStartTimeChange, jumpToTime, isInverted, getMainSelectionBoundaries, startTime, endTime, regions.length, setActiveRegionIdDebounced]);

  const handleEndTimeChange = useCallback((newEndTime) => {
    if (regions.length > 0) {
      setActiveRegionIdDebounced('main', 'dragMainHandle');
    }
    
    const boundaries = getMainSelectionBoundaries('end', startTime, endTime);
    const safeEndTime = Math.max(boundaries.min, Math.min(newEndTime, boundaries.max));
    
    originalHandleEndTimeChange(safeEndTime);
    if (!isDragging) jumpToTime(isInverted ? Math.max(0, startTime - 3) : Math.max(startTime, safeEndTime - 3));
  }, [originalHandleEndTimeChange, isDragging, jumpToTime, isInverted, startTime, getMainSelectionBoundaries, endTime, regions.length, setActiveRegionIdDebounced]);

  return {
    handleStartTimeChange,
    handleEndTimeChange
  };
}; 