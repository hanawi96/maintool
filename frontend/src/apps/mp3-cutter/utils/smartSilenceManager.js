// 🚀 Smart Silence Manager - Ultra-lightweight hybrid approach
class SmartSilenceManager {
  constructor() {
    this.worker = null;
    this.callbacks = new Map();
  }
  
  init() {
    if (!this.worker) {
      this.worker = new Worker('/workers/smart-silence-worker.js');
      this.worker.onmessage = (e) => {
        const { type, id, ...data } = e.data;
        const cb = this.callbacks.get(id);
        if (cb) {
          if (type === 'progress') cb.onProgress?.(data.progress);
          if (type === 'region') cb.onRegion?.(data.region);
          if (type === 'complete') {
            cb.onComplete?.(data.regions);
            this.callbacks.delete(id);
          }
          if (type === 'error') {
            cb.onError?.(new Error(data.error));
            this.callbacks.delete(id);
          }
        }
      };
    }
  }
  
  async analyzeProgressive(buffer, params, callbacks) {
    this.init();
    const id = Date.now().toString();
    this.callbacks.set(id, callbacks);
    this.worker.postMessage({ cmd: 'analyze', id, data: { buffer, params } });
    return id;
  }
  
  cancel() {
    this.worker?.postMessage({ cmd: 'cancel' });
  }
  
  destroy() {
    this.worker?.terminate();
    this.worker = null;
    this.callbacks.clear();
  }
}

let instance = null;
export const getSilenceManager = () => {
  if (!instance) instance = new SmartSilenceManager();
  return instance;
};