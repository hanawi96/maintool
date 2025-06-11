// 🚀 **HYBRID SYSTEM DEMO PAGE** - Test and showcase hybrid capabilities
import React, { useState, useRef } from 'react';
import { useEnhancedWaveform } from '../hooks/useEnhancedWaveform';
import SmartWaveform from '../components/Waveform/SmartWaveform';
import { WaveformSystemControl, WaveformDebugPanel } from '../components/Waveform/SmartWaveform';

const HybridSystemDemo = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [performanceStats, setPerformanceStats] = useState(null);
  const fileInputRef = useRef(null);

  // 🚀 **ENHANCED WAVEFORM HOOK**
  const {
    waveformData,
    startTime,
    endTime,
    isDragging,
    hoveredHandle,
    isGenerating,
    generateWaveform,
    setStartTime,
    setEndTime,
    setIsDragging,
    setHoveredHandle,
    reset,
    canvasRef,
    enhancedFeatures
  } = useEnhancedWaveform();

  // 🎯 **FILE SELECTION**
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('🎵 [HybridDemo] File selected:', file.name);
    setSelectedFile(file);

    try {
      await generateWaveform(file);
      
      // 🎯 **GET PERFORMANCE STATS**
      if (enhancedFeatures) {
        setPerformanceStats(enhancedFeatures.getPerformanceStats());
      }
    } catch (error) {
      console.error('❌ [HybridDemo] Processing failed:', error);
    }
  };

  // 🔄 **RESET DEMO**
  const handleReset = () => {
    reset();
    setSelectedFile(null);
    setPerformanceStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 🎯 **TOGGLE SYSTEM**
  const toggleHybridSystem = () => {
    const currentConfig = WaveformSystemControl.getConfig();
    WaveformSystemControl.setHybridEnabled(!currentConfig.USE_HYBRID_SYSTEM);
    // Force re-render by resetting and re-processing
    if (selectedFile) {
      setTimeout(() => {
        handleReset();
        setTimeout(() => {
          generateWaveform(selectedFile);
        }, 100);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 🎯 **HEADER** */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 Hybrid Waveform System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Test the new OffscreenCanvas + Web Worker + Smart Cache system with 4-10x performance improvements
          </p>
        </div>

        {/* 🎛️ **CONTROLS** */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <label className="flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="sr-only"
              />
              <div className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer transition-colors">
                📁 Select Audio File
              </div>
            </label>

            <button
              onClick={handleReset}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              🔄 Reset
            </button>

            <button
              onClick={toggleHybridSystem}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-colors"
            >
              🔧 Toggle System
            </button>

            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors"
            >
              🐛 Debug Panel
            </button>
          </div>

          {/* 📊 **FILE INFO** */}
          {selectedFile && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>File:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* 📊 **PERFORMANCE STATS** */}
        {performanceStats && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-green-800 mb-2">⚡ Performance Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Processing Time:</span>
                <div className="text-green-700">{performanceStats.processingTime}ms</div>
              </div>
              <div>
                <span className="font-medium">Strategy:</span>
                <div className="text-green-700">{performanceStats.strategy}</div>
              </div>
              <div>
                <span className="font-medium">From Cache:</span>
                <div className="text-green-700">{performanceStats.fromCache ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <span className="font-medium">Speed Improvement:</span>
                <div className="text-green-700">{performanceStats.speedImprovement}</div>
              </div>
            </div>
          </div>
        )}

        {/* 🌊 **WAVEFORM DISPLAY** */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Audio Waveform</h2>
            {enhancedFeatures && (
              <div className="text-sm text-gray-600">
                System: {enhancedFeatures.isWorkerProcessed ? '🚀 Web Worker' : 
                        enhancedFeatures.isFallback ? '🔄 Fallback' : '⚙️ Processing'}
              </div>
            )}
          </div>

          <SmartWaveform
            canvasRef={canvasRef}
            waveformData={waveformData}
            currentTime={0}
            duration={endTime}
            startTime={startTime}
            endTime={endTime}
            hoveredHandle={hoveredHandle}
            isDragging={isDragging}
            isPlaying={false}
            volume={1}
            isGenerating={isGenerating}
            enhancedFeatures={enhancedFeatures}
            showPerformanceBadge={true}
            onMouseDown={() => {}}
            onMouseMove={() => {}}
            onMouseUp={() => {}}
            onMouseLeave={() => {}}
          />
        </div>

        {/* 🎮 **FEATURE SHOWCASE** */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-800 mb-2">🔧 Web Workers</h3>
            <p className="text-sm text-blue-700">
              Non-blocking audio processing in background threads for smooth UI performance
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-bold text-purple-800 mb-2">🎨 OffscreenCanvas</h3>
            <p className="text-sm text-purple-700">
              Hardware-accelerated rendering with automatic fallback to regular canvas
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-800 mb-2">💾 Smart Cache</h3>
            <p className="text-sm text-green-700">
              Intelligent caching with compression and LRU eviction for instant loading
            </p>
          </div>
        </div>

        {/* 🎯 **INSTRUCTIONS** */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 mb-2">🎯 How to Test</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Select an audio file to see hybrid processing in action</li>
            <li>2. Note the performance badge and processing time</li>
            <li>3. Select the same file again to see cache benefits</li>
            <li>4. Toggle between hybrid and original system to compare</li>
            <li>5. Use debug panel to experiment with different settings</li>
          </ol>
        </div>
      </div>

      {/* 🐛 **DEBUG PANEL** */}
      {showDebugPanel && <WaveformDebugPanel />}
    </div>
  );
};

export default HybridSystemDemo;
