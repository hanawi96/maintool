export class EQ10BandEngine {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.eqNodes = [];
    this.gainNode = null;
    this.isInitialized = false;
    
    // 🎚️ Exact 10-band frequencies for FFmpeg mapping
    this.frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    this.currentGains = new Array(10).fill(0); // Store current dB values
    
    console.log('🎚️ EQ10BandEngine initialized with frequencies:', this.frequencies);
  }
  
  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.createEQChain();
      this.isInitialized = true;
      console.log('✅ EQ10BandEngine initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize EQ10BandEngine:', error);
      return false;
    }
  }
  
  async createEQChain() {
    // Create 10 BiquadFilterNode for each frequency band
    this.eqNodes = this.frequencies.map((freq, index) => {
      const filter = this.audioContext.createBiquadFilter();
      
      // 🎯 Exact Web Audio API configuration
      filter.type = 'peaking';           // Peaking filter type
      filter.frequency.value = freq;     // Exact frequency
      filter.Q.value = 1.0;             // Fixed Q-factor = 1.0
      filter.gain.value = 0;            // Initial gain = 0dB
      
      console.log(`🎚️ Created EQ Band ${index + 1}: ${freq}Hz, Q=1.0, Gain=0dB`);
      return filter;
    });
    
    // Create master gain node
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    
    // Connect EQ chain: node[0] → node[1] → ... → node[9] → gainNode
    this.connectEQChain();
  }
  
  connectEQChain() {
    // Connect all EQ nodes in series
    for (let i = 0; i < this.eqNodes.length - 1; i++) {
      this.eqNodes[i].connect(this.eqNodes[i + 1]);
    }
    
    // Connect last EQ node to master gain
    this.eqNodes[this.eqNodes.length - 1].connect(this.gainNode);
    
    // Connect to destination
    this.gainNode.connect(this.audioContext.destination);
    
    console.log('🔗 EQ Chain connected: Source → EQ1 → EQ2 → ... → EQ10 → Gain → Output');
  }
  
  // 🎚️ Update single EQ band - called when user moves slider
  updateEQBand(bandIndex, gainDB) {
    if (!this.isInitialized || bandIndex < 0 || bandIndex >= 10) {
      console.warn('⚠️ Invalid band index or engine not initialized:', bandIndex);
      return;
    }
    
    // Clamp gain to valid range
    const clampedGain = Math.max(-12, Math.min(12, gainDB));
    
    // Update Web Audio API filter
    this.eqNodes[bandIndex].gain.value = clampedGain;
    
    // Store for FFmpeg mapping
    this.currentGains[bandIndex] = clampedGain;
    
    console.log(`🎚️ Updated EQ Band ${bandIndex + 1} (${this.frequencies[bandIndex]}Hz): ${clampedGain}dB`);
    
    // Emit change event for UI update
    this.dispatchEQChangeEvent(bandIndex, clampedGain);
  }
  
  // 🎚️ Update multiple EQ bands (for presets)
  updateEQBands(gainsArray) {
    if (!Array.isArray(gainsArray) || gainsArray.length !== 10) {
      console.warn('⚠️ Invalid gains array. Expected array of 10 values.');
      return;
    }
    
    gainsArray.forEach((gain, index) => {
      this.updateEQBand(index, gain);
    });
    
    console.log('🎚️ Updated all EQ bands:', gainsArray);
  }
  
  // 🎚️ Get current EQ parameters for FFmpeg export
  getEQParameters() {
    return {
      frequencies: [...this.frequencies],
      gains: [...this.currentGains],
      qFactor: 1.0,
      type: 'peaking'
    };
  }
  
  // 🎚️ Get FFmpeg-ready parameters
  getFFmpegEQString() {
    const filters = [];
    
    this.currentGains.forEach((gain, index) => {
      if (Math.abs(gain) > 0.01) { // Only add filters with significant gain
        const freq = this.frequencies[index];
        filters.push(`equalizer=f=${freq}:t=q:w=1.0:g=${gain.toFixed(1)}`);
      }
    });
    
    const eqString = filters.join(',');
    console.log('🔧 Generated FFmpeg EQ string:', eqString);
    
    return {
      filterString: eqString,
      hasEQ: filters.length > 0,
      activeFilters: filters.length,
      parameters: this.getEQParameters()
    };
  }
  
  // 🎵 Connect audio source (for preview)
  connectSource(audioBuffer) {
    if (!this.isInitialized) {
      console.warn('⚠️ Engine not initialized');
      return null;
    }
    
    // Disconnect previous source if exists
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    
    // Create new source
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.loop = true;
    
    // Connect source to EQ chain
    this.sourceNode.connect(this.eqNodes[0]);
    
    console.log('🎵 Audio source connected to EQ chain');
    return this.sourceNode;
  }
  
  // 🎚️ Reset all EQ bands to 0dB
  resetEQ() {
    this.updateEQBands(new Array(10).fill(0));
    console.log('🔄 EQ reset to flat response');
  }
  
  // 🎚️ Load EQ preset
  loadPreset(presetName, presetValues) {
    if (!Array.isArray(presetValues) || presetValues.length !== 10) {
      console.warn('⚠️ Invalid preset values');
      return false;
    }
    
    this.updateEQBands(presetValues);
    console.log(`🎚️ Loaded EQ preset: ${presetName}`, presetValues);
    return true;
  }
  
  // 📊 Get frequency response (for visualization)
  getFrequencyResponse(frequencyArray) {
    if (!this.isInitialized) return null;
    
    const response = new Float32Array(frequencyArray.length);
    const phase = new Float32Array(frequencyArray.length);
    
    // Calculate combined response of all EQ bands
    this.eqNodes.forEach(node => {
      const nodeResponse = new Float32Array(frequencyArray.length);
      const nodePhase = new Float32Array(frequencyArray.length);
      
      node.getFrequencyResponse(frequencyArray, nodeResponse, nodePhase);
      
      // Combine responses (multiply in linear domain)
      for (let i = 0; i < response.length; i++) {
        response[i] *= nodeResponse[i];
        phase[i] += nodePhase[i];
      }
    });
    
    return { magnitude: response, phase: phase };
  }
  
  // 🎚️ Event dispatcher for UI updates
  dispatchEQChangeEvent(bandIndex, gainDB) {
    const event = new CustomEvent('eqBandChanged', {
      detail: {
        bandIndex,
        frequency: this.frequencies[bandIndex],
        gainDB,
        allGains: [...this.currentGains],
        ffmpegString: this.getFFmpegEQString().filterString
      }
    });
    
    window.dispatchEvent(event);
  }
  
  // 🧹 Cleanup
  destroy() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    this.eqNodes.forEach(node => node.disconnect());
    this.eqNodes = [];
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.isInitialized = false;
    console.log('🧹 EQ10BandEngine destroyed');
  }
}

// 🎚️ EQ Preset Library
export const EQPresets = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [3, 2, 1, 0, -1, 0, 2, 4, 3, 2],
  pop: [1, 2, 0, 1, 2, 1, 0, -1, -1, 0],
  jazz: [2, 1, 0, 1, 0, 0, 1, 2, 1, 1],
  classical: [1, 0, 0, 0, 0, 0, 0, 1, 2, 3],
  vocal: [0, -1, 0, 2, 3, 2, 1, 0, -1, 0],
  bass_boost: [5, 4, 2, 1, 0, 0, 0, 0, 0, 0],
  treble_boost: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6]
};

console.log('🎚️ EQ10BandEngine module loaded with presets:', Object.keys(EQPresets)); 