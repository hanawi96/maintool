import { useCallback, useRef } from 'react';

// Region management functions
export const useRegionManagement = ({
  regions,
  activeRegionId,
  startTime,
  endTime,
  duration,
  availableSpaces,
  minimumHandleGap,
  canAddNewRegion,
  dispatch,
  setActiveRegionIdDebounced,
  jumpToTime,
  setStartTime,
  setEndTime
}) => {
  // 🚀 Optimized region generation
  const generateRandomRegion = useCallback(() => {
    if (duration <= 0 || availableSpaces.length === 0) return null;
    
    const bestSpace = availableSpaces.reduce((best, current) => 
      current.length > best.length ? current : best
    );
    
    const effectiveStart = bestSpace.start + minimumHandleGap / 2;
    const effectiveEnd = bestSpace.end - minimumHandleGap / 2;
    const effectiveLength = effectiveEnd - effectiveStart;
    
    const minDuration = Math.max(1, effectiveLength * 0.1);
    const maxDuration = Math.min(30, effectiveLength * 0.6);
    const regionDuration = minDuration + Math.random() * (maxDuration - minDuration);
    
    const maxStartPos = effectiveEnd - regionDuration;
    const regionStart = effectiveStart + Math.random() * Math.max(0, maxStartPos - effectiveStart);
    
    return {
      id: Date.now() + Math.random(),
      start: Math.max(effectiveStart, regionStart),
      end: Math.min(effectiveEnd, regionStart + regionDuration),
      name: `Region ${regions.length + 1}`
    };
  }, [duration, availableSpaces, minimumHandleGap, regions.length]);

  // 🚀 Optimized region management
  const handleAddRegion = useCallback(() => {
    if (!canAddNewRegion) return;
    
    const newRegion = generateRandomRegion();
    if (newRegion) {
      dispatch({ type: 'SET_REGIONS', regions: [...regions, newRegion] });
      setActiveRegionIdDebounced(newRegion.id, 'addRegion');
      jumpToTime(newRegion.start);
    }
  }, [generateRandomRegion, canAddNewRegion, regions, setActiveRegionIdDebounced, jumpToTime, dispatch]);

  const handleDeleteRegion = useCallback(() => {
    const mainSelectionExists = startTime < endTime && duration > 0;
    const totalItems = regions.length + (mainSelectionExists ? 1 : 0);
    
    if (totalItems > 1 && activeRegionId) {
      if (activeRegionId === 'main') {
        setStartTime(0);
        setEndTime(duration);
        
        if (regions.length > 0) {
          setActiveRegionIdDebounced(regions[0].id, 'deleteMainSelection');
        } else {
          setActiveRegionIdDebounced(null, 'deleteMainSelection');
        }
      } else {
        const remaining = regions.filter(r => r.id !== activeRegionId);
        dispatch({ type: 'SET_REGIONS', regions: remaining });
        
        if (mainSelectionExists) {
          setActiveRegionIdDebounced('main', 'deleteRegion');
          jumpToTime(startTime);
        } else if (remaining.length > 0) {
          setActiveRegionIdDebounced(remaining[0].id, 'deleteRegion');
          jumpToTime(remaining[0].start);
        } else {
          setActiveRegionIdDebounced(null, 'deleteRegion');
        }
      }
    }
  }, [activeRegionId, regions, startTime, endTime, duration, setStartTime, setEndTime, setActiveRegionIdDebounced, jumpToTime, dispatch]);

  const handleClearAllRegions = useCallback(() => {
    dispatch({ type: 'SET_REGIONS', regions: [] });
    setActiveRegionIdDebounced('main', 'clearAllRegions');
    if (startTime < endTime && duration > 0) {
      jumpToTime(startTime);
    }
  }, [setActiveRegionIdDebounced, jumpToTime, startTime, endTime, duration, dispatch]);

  return {
    handleAddRegion,
    handleDeleteRegion,
    handleClearAllRegions,
    generateRandomRegion
  };
};

// Region interaction handlers
export const useRegionInteractions = ({
  regions,
  draggingRegion,
  duration,
  canvasRef,
  getRegionBoundaries,
  getRegionBodyBoundaries,
  ultraSmoothRegionSync,
  dispatch,
  setActiveRegionIdDebounced
}) => {
  // 🚀 Consolidated region event handlers (eliminates redundancy)
  const handleRegionPointerDown = useCallback((regionId, handleType, e) => {
    setActiveRegionIdDebounced(regionId, `region${handleType}Down`);
    dispatch({ type: 'SET_DRAGGING', dragging: { regionId, handleType, startX: e.clientX } });
    
    if (e.target?.setPointerCapture && e.pointerId) {
      e.target.setPointerCapture(e.pointerId);
    }
  }, [setActiveRegionIdDebounced, dispatch]);

  const handleRegionPointerMove = useCallback((regionId, handleType, e) => {
    if (!draggingRegion || draggingRegion.regionId !== regionId || draggingRegion.handleType !== handleType) return;
    if (!duration) return;
    
    const deltaX = e.clientX - draggingRegion.startX;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = canvas.offsetWidth;
    const deltaTime = (deltaX / canvasWidth) * duration;
    
    dispatch({
      type: 'SET_REGIONS',
      regions: regions.map(region => {
        if (region.id !== regionId) return region;
        
        if (handleType === 'body') {
          // Body drag: move entire region
          const boundaries = getRegionBodyBoundaries(regionId);
          const regionDuration = region.end - region.start;
          const newStart = Math.max(boundaries.min, Math.min(region.start + deltaTime, boundaries.max));
          const newEnd = newStart + regionDuration;
          
          ultraSmoothRegionSync(newStart);
          return { ...region, start: newStart, end: newEnd };
        } else {
          // Handle drag: resize region
          const boundaries = getRegionBoundaries(regionId, handleType);
          
          if (handleType === 'start') {
            const newStart = Math.max(boundaries.min, Math.min(region.start + deltaTime, boundaries.max));
            ultraSmoothRegionSync(newStart);
            return { ...region, start: newStart };
          } else { // handleType === 'end'
            const newEnd = Math.max(boundaries.min, Math.min(region.end + deltaTime, boundaries.max));
            const regionDuration = newEnd - region.start;
            const cursorPosition = regionDuration < 3 ? region.start : Math.max(region.start, newEnd - 3);
            ultraSmoothRegionSync(cursorPosition, 'end');
            return { ...region, end: newEnd };
          }
        }
      })
    });
    
    dispatch({ type: 'SET_DRAGGING', dragging: { ...draggingRegion, startX: e.clientX } });
  }, [draggingRegion, duration, canvasRef, getRegionBoundaries, getRegionBodyBoundaries, regions, ultraSmoothRegionSync, dispatch]);

  const handleRegionPointerUp = useCallback((regionId, handleType, e) => {
    if (e.target?.releasePointerCapture && e.pointerId) {
      e.target.releasePointerCapture(e.pointerId);
    }
    dispatch({ type: 'SET_DRAGGING', dragging: null });
  }, [dispatch]);

  return {
    handleRegionPointerDown,
    handleRegionPointerMove,
    handleRegionPointerUp
  };
};

// Region click handlers
export const useRegionClickHandlers = ({
  regions,
  activeRegionId,
  startTime,
  jumpToTime,
  setActiveRegionIdDebounced
}) => {
  const mainSelectionClickRef = useRef(null);

  // 🚀 Optimized region click handlers
  const handleRegionClick = useCallback((regionId, clickPosition = null) => {
    const selectedRegion = regions.find(r => r.id === regionId);
    if (!selectedRegion) return;
    
    const wasAlreadyActive = activeRegionId === regionId;
    
    if (wasAlreadyActive && clickPosition !== null) {
      jumpToTime(clickPosition);
    } else {
      setActiveRegionIdDebounced(regionId, 'regionClick');
      jumpToTime(selectedRegion.start);
    }
  }, [regions, jumpToTime, setActiveRegionIdDebounced, activeRegionId]);

  const handleMainSelectionClick = useCallback((clickPosition = null, options = {}) => {
    if (regions.length >= 1) {
      const now = Date.now();
      if (mainSelectionClickRef.current && now - mainSelectionClickRef.current < 100) return;
      mainSelectionClickRef.current = now;
      
      const wasAlreadyActive = activeRegionId === 'main';
      const isActivation = options.isActivation || false;
      
      if (isActivation) {
        setActiveRegionIdDebounced('main', 'mainSelectionClick');
        jumpToTime(startTime);
      } else if (wasAlreadyActive && clickPosition !== null) {
        jumpToTime(clickPosition);
      }
    } else {
      // 🔧 CRITICAL FIX: Handle main selection click when no regions exist
      if (clickPosition !== null) {
        jumpToTime(clickPosition);
      }
    }
  }, [regions.length, setActiveRegionIdDebounced, jumpToTime, startTime, activeRegionId]);

  return {
    handleRegionClick,
    handleMainSelectionClick
  };
}; 