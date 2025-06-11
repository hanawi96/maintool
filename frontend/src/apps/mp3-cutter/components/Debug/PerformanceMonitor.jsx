// 🎨 **PERFORMANCE MONITOR COMPONENT** - Real-time performance visualization
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\components\Debug\PerformanceMonitor.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHybridWaveform } from '../../hooks/useHybridWaveform';

const PerformanceMonitor = ({ isVisible, onToggle }) => {
  const { getPerformanceStats, cacheManager } = useHybridWaveform();
  
  // 📊 **PERFORMANCE STATE**: Real-time metrics
  const [stats, setStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // 🔄 **REFRESH MECHANISM**: Auto-refresh stats
  const intervalRef = useRef(null);
  
  // 📊 **UPDATE STATS**: Fetch latest performance data
  const updateStats = useCallback(() => {
    try {
      const newStats = getPerformanceStats();
      const newCacheStats = cacheManager.getStats();
      
      setStats(newStats);
      setCacheStats(newCacheStats);
      
      // 📈 **HISTORY TRACKING**: Track performance over time
      if (isRecording && newStats) {
        setPerformanceHistory(prev => {
          const newEntry = {
            timestamp: Date.now(),
            avgLoadTime: parseFloat(newStats.averageLoadTime) || 0,
            cacheHitRate: parseFloat(newStats.cacheHitRate) || 0,
            processedFiles: newStats.processedFiles || 0
          };
          
          // Keep last 60 entries (1 minute if updating every second)
          return [...prev.slice(-59), newEntry];
        });
      }
    } catch (error) {
      console.error('❌ [PerformanceMonitor] Failed to update stats:', error);
    }
  }, [getPerformanceStats, cacheManager, isRecording]);
  
  // 🔄 **AUTO-REFRESH**: Start/stop auto-refresh
  useEffect(() => {
    if (isVisible && isRecording) {
      updateStats(); // Initial update
      intervalRef.current = setInterval(updateStats, 1000); // Update every second
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible, isRecording, updateStats]);
  
  // 📊 **PERFORMANCE GRADE**: Calculate overall performance grade
  const calculatePerformanceGrade = useCallback((stats) => {
    if (!stats) return { grade: 'N/A', color: '#64748b' };
    
    const avgLoadTime = parseFloat(stats.averageLoadTime) || 1000;
    const cacheHitRate = parseFloat(stats.cacheHitRate) || 0;
    
    // 🎯 **SCORING ALGORITHM**: Grade based on load time and cache efficiency
    let score = 100;
    
    // Load time scoring (0-50 points)
    if (avgLoadTime > 2000) score -= 30;
    else if (avgLoadTime > 1000) score -= 20;
    else if (avgLoadTime > 500) score -= 10;
    else if (avgLoadTime > 200) score -= 5;
    
    // Cache hit rate scoring (0-50 points)
    const cacheScore = cacheHitRate * 0.5;
    score = (score * 0.5) + cacheScore;
    
    // 🏆 **GRADE ASSIGNMENT**: Assign letter grade
    if (score >= 90) return { grade: 'A+', color: '#10b981' };
    if (score >= 80) return { grade: 'A', color: '#059669' };
    if (score >= 70) return { grade: 'B', color: '#3b82f6' };
    if (score >= 60) return { grade: 'C', color: '#f59e0b' };
    if (score >= 50) return { grade: 'D', color: '#ef4444' };
    return { grade: 'F', color: '#dc2626' };
  }, []);
  
  // 🎨 **MINI CHART**: Simple performance chart
  const MiniChart = ({ data, label, unit = 'ms', color = '#3b82f6' }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.avgLoadTime || 0));
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.avgLoadTime || 0) / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="bg-white rounded-lg p-3 border border-slate-200">
        <div className="text-xs text-slate-600 mb-2">{label}</div>
        <svg viewBox="0 0 100 40" className="w-full h-8">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
        </svg>
        <div className="text-xs text-slate-500 mt-1">
          Latest: {data[data.length - 1]?.avgLoadTime?.toFixed(1) || 0}{unit}
        </div>
      </div>
    );
  };
  
  // 🧹 **CLEAR DATA**: Reset performance history
  const clearHistory = useCallback(() => {
    setPerformanceHistory([]);
    setStats(null);
    setCacheStats(null);
  }, []);
  
  // 🗑️ **CLEAR CACHE**: Clear entire cache
  const clearCache = useCallback(async () => {
    if (window.confirm('Clear all cached data? This will reset performance metrics.')) {
      try {
        await cacheManager.clearAll();
        clearHistory();
        updateStats();
        console.log('🗑️ [PerformanceMonitor] Cache cleared successfully');
      } catch (error) {
        console.error('❌ [PerformanceMonitor] Failed to clear cache:', error);
      }
    }
  }, [cacheManager, clearHistory, updateStats]);
  
  if (!isVisible) return null;
  
  const performanceGrade = calculatePerformanceGrade(stats);
  
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
      {/* 🎯 **HEADER**: Performance monitor header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="text-lg">📊</div>
          <div>
            <div className="font-medium text-sm">Performance Monitor</div>
            <div className="text-xs text-slate-500">Real-time metrics</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* 📊 **PERFORMANCE GRADE**: Overall grade */}
          <div 
            className="px-2 py-1 rounded text-xs font-bold text-white"
            style={{ backgroundColor: performanceGrade.color }}
          >
            {performanceGrade.grade}
          </div>
          
          {/* 🔄 **RECORDING TOGGLE**: Start/stop recording */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-1 rounded text-xs ${
              isRecording 
                ? 'bg-red-100 text-red-600' 
                : 'bg-gray-100 text-gray-600'
            }`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹️' : '▶️'}
          </button>
          
          {/* ❌ **CLOSE**: Close monitor */}
          <button
            onClick={onToggle}
            className="p-1 rounded text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* 📊 **METRICS DISPLAY**: Show current stats */}
      <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
        {stats ? (
          <>
            {/* 🎯 **CORE METRICS**: Key performance indicators */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-xs text-blue-600 font-medium">Avg Load Time</div>
                <div className="text-lg font-bold text-blue-700">
                  {stats.averageLoadTime}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-xs text-green-600 font-medium">Cache Hit Rate</div>
                <div className="text-lg font-bold text-green-700">
                  {stats.cacheHitRate}
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-2">
                <div className="text-xs text-purple-600 font-medium">Files Processed</div>
                <div className="text-lg font-bold text-purple-700">
                  {stats.processedFiles}
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-2">
                <div className="text-xs text-yellow-600 font-medium">Strategy</div>
                <div className="text-xs font-bold text-yellow-700 capitalize">
                  {stats.recommendedStrategy?.replace('-', ' ')}
                </div>
              </div>
            </div>
            
            {/* 📈 **PERFORMANCE CHART**: Mini chart if history available */}
            {performanceHistory.length > 1 && (
              <MiniChart 
                data={performanceHistory}
                label="Load Time Trend"
                unit="ms"
                color="#3b82f6"
              />
            )}
            
            {/* 🧠 **CACHE DETAILS**: Cache-specific metrics */}
            {cacheStats && (
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-xs text-slate-600 font-medium mb-2">Cache Details</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Memory Usage:</span>
                    <span className="font-mono">{cacheStats.memoryUsage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Entries:</span>
                    <span className="font-mono">{cacheStats.memoryCacheSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retrieval Time:</span>
                    <span className="font-mono">{cacheStats.averageRetrievalTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compression:</span>
                    <span className="font-mono">{cacheStats.compressionRatio}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 🎯 **CAPABILITY INFO**: System capabilities */}
            {stats.capabilities && (
              <div className="bg-indigo-50 rounded-lg p-2">
                <div className="text-xs text-indigo-600 font-medium mb-2">System Capabilities</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center space-x-1 ${stats.capabilities.webWorkers ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{stats.capabilities.webWorkers ? '✅' : '❌'}</span>
                    <span>Web Workers</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${stats.capabilities.offscreenCanvas ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{stats.capabilities.offscreenCanvas ? '✅' : '❌'}</span>
                    <span>OffscreenCanvas</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${stats.capabilities.indexedDB ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{stats.capabilities.indexedDB ? '✅' : '❌'}</span>
                    <span>IndexedDB</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${stats.capabilities.webGL ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{stats.capabilities.webGL ? '✅' : '❌'}</span>
                    <span>WebGL</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 🎨 **QUALITY DISTRIBUTION**: Show quality usage */}
            {stats.qualityDistribution && (
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-xs text-green-600 font-medium mb-2">Quality Distribution</div>
                <div className="space-y-1">
                  {Object.entries(stats.qualityDistribution).map(([quality, count]) => (
                    <div key={quality} className="flex justify-between text-xs">
                      <span className="capitalize">{quality}:</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </>
        ) : (
          <div className="text-center text-slate-500 py-4">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm">No performance data available</div>
            <button
              onClick={updateStats}
              className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Refresh Stats
            </button>
          </div>
        )}
        
        {/* 🔧 **ACTIONS**: Management actions */}
        <div className="flex space-x-2 pt-2 border-t border-slate-200">
          <button
            onClick={updateStats}
            className="flex-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            🔄 Refresh
          </button>
          <button
            onClick={clearHistory}
            className="flex-1 px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
          >
            🗑️ Clear History
          </button>
          <button
            onClick={clearCache}
            className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            💥 Clear Cache
          </button>
        </div>
        
        {/* 📈 **RECORDING STATUS**: Show if recording */}
        {isRecording && (
          <div className="text-center text-xs text-red-600 bg-red-50 rounded-lg p-2">
            🔴 Recording performance data ({performanceHistory.length} entries)
          </div>
        )}
      </div>
    </div>
  );
};

// 🎯 **PERFORMANCE TOGGLE BUTTON**: Button to show/hide monitor
export const PerformanceToggleButton = ({ onToggle, isVisible }) => {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-4 right-4 w-12 h-12 rounded-full shadow-lg transition-all ${
        isVisible 
          ? 'bg-red-500 text-white hover:bg-red-600' 
          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
      }`}
      title={isVisible ? 'Hide Performance Monitor' : 'Show Performance Monitor'}
    >
      📊
    </button>
  );
};

export default PerformanceMonitor;
