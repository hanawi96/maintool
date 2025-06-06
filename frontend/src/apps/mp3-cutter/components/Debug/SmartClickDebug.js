import React, { useState, useEffect } from 'react';
import { MousePointer, Target, ArrowLeft, ArrowRight } from 'lucide-react';

const SmartClickDebug = ({ interactionManagerRef }) => {
  const [smartClickInfo, setSmartClickInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 🎯 Update smart click debug info every 100ms
  useEffect(() => {
    if (!interactionManagerRef?.current) return;

    const updateSmartClickInfo = () => {
      const clickInfo = interactionManagerRef.current.getSmartClickDebugInfo();
      setSmartClickInfo(clickInfo);
    };

    // Initial update
    updateSmartClickInfo();

    // Set up interval for real-time updates
    const interval = setInterval(updateSmartClickInfo, 100);

    return () => clearInterval(interval);
  }, [interactionManagerRef]);

  if (!smartClickInfo) return null;

  const getStatusColor = () => {
    if (!smartClickInfo.preferences?.enableSmartUpdate) {
      return 'bg-gray-50 border-gray-200 text-gray-600';
    }
    return 'bg-blue-50 border-blue-200 text-blue-800';
  };

  const getStatusIcon = () => {
    if (!smartClickInfo.preferences?.enableSmartUpdate) {
      return <MousePointer className="w-4 h-4 text-gray-400" />;
    }
    return <Target className="w-4 h-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (!smartClickInfo.preferences?.enableSmartUpdate) {
      return 'DISABLED';
    }
    return 'SMART CLICK';
  };

  return (
    <div className="fixed top-32 right-4 z-50">
      <div className={`border rounded-lg p-3 backdrop-blur-sm transition-all duration-200 ${getStatusColor()}`}>
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
          <span className="text-xs opacity-70">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        
        {isExpanded && (
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Manager ID:</span>
              <span className="font-mono">{smartClickInfo.id}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Smart Updates:</span>
              <span className={`font-mono ${
                smartClickInfo.preferences?.enableSmartUpdate ? 'text-green-600' : 'text-red-600'
              }`}>
                {smartClickInfo.preferences?.enableSmartUpdate ? 'ON' : 'OFF'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Min Selection:</span>
              <span className="font-mono text-blue-600">
                {smartClickInfo.preferences?.requireMinSelection || 0.1}s
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Allow Zero Duration:</span>
              <span className={`font-mono ${
                smartClickInfo.preferences?.allowZeroDuration ? 'text-orange-600' : 'text-gray-400'
              }`}>
                {smartClickInfo.preferences?.allowZeroDuration ? 'YES' : 'NO'}
              </span>
            </div>
            
            <div className="pt-1 border-t">
              <div className="flex items-center justify-between mb-1">
                <span>Click Zones:</span>
                <span className="text-xs text-gray-500">
                  {smartClickInfo.supportedZones?.length || 0}
                </span>
              </div>
              
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs">
                  <ArrowLeft className="w-3 h-3 text-purple-400" />
                  <span>Before Start → Update Start</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <ArrowRight className="w-3 h-3 text-pink-400" />
                  <span>After End → Update End</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Target className="w-3 h-3 text-green-400" />
                  <span>In Selection → Seek</span>
                </div>
              </div>
            </div>
            
            <div className="pt-1 text-xs text-gray-500">
              🎯 Smart click behavior enabled
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartClickDebug; 