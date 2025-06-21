import { useMemo, useCallback } from 'react';

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
  dispatch
}) => {
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

  // 🚀 Optimized time change handlers
  const handleTimeDisplayChange = useCallback((type, newTime) => {
    if (timeDisplayValues.isRegionTime && activeRegionId) {
      dispatch({
        type: 'SET_REGIONS',
        regions: regions.map(region => {
          if (region.id !== activeRegionId) return region;
          
          const boundaries = getRegionBoundaries(activeRegionId, type);
          const safeTime = Math.max(boundaries.min, Math.min(newTime, boundaries.max));
          
          return { ...region, [type]: safeTime };
        })
      });
    } else {
      if (type === 'start') {
        handleStartTimeChange(newTime);
      } else {
        handleEndTimeChange(newTime);
      }
    }
  }, [timeDisplayValues.isRegionTime, activeRegionId, handleStartTimeChange, handleEndTimeChange, getRegionBoundaries, regions, dispatch]);

  const handleDisplayStartTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('start', newTime);
  }, [handleTimeDisplayChange]);

  const handleDisplayEndTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('end', newTime);
  }, [handleTimeDisplayChange]);

  return {
    getTimeDisplayValues,
    handleDisplayStartTimeChange,
    handleDisplayEndTimeChange
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