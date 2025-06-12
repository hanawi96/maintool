// 🚀 Smart Silence Worker - Ultra-lightweight progressive analysis
class SilenceDetector {
  constructor() {
    this.cancel = false;
  }

  async analyze(buffer, { threshold = -40, minDuration = 0.5 }, onProgress, onRegion) {
    this.cancel = false;
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const chunkSize = Math.floor(sampleRate * 0.5); // 0.5s chunks
    const silenceLevel = Math.pow(10, threshold / 20);
    
    const regions = [];
    let silenceStart = null;
    let processed = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
      if (this.cancel) break;
      
      const chunk = data.slice(i, i + chunkSize);
      const isSilent = chunk.every(sample => Math.abs(sample) < silenceLevel);
      const time = i / sampleRate;
      
      if (isSilent && silenceStart === null) {
        silenceStart = time;
      } else if (!isSilent && silenceStart !== null) {
        const duration = time - silenceStart;
        if (duration >= minDuration) {
          const region = { start: silenceStart, end: time, duration };
          regions.push(region);
          onRegion(region);
        }
        silenceStart = null;
      }
      
      processed += chunkSize;
      if (processed % (chunkSize * 4) === 0) {
        onProgress(Math.min(100, (processed / data.length) * 100));
        await new Promise(r => setTimeout(r, 0)); // Yield
      }
    }
    
    return regions;
  }
}

const detector = new SilenceDetector();

self.onmessage = async (e) => {
  const { cmd, id, data } = e.data;
  
  if (cmd === 'analyze') {
    try {
      const regions = await detector.analyze(
        data.buffer,
        data.params,
        (progress) => self.postMessage({ type: 'progress', id, progress }),
        (region) => self.postMessage({ type: 'region', id, region })
      );
      self.postMessage({ type: 'complete', id, regions });
    } catch (error) {
      self.postMessage({ type: 'error', id, error: error.message });
    }
  } else if (cmd === 'cancel') {
    detector.cancel = true;
  }
};