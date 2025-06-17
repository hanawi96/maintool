// Volume Comparison Test - Web Audio API vs FFmpeg
// Test script để so sánh volume processing

const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

// Test different volume levels and compare
const testVolumeLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

async function testFFmpegVolumeFilter() {
  console.log('🔬 Testing FFmpeg Volume Filter Response Curve');
  
  testVolumeLevels.forEach(volume => {
    console.log(`\n📊 Volume Level: ${volume} (${Math.round(volume * 100)}%)`);
    console.log(`   Web Audio API: masterGainNode.gain.value = ${volume}`);
    console.log(`   FFmpeg Filter: volume=${volume}`);
    console.log(`   Expected: Linear scaling at ${(volume * 100).toFixed(0)}%`);
    
    // Calculate dB equivalents
    const dB = volume > 0 ? 20 * Math.log10(volume) : -Infinity;
    console.log(`   Decibel Equivalent: ${dB === -Infinity ? '-∞' : dB.toFixed(2)} dB`);
  });
}

// Test different FFmpeg volume filter formats
async function testVolumeFilterFormats() {
  console.log('\n🧪 Testing Different FFmpeg Volume Filter Formats:');
  
  const formats = [
    { name: 'Linear', filter: `volume=${1.5}` },
    { name: 'Decibel', filter: `volume=3.5dB` },
    { name: 'Percentage', filter: `volume=150%` }
  ];
  
  formats.forEach(format => {
    console.log(`   ${format.name}: ${format.filter}`);
  });
}

// Run tests
testFFmpegVolumeFilter();
testVolumeFilterFormats();

console.log('\n💡 POTENTIAL SOLUTIONS:');
console.log('1. Use dB scale for FFmpeg: volume=XdB instead of volume=X');
console.log('2. Apply compensation curve for Web Audio API');
console.log('3. Use FFmpeg volume filter with percentage: volume=X%');
console.log('4. Add pre-gain adjustment for preview vs export consistency');
