// 🚀 Smart Silence Worker - Ultra-lightweight progressive analysis
class SilenceDetector {
  constructor() {
    this.cancel = false;
  }  async analyze(buffer, { threshold = -10, minDuration = 0.2 }, onProgress, onRegion) {
    this.cancel = false;
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // 🎯 **OPTIMIZED CHUNKING**: Use 5-10 second chunks for better performance
    const audioLength = data.length / sampleRate;
    let chunkSizeSeconds;
    
    if (audioLength <= 30) {
      chunkSizeSeconds = 5; // 5 seconds for short audio
    } else if (audioLength <= 300) {
      chunkSizeSeconds = 7; // 7 seconds for medium audio  
    } else {
      chunkSizeSeconds = 10; // 10 seconds for long audio
    }
    
    const chunkSize = Math.floor(sampleRate * chunkSizeSeconds);
    const silenceLevel = Math.pow(10, threshold / 20);
    
    const regions = [];
    let processed = 0;
    let globalSilenceStart = null; // Track silence across chunks

    for (let i = 0; i < data.length; i += chunkSize) {
      if (this.cancel) break;
      
      const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
      
      // 🔍 **SAMPLE-LEVEL ANALYSIS**: Analyze each sample in chunk
      for (let j = 0; j < chunk.length; j++) {
        const sampleTime = (i + j) / sampleRate;
        const amplitude = Math.abs(chunk[j]);
        
        if (amplitude < silenceLevel) {
          if (globalSilenceStart === null) {
            globalSilenceStart = sampleTime;
          }
        } else {
          if (globalSilenceStart !== null) {
            const duration = sampleTime - globalSilenceStart;
            if (duration >= minDuration) {
              const region = { 
                start: Math.round(globalSilenceStart * 1000) / 1000, 
                end: Math.round(sampleTime * 1000) / 1000, 
                duration: Math.round(duration * 1000) / 1000
              };
              regions.push(region);
              onRegion(region);
            }
            globalSilenceStart = null;
          }
        }
      }
      
      processed += chunk.length;
      
      // Report progress every chunk
      const progressPercent = Math.min(100, (processed / data.length) * 100);
      onProgress(Math.round(progressPercent));
      
      // Yield control to prevent blocking
      await new Promise(r => setTimeout(r, 1));
    }
    
    // Handle silence at end of audio
    if (globalSilenceStart !== null) {
      const duration = (data.length / sampleRate) - globalSilenceStart;
      if (duration >= minDuration) {
        const region = { 
          start: Math.round(globalSilenceStart * 1000) / 1000, 
          end: Math.round((data.length / sampleRate) * 1000) / 1000, 
          duration: Math.round(duration * 1000) / 1000
        };
        regions.push(region);
        onRegion(region);
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