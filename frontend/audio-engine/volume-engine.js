// frontend/audio-engine/volume-engine.js

export class VolumeEngine {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.currentVolume = 1.0; // Default 100% volume
    this.isInitialized = false;
    
    console.log('🔊 VolumeEngine initialized');
  }
  
  async initialize(audioContext) {
    try {
      this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.currentVolume;
      
      this.isInitialized = true;
      console.log('✅ VolumeEngine initialized with GainNode');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VolumeEngine:', error);
      return false;
    }
  }
  
  // 🔊 Update volume - called when user changes volume slider
  updateVolume(volumeValue) {
    if (!this.isInitialized) {
      console.warn('⚠️ VolumeEngine not initialized');
      return;
    }
    
    // Clamp volume to valid range (0.0 to 2.0)
    const clampedVolume = Math.max(0.0, Math.min(2.0, volumeValue));
    
    // Update Web Audio API GainNode
    this.gainNode.gain.value = clampedVolume;
    
    // Store for FFmpeg export
    this.currentVolume = clampedVolume;
    
    console.log(`🔊 Updated Volume: ${clampedVolume} (${Math.round(clampedVolume * 100)}%)`);
    
    // Emit change event for UI update
    this.dispatchVolumeChangeEvent(clampedVolume);
  }
  
  // 🔊 Get current volume for FFmpeg export
  getVolumeParameters() {
    return {
      webAudioGain: this.currentVolume,
      percentage: Math.round(this.currentVolume * 100),
      amplification: this.currentVolume > 1.0 ? 'boost' : 
                    this.currentVolume < 1.0 ? 'cut' : 'unity'
    };
  }
  
  // 🔊 Get FFmpeg-ready volume value
  getFFmpegVolume() {
    return {
      volumeValue: this.currentVolume,
      needsFilter: Math.abs(this.currentVolume - 1.0) > 0.001,
      parameters: this.getVolumeParameters()
    };
  }
  
  // 🔊 Connect to audio chain
  connectTo(destinationNode) {
    if (!this.isInitialized) return null;
    
    this.gainNode.connect(destinationNode);
    console.log('🔗 VolumeEngine connected to audio chain');
    return this.gainNode;
  }
  
  // 🔊 Get input node for connecting sources
  getInputNode() {
    return this.gainNode;
  }
  
  // 🔊 Reset to default volume
  resetVolume() {
    this.updateVolume(1.0);
    console.log('🔄 Volume reset to 100%');
  }
  
  // 🔊 Event dispatcher for UI updates
  dispatchVolumeChangeEvent(volumeValue) {
    const event = new CustomEvent('volumeChanged', {
      detail: {
        volumeValue,
        percentage: Math.round(volumeValue * 100),
        ffmpegValue: volumeValue,
        needsFilter: Math.abs(volumeValue - 1.0) > 0.001
      }
    });
    
    window.dispatchEvent(event);
  }
  
  // 🧹 Cleanup
  destroy() {
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    this.isInitialized = false;
    console.log('🧹 VolumeEngine destroyed');
  }
}

// 🔊 Volume preset values
export const VolumePresets = {
  mute: 0.0,      // 0%
  quiet: 0.25,    // 25%
  low: 0.5,       // 50%
  normal: 1.0,    // 100%
  loud: 1.5,      // 150%
  max: 2.0        // 200%
};

console.log('🔊 VolumeEngine module loaded'); 