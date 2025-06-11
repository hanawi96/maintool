// 🚀 **INTEGRATION EXAMPLE** - Complete implementation example
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\examples\HybridWaveformExample.jsx

import React, { useState, useRef, useCallback } from 'react';
import ProgressiveWaveform from '../components/Waveform/ProgressiveWaveform';
import PerformanceMonitor, { PerformanceToggleButton } from '../components/Debug/PerformanceMonitor';
import { useHybridWaveform } from '../hooks/useHybridWaveform';

const HybridWaveformExample = () => {
  // 🎯 **COMPONENT STATE**: Main component state
  const [selectedFile, setSelectedFile] = useState(null);
  const [waveformData, setWaveformData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState('standard');
  const [showPerformance, setShowPerformance] = useState(false);
  
  // 🎵 **AUDIO & CANVAS REFS**: Direct DOM references
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // 🚀 **HYBRID WAVEFORM HOOK**: Access to hybrid functionality
  const {
    processBatch,
    getPerformanceStats,
    cacheManager,
    utils
  } = useHybridWaveform();
  
  // 📁 **FILE SELECTION**: Handle file selection
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 [HybridWaveformExample] File selected:', {
      name: file.name,
      size: utils.formatFileSize(file.size),
      type: file.type
    });
    
    setSelectedFile(file);
    
    // 🎵 **SETUP AUDIO**: Setup audio element for playback
    if (audioRef.current) {
      audioRef.current.src = URL.createObjectURL(file);
      audioRef.current.onloadedmetadata = () => {
        const audioDuration = audioRef.current.duration;
        setDuration(audioDuration);
        setEndTime(audioDuration);
        console.log('🎵 [HybridWaveformExample] Audio loaded:', {
          duration: audioDuration.toFixed(2) + 's'
        });
      };
    }
  }, [utils]);
  
  // 🌊 **WAVEFORM READY**: Handle completed waveform processing
  const handleWaveformReady = useCallback((result) => {
    console.log('🌊 [HybridWaveformExample] Waveform ready:', {
      isPreview: result.isPreview,
      quality: result.quality,
      dataPoints: result.data?.length,
      processingTime: result.processingTime?.toFixed(2) + 'ms',
      strategy: result.strategy
    });
    
    if (!result.isPreview) {
      setWaveformData(result);
      if (result.duration && !duration) {
        setDuration(result.duration);
        setEndTime(result.duration);
      }
    }
  }, [duration]);
  
  // ❌ **ERROR HANDLING**: Handle processing errors
  const handleError = useCallback((error) => {
    console.error('❌ [HybridWaveformExample] Waveform error:', error);
    alert(`Waveform processing failed: ${error.message || error}`);
  }, []);
  
  // 🎮 **PLAYBACK CONTROLS**: Audio playback management
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = currentTime;
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime]);
  
  // ⏮️ **SEEK**: Seek to specific time
  const seekTo = useCallback((time) => {
    const clampedTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(clampedTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = clampedTime;
    }
  }, [duration]);
  
  // 🎚️ **VOLUME CONTROL**: Handle volume changes
  const handleVolumeChange = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);
  
  // 🎯 **QUALITY CHANGE**: Handle quality selection
  const handleQualityChange = useCallback((newQuality) => {
    setQuality(newQuality);
    console.log('🎯 [HybridWaveformExample] Quality changed to:', newQuality);
  }, []);
  
  // 📊 **BATCH PROCESSING DEMO**: Demonstrate batch processing
  const handleBatchDemo = useCallback(async () => {
    if (!fileInputRef.current) return;
    
    // Trigger multiple file selection
    fileInputRef.current.multiple = true;
    fileInputRef.current.click();
    
    fileInputRef.current.onchange = async (event) => {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;
      
      console.log('📊 [HybridWaveformExample] Starting batch processing:', {
        fileCount: files.length,
        totalSize: utils.formatFileSize(files.reduce((sum, f) => sum + f.size, 0))
      });
      
      try {
        const results = await processBatch(files, {
          quality: 'standard',
          batchSize: 3,
          onBatchProgress: (progress) => {
            console.log('📊 Batch progress:', progress);
          }
        });
        
        const successful = results.filter(r => r.success).length;
        alert(`Batch processing complete!\nSuccessful: ${successful}/${files.length}`);
      } catch (error) {
        console.error('❌ Batch processing failed:', error);
        alert('Batch processing failed');
      }
      
      // Reset file input
      fileInputRef.current.multiple = false;
    };
  }, [processBatch, utils]);
  
  // 🧹 **CLEAR CACHE DEMO**: Demonstrate cache management
  const handleClearCache = useCallback(async () => {
    if (window.confirm('Clear all cached waveform data?')) {
      try {
        await cacheManager.clearAll();
        alert('Cache cleared successfully!');
      } catch (error) {
        console.error('❌ Failed to clear cache:', error);
        alert('Failed to clear cache');
      }
    }
  }, [cacheManager]);
  
  // 📊 **SHOW STATS**: Display performance statistics
  const showStats = useCallback(() => {
    const stats = getPerformanceStats();
    if (stats) {
      alert(`Performance Stats:\n` +
        `Average Load Time: ${stats.averageLoadTime}\n` +
        `Cache Hit Rate: ${stats.cacheHitRate}\n` +
        `Files Processed: ${stats.processedFiles}\n` +
        `Recommended Strategy: ${stats.recommendedStrategy}`
      );
    } else {
      alert('No performance data available');
    }
  }, [getPerformanceStats]);
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 🎯 **HEADER**: Example header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🚀 Hybrid Waveform System Demo
        </h1>
        <p className="text-gray-600">
          Advanced audio waveform processing with never-blocking UI
        </p>
      </div>
      
      {/* 📁 **FILE UPLOAD**: File selection area */}
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🎵</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Select Audio File
          </button>
          {selectedFile && (
            <div className="mt-4 text-sm text-gray-600">
              Selected: {selectedFile.name} ({utils.formatFileSize(selectedFile.size)})
            </div>
          )}
        </div>
      </div>
      
      {/* 🎛️ **CONTROLS**: Quality and settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-3">Processing Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 🎯 **QUALITY SELECTOR**: Quality selection */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Quality</label>
            <select
              value={quality}
              onChange={(e) => handleQualityChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="low">Low (Fast)</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
              <option value="premium">Premium (Slow)</option>
            </select>
          </div>
          
          {/* 🎚️ **VOLUME CONTROL**: Volume slider */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Volume ({Math.round(volume * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* ⏱️ **TIME DISPLAY**: Current time */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Current Time</label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm font-mono">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </div>
          </div>
          
          {/* 🎮 **PLAYBACK**: Play/pause button */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Playback</label>
            <button
              onClick={togglePlayback}
              disabled={!selectedFile}
              className="w-full px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 transition-colors"
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
        </div>
      </div>
      
      {/* 🌊 **WAVEFORM DISPLAY**: Progressive waveform component */}
      {selectedFile && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-800 mb-3">Waveform Visualization</h3>
          <ProgressiveWaveform
            file={selectedFile}
            canvasRef={canvasRef}
            currentTime={currentTime}
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            isPlaying={isPlaying}
            volume={volume}
            quality={quality}
            audioRef={audioRef}
            onWaveformReady={handleWaveformReady}
            onError={handleError}
            enableThumbnail={true}
            enableProgressiveUpgrade={true}
            className="min-h-[200px]"
          />
        </div>
      )}
      
      {/* 🧪 **DEMO ACTIONS**: Demo buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-3">Demo Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <button
            onClick={handleBatchDemo}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm"
          >
            📊 Batch Process Demo
          </button>
          <button
            onClick={showStats}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            📈 Show Performance Stats
          </button>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
          >
            🗑️ Clear Cache
          </button>
          <button
            onClick={() => setShowPerformance(!showPerformance)}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
          >
            📊 {showPerformance ? 'Hide' : 'Show'} Monitor
          </button>
        </div>
      </div>
      
      {/* 📊 **WAVEFORM INFO**: Display waveform details */}
      {waveformData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-800 mb-3">Waveform Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Data Points:</span>
              <div className="font-mono">{waveformData.data?.length || 0}</div>
            </div>
            <div>
              <span className="text-gray-600">Processing Time:</span>
              <div className="font-mono">{waveformData.processingTime?.toFixed(2) || 0}ms</div>
            </div>
            <div>
              <span className="text-gray-600">Strategy:</span>
              <div className="font-mono capitalize">{waveformData.strategy || 'unknown'}</div>
            </div>
            <div>
              <span className="text-gray-600">From Cache:</span>
              <div className="font-mono">{waveformData.fromCache ? '✅ Yes' : '❌ No'}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 🎵 **HIDDEN AUDIO**: Audio element for playback */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
      
      {/* 📊 **PERFORMANCE MONITOR**: Real-time performance monitoring */}
      <PerformanceMonitor
        isVisible={showPerformance}
        onToggle={() => setShowPerformance(!showPerformance)}
      />
      
      {/* 🎯 **PERFORMANCE TOGGLE**: Floating toggle button */}
      {!showPerformance && (
        <PerformanceToggleButton
          onToggle={() => setShowPerformance(true)}
          isVisible={false}
        />
      )}
    </div>
  );
};

export default HybridWaveformExample;
