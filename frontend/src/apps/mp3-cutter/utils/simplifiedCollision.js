/**
 * 🎯 SIMPLIFIED COLLISION DETECTION SYSTEM
 * 
 * Đây là hệ thống collision detection đơn giản hóa với mục tiêu chính:
 * - Đảm bảo khoảng cách tối thiểu 8px giữa các handle của regions
 * - Logic đơn giản, dễ hiểu và maintain
 * - Performance tốt với nhiều regions
 */

/**
 * Tính toán 8px buffer trong đơn vị thời gian
 */
export const calculateTimeBuffer = (canvasRef, duration) => {
  if (!canvasRef.current || duration <= 0) return 0.01;
  
  const canvas = canvasRef.current;
  const canvasWidth = canvas.offsetWidth || 800;
  const waveformAreaWidth = canvasWidth - 16; // Trừ handle width
  const BUFFER_PX = 8; // Cố định 8px
  
  return waveformAreaWidth > 0 ? (BUFFER_PX / waveformAreaWidth) * duration : 0.01;
};

/**
 * Lấy tất cả vị trí handle conflict với region target
 */
export const getConflictPositions = (targetRegionId, regions, startTime, endTime) => {
  const positions = [];
  
  // Thêm main selection nếu không phải target
  if (targetRegionId !== 'main' && startTime < endTime) {
    positions.push(startTime, endTime);
  }
  
  // Thêm các regions khác
  regions.forEach(region => {
    if (region.id !== targetRegionId) {
      positions.push(region.start, region.end);
    }
  });
  
  return positions;
};

/**
 * Áp dụng 8px buffer cho handle drag
 */
export const applyHandleBuffer = (handleType, newTime, conflictPositions, bufferTime, duration) => {
  let minBoundary = 0;
  let maxBoundary = duration;
  
  for (const pos of conflictPositions) {
    if (handleType === 'start') {
      if (pos > newTime) {
        maxBoundary = Math.min(maxBoundary, pos - bufferTime);
      } else {
        minBoundary = Math.max(minBoundary, pos + bufferTime);
      }
    } else { // handleType === 'end'
      if (pos < newTime) {
        minBoundary = Math.max(minBoundary, pos + bufferTime);
      } else {
        maxBoundary = Math.min(maxBoundary, pos - bufferTime);
      }
    }
  }
  
  return { min: Math.max(0, minBoundary), max: Math.min(duration, maxBoundary) };
};

/**
 * Áp dụng 8px buffer cho region body movement
 */
export const applyRegionBodyBuffer = (targetRegion, conflictRegions, bufferTime, duration) => {
  const regionDuration = targetRegion.end - targetRegion.start;
  let minStart = 0;
  let maxStart = duration - regionDuration;
  
  for (const conflict of conflictRegions) {
    const bufferedStart = conflict.start - bufferTime;
    const bufferedEnd = conflict.end + bufferTime;
    
    // Tránh overlap khi di chuyển region
    if (bufferedEnd <= targetRegion.start + regionDuration) {
      minStart = Math.max(minStart, bufferedEnd);
    }
    if (bufferedStart >= targetRegion.start) {
      maxStart = Math.min(maxStart, bufferedStart - regionDuration);
    }
  }
  
  return { 
    min: Math.max(0, minStart), 
    max: Math.max(minStart, Math.min(duration - regionDuration, maxStart))
  };
};

/**
 * 🎯 MAIN FUNCTION: Đơn giản hóa collision detection
 * 
 * Cách sử dụng:
 * 
 * 1. Khi drag handle của region:
 *    const boundaries = simplifiedCollisionDetection(regionId, 'start', newTime, ...);
 *    const safeTime = Math.max(boundaries.min, Math.min(newTime, boundaries.max));
 * 
 * 2. Khi drag body của region:
 *    const boundaries = simplifiedRegionBodyCollision(regionId, ...);
 *    const safeStart = Math.max(boundaries.min, Math.min(newStart, boundaries.max));
 */
export const simplifiedCollisionDetection = (
  targetRegionId, 
  handleType, 
  newTime, 
  regions, 
  startTime, 
  endTime, 
  duration, 
  canvasRef
) => {
  const bufferTime = calculateTimeBuffer(canvasRef, duration);
  const conflictPositions = getConflictPositions(targetRegionId, regions, startTime, endTime);
  
  return applyHandleBuffer(handleType, newTime, conflictPositions, bufferTime, duration);
};

export const simplifiedRegionBodyCollision = (
  targetRegionId,
  regions,
  startTime,
  endTime,
  duration,
  canvasRef
) => {
  const targetRegion = regions.find(r => r.id === targetRegionId);
  if (!targetRegion) return { min: 0, max: duration };
  
  const bufferTime = calculateTimeBuffer(canvasRef, duration);
  
  // Tạo danh sách conflict regions
  const conflictRegions = [];
  
  if (targetRegionId !== 'main' && startTime < endTime) {
    conflictRegions.push({ start: startTime, end: endTime });
  }
  
  regions.forEach(region => {
    if (region.id !== targetRegionId) {
      conflictRegions.push({ start: region.start, end: region.end });
    }
  });
  
  return applyRegionBodyBuffer(targetRegion, conflictRegions, bufferTime, duration);
};

/**
 * 🚀 PERFORMANCE TIP:
 * - Sử dụng useCallback() để memoize functions
 * - Cache collision results khi có thể
 * - Chỉ tính toán lại khi regions thay đổi
 */

/**
 * 🎯 DEBUGGING HELPER:
 * Log collision information for debugging
 */
export const debugCollision = (targetRegionId, handleType, newTime, boundaries) => {
  console.log(`🎯 Collision Debug [${targetRegionId}]:`, {
    handleType,
    newTime: newTime.toFixed(3),
    boundaries: {
      min: boundaries.min.toFixed(3),
      max: boundaries.max.toFixed(3)
    },
    bufferApplied: newTime !== Math.max(boundaries.min, Math.min(newTime, boundaries.max))
  });
}; 