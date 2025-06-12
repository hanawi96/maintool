// 🚀 **ULTRA-OPTIMIZED HIGH DPI CANVAS UTILITIES**: Siêu nhanh, siêu mượt, siêu nhẹ
// Chỉ enable High DPI khi device thực sự hưởng lợi

// 🎯 **PERFORMANCE THRESHOLDS**: Ngưỡng hiệu suất để quyết định enable High DPI
const PERFORMANCE_CONFIG = {
  MIN_DPR_FOR_HIGH_DPI: 1.5,        // Chỉ enable khi DPR >= 1.5
  MAX_CANVAS_AREA: 2000000,         // Max 2M pixels (1920x1040 ở DPR 1)
  PERFORMANCE_BUDGET_MS: 16,        // 60fps = 16ms per frame
  FALLBACK_THRESHOLD_MS: 33,        // Fallback khi > 30fps (33ms)
  MEMORY_THRESHOLD_MB: 50,          // Max 50MB memory usage
  CPU_USAGE_THRESHOLD: 0.8          // Max 80% CPU usage
};

// 🔍 **DEVICE CAPABILITY DETECTION**: Phát hiện khả năng device
export const detectDeviceCapability = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // 🎯 **HARDWARE ACCELERATION CHECK**: Kiểm tra GPU acceleration
  const hasHardwareAcceleration = !!(
    ctx.getContextAttributes?.()?.accelerated || 
    window.WebGLRenderingContext
  );
  
  // 🧠 **MEMORY ESTIMATION**: Ước tính memory available
  const estimateAvailableMemory = () => {
    if ('memory' in performance) {
      return performance.memory.jsHeapSizeLimit / (1024 * 1024); // MB
    }
    // Fallback estimation based on device type
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 512 : 2048; // Conservative estimates
  };
  
  // ⚡ **CPU CORES DETECTION**: Ước tính CPU power
  const estimatedCores = navigator.hardwareConcurrency || 4;
  
  // 📱 **DEVICE CLASSIFICATION**: Phân loại device
  const deviceClass = (() => {
    const memory = estimateAvailableMemory();
    if (memory >= 4096 && estimatedCores >= 8 && hasHardwareAcceleration) return 'high-end';
    if (memory >= 2048 && estimatedCores >= 4) return 'mid-range';
    return 'low-end';
  })();
  
  return {
    hasHardwareAcceleration,
    estimatedMemoryMB: estimateAvailableMemory(),
    estimatedCores,
    deviceClass,
    shouldUseHighDPI: deviceClass !== 'low-end' && hasHardwareAcceleration
  };
};

// 🎯 **INTELLIGENT DPR CALCULATION**: Tính toán DPR thông minh
export const getOptimalDevicePixelRatio = (canvasWidth, canvasHeight) => {
  const actualDPR = window.devicePixelRatio || 1;
  const deviceCapability = detectDeviceCapability();
    // 🚫 **EARLY EXIT**: Không dùng High DPI cho low-end devices
  if (!deviceCapability.shouldUseHighDPI || actualDPR < PERFORMANCE_CONFIG.MIN_DPR_FOR_HIGH_DPI) {
    // Disabled for low-end device or low DPR
    return 1;
  }
  
  // 🎯 **CANVAS AREA CHECK**: Giới hạn canvas size
  const canvasArea = canvasWidth * canvasHeight;
  const maxAreaForHighDPI = PERFORMANCE_CONFIG.MAX_CANVAS_AREA / (actualDPR * actualDPR);
    if (canvasArea > maxAreaForHighDPI) {
    const limitedDPR = Math.sqrt(PERFORMANCE_CONFIG.MAX_CANVAS_AREA / canvasArea);
    // Limited DPR due to large canvas for performance
    return Math.max(1, Math.min(limitedDPR, actualDPR));
  }
    // 🧠 **MEMORY-BASED LIMITING**: Giới hạn theo memory
  const memoryUsageMB = (canvasWidth * canvasHeight * actualDPR * actualDPR * 4) / (1024 * 1024);
  if (memoryUsageMB > PERFORMANCE_CONFIG.MEMORY_THRESHOLD_MB) {
    const memoryLimitedDPR = Math.sqrt(PERFORMANCE_CONFIG.MEMORY_THRESHOLD_MB * 1024 * 1024 / (canvasWidth * canvasHeight * 4));
    // Limited DPR due to memory constraints
    return Math.max(1, Math.min(memoryLimitedDPR, actualDPR));
  }
  
  // Using full DPR for optimal quality
  return actualDPR;
};

// 🚀 **ULTRA-FAST CANVAS SETUP**: Setup canvas với performance monitoring
export const setupUltraFastHighDPICanvas = (canvas, logicalWidth, logicalHeight) => {
  const startTime = performance.now();
  
  // 🎯 **OPTIMAL DPR**: Tính toán DPR tối ưu
  const optimalDPR = getOptimalDevicePixelRatio(logicalWidth, logicalHeight);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // 🎯 **LOGICAL SIZE**: Size hiển thị
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  
  // 🎯 **PHYSICAL SIZE**: Size thực tế
  const physicalWidth = Math.round(logicalWidth * optimalDPR);
  const physicalHeight = Math.round(logicalHeight * optimalDPR);
  
  // 🔥 **ATOMIC UPDATE**: Update canvas dimensions atomically
  canvas.width = physicalWidth;
  canvas.height = physicalHeight;
  
  // 🎯 **CONTEXT SCALING**: Scale context một lần duy nhất
  ctx.setTransform(optimalDPR, 0, 0, optimalDPR, 0, 0);
  
  // ⚡ **PERFORMANCE HINTS**: Optimize context settings
  if (optimalDPR > 1) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  } else {
    ctx.imageSmoothingEnabled = false; // Faster for non-High DPI
  }
  
  // 🎯 **PIXEL PERFECT RENDERING**: Half-pixel offset cho crisp lines
  if (optimalDPR === Math.floor(optimalDPR)) {
    ctx.translate(0.5, 0.5); // Only for integer DPR
  }
    const setupTime = performance.now() - startTime;
  // Ultra-fast setup completed in optimal time
  
  return {
    ctx,
    dpr: optimalDPR,
    logicalWidth,
    logicalHeight,
    physicalWidth,
    physicalHeight,
    setupTime,
    memoryUsageMB: (physicalWidth * physicalHeight * 4) / (1024 * 1024)
  };
};

// 📊 **PERFORMANCE MONITOR**: Monitor performance và auto-adjust
export class PerformanceMonitor {
  constructor() {
    this.frameTimings = [];
    this.maxSamples = 30; // Keep last 30 frames
    this.performanceBudget = PERFORMANCE_CONFIG.PERFORMANCE_BUDGET_MS;
    this.fallbackThreshold = PERFORMANCE_CONFIG.FALLBACK_THRESHOLD_MS;
    this.isInFallbackMode = false;
    this.consecutiveSlowFrames = 0;
    this.maxConsecutiveSlowFrames = 3;
  }
  
  // ⏱️ **FRAME TIMING**: Record frame timing
  recordFrameTiming(startTime, endTime) {
    const frameTime = endTime - startTime;
    this.frameTimings.push(frameTime);
    
    // 🔥 **SLIDING WINDOW**: Keep only recent samples
    if (this.frameTimings.length > this.maxSamples) {
      this.frameTimings.shift();
    }
    
    // 📊 **PERFORMANCE ANALYSIS**: Analyze performance
    if (frameTime > this.fallbackThreshold) {
      this.consecutiveSlowFrames++;
      if (this.consecutiveSlowFrames >= this.maxConsecutiveSlowFrames) {
        this.triggerFallbackMode();
      }
    } else {
      this.consecutiveSlowFrames = 0;
      if (this.isInFallbackMode && this.getAverageFrameTime() < this.performanceBudget) {
        this.exitFallbackMode();
      }
    }
    
    return {
      frameTime,
      averageFrameTime: this.getAverageFrameTime(),
      isInFallbackMode: this.isInFallbackMode,
      recommendation: this.getPerformanceRecommendation()
    };
  }
  
  // 📈 **AVERAGE FRAME TIME**: Calculate average
  getAverageFrameTime() {
    if (this.frameTimings.length === 0) return 0;
    return this.frameTimings.reduce((sum, time) => sum + time, 0) / this.frameTimings.length;
  }
  
  // 🚨 **FALLBACK MODE**: Enter fallback mode
  triggerFallbackMode() {
    if (!this.isInFallbackMode) {
      this.isInFallbackMode = true;
      console.warn(`🐌 [Performance] Entering fallback mode - average frame time: ${this.getAverageFrameTime().toFixed(2)}ms`);
    }
  }
    // ✅ **EXIT FALLBACK**: Exit fallback mode
  exitFallbackMode() {
    if (this.isInFallbackMode) {
      this.isInFallbackMode = false;
      // Performance improved - exiting fallback mode
    }
  }
  
  // 💡 **RECOMMENDATIONS**: Get performance recommendations
  getPerformanceRecommendation() {
    const avgTime = this.getAverageFrameTime();
    
    if (avgTime > this.fallbackThreshold) {
      return 'disable-high-dpi';
    } else if (avgTime > this.performanceBudget) {
      return 'reduce-quality';
    } else if (avgTime < this.performanceBudget * 0.5) {
      return 'increase-quality';
    }
    return 'optimal';
  }
  
  // 📊 **PERFORMANCE STATS**: Get detailed stats
  getStats() {
    return {
      averageFrameTime: this.getAverageFrameTime(),
      minFrameTime: Math.min(...this.frameTimings),
      maxFrameTime: Math.max(...this.frameTimings),
      samples: this.frameTimings.length,
      isInFallbackMode: this.isInFallbackMode,
      consecutiveSlowFrames: this.consecutiveSlowFrames
    };
  }
} 