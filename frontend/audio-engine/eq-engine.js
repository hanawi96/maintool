// EQ10BandEngine.js

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
const EQ_BAND_COUNT = 10;
const EQ_Q_FACTOR = 1.0;
const EQ_GAIN_MIN = -12;
const EQ_GAIN_MAX = 12;

export class EQ10BandEngine {
  audioContext = null;
  sourceNode = null;
  eqNodes = [];
  gainNode = null;
  isInitialized = false;
  frequencies = EQ_FREQUENCIES;
  currentGains = Array(EQ_BAND_COUNT).fill(0);

  async initialize() {
    if (this.isInitialized) return true;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.#createEQChain();
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('[EQ10BandEngine] Initialization failed:', err);
      this.destroy();
      return false;
    }
  }

  #createEQChain() {
    // Create EQ bands (BiquadFilterNode)
    this.eqNodes = this.frequencies.map(freq => {
      const node = this.audioContext.createBiquadFilter();
      node.type = 'peaking';
      node.frequency.value = freq;
      node.Q.value = EQ_Q_FACTOR;
      node.gain.value = 0;
      return node;
    });

    // Master gain node
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    // Connect EQ chain
    this.eqNodes.reduce((prev, curr) => {
      prev.connect(curr);
      return curr;
    });

    this.eqNodes[EQ_BAND_COUNT - 1].connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  updateEQBand(bandIndex, gainDB) {
    if (!this.isInitialized || bandIndex < 0 || bandIndex >= EQ_BAND_COUNT) return;
    const clamped = Math.max(EQ_GAIN_MIN, Math.min(EQ_GAIN_MAX, gainDB));
    if (this.currentGains[bandIndex] === clamped) return;
    this.eqNodes[bandIndex].gain.value = clamped;
    this.currentGains[bandIndex] = clamped;
    this.#dispatchEQChangeEvent(bandIndex, clamped);
  }

  updateEQBands(gainArr) {
    if (!Array.isArray(gainArr) || gainArr.length !== EQ_BAND_COUNT) return;
    gainArr.forEach((g, i) => this.updateEQBand(i, g));
  }

  getEQParameters() {
    return {
      frequencies: [...this.frequencies],
      gains: [...this.currentGains],
      qFactor: EQ_Q_FACTOR,
      type: 'peaking'
    };
  }

  getFFmpegEQString() {
    const filters = this.currentGains
      .map((g, i) =>
        Math.abs(g) > 0.01
          ? `equalizer=f=${this.frequencies[i]}:t=q:w=${EQ_Q_FACTOR}:g=${g.toFixed(1)}`
          : null
      )
      .filter(Boolean);
    return {
      filterString: filters.join(','),
      hasEQ: filters.length > 0,
      activeFilters: filters.length,
      parameters: this.getEQParameters()
    };
  }

  connectSource(audioBuffer) {
    if (!this.isInitialized || !audioBuffer) return null;
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.eqNodes[0]);
    return this.sourceNode;
  }

  resetEQ() {
    this.updateEQBands(Array(EQ_BAND_COUNT).fill(0));
  }

  loadPreset(presetName, presetValues) {
    if (!Array.isArray(presetValues) || presetValues.length !== EQ_BAND_COUNT) return false;
    this.updateEQBands(presetValues);
    return true;
  }

  getFrequencyResponse(frequencyArray) {
    if (!this.isInitialized || !frequencyArray) return null;
    const len = frequencyArray.length;
    const mag = new Float32Array(len).fill(1);
    const phase = new Float32Array(len);
    this.eqNodes.forEach(node => {
      const m = new Float32Array(len);
      const p = new Float32Array(len);
      node.getFrequencyResponse(frequencyArray, m, p);
      for (let i = 0; i < len; i++) {
        mag[i] *= m[i];
        phase[i] += p[i];
      }
    });
    return { magnitude: mag, phase };
  }

  #dispatchEQChangeEvent(bandIndex, gainDB) {
    window.dispatchEvent(new CustomEvent('eqBandChanged', {
      detail: {
        bandIndex,
        frequency: this.frequencies[bandIndex],
        gainDB,
        allGains: [...this.currentGains],
        ffmpegString: this.getFFmpegEQString().filterString
      }
    }));
  }

  destroy() {
    this.isInitialized = false;
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    this.eqNodes.forEach(node => { try { node.disconnect(); } catch {} });
    this.eqNodes = [];
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch {}
      this.gainNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.currentGains = Array(EQ_BAND_COUNT).fill(0);
  }
}

// EQ Presets
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
