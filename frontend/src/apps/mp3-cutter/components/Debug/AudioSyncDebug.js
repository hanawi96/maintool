import React, { useState, useEffect } from 'react';
import { RotateCcw, Volume2, Play, Pause } from 'lucide-react';

const AudioSyncDebug = ({ interactionManagerRef, isPlaying, currentTime }) => {
  const [syncDebugInfo, setSyncDebugInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 🎯 Update sync debug info every 100ms
  useEffect(() => {
    if (!interactionManagerRef?.current) return;

    const updateSyncDebugInfo = () => {
      const syncInfo = interactionManagerRef.current.getAudioSyncDebugInfo();
      setSyncDebugInfo(syncInfo);
    };

    // Initial update
    updateSyncDebugInfo();

    // Set up interval for real-time updates
    const interval = setInterval(updateSyncDebugInfo, 100);

    return () => clearInterval(interval);
  }, [interactionManagerRef]);

  if (!syncDebugInfo) return null;

  const getSyncStatusColor = () => {
    if (!syncDebugInfo.isEnabled) return 'bg-gray-50 border-gray-200 text-gray-600';
    if (syncDebugInfo.isThrottled) return 'bg-orange-50 border-orange-200 text-orange-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  const getSyncStatusIcon = () => {
    if (!syncDebugInfo.isEnabled) return <Volume2 className="w-4 h-4 text-gray-400" />;
    if (syncDebugInfo.isThrottled) return <RotateCcw className="w-4 h-4 text-orange-500 animate-spin" />;
    return <Volume2 className="w-4 h-4 text-green-500" />;
  };

  const getSyncStatusText = () => {
    if (!syncDebugInfo.isEnabled) return 'DISABLED';
    if (syncDebugInfo.isThrottled) return 'THROTTLED';
    return 'READY';
  };

  return (
    <div className="fixed top-16 right-4 z-50">
      <div className={`border rounded-lg p-3 backdrop-blur-sm transition-all duration-200 ${getSyncStatusColor()}`}>
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {getSyncStatusIcon()}
          <span className="text-sm font-medium">
            Audio Sync: {getSyncStatusText()}
          </span>
          <span className="text-xs opacity-70">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        
        {isExpanded && (
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Sync ID:</span>
              <span className="font-mono">{syncDebugInfo.id}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Enabled:</span>
              <span className={`font-mono ${
                syncDebugInfo.isEnabled ? 'text-green-600' : 'text-red-600'
              }`}>
                {syncDebugInfo.isEnabled ? 'YES' : 'NO'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Start Handle Sync:</span>
              <span className={`font-mono ${
                syncDebugInfo.preferences?.syncStartHandle ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {syncDebugInfo.preferences?.syncStartHandle ? 'ON' : 'OFF'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>End Handle Sync:</span>
              <span className={`font-mono ${
                syncDebugInfo.preferences?.syncEndHandle ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {syncDebugInfo.preferences?.syncEndHandle ? 'ON' : 'OFF'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Sync When Paused:</span>
              <span className={`font-mono ${
                !syncDebugInfo.preferences?.syncOnlyWhenPlaying ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {!syncDebugInfo.preferences?.syncOnlyWhenPlaying ? 'YES' : 'NO'}
              </span>
            </div>
            
            <div className="pt-1 border-t">
              <div className="flex justify-between">
                <span>Audio State:</span>
                <div className="flex items-center gap-1">
                  {isPlaying ? (
                    <Play className="w-3 h-3 text-green-500" />
                  ) : (
                    <Pause className="w-3 h-3 text-gray-400" />
                  )}
                  <span className="font-mono">
                    {currentTime ? currentTime.toFixed(2) + 's' : '0.00s'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-1 text-xs text-gray-500">
              🎯 Dragging start handle syncs cursor
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioSyncDebug; 