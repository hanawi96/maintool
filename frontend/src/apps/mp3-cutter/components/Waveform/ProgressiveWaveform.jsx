// Optimized ProgressiveWaveform Component
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHybridWaveform } from '../../hooks/useHybridWaveform';
import WaveformCanvas from './WaveformCanvas';
import classNames from 'classnames';

const QUALITY_STYLES = {
  premium: 'bg-purple-100 text-purple-700',
  high: 'bg-blue-100 text-blue-700',
  standard: 'bg-green-100 text-green-700',
  low: 'bg-gray-100 text-gray-700'
};

const upgradeMap = {
  low: 'standard',
  standard: 'high',
  high: 'premium'
};

const QualityBadge = ({ level }) => (
  <div className={`text-xs px-2 py-1 rounded-full ${QUALITY_STYLES[level] || 'bg-gray-100 text-gray-700'}`}>{level}</div>
);

const LoadingPhaseIndicator = React.memo(({ phase, progress, fileName }) => {
  const phaseInfo = useMemo(() => ({
    idle: { icon: '⭐', label: 'Ready', color: '#64748b' },
    thumbnail: { icon: '🖼️', label: 'Generating Preview', color: '#3b82f6' },
    processing: { icon: '⚡', label: 'Processing Audio', color: '#7c3aed' },
    rendering: { icon: '🎨', label: 'Rendering Waveform', color: '#06b6d4' },
    complete: { icon: '✅', label: 'Complete', color: '#10b981' }
  }), []);

  const current = phaseInfo[phase] || phaseInfo.idle;

  return (
    <div className="flex items-center justify-center w-full p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
      <div className="text-center space-y-4">
        <div className="text-4xl animate-pulse" style={{ color: current.color }}>{current.icon}</div>
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>{current.label}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${current.color}, ${current.color}dd)` }} />
          </div>
          {fileName && <div className="text-xs text-slate-500 truncate max-w-64">Processing: {fileName}</div>}
        </div>
        <div className="flex items-center justify-center gap-1 opacity-40">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="bg-slate-300 rounded-full animate-pulse" style={{ width: '2px', height: `${8 + Math.sin(i * 0.5) * 4}px`, animationDelay: `${i * 100}ms`, animationDuration: '1.5s' }} />
          ))}
        </div>
      </div>
    </div>
  );
});

const ThumbnailPreview = React.memo(({ thumbnail, onUpgrade }) => {
  if (!thumbnail?.data) return null;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-blue-600 font-medium">Preview Quality</div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-2">
        <div className="flex items-center justify-center h-16 space-x-1">
          {thumbnail.data.map((value, i) => (
            <div key={i} className="bg-blue-400" style={{ width: '2px', height: `${Math.max(2, value * 60)}px`, opacity: 0.7 }} />
          ))}
        </div>
        {onUpgrade && (
          <button onClick={onUpgrade} className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors">
            Click for full quality
          </button>
        )}
      </div>
    </div>
  );
});

const ProgressiveWaveform = ({
  file, canvasRef, currentTime, duration, startTime, endTime,
  hoveredHandle, isDragging, isPlaying, volume = 1,
  fadeIn = 0, fadeOut = 0, isInverted = false, audioRef,
  onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
  onWaveformReady, onError, quality = 'standard',
  priority = 'normal', enableThumbnail = true,
  enableProgressiveUpgrade = true, className = ''
}) => {
  const {
    processFile, isLoading, loadingPhase, progress,
    waveformData, thumbnail, error, processingStats,
    cancelProcessing, utils
  } = useHybridWaveform();

  const [currentQuality, setCurrentQuality] = useState(quality);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const startProcessing = useCallback(async () => {
    if (!file) return;
    try {
      const result = await processFile(file, {
        quality: currentQuality,
        priority,
        onThumbnail: (thumb) => {
          if (onWaveformReady && enableThumbnail) {
            onWaveformReady({ ...thumb, isPreview: true, quality: 'thumbnail' });
          }
        }
      });
      if (result && onWaveformReady) {
        onWaveformReady({ ...result, isPreview: false, quality: currentQuality });
      }
    } catch (err) {
      onError?.(err);
    }
  }, [file, currentQuality, priority, processFile, onWaveformReady, enableThumbnail, onError]);

  useEffect(() => { startProcessing(); }, [startProcessing]);

  const upgradeQuality = useCallback(async (newQuality) => {
    if (!file || isUpgrading || newQuality === currentQuality) return;
    setIsUpgrading(true);
    try {
      const result = await processFile(file, { quality: newQuality, priority: 'high' });
      if (result && onWaveformReady) {
        onWaveformReady({ ...result, isPreview: false, quality: newQuality });
        setCurrentQuality(newQuality);
      }
    } finally {
      setIsUpgrading(false);
    }
  }, [file, isUpgrading, currentQuality, processFile, onWaveformReady]);

  useEffect(() => {
    if (enableProgressiveUpgrade && waveformData && currentQuality !== 'premium') {
      if (isDragging || isPlaying) {
        const next = upgradeMap[currentQuality];
        next && upgradeQuality(next);
      }
    }
  }, [isDragging, isPlaying, currentQuality, waveformData, enableProgressiveUpgrade, upgradeQuality]);

  const estimatedTime = useMemo(() => file ? utils.estimateProcessingTime(file, currentQuality) : 0, [file, currentQuality, utils]);

  const renderContent = () => {
    if (isLoading || isUpgrading) return (
      <>
        <LoadingPhaseIndicator phase={loadingPhase} progress={progress} fileName={file?.name} />
        <button onClick={cancelProcessing} className="absolute top-2 right-2 text-slate-500 hover:text-slate-700">✕</button>
        {estimatedTime > 1000 && <div className="absolute bottom-2 left-2 text-xs text-slate-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded">Est. {Math.round(estimatedTime / 1000)}s</div>}
      </>
    );

    if (error) return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-red-600">
          <span>❌</span><span className="font-medium">Processing Failed</span>
        </div>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button onClick={startProcessing} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">Try Again</button>
      </div>
    );

    if (thumbnail && !waveformData) return (
      <>
        <ThumbnailPreview thumbnail={thumbnail} onUpgrade={() => upgradeQuality('high')} />
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Processing {Math.round(progress)}%</div>
      </>
    );

    if (waveformData?.data) return (
      <>
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
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          <QualityBadge level={currentQuality} />
          {processingStats?.fromCache && <div className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">⚡ Cached</div>}
        </div>
        {enableProgressiveUpgrade && (
          <div className="absolute bottom-2 right-2 flex items-center space-x-1">
            {['standard', 'high', 'premium'].map((q) => (
              <button key={q} onClick={() => upgradeQuality(q)} disabled={q === currentQuality || isUpgrading} className={classNames(
                'text-xs px-2 py-1 rounded transition-colors',
                q === currentQuality ? 'bg-slate-200 text-slate-500 cursor-default' : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-800'
              )} title={`Upgrade to ${q} quality`}>
                {q.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </>
    );

    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
        <div className="text-slate-400 text-lg">🎵</div>
        <p className="text-slate-500 text-sm mt-2">No audio file provided</p>
      </div>
    );
  };

  return <div className={className}>{renderContent()}</div>;
};

ProgressiveWaveform.displayName = 'ProgressiveWaveform';
export default ProgressiveWaveform;
