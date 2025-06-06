import React, { useState, useEffect } from 'react';
import { Mouse, Hand, Target } from 'lucide-react';

const InteractionDebug = ({ interactionManagerRef }) => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 🎯 Update debug info every 100ms when active
  useEffect(() => {
    if (!interactionManagerRef?.current) return;

    const updateDebugInfo = () => {
      const info = interactionManagerRef.current.getDebugInfo();
      setDebugInfo(info);
    };

    // Initial update
    updateDebugInfo();

    // Set up interval for real-time updates
    const interval = setInterval(updateDebugInfo, 100);

    return () => clearInterval(interval);
  }, [interactionManagerRef]);

  if (!debugInfo) return null;

  const getStateIcon = () => {
    switch (debugInfo.state) {
      case 'dragging':
        return <Hand className="w-4 h-4 text-red-500" />;
      case 'hovering':
        return <Target className="w-4 h-4 text-yellow-500" />;
      default:
        return <Mouse className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStateColor = () => {
    switch (debugInfo.state) {
      case 'dragging':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'hovering':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`border rounded-lg p-3 backdrop-blur-sm transition-all duration-200 ${getStateColor()}`}>
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {getStateIcon()}
          <span className="text-sm font-medium">
            Interaction: {debugInfo.state.toUpperCase()}
          </span>
          <span className="text-xs opacity-70">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        
        {isExpanded && (
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Manager ID:</span>
              <span className="font-mono">{debugInfo.id}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Active Handle:</span>
              <span className={`font-mono ${
                debugInfo.activeHandle ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {debugInfo.activeHandle || 'none'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Hovered Handle:</span>
              <span className={`font-mono ${
                debugInfo.lastHoveredHandle ? 'text-green-600' : 'text-gray-400'
              }`}>
                {debugInfo.lastHoveredHandle || 'none'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Is Dragging:</span>
              <span className={`font-mono ${
                debugInfo.isDragging ? 'text-red-600' : 'text-gray-400'
              }`}>
                {debugInfo.isDragging ? 'YES' : 'NO'}
              </span>
            </div>
            
            <div className="pt-1 border-t">
              <div className="text-xs text-gray-500">
                🎯 Only dragging changes region
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractionDebug; 