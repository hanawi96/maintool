import React, { useState, useEffect, useMemo } from 'react';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';

const stageConfig = {
  initializing: {
    color: 'bg-blue-500',
    icon: <Loader className="w-4 h-4 animate-spin" />,
    label: 'Initializing'
  },
  processing: {
    color: 'bg-green-500',
    icon: <Loader className="w-4 h-4 animate-spin" />,
    label: 'Processing'
  },
  completed: {
    color: 'bg-green-600',
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Completed'
  },
  error: {
    color: 'bg-red-500',
    icon: <AlertCircle className="w-4 h-4" />,
    label: 'Error'
  },
  default: {
    color: 'bg-gray-500',
    icon: <Loader className="w-4 h-4 animate-spin" />,
    label: 'Processing'
  }
};

const ProgressIndicator = ({ progress, className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Fade out effect
  useEffect(() => {
    let timeout;
    if (progress) {
      setIsVisible(true);
      if (progress.stage === 'completed') {
        timeout = setTimeout(() => setIsVisible(false), 2000);
      }
    }
    return () => timeout && clearTimeout(timeout);
  }, [progress]);

  // Derived stage config
  const { color, icon, label } = useMemo(() => {
    if (!progress) return stageConfig.default;
    return stageConfig[progress.stage] || stageConfig.default;
  }, [progress]);

  if (!progress) return null;

  const percent = Math.round(progress.percent ?? 0);

  return (
    <div
      className={`
        bg-white border rounded-lg p-4 shadow-sm 
        transition-opacity duration-[1500ms] ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium capitalize">{label}</span>
          </div>
          <span className="font-mono">{percent}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${color}`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>

        {progress.message && (
          <div className="text-xs text-gray-600">{progress.message}</div>
        )}

        {(progress.currentTime || progress.targetSize) && (
          <div className="text-xs text-gray-500">
            {progress.currentTime && `Current: ${progress.currentTime}`}
            {progress.currentTime && progress.targetSize && ' | '}
            {progress.targetSize && `Size: ${progress.targetSize}`}
          </div>
        )}

        {progress.stage === 'error' && progress.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Error: {progress.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;
