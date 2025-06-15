// 🎨 **OFFSCREEN CANVAS RENDERER** - Background rendering without blocking UI
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\services\offscreenRenderer.js

import { WAVEFORM_CONFIG } from '../utils/constants';

export class OffscreenWaveformRenderer {
  constructor() {
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.renderWorker = null;
    this.renderQueue = [];
    this.isInitialized = false;
    
    this.initialize();
  }

  // 🚀 **INITIALIZATION**: Setup OffscreenCanvas và render worker
  async initialize() {
    try {
      // 🔧 **FEATURE DETECTION**: Check OffscreenCanvas support
      if (typeof OffscreenCanvas === 'undefined') {
        console.warn('⚠️ [OffscreenRenderer] OffscreenCanvas not supported, falling back to main thread');
        this.fallbackToMainThread = true;
        return;
      }

      // 🎯 **CREATE OFFSCREEN CANVAS**: Tạo canvas cho background rendering
      this.offscreenCanvas = new OffscreenCanvas(800, WAVEFORM_CONFIG.HEIGHT);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      
      // ⚡ **PERFORMANCE SETUP**: Optimize context settings
      this.offscreenCtx.imageSmoothingEnabled = false;
      this.offscreenCtx.textBaseline = 'middle';
      
      // 🔧 **RENDER WORKER**: Setup dedicated render worker if available
      if (window.Worker) {
        try {
          this.renderWorker = new Worker('/workers/render-worker.js');
          this.setupWorkerHandlers();
        } catch (error) {
          console.warn('⚠️ [OffscreenRenderer] Render worker failed, using main thread:', error);
        }
      }

      this.isInitialized = true;

    } catch (error) {
      console.error('❌ [OffscreenRenderer] Initialization failed:', error);
      this.fallbackToMainThread = true;
    }
  }

  // 🔧 **WORKER HANDLERS**: Setup communication với render worker
  setupWorkerHandlers() {
    this.renderWorker.onmessage = (e) => {
      const { type, id, result, error } = e.data;
      
      if (error) {
        console.error('❌ [OffscreenRenderer] Worker error:', error);
        return;
      }

      switch (type) {
        case 'render-complete':
          this.handleRenderComplete(id, result);
          break;
        case 'progress':
          this.handleRenderProgress(id, result.progress);
          break;
      }
    };

    this.renderWorker.onerror = (error) => {
      console.error('❌ [OffscreenRenderer] Worker error:', error);
      this.fallbackToMainThread = true;
    };
  }

  // 🎨 **BACKGROUND RENDER**: Render waveform ở background thread
  async renderWaveformBackground(waveformData, options = {}) {
    if (!this.isInitialized || this.fallbackToMainThread) {
      return this.renderWaveformMainThread(waveformData, options);
    }

    const renderId = Date.now() + Math.random();

    return new Promise((resolve, reject) => {
      try {
        // 🔧 **RESIZE OFFSCREEN CANVAS**: Resize to match target
        const targetWidth = options.width || 800;
        const targetHeight = options.height || WAVEFORM_CONFIG.HEIGHT;
        
        if (this.offscreenCanvas.width !== targetWidth || this.offscreenCanvas.height !== targetHeight) {
          this.offscreenCanvas.width = targetWidth;
          this.offscreenCanvas.height = targetHeight;
        }

        // 🎯 **PREPARE RENDER DATA**: Chuẩn bị data cho rendering
        const renderData = {
          waveformData,
          width: targetWidth,
          height: targetHeight,
          volume: options.volume || 1,
          startTime: options.startTime || 0,
          endTime: options.endTime || 100,
          duration: options.duration || 100,
          fadeIn: options.fadeIn || 0,
          fadeOut: options.fadeOut || 0,
          isInverted: options.isInverted || false,
          style: {
            backgroundColor: options.backgroundColor || 'transparent',
            waveformColor: options.waveformColor || '#7c3aed',
            selectionColor: options.selectionColor || 'rgba(139, 92, 246, 0.15)'
          }
        };

        // 🚀 **RENDER EXECUTION**: Execute render
        if (this.renderWorker) {
          // Use worker for complex rendering
          this.renderWorker.postMessage({
            type: 'render-waveform',
            id: renderId,
            data: renderData,
            canvas: this.offscreenCanvas
          }, [this.offscreenCanvas]);

          // Setup promise handlers
          this.renderQueue.push({ id: renderId, resolve, reject });
        } else {
          // Use main thread offscreen canvas
          this.executeRender(renderData).then(resolve).catch(reject);
        }

      } catch (error) {
        console.error('❌ [OffscreenRenderer] Background render failed:', error);
        reject(error);
      }
    });
  }

  // 🎨 **MAIN THREAD RENDER**: Fallback rendering
  async renderWaveformMainThread(waveformData, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 800;
    canvas.height = options.height || WAVEFORM_CONFIG.HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Execute render synchronously
    await this.executeRender({
      waveformData,
      width: canvas.width,
      height: canvas.height,
      volume: options.volume || 1,
      ...options
    }, ctx);

    return canvas;
  }

  // ⚡ **EXECUTE RENDER**: Core rendering logic
  async executeRender(renderData, ctx = this.offscreenCtx) {
    const startTime = performance.now();
    const { waveformData, width, height, volume, style } = renderData;

    try {
      // 🔧 **PERFORMANCE SETUP**
      ctx.imageSmoothingEnabled = false;
      
      // 🎯 **CLEAR CANVAS**
      ctx.clearRect(0, 0, width, height);
      
      // 🎨 **BACKGROUND GRADIENT**
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 🌊 **RENDER WAVEFORM BARS**
      await this.renderWaveformBars(ctx, renderData);
      
      // 🎯 **RENDER SELECTION OVERLAY** 
      this.renderSelectionOverlay(ctx, renderData);

      const renderTime = performance.now() - startTime;
      return this.offscreenCanvas || ctx.canvas;

    } catch (error) {
      console.error('❌ [OffscreenRenderer] Render execution failed:', error);
      throw error;
    }
  }
  // 🌊 **RENDER WAVEFORM BARS**: Optimized bar rendering
  async renderWaveformBars(ctx, renderData) {
    const { waveformData, width, height, volume, startTime, endTime, duration, fadeIn, fadeOut, isInverted } = renderData;
    const centerY = height / 2;
    const barWidth = width / waveformData.length;
    
    // 🎯 **VOLUME CALCULATION**: Linear scaling
    const FLAT_BAR_HEIGHT_PX = 1;
    const MAX_SCALING_PX = 65;
    const volumePercent = Math.max(0, Math.min(100, volume * 100));
    const volumeStep = volumePercent / 2;
    const scalingPixels = volumeStep * (MAX_SCALING_PX / 50);
    const absoluteBarHeightPx = FLAT_BAR_HEIGHT_PX + scalingPixels;

    // 🎯 **FADE CALCULATION HELPER**: Calculate fade multiplier for each bar position  
    const calculateFadeMultiplier = (barIndex, totalBars) => {
      if (!fadeIn && !fadeOut) return 1;
      
      const barTimePosition = (barIndex / totalBars) * duration;
      
      // 🆕 **INVERT MODE**: Different fade logic for inverted selection
      if (isInverted) {
        let fadeMultiplier = 1;
        
        // 🎯 **FADE IN - FIRST ACTIVE REGION** (0 to startTime)
        if (fadeIn > 0 && barTimePosition < startTime) {
          const activeRegionDuration = startTime;
          const fadeInDuration = Math.min(fadeIn, activeRegionDuration);
          
          if (barTimePosition <= fadeInDuration) {
            const fadeProgress = barTimePosition / fadeInDuration;
            fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
          }
        }
        
        // 🔥 **FADE OUT - SECOND ACTIVE REGION** (endTime to duration)
        if (fadeOut > 0 && barTimePosition >= endTime) {
          const activeRegionDuration = duration - endTime;
          const fadeOutDuration = Math.min(fadeOut, activeRegionDuration);
          const fadeOutStart = duration - fadeOutDuration;
          
          if (barTimePosition >= fadeOutStart) {
            const fadeProgress = (duration - barTimePosition) / fadeOutDuration;
            fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
          }
        }
        
        return fadeMultiplier;
      } else {
        // 🎯 **NORMAL MODE**: Original logic for selection region
        const relativePosition = (barTimePosition - startTime) / (endTime - startTime);
        let fadeMultiplier = 1;
        
        // 🎵 **FADE IN EFFECT**: Gradual increase from start
        if (fadeIn > 0 && relativePosition < (fadeIn / (endTime - startTime))) {
          const fadeProgress = relativePosition / (fadeIn / (endTime - startTime));
          fadeMultiplier *= Math.max(0.05, Math.min(1, fadeProgress));
        }
        
        // 🎵 **FADE OUT EFFECT**: Gradual decrease to end
        if (fadeOut > 0 && relativePosition > (1 - fadeOut / (endTime - startTime))) {
          const fadeProgress = (1 - relativePosition) / (fadeOut / (endTime - startTime));
          fadeMultiplier *= Math.max(0.05, Math.min(1, fadeProgress));
        }
        
        return fadeMultiplier;
      }
    };

    ctx.save();
    
    // 🚀 **BATCH RENDERING**: Render bars in batches for performance
    const batchSize = 100;
    for (let batchStart = 0; batchStart < waveformData.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, waveformData.length);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const value = waveformData[i];
        const barTime = (i / waveformData.length) * duration;
        
        // 🎨 **BAR HEIGHT CALCULATION** with fade effects
        let effectiveBarHeight = absoluteBarHeightPx * value;
        
        // 🎵 **APPLY FADE EFFECTS**: Modify bar height based on fade position
        if (fadeIn > 0 || fadeOut > 0) {
          const fadeMultiplier = calculateFadeMultiplier(i, waveformData.length);
          effectiveBarHeight = FLAT_BAR_HEIGHT_PX + (effectiveBarHeight - FLAT_BAR_HEIGHT_PX) * fadeMultiplier;
        }
        
        const x = i * barWidth;        
        // 🎯 **SELECTION LOGIC**: Determine if bar is in active region
        let isInSelection;
        if (isInverted) {
          // In invert mode, active regions are outside the selection
          isInSelection = barTime < startTime || barTime > endTime;
        } else {
          // In normal mode, active region is inside the selection
          isInSelection = barTime >= startTime && barTime <= endTime;
        }
        
        ctx.fillStyle = isInSelection ? '#7c3aed' : '#e2e8f0';
        
        // 🎨 **DRAW BAR**
        ctx.fillRect(Math.floor(x), centerY - effectiveBarHeight, Math.max(0.4, barWidth), effectiveBarHeight * 2);
      }

      // 🔄 **YIELD CONTROL**: Cho phép other operations
      if (batchStart % (batchSize * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    ctx.restore();
  }

  // 🎯 **RENDER SELECTION OVERLAY**: Selection highlight
  renderSelectionOverlay(ctx, renderData) {
    const { width, height, startTime, endTime, duration, style } = renderData;
    
    if (startTime < endTime) {
      const startPercent = startTime / duration;
      const endPercent = endTime / duration;
      const startX = startPercent * width;
      const endX = endPercent * width;
      
      ctx.fillStyle = style.selectionColor || 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
    }
  }

  // 🔄 **HANDLE RENDER COMPLETE**: Process completed renders
  handleRenderComplete(id, result) {
    const queueItem = this.renderQueue.find(item => item.id === id);
    if (queueItem) {
      queueItem.resolve(result);
      this.renderQueue = this.renderQueue.filter(item => item.id !== id);
    }
  }


  // 🧹 **CLEANUP**: Clean up resources
  dispose() {
    if (this.renderWorker) {
      this.renderWorker.terminate();
    }
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.renderQueue = [];
  }
}
