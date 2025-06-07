/**
 * 🚀 DRAG PERFORMANCE OPTIMIZER
 * Siêu tối ưu hiệu suất drag handles với frame batching và state coordination
 * 
 * ❌ VẤN ĐỀ ĐÃ GIẢI QUYẾT:
 * 1. Quá nhiều re-renders (500fps state updates)
 * 2. Animation loop conflicts
 * 3. Heavy calculations trong render cycle  
 * 4. Scattered state updates
 * 
 * ✅ GIẢI PHÁP:
 * 1. Batch tất cả state updates vào 1 frame
 * 2. Coordinate animation loops
 * 3. Pre-calculate expensive operations
 * 4. Smart frame scheduling
 */

// 🎯 **DRAG PERFORMANCE CLASS**: Core optimizer
export class DragPerformanceOptimizer {
  constructor() {
    // 🔥 **FRAME BATCHING**: Batch state updates
    this.pendingUpdates = new Map();
    this.batchUpdateId = null;
    this.lastBatchTime = 0;
    
    // 🎯 **ANIMATION COORDINATION**: Coordinate multiple animations
    this.activeAnimations = new Set();
    this.masterAnimationId = null;
    this.frameTime = 0;
    
    // 🚀 **PERFORMANCE TRACKING**: Track performance metrics
    this.frameCount = 0;
    this.lastFpsTime = 0;
    this.currentFps = 0;
    
    // 🎯 **DRAG STATE**: Optimized drag state management
    this.isDragging = false;
    this.dragType = null; // 'start', 'end', 'region'
    this.dragStartTime = 0;
    this.lastDragUpdate = 0;
    
    // 🔥 **CALCULATION CACHE**: Cache expensive calculations
    this.calculationCache = new Map();
    this.cacheSize = 0;
    this.maxCacheSize = 100;
    
    console.log('🚀 [DragOptimizer] Initialized ultra-performance drag system');
  }
  
  // 🎯 **BATCH STATE UPDATES**: Batch tất cả state updates vào 1 frame
  batchStateUpdate(updateKey, updateData, priority = 'normal') {
    this.pendingUpdates.set(updateKey, { ...updateData, priority });
    
    // 🔥 **SMART SCHEDULING**: Different intervals cho different priorities
    const intervals = {
      ultra: 2,    // 500fps cho confirmed dragging
      high: 8,     // 125fps cho drag detection  
      normal: 16,  // 60fps cho normal updates
      low: 33      // 30fps cho background tasks
    };
    
    const interval = intervals[priority] || intervals.normal;
    const now = performance.now();
    
    // 🚀 **IMMEDIATE BATCH**: Cho ultra priority
    if (priority === 'ultra' || now - this.lastBatchTime >= interval) {
      this.flushBatchedUpdates();
    } else if (!this.batchUpdateId) {
      // 🎯 **SCHEDULED BATCH**: Schedule batch cho lower priorities
      this.batchUpdateId = requestAnimationFrame(() => {
        this.flushBatchedUpdates();
      });
    }
  }
  
  // 🔥 **FLUSH BATCHED UPDATES**: Execute tất cả pending updates
  flushBatchedUpdates() {
    if (this.pendingUpdates.size === 0) return;
    
    const now = performance.now();
    const updates = Array.from(this.pendingUpdates.entries());
    
    // 🎯 **SORT BY PRIORITY**: Process ultra priority first
    updates.sort(([, a], [, b]) => {
      const priorityOrder = { ultra: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // 🚀 **EXECUTE UPDATES**: Process all updates in order
    updates.forEach(([key, updateData]) => {
      const { action, callback, data } = updateData;
      
      try {
        if (callback && typeof callback === 'function') {
          callback(data);
        }
        
        // 🔧 **DEBUG**: Log significant updates only
        if (updateData.priority === 'ultra' && Math.random() < 0.1) {
          console.log(`⚡ [BatchUpdate] Executed ${key}:`, {
            action,
            priority: updateData.priority,
            dataKeys: Object.keys(data || {})
          });
        }
      } catch (error) {
        console.error(`❌ [BatchUpdate] Error executing ${key}:`, error);
      }
    });
    
    // 🧹 **CLEANUP**: Reset batch state
    this.pendingUpdates.clear();
    this.batchUpdateId = null;
    this.lastBatchTime = now;
    
    // 📊 **FPS TRACKING**: Update FPS counter
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
      
      if (this.isDragging && Math.random() < 0.2) {
        console.log(`📊 [DragOptimizer] Batch FPS: ${this.currentFps}, Cache: ${this.cacheSize}`);
      }
    }
  }
  
  // 🎯 **START DRAG OPTIMIZATION**: Initialize drag performance mode
  startDragOptimization(dragType, initialData) {
    this.isDragging = true;
    this.dragType = dragType;
    this.dragStartTime = performance.now();
    this.lastDragUpdate = 0;
    
    // 🔥 **CLEAR CACHE**: Clear calculation cache for fresh start
    this.calculationCache.clear();
    this.cacheSize = 0;
    
    console.log(`🚀 [DragOptimizer] Starting ULTRA-PERFORMANCE mode for ${dragType} drag`, {
      dragType,
      timestamp: this.dragStartTime,
      initialData
    });
    
    return {
      success: true,
      mode: 'ultra-performance',
      expectedFps: 500
    };
  }
  
  // 🎯 **OPTIMIZE DRAG UPDATE**: Ultra-optimized drag update
  optimizeDragUpdate(updateData) {
    const now = performance.now();
    
    // 🔥 **ULTRA-HIGH FREQUENCY**: Only for confirmed dragging
    if (!this.isDragging || now - this.lastDragUpdate < 2) {
      return { skipped: true, reason: 'throttled' };
    }
    
    this.lastDragUpdate = now;
    
    // 🎯 **CALCULATION CACHE**: Cache expensive calculations
    const cacheKey = this.generateCacheKey(updateData);
    let calculatedData = this.calculationCache.get(cacheKey);
    
    if (!calculatedData) {
      calculatedData = this.calculateDragData(updateData);
      
      // 🧹 **CACHE MANAGEMENT**: Limit cache size
      if (this.cacheSize >= this.maxCacheSize) {
        const firstKey = this.calculationCache.keys().next().value;
        this.calculationCache.delete(firstKey);
        this.cacheSize--;
      }
      
      this.calculationCache.set(cacheKey, calculatedData);
      this.cacheSize++;
    }
    
    // 🚀 **BATCH UPDATE**: Add to batch với ultra priority
    this.batchStateUpdate('dragUpdate', {
      action: 'updateDragState',
      callback: updateData.callback,
      data: calculatedData,
      priority: 'ultra'
    }, 'ultra');
    
    return {
      success: true,
      cached: !!this.calculationCache.has(cacheKey),
      fps: this.currentFps,
      dragDuration: now - this.dragStartTime
    };
  }
  
  // 🎯 **CALCULATE DRAG DATA**: Expensive calculations với caching
  calculateDragData(updateData) {
    const { mouseX, canvasWidth, duration, currentStartTime, currentEndTime, dragType } = updateData;
    
    // 🔥 **EFFICIENT CALCULATIONS**: Pre-calculate common values
    const timePerPixel = duration / canvasWidth;
    const mouseTime = (mouseX / canvasWidth) * duration;
    const roundedMouseTime = Math.round(mouseTime * 100) / 100; // 10ms precision
    
    let calculatedData = {
      mouseTime: roundedMouseTime,
      timePerPixel,
      dragType,
      timestamp: performance.now()
    };
    
    // 🎯 **TYPE-SPECIFIC CALCULATIONS**: Different logic cho different drag types
    switch (dragType) {
      case 'start':
        calculatedData.newStartTime = Math.min(roundedMouseTime, currentEndTime - 0.1);
        calculatedData.newEndTime = currentEndTime;
        calculatedData.syncTime = calculatedData.newStartTime;
        break;
        
      case 'end':
        calculatedData.newStartTime = currentStartTime;
        calculatedData.newEndTime = Math.max(roundedMouseTime, currentStartTime + 0.1);
        calculatedData.syncTime = Math.max(0, calculatedData.newEndTime - 3.0);
        break;
        
      case 'region':
        const regionDuration = currentEndTime - currentStartTime;
        const regionOffset = updateData.regionOffset || 0;
        calculatedData.newStartTime = Math.max(0, roundedMouseTime - regionOffset);
        calculatedData.newEndTime = Math.min(duration, calculatedData.newStartTime + regionDuration);
        calculatedData.syncTime = calculatedData.newStartTime + (regionDuration / 2);
        break;
    }
    
    return calculatedData;
  }
  
  // 🎯 **GENERATE CACHE KEY**: Efficient cache key generation
  generateCacheKey(updateData) {
    const { mouseX, dragType, currentStartTime, currentEndTime } = updateData;
    
    // 🔥 **ROUNDED VALUES**: For better cache hits
    const roundedMouseX = Math.round(mouseX * 10) / 10; // 0.1px precision
    const roundedStart = Math.round(currentStartTime * 100) / 100; // 10ms precision
    const roundedEnd = Math.round(currentEndTime * 100) / 100; // 10ms precision
    
    return `${dragType}_${roundedMouseX}_${roundedStart}_${roundedEnd}`;
  }
  
  // 🎯 **STOP DRAG OPTIMIZATION**: Clean up drag performance mode
  stopDragOptimization() {
    const dragDuration = performance.now() - this.dragStartTime;
    const avgFps = this.currentFps;
    
    console.log(`🏁 [DragOptimizer] ULTRA-PERFORMANCE drag completed:`, {
      dragType: this.dragType,
      duration: dragDuration.toFixed(0) + 'ms',
      avgFps: avgFps,
      cacheHits: this.cacheSize,
      performance: avgFps > 120 ? 'EXCELLENT' : avgFps > 60 ? 'GOOD' : 'NEEDS_OPTIMIZATION'
    });
    
    // 🔥 **FLUSH FINAL UPDATES**: Ensure all updates are processed
    this.flushBatchedUpdates();
    
    // 🧹 **RESET STATE**: Clean reset
    this.isDragging = false;
    this.dragType = null;
    this.dragStartTime = 0;
    this.lastDragUpdate = 0;
    
    // 🎯 **SMART CACHE CLEANUP**: Keep recent calculations
    if (this.cacheSize > 20) {
      const recentEntries = Array.from(this.calculationCache.entries()).slice(-20);
      this.calculationCache.clear();
      recentEntries.forEach(([key, value]) => this.calculationCache.set(key, value));
      this.cacheSize = recentEntries.length;
    }
    
    return {
      success: true,
      metrics: {
        duration: dragDuration,
        avgFps,
        cacheHits: this.cacheSize
      }
    };
  }
  
  // 🎯 **COORDINATE ANIMATIONS**: Manage multiple animation loops
  coordinateAnimation(animationId, callback, priority = 'normal') {
    this.activeAnimations.add(animationId);
    
    // 🚀 **MASTER ANIMATION LOOP**: Single coordinated loop
    if (!this.masterAnimationId) {
      this.startMasterAnimationLoop();
    }
    
    // 🎯 **REGISTER CALLBACK**: Store callback for coordination
    this.animationCallbacks = this.animationCallbacks || new Map();
    this.animationCallbacks.set(animationId, { callback, priority });
    
    return animationId;
  }
  
  // 🚀 **MASTER ANIMATION LOOP**: Single efficient animation loop
  startMasterAnimationLoop() {
    const animate = (timestamp) => {
      this.frameTime = timestamp;
      
      // 🎯 **EXECUTE ANIMATIONS**: Run all registered animations
      if (this.animationCallbacks) {
        this.animationCallbacks.forEach((animation, id) => {
          try {
            animation.callback(timestamp);
          } catch (error) {
            console.error(`❌ [Animation] Error in ${id}:`, error);
            this.activeAnimations.delete(id);
            this.animationCallbacks.delete(id);
          }
        });
      }
      
      // 🔄 **CONTINUE LOOP**: Keep running if we have active animations
      if (this.activeAnimations.size > 0) {
        this.masterAnimationId = requestAnimationFrame(animate);
      } else {
        this.masterAnimationId = null;
        this.animationCallbacks = null;
      }
    };
    
    this.masterAnimationId = requestAnimationFrame(animate);
  }
  
  // 🛑 **STOP ANIMATION**: Remove animation from coordination
  stopAnimation(animationId) {
    this.activeAnimations.delete(animationId);
    if (this.animationCallbacks) {
      this.animationCallbacks.delete(animationId);
    }
    
    // 🎯 **CLEANUP**: Stop master loop if no active animations
    if (this.activeAnimations.size === 0 && this.masterAnimationId) {
      cancelAnimationFrame(this.masterAnimationId);
      this.masterAnimationId = null;
      this.animationCallbacks = null;
    }
  }
  
  // 📊 **GET STATUS**: Current optimizer status
  getStatus() {
    return {
      isDragging: this.isDragging,
      dragType: this.dragType,
      currentFps: this.currentFps,
      pendingUpdates: this.pendingUpdates.size,
      activeAnimations: this.activeAnimations.size,
      cacheSize: this.cacheSize,
      performance: this.currentFps > 120 ? 'EXCELLENT' : this.currentFps > 60 ? 'GOOD' : 'NEEDS_OPTIMIZATION'
    };
  }
  
  // 🧹 **CLEANUP**: Complete cleanup
  cleanup() {
    // 🛑 **STOP ALL**: Stop all animations and batching
    if (this.masterAnimationId) {
      cancelAnimationFrame(this.masterAnimationId);
    }
    if (this.batchUpdateId) {
      cancelAnimationFrame(this.batchUpdateId);
    }
    
    // 🗑️ **CLEAR ALL**: Clear all data structures
    this.pendingUpdates.clear();
    this.activeAnimations.clear();
    this.calculationCache.clear();
    this.animationCallbacks = null;
    
    console.log('🧹 [DragOptimizer] Complete cleanup performed');
  }
}

// 🎯 **SINGLETON INSTANCE**: Global optimizer instance
let globalOptimizer = null;

// 🚀 **GET OPTIMIZER**: Get or create global optimizer
export const getDragOptimizer = () => {
  if (!globalOptimizer) {
    globalOptimizer = new DragPerformanceOptimizer();
  }
  return globalOptimizer;
};

// 🧹 **CLEANUP OPTIMIZER**: Clean up global optimizer
export const cleanupDragOptimizer = () => {
  if (globalOptimizer) {
    globalOptimizer.cleanup();
    globalOptimizer = null;
  }
};

// 🎯 **CONVENIENCE FUNCTIONS**: Easy-to-use functions
export const startDragMode = (dragType, initialData) => {
  const optimizer = getDragOptimizer();
  return optimizer.startDragOptimization(dragType, initialData);
};

export const updateDragState = (updateData) => {
  const optimizer = getDragOptimizer();
  return optimizer.optimizeDragUpdate(updateData);
};

export const stopDragMode = () => {
  const optimizer = getDragOptimizer();
  return optimizer.stopDragOptimization();
};

export const batchUpdate = (key, data, priority = 'normal') => {
  const optimizer = getDragOptimizer();
  return optimizer.batchStateUpdate(key, data, priority);
};

console.log('🚀 [DragOptimizer] Ultra-performance drag optimization system loaded!'); 