import { useMemo, useCallback } from 'react';

// 🚀 Custom hook for region calculations - Optimized with memoization
export const useRegionCalculations = (regions, startTime, endTime, duration, canvasRef) => {
  // Memoized minimum handle gap calculation
  const minimumHandleGap = useMemo(() => {
    if (!canvasRef.current || duration <= 0) return 0;
      const canvas = canvasRef.current;
    const canvasWidth = canvas.offsetWidth || 800;
    const handleW = canvasWidth < 640 ? Math.max(3, 8 * 0.75) : 8;
    // 🎯 ENHANCED: Add extra 4px buffer to prevent handle overlap (total: handle width + 4px + 2px)
    const requiredPixelGap = handleW + 4 + 2;
    return (requiredPixelGap / canvasWidth) * duration;
  }, [canvasRef, duration]);

  // Memoized all regions (including main region as a unified region)
  const allRegions = useMemo(() => {
    const allRegionsList = [...regions];
    
    // Add main region as a regular region if it exists
    if (startTime < endTime) {
      allRegionsList.push({
        id: 'main',
        start: startTime,
        end: endTime,
        type: 'main'
      });
    }
    
    return allRegionsList;
  }, [regions, startTime, endTime]);

  // Memoized handle edge positions - unified logic for all regions
  const handleEdgePositions = useMemo(() => {
    const handleEdges = [];
    
    allRegions.forEach(region => {
      const edgeType = region.type === 'main' ? 'main' : 'region';
      handleEdges.push(
        { position: region.start, type: `${edgeType}_start_edge`, regionId: region.id },
        { position: region.end, type: `${edgeType}_end_edge`, regionId: region.id }
      );
    });
    
    return handleEdges.sort((a, b) => a.position - b.position);
  }, [allRegions]);

  // Memoized available spaces - unified logic for all regions
  const availableSpaces = useMemo(() => {
    if (duration <= 0) return [];
    
    const occupiedAreas = [];
    const minGap = minimumHandleGap;
    
    // Process all regions with unified logic
    allRegions.forEach(region => {
      occupiedAreas.push({
        start: Math.max(0, region.start - minGap / 2),
        end: Math.min(duration, region.end + minGap / 2),
        type: region.type === 'main' ? 'selection' : 'region',
        id: region.id
      });
    });
    
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
  }, [allRegions, duration, minimumHandleGap]);

  return {
    minimumHandleGap,
    handleEdgePositions,
    availableSpaces,
    allRegions,
    canAddNewRegion: availableSpaces.length > 0
  };
};

// 🚀 Custom hook for collision detection - Unified logic for all regions
export const useCollisionDetection = (handleEdgePositions, duration, canvasWidth = 800) => {
  return useCallback((targetType, targetRegionId, handleType, newTime, currentStartTime, currentEndTime) => {
    let minBoundary = 0;
    let maxBoundary = duration;
      // Calculate handle buffer in time units to prevent overlap
    const getResponsiveHandleWidth = (width) =>
      width < 640 // MOBILE_BREAKPOINT
        ? Math.max(3, 8 * 0.75) // 6px on mobile
        : 8; // 8px on desktop
    
    const handleWidthPx = getResponsiveHandleWidth(canvasWidth);
    const waveformAreaWidth = canvasWidth - 2 * handleWidthPx;
    // 🎯 ENHANCED: Add extra 4px buffer to prevent handle overlap (total: handle width + 4px)
    const totalBufferPx = handleWidthPx + 4;
    const handleBufferTime = waveformAreaWidth > 0 ? (totalBufferPx / waveformAreaWidth) * duration : 0.01;
    
    // Unified collision detection for all regions (main and regular regions)
    for (const edge of handleEdgePositions) {
      if (edge.regionId === targetRegionId) continue;
      
      if (handleType === 'start') {
        if (edge.position > newTime && edge.position < maxBoundary) {
          // Add buffer to prevent handle overlap
          maxBoundary = Math.max(0, edge.position - handleBufferTime);
        }
        if (edge.position <= newTime && edge.position > minBoundary) {
          // Add buffer to prevent handle overlap
          minBoundary = Math.min(duration, edge.position + handleBufferTime);
        }
      } else {
        if (edge.position < newTime && edge.position > minBoundary) {
          // Add buffer to prevent handle overlap
          minBoundary = Math.min(duration, edge.position + handleBufferTime);
        }
        if (edge.position >= newTime && edge.position < maxBoundary) {
          // Add buffer to prevent handle overlap
          maxBoundary = Math.max(0, edge.position - handleBufferTime);
        }
      }
    }
    
    if (handleType === 'start') {
      maxBoundary = Math.min(maxBoundary, currentEndTime - 0.1);
    } else {
      minBoundary = Math.max(minBoundary, currentStartTime + 0.1);
    }
    
    return { min: minBoundary, max: maxBoundary };
  }, [handleEdgePositions, duration, canvasWidth]);
};