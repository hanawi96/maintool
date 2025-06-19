# 🔊 **VOLUME SYNCHRONIZATION GUIDE**

## 🎯 **QUICK SETUP**

### **✅ Backend Integration:**
```javascript
// Already integrated in utils.js
import { VolumeParameterConverter } from './volume-converter.js';
const volumeConverter = new VolumeParameterConverter();

// Precise volume conversion in cutAudio method:
const volumeConversion = volumeConverter.convertToFFmpeg(volume, {
  precision: 3,
  skipUnityGain: true
});
```

### **✅ Frontend Integration:**
```javascript
import { VolumeEngine, VolumePresets } from './audio-engine/volume-engine.js';

// Initialize volume engine
const volumeEngine = new VolumeEngine();
await volumeEngine.initialize();

// Connect to audio chain
volumeEngine.connectTo(audioContext.destination);

// Update volume when user changes slider
volumeSlider.addEventListener('input', (e) => {
  const volumeValue = parseFloat(e.target.value);
  volumeEngine.updateVolume(volumeValue);
});

// Get FFmpeg parameters for export
const volumeParams = volumeEngine.getFFmpegVolume();
```

## 🔧 **PARAMETER MAPPING**

### **Web Audio API → FFmpeg Conversion:**

| Web Audio GainNode | FFmpeg Volume | Effect |
|-------------------|---------------|--------|
| `gainNode.gain.value = 0.0` | `volume=0.000` | Mute |
| `gainNode.gain.value = 0.5` | `volume=0.500` | 50% volume |
| `gainNode.gain.value = 1.0` | *No filter* | Unity gain (skipped) |
| `gainNode.gain.value = 1.5` | `volume=1.500` | 150% boost |
| `gainNode.gain.value = 2.0` | `volume=2.000` | 200% boost |

## 🎵 **USAGE EXAMPLES**

### **Basic Volume Control:**
```javascript
// Set 75% volume
volumeEngine.updateVolume(0.75);

// Get parameters for export
const { volumeValue, needsFilter } = volumeEngine.getFFmpegVolume();

// Send to backend
fetch('/api/cut-audio', {
  method: 'POST',
  body: JSON.stringify({
    volume: volumeValue,  // 0.75
    // ... other params
  })
});
```

### **Volume Events:**
```javascript
// Listen for volume changes
window.addEventListener('volumeChanged', (event) => {
  const { volumeValue, percentage, needsFilter } = event.detail;
  console.log(`Volume: ${percentage}%, FFmpeg filter needed: ${needsFilter}`);
});
```

## 🎯 **KEY BENEFITS**

✅ **Exact 1:1 Mapping:** Web Audio GainNode values = FFmpeg volume values  
✅ **Smart Skipping:** Unity gain (1.0) skipped for performance  
✅ **Precise Conversion:** 3-decimal precision for accuracy  
✅ **Clean Implementation:** Simple, focused, no over-engineering  

## 🔧 **BACKEND PROCESSING**

**FFmpeg Command Example:**
```bash
# Volume at 75% (0.75)
-filter:a volume=0.750

# Volume at 150% (1.5) 
-filter:a volume=1.500

# Volume at 100% (1.0)
# No volume filter applied (skipped)
```

## 🎊 **RESULT**

**Perfect volume synchronization between preview and export!**  
**Preview volume = Export volume** with exact Web Audio API mapping.

---

*Simple, clean, effective - exactly what was needed! 🚀* 