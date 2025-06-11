// 🌊 **SIMPLE WAVEFORM COMPONENT** - Lightweight demo component
import React, { useRef, useState } from 'react';
import { useSimpleHybrid } from '../hooks/useSimpleHybrid.js';

const SimpleWaveform = ({ file, onReady, className = '' }) => {
  const canvasRef = useRef(null);
  const [stats, setStats] = useState(null);
  
  const {
    processFile,
    isLoading,
    progress,
    waveformData,
    error,
    getStats,
    clearCache
  } = useSimpleHybrid();

  // 🎯 **PROCESS WHEN FILE CHANGES**
  React.useEffect(() => {
    if (!file) return;
    
    const process = async () => {
      const result = await processFile(file, {
        width: 800,
        height: 200,
        samples: 2000
      });
      
      if (result && onReady) {
        onReady(result);
      }
    };
    
    process();
  }, [file, processFile, onReady]);

  // 🎨 **RENDER CANVAS**
  React.useEffect(() => {
    if (!waveformData?.canvas || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform result
    if (waveformData.canvas instanceof ImageBitmap) {
      ctx.drawImage(waveformData.canvas, 0, 0);
    } else if (waveformData.canvas instanceof HTMLCanvasElement) {
      ctx.drawImage(waveformData.canvas, 0, 0);
    } else {
      // Fallback: draw waveform data directly
      drawWaveformData(ctx, waveformData.data, canvas.width, canvas.height);
    }
  }, [waveformData]);

  // 🎨 **FALLBACK DRAW FUNCTION**
  const drawWaveformData = (ctx, data, width, height) => {
    if (!data || !data.length) return;
    
    const centerY = height / 2;
    const barWidth = width / data.length;
    
    ctx.fillStyle = '#3b82f6';
    
    data.forEach((amplitude, i) => {
      const barHeight = amplitude * height * 0.8;
      const x = i * barWidth;
      const y = centerY - barHeight / 2;
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });
  };

  // 📊 **SHOW STATS**
  const handleShowStats = () => {
    const currentStats = getStats();
    setStats(currentStats);
    console.log('📊 [SimpleWaveform] Stats:', currentStats);
  };

  // 🧹 **CLEAR CACHE**
  const handleClearCache = async () => {
    await clearCache();
    console.log('🧹 [SimpleWaveform] Cache cleared');
  };

  // ❌ **ERROR STATE**
  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <h3 className="text-red-800 font-medium">Processing Error</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button 
          onClick={() => file && processFile(file)}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ⏳ **LOADING STATE**
  if (isLoading) {
    return (
      <div className={`p-6 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-2xl mb-2">🎵</div>
          <h3 className="font-medium text-gray-800">Processing Audio</h3>
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
        </div>
      </div>
    );
  }

  // 📄 **EMPTY STATE**
  if (!file) {
    return (
      <div className={`p-6 bg-gray-50 border border-gray-200 rounded-lg text-center ${className}`}>
        <div className="text-4xl mb-2">🎵</div>
        <p className="text-gray-600">No audio file selected</p>
      </div>
    );
  }

  // ✅ **SUCCESS STATE**
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 🌊 **WAVEFORM CANVAS** */}
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="w-full h-auto block"
        style={{ maxHeight: '200px' }}
      />
      
      {/* 📊 **INFO BAR** */}
      {waveformData && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Duration: {waveformData.duration?.toFixed(2)}s
              </span>
              <span className="text-gray-600">
                Strategy: {waveformData.strategy}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                waveformData.fromCache 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {waveformData.fromCache ? '⚡ Cached' : '🔄 Processed'}
              </span>
              <span className="text-gray-600">
                {waveformData.processingTime?.toFixed(2)}ms
              </span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleShowStats}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              >
                📊 Stats
              </button>
              <button
                onClick={handleClearCache}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              >
                🧹 Clear Cache
              </button>
            </div>
          </div>
          
          {/* 📊 **STATS DISPLAY** */}
          {stats && (
            <div className="mt-2 p-2 bg-white rounded border text-xs">
              <pre className="text-gray-600 overflow-auto">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleWaveform;
