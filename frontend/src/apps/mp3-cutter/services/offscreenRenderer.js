// 🎨 OFFSCREEN CANVAS RENDERER (Optimized)
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\services\offscreenRenderer.js

import { WAVEFORM_CONFIG } from '../utils/constants';

export class OffscreenWaveformRenderer {
  constructor() {
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.renderWorker = null;
    this.renderQueue = new Map();
    this.isInitialized = false;
    this._fallback = false;
    this.initialize();
  }

  async initialize() {
    try {
      if (typeof OffscreenCanvas === 'undefined') {
        this._fallback = true;
        return;
      }
      this.offscreenCanvas = new OffscreenCanvas(800, WAVEFORM_CONFIG.HEIGHT);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      this.offscreenCtx.imageSmoothingEnabled = false;
      this.offscreenCtx.textBaseline = 'middle';

      if (window.Worker) {
        try {
          this.renderWorker = new Worker('/workers/render-worker.js');
          this.renderWorker.onmessage = this._handleWorkerMessage.bind(this);
          this.renderWorker.onerror = this._handleWorkerError.bind(this);
        } catch {
          this._fallback = true;
        }
      }
      this.isInitialized = true;
    } catch {
      this._fallback = true;
    }
  }

  async renderWaveformBackground(waveformData, options = {}) {
    if (!this.isInitialized || this._fallback)
      return this.renderWaveformMainThread(waveformData, options);

    const width = options.width || 800;
    const height = options.height || WAVEFORM_CONFIG.HEIGHT;
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }

    const renderId = Date.now() + Math.random();
    const renderData = {
      waveformData,
      width,
      height,
      volume: options.volume ?? 1,
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 100,
      duration: options.duration ?? 100,
      fadeIn: options.fadeIn ?? 0,
      fadeOut: options.fadeOut ?? 0,
      isInverted: options.isInverted ?? false,
      style: {
        backgroundColor: options.backgroundColor ?? 'transparent',
        waveformColor: options.waveformColor ?? '#7c3aed',
        selectionColor: options.selectionColor ?? 'rgba(139, 92, 246, 0.15)'
      }
    };

    return new Promise((resolve, reject) => {
      try {
        if (this.renderWorker) {
          this.renderWorker.postMessage(
            { type: 'render-waveform', id: renderId, data: renderData, canvas: this.offscreenCanvas },
            [this.offscreenCanvas]
          );
          this.renderQueue.set(renderId, { resolve, reject });
        } else {
          this.executeRender(renderData).then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async renderWaveformMainThread(waveformData, options = {}) {
    const width = options.width || 800;
    const height = options.height || WAVEFORM_CONFIG.HEIGHT;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    await this.executeRender({
      waveformData,
      width,
      height,
      volume: options.volume ?? 1,
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 100,
      duration: options.duration ?? 100,
      fadeIn: options.fadeIn ?? 0,
      fadeOut: options.fadeOut ?? 0,
      isInverted: options.isInverted ?? false,
      style: {
        backgroundColor: options.backgroundColor ?? 'transparent',
        waveformColor: options.waveformColor ?? '#7c3aed',
        selectionColor: options.selectionColor ?? 'rgba(139, 92, 246, 0.15)'
      }
    }, ctx);

    return canvas;
  }

  async executeRender(renderData, ctx = this.offscreenCtx) {
    const { waveformData, width, height, style } = renderData;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99,102,241,0.04)');
    gradient.addColorStop(1, 'rgba(168,85,247,0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    await this._renderBars(ctx, renderData);
    this._renderSelection(ctx, renderData);

    return this.offscreenCanvas || ctx.canvas;
  }

  async _renderBars(ctx, data) {
    const {
      waveformData, width, height, volume, startTime, endTime, duration,
      fadeIn, fadeOut, isInverted, style
    } = data;
    const centerY = height / 2;
    const barW = width / waveformData.length;
    const FLAT_PX = 1;
    const MAX_PX = 65;
    const volPct = Math.max(0, Math.min(100, volume * 100));
    const scalingPx = (volPct / 2) * (MAX_PX / 50);
    const absBarH = FLAT_PX + scalingPx;

    const fadeMultiplier = (i) => {
      if (!fadeIn && !fadeOut) return 1;
      const time = (i / waveformData.length) * duration;
      if (isInverted) {
        if (fadeIn && time < startTime) {
          const fadeInDur = Math.min(fadeIn, startTime);
          if (time <= fadeInDur) return Math.max(0.05, time / fadeInDur);
        }
        if (fadeOut && time >= endTime) {
          const outDur = Math.min(fadeOut, duration - endTime);
          const fadeStart = duration - outDur;
          if (time >= fadeStart) return Math.max(0.05, (duration - time) / outDur);
        }
        return 1;
      } else {
        const rel = (time - startTime) / (endTime - startTime);
        if (fadeIn && rel < fadeIn / (endTime - startTime))
          return Math.max(0.05, rel / (fadeIn / (endTime - startTime)));
        if (fadeOut && rel > 1 - fadeOut / (endTime - startTime))
          return Math.max(0.05, (1 - rel) / (fadeOut / (endTime - startTime)));
        return 1;
      }
    };

    ctx.save();
    let lastStyle = null;
    const batch = 200;
    for (let i = 0; i < waveformData.length; i++) {
      const value = waveformData[i];
      const time = (i / waveformData.length) * duration;
      let h = absBarH * value;
      if (fadeIn > 0 || fadeOut > 0)
        h = FLAT_PX + (h - FLAT_PX) * fadeMultiplier(i);

      const x = i * barW;
      const inSelection = isInverted
        ? (time < startTime || time > endTime)
        : (time >= startTime && time <= endTime);
      const thisStyle = inSelection ? style.waveformColor : '#e2e8f0';
      if (thisStyle !== lastStyle) {
        ctx.fillStyle = thisStyle;
        lastStyle = thisStyle;
      }
      ctx.fillRect(Math.floor(x), centerY - h, Math.max(0.4, barW), h * 2);

      // Yield every batch bars (keep UI smooth in main thread)
      if (i % batch === 0) await Promise.resolve();
    }
    ctx.restore();
  }

  _renderSelection(ctx, data) {
    const { width, height, startTime, endTime, duration, style } = data;
    if (startTime < endTime) {
      const sx = (startTime / duration) * width;
      const ex = (endTime / duration) * width;
      ctx.fillStyle = style.selectionColor;
      ctx.fillRect(sx, 0, ex - sx, height);
    }
  }

  _handleWorkerMessage(e) {
    const { type, id, result, error } = e.data;
    if (error) return;
    if (type === 'render-complete') this._resolveQueue(id, result);
  }

  _handleWorkerError() {
    this._fallback = true;
  }

  _resolveQueue(id, result) {
    const q = this.renderQueue.get(id);
    if (q) {
      q.resolve(result);
      this.renderQueue.delete(id);
    }
  }

  dispose() {
    if (this.renderWorker) {
      this.renderWorker.terminate();
      this.renderWorker = null;
    }
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.renderQueue.clear();
  }
}
