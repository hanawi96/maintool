import { useMemo, useCallback } from 'react';
import { COLLISION_CONFIG } from '../utils/constants';

// 🚀 Dynamic buffer calculation for collision detection
const calculateDynamicBuffer = (canvasRef, duration) => {
  if (!canvasRef?.current || duration <= 0) return 0;
  
  const canvas = canvasRef.current;
  const canvasWidth = canvas.offsetWidth || 800;
  
  // Responsive buffer: Mobile = 12px, Desktop = 8px
  const bufferPx = canvasWidth < COLLISION_CONFIG.MOBILE_BREAKPOINT 
    ? COLLISION_CONFIG.MOBILE_BUFFER_PX 
    : COLLISION_CONFIG.DESKTOP_BUFFER_PX;
  
  const waveformWidth = canvasWidth - 16; // Minus handle space
  return waveformWidth > 0 ? (bufferPx / waveformWidth) * duration : 0;
};

// 🚀 Custom hook for region calculations - Optimized with memoization
export const useRegionCalculations = (regions, startTime, endTime, duration, canvasRef) => {
  // Memoized minimum handle gap calculation
  const minimumHandleGap = useMemo(() => {
    if (!canvasRef.current || duration <= 0) return 0;
    
    const canvas = canvasRef.current;
    const canvasWidth = canvas.offsetWidth || 800;
    const handleW = canvasWidth < 640 ? Math.max(3, 8 * 0.75) : 8;
    const requiredPixelGap = handleW + 2;
    return (requiredPixelGap / canvasWidth) * duration;
  }, [canvasRef, duration]);

  // Memoized handle edge positions
  const handleEdgePositions = useMemo(() => {
    const handleEdges = [];
    
    if (startTime < endTime) {
      handleEdges.push(
        { position: startTime, type: 'main_start_edge', regionId: 'main' },
        { position: endTime, type: 'main_end_edge', regionId: 'main' }
      );
    }
    
    regions.forEach(region => {
      handleEdges.push(
        { position: region.start, type: 'region_start_edge', regionId: region.id },
        { position: region.end, type: 'region_end_edge', regionId: region.id }
      );
    });
    
    return handleEdges.sort((a, b) => a.position - b.position);
  }, [regions, startTime, endTime]);

  // Memoized available spaces
  const availableSpaces = useMemo(() => {
    if (duration <= 0) return [];
    
    const occupiedAreas = [];
    const minGap = minimumHandleGap;
    
    regions.forEach(region => {
      occupiedAreas.push({
        start: Math.max(0, region.start - minGap / 2),
        end: Math.min(duration, region.end + minGap / 2),
        type: 'region',
        id: region.id
      });
    });
    
    if (startTime < endTime) {
      occupiedAreas.push({
        start: Math.max(0, startTime - minGap / 2),
        end: Math.min(duration, endTime + minGap / 2),
        type: 'selection'
      });
    }
    
    if (occupiedAreas.length === 0) {
      return [{ start: 0, end: duration, length: duration, hasMinGap: true }];
    }
    
    const sortedAreas = occupiedAreas.sort((a, b) => a.start - b.start);
    const spaces = [];
    
    if (sortedAreas[0].start > 0) {
      const spaceLength = sortedAreas[0].start;
      if (spaceLength >= minGap + 1.0) {
        spaces.push({ start: 0, end: sortedAreas[0].start, length: spaceLength, hasMinGap: true });
      }
    }
    
    for (let i = 0; i < sortedAreas.length - 1; i++) {
      const currentEnd = sortedAreas[i].end;
      const nextStart = sortedAreas[i + 1].start;
      if (nextStart > currentEnd) {
        const spaceLength = nextStart - currentEnd;
        if (spaceLength >= minGap + 1.0) {
          spaces.push({ start: currentEnd, end: nextStart, length: spaceLength, hasMinGap: true });
        }
      }
    }
    
    const lastArea = sortedAreas[sortedAreas.length - 1];
    if (lastArea.end < duration) {
      const spaceLength = duration - lastArea.end;
      if (spaceLength >= minGap + 1.0) {
        spaces.push({ start: lastArea.end, end: duration, length: spaceLength, hasMinGap: true });
      }
    }
    
    return spaces;
  }, [regions, duration, startTime, endTime, minimumHandleGap]);

  return {
    minimumHandleGap,
    handleEdgePositions,
    availableSpaces,
    canAddNewRegion: availableSpaces.length > 0
  };
};

// 🚀 Custom hook for collision detection - Enhanced with buffer
export const useCollisionDetection = (handleEdgePositions, duration, canvasRef) => {
  return useCallback((targetType, targetRegionId, handleType, newTime, currentStartTime, currentEndTime) => {
    let minBoundary = 0;
    let maxBoundary = duration;
    
    // Calculate dynamic buffer for visual spacing
    const buffer = calculateDynamicBuffer(canvasRef, duration);
    
    for (const edge of handleEdgePositions) {
      if (edge.regionId === targetRegionId) continue;
      
      if (handleType === 'start') {
        if (edge.position > newTime && edge.position < maxBoundary) {
          maxBoundary = edge.position - buffer;
        }
        if (edge.position <= newTime && edge.position > minBoundary) {
          minBoundary = edge.position + buffer;
        }
      } else {
        if (edge.position < newTime && edge.position > minBoundary) {
          minBoundary = edge.position + buffer;
        }
        if (edge.position >= newTime && edge.position < maxBoundary) {
          maxBoundary = edge.position - buffer;
        }
      }
    }
    
    if (handleType === 'start') {
      maxBoundary = Math.min(maxBoundary, currentEndTime - 0.1);
    } else {
      minBoundary = Math.max(minBoundary, currentStartTime + 0.1);
    }
    
    return { min: Math.max(0, minBoundary), max: Math.min(duration, maxBoundary) };
  }, [handleEdgePositions, duration, canvasRef]);
};