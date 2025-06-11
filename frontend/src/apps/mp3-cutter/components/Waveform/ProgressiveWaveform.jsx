// 🚀 **PROGRESSIVE WAVEFORM COMPONENT** - Smart loading with never-blocking UI
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\components\Waveform\ProgressiveWaveform.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHybridWaveform } from '../../hooks/useHybridWaveform';
import WaveformCanvas from './WaveformCanvas';
import { WAVEFORM_CONFIG } from '../../utils/constants';

// 🎨 **LOADING PHASES VISUALIZATION**: Beautiful loading states
const LoadingPhaseIndicator = React.memo(({ phase, progress, fileName }) => {
  const phaseInfo = {
    idle: { icon: '⭐', label: 'Ready', color: '#64748b' },
    thumbnail: { icon: '🖼️', label: 'Generating Preview', color: '#3b82f6' },
    processing: { icon: '⚡', label: 'Processing Audio', color: '#7c3aed' },
    rendering: { icon: '🎨', label: 'Rendering Waveform', color: '#06b6d4' },
    complete: { icon: '✅', label: 'Complete', color: '#10b981' }
  };
  
  const current = phaseInfo[phase] || phaseInfo.idle;
  
  return (
    <div className="flex items-center justify-center w-full p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
      <div className="text-center space-y-4">
        {/* 🎯 **ANIMATED ICON**: Phase-specific icon with animation */}
        <div 
          className="text-4xl animate-pulse"
          style={{ color: current.color }}
        >
          {current.icon}
        </div>
        
        {/* 📊 **PROGRESS BAR**: Beautiful progress indicator */}
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>{current.label}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${current.color}, ${current.color}dd)`
              }}
            />
          </div>
          
          {fileName && (
            <div className="text-xs text-slate-500 truncate max-w-64">
              Processing: {fileName}
            </div>
          )}
        </div>
        
        {/* 🎨 **WAVEFORM SKELETON**: Animated preview */}
        <div className="flex items-center justify-center gap-1 opacity-40">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-300 rounded-full animate-pulse"
              style={{
                width: '2px',
                height: `${8 + Math.sin(i * 0.5) * 4}px`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

LoadingPhaseIndicator.displayName = 'LoadingPhaseIndicator';

// 🎯 **THUMBNAIL PREVIEW**: Quick preview during processing
const ThumbnailPreview = React.memo(({ thumbnail, onUpgrade }) => {
  if (!thumbnail || !thumbnail.data) return null;
  
  return (
    <div className="relative">
      {/* 🔧 **BLUR OVERLAY**: Indicate this is low quality */}
      <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-blue-600 font-medium">
          Preview Quality
        </div>
      </div>
      
      {/* 🎨 **THUMBNAIL WAVEFORM**: Low quality preview */}
      <div className="bg-white rounded-lg border border-slate-200 p-2">
        <div className="flex items-center justify-center h-16 space-x-1">
          {thumbnail.data.map((value, i) => (
            <div
              key={i}
              className="bg-blue-400"
              style={{
                width: '2px',
                height: `${Math.max(2, value * 60)}px`,
                opacity: 0.7
              }}
            />
          ))}
        </div>
        
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            Click for full quality
          </button>
        )}
      </div>
    </div>
  );
});

ThumbnailPreview.displayName = 'ThumbnailPreview';

// 🚀 **PROGRESSIVE WAVEFORM COMPONENT**: Main component with intelligent loading
const ProgressiveWaveform = ({
  file,
  canvasRef,
  currentTime,
  duration,
  startTime,
  endTime,
  hoveredHandle,
  isDragging,
  isPlaying,
  volume = 1,
  fadeIn = 0,
  fadeOut = 0,
  isInverted = false,
  audioRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWaveformReady,
  onError,
  quality = 'standard', // low, standard, high, premium
  priority = 'normal', // low, normal, high
  enableThumbnail = true,
  enableProgressiveUpgrade = true,
  className = ''
}) => {
  // 🚀 **HYBRID PROCESSING**: Use the hybrid waveform hook
  const {
    processFile,
    isLoading,
    loadingPhase,
    progress,
    waveformData,
    thumbnail,
    error,
    processingStats,
    cancelProcessing,
    utils
  } = useHybridWaveform();
  
  // 📊 **COMPONENT STATE**: Local state management
  const [currentQuality, setCurrentQuality] = useState(quality);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(enableThumbnail);
  const [processingStartTime, setProcessingStartTime] = useState(null);
  
  // 🎯 **FILE PROCESSING**: Process file when it changes
  useEffect(() => {
    if (!file) {
      return;
    }
    
    const startProcessing = async () => {
      setProcessingStartTime(Date.now());
      
      try {
        console.log('🚀 [ProgressiveWaveform] Starting file processing:', {
          fileName: file.name,
          quality: currentQuality,
          priority
        });
        
        const result = await processFile(file, {
          quality: currentQuality,
          priority,
          onProgress: (progressData) => {
            // Progress is automatically handled by the hook
            console.log('📊 [ProgressiveWaveform] Progress:', progressData);
          },
          onThumbnail: (thumbnailData) => {
            console.log('🖼️ [ProgressiveWaveform] Thumbnail ready');
            if (onWaveformReady && enableThumbnail) {
              // Provide thumbnail data immediately for instant feedback
              onWaveformReady({
                data: thumbnailData.data,
                duration: thumbnailData.duration,
                isPreview: true,
                quality: 'thumbnail'
              });
            }
          }
        });
        
        if (result) {
          console.log('✅ [ProgressiveWaveform] Processing complete:', {
            strategy: result.strategy,
            fromCache: result.fromCache,
            processingTime: result.processingTime?.toFixed(2) + 'ms'
          });
          
          // 📊 **NOTIFY PARENT**: Send complete waveform data
          if (onWaveformReady) {
            onWaveformReady({
              data: result.data,
              duration: result.duration,
              isPreview: false,
              quality: currentQuality,
              processingTime: result.processingTime,
              strategy: result.strategy,
              fromCache: result.fromCache
            });
          }
        }
        
      } catch (error) {
        console.error('❌ [ProgressiveWaveform] Processing failed:', error);
        if (onError) {
          onError(error);
        }
      }
    };
    
    startProcessing();
  }, [file, currentQuality, priority, processFile, onWaveformReady, onError, enableThumbnail]);
  
  // 🔄 **QUALITY UPGRADE**: Upgrade to higher quality
  const upgradeQuality = useCallback(async (newQuality) => {
    if (!file || isUpgrading || newQuality === currentQuality) return;
    
    setIsUpgrading(true);
    
    try {
      console.log('🔄 [ProgressiveWaveform] Upgrading quality:', {
        from: currentQuality,
        to: newQuality
      });
      
      const result = await processFile(file, {
        quality: newQuality,
        priority: 'high' // High priority for user-requested upgrades
      });
      
      if (result) {
        setCurrentQuality(newQuality);
        
        if (onWaveformReady) {
          onWaveformReady({
            data: result.data,
            duration: result.duration,
            isPreview: false,
            quality: newQuality,
            processingTime: result.processingTime,
            strategy: result.strategy,
            fromCache: result.fromCache
          });
        }
        
        console.log('✅ [ProgressiveWaveform] Quality upgrade complete');
      }
    } catch (error) {
      console.error('❌ [ProgressiveWaveform] Quality upgrade failed:', error);
    } finally {
      setIsUpgrading(false);
    }
  }, [file, currentQuality, isUpgrading, processFile, onWaveformReady]);
  
  // 🎨 **PROGRESSIVE UPGRADE**: Auto-upgrade based on user interaction
  useEffect(() => {
    if (!enableProgressiveUpgrade || !waveformData || currentQuality === 'premium') return;
    
    // 🎯 **AUTO-UPGRADE CONDITIONS**: Upgrade when user starts interacting
    if (isDragging || isPlaying) {
      const upgradeMap = {
        'low': 'standard',
        'standard': 'high',
        'high': 'premium'
      };
      
      const nextQuality = upgradeMap[currentQuality];
      if (nextQuality) {
        console.log('🎨 [ProgressiveWaveform] Auto-upgrading quality due to user interaction');
        upgradeQuality(nextQuality);
      }
    }
  }, [isDragging, isPlaying, currentQuality, waveformData, enableProgressiveUpgrade, upgradeQuality]);
  
  // 📊 **ESTIMATED TIME**: Calculate estimated processing time
  const estimatedTime = useMemo(() => {
    if (!file) return 0;
    return utils.estimateProcessingTime(file, currentQuality);
  }, [file, currentQuality, utils]);
  
  // 🎯 **LOADING STATE**: Show appropriate loading state
  if (isLoading || isUpgrading) {
    return (
      <div className={`relative ${className}`}>
        <LoadingPhaseIndicator 
          phase={loadingPhase} 
          progress={progress} 
          fileName={file?.name}
        />
        
        {/* 🔄 **CANCEL BUTTON**: Allow cancellation */}
        <button
          onClick={cancelProcessing}
          className="absolute top-2 right-2 text-slate-500 hover:text-slate-700 transition-colors"
          title="Cancel processing"
        >
          ✕
        </button>
        
        {/* 📊 **PROCESSING INFO**: Show estimated time */}
        {estimatedTime > 1000 && (
          <div className="absolute bottom-2 left-2 text-xs text-slate-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
            Est. {Math.round(estimatedTime / 1000)}s
          </div>
        )}
      </div>
    );
  }
  
  // ❌ **ERROR STATE**: Show error
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <span>❌</span>
          <span className="font-medium">Processing Failed</span>
        </div>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        
        {/* 🔄 **RETRY BUTTON**: Allow retry */}
        {file && (
          <button
            onClick={() => processFile(file, { quality: currentQuality, priority })}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }
  
  // 🖼️ **THUMBNAIL STATE**: Show thumbnail while processing full quality
  if (showThumbnail && thumbnail && !waveformData) {
    return (
      <div className={`relative ${className}`}>
        <ThumbnailPreview 
          thumbnail={thumbnail}
          onUpgrade={() => upgradeQuality('high')}
        />
        
        {/* 📊 **PROCESSING STATUS**: Show background processing status */}
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
          Processing {Math.round(progress)}%
        </div>
      </div>
    );
  }
  
  // ✅ **COMPLETE STATE**: Show full waveform
  if (waveformData && waveformData.data) {
    return (
      <div className={`relative ${className}`}>
        {/* 🎨 **MAIN WAVEFORM**: Full quality waveform canvas */}
        <WaveformCanvas
          canvasRef={canvasRef}
          waveformData={waveformData.data}
          currentTime={currentTime}
          duration={duration || waveformData.duration}
          startTime={startTime}
          endTime={endTime}
          hoveredHandle={hoveredHandle}
          isDragging={isDragging}
          isPlaying={isPlaying}
          volume={volume}
          fadeIn={fadeIn}
          fadeOut={fadeOut}
          isInverted={isInverted}
          audioRef={audioRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
        
        {/* 📊 **QUALITY INDICATOR**: Show current quality and stats */}
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          {/* 🎯 **QUALITY BADGE**: Current quality level */}
          <div className={`text-xs px-2 py-1 rounded-full ${
            currentQuality === 'premium' ? 'bg-purple-100 text-purple-700' :
            currentQuality === 'high' ? 'bg-blue-100 text-blue-700' :
            currentQuality === 'standard' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {currentQuality}
          </div>
          
          {/* ⚡ **PERFORMANCE BADGE**: Show if from cache */}
          {processingStats?.fromCache && (
            <div className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              ⚡ Cached
            </div>
          )}
        </div>
        
        {/* 🔄 **QUALITY CONTROLS**: Allow manual quality adjustment */}
        {enableProgressiveUpgrade && (
          <div className="absolute bottom-2 right-2 flex items-center space-x-1">
            {['standard', 'high', 'premium'].map((q) => (
              <button
                key={q}
                onClick={() => upgradeQuality(q)}
                disabled={q === currentQuality || isUpgrading}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  q === currentQuality 
                    ? 'bg-slate-200 text-slate-500 cursor-default'
                    : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-800'
                }`}
                title={`Upgrade to ${q} quality`}
              >
                {q.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // 🔄 **EMPTY STATE**: No file provided
  return (
    <div className={`bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center ${className}`}>
      <div className="text-slate-400 text-lg">🎵</div>
      <p className="text-slate-500 text-sm mt-2">No audio file provided</p>
    </div>
  );
};

ProgressiveWaveform.displayName = 'ProgressiveWaveform';

export default ProgressiveWaveform;
