import { useMemo, useCallback } from 'react';

// 🚀 Optimized hook for Add Region Icons positioning
export const useAddRegionIcons = ({
  regions = [],
  duration = 0,
  startTime = 0,
  endTime = 0,
  canvasWidth = 800,
  startX = 0,
  areaWidth = 0,
  handleW = 0
}) => {
  // 🔧 Calculate available spaces efficiently  
  const availableSpaces = useMemo(() => {
    if (duration <= 0 || !regions) return [];
    
    console.log('🔍 Calculating available spaces:', {
      regionsCount: regions.length,
      duration: duration.toFixed(2),
      mainSelection: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`
    });
    
    const spaces = [];
    const allItems = [];
    
    // Add main selection if exists
    if (startTime < endTime) {
      allItems.push({ start: startTime, end: endTime, type: 'main' });
    }
    
    // Add all regions
    regions.forEach(region => {
      allItems.push({ start: region.start, end: region.end, type: 'region', id: region.id });
    });
    
    // Sort by start time
    allItems.sort((a, b) => a.start - b.start);
    
    // Find gaps
    let currentTime = 0;
    
    allItems.forEach(item => {
      // Gap before this item
      if (item.start > currentTime) {
        const gapDuration = item.start - currentTime;
        if (gapDuration >= 1.0) { // Minimum 1 second
          spaces.push({
            start: currentTime,
            end: item.start,
            duration: gapDuration,
            center: currentTime + gapDuration / 2
          });
        }
      }
      currentTime = Math.max(currentTime, item.end);
    });
    
    // Gap after last item
    if (currentTime < duration) {
      const gapDuration = duration - currentTime;
      if (gapDuration >= 1.0) {
        spaces.push({
          start: currentTime,
          end: duration,
          duration: gapDuration,
          center: currentTime + gapDuration / 2
        });
      }
    }
    
    console.log('✅ Found available spaces:', spaces.map(s => 
      `${s.start.toFixed(1)}s-${s.end.toFixed(1)}s (${s.duration.toFixed(1)}s)`
    ));
    
    return spaces;
  }, [regions, duration, startTime, endTime]);

  // 🎯 Calculate optimal icon positions
  const iconPositions = useMemo(() => {
    if (!availableSpaces.length || areaWidth <= 0) return [];
    
    return availableSpaces.map((space, index) => {
      const centerX = startX + (space.center / duration) * areaWidth;
      
      return {
        id: `add-icon-${index}`,
        x: centerX,
        y: 50, // Fixed Y position 
        spaceStart: space.start,
        spaceEnd: space.end,
        spaceDuration: space.duration,
        visible: true
      };
    });
  }, [availableSpaces, startX, areaWidth, duration]);

  // 🔧 Check collision with regions and handles
  const getVisibleIcons = useCallback((icons) => {
    if (!icons.length) return [];
    
    return icons.map(icon => {
      let isColliding = false;
      
      // Check collision with all regions (including handles)
      [...regions].forEach(region => {
        const regionStartX = startX + (region.start / duration) * areaWidth;
        const regionEndX = startX + (region.end / duration) * areaWidth;
        const regionLeft = regionStartX - handleW; // Include start handle
        const regionRight = regionEndX + handleW; // Include end handle
        
        // Icon collision zone (±15px)
        const iconLeft = icon.x - 15;
        const iconRight = icon.x + 15;
        
        if (iconRight > regionLeft && iconLeft < regionRight) {
          isColliding = true;
        }
      });
      
      // Check collision with main selection handles
      if (startTime < endTime) {
        const mainStartX = startX + (startTime / duration) * areaWidth;
        const mainEndX = startX + (endTime / duration) * areaWidth;
        const mainLeft = mainStartX - handleW;
        const mainRight = mainEndX + handleW;
        
        const iconLeft = icon.x - 15;
        const iconRight = icon.x + 15;
        
        if (iconRight > mainLeft && iconLeft < mainRight) {
          isColliding = true;
        }
      }
      
      return {
        ...icon,
        visible: !isColliding
      };
    });
  }, [regions, startTime, endTime, startX, areaWidth, duration, handleW]);

  // 🎯 Final visible icons
  const visibleIcons = useMemo(() => {
    const iconsWithCollision = getVisibleIcons(iconPositions);
    const visible = iconsWithCollision.filter(icon => icon.visible);
    
    if (visible.length !== iconPositions.length) {
      console.log('🔄 Icon visibility changed:', {
        total: iconPositions.length,
        visible: visible.length,
        hidden: iconPositions.length - visible.length
      });
    }
    
    return visible;
  }, [iconPositions, getVisibleIcons]);

  return {
    availableSpaces,
    iconPositions: visibleIcons,
    hasAvailableSpace: availableSpaces.length > 0
  };
}; 