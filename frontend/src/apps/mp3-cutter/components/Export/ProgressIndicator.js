import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';

// 🔌 **PROGRESS INDICATOR COMPONENT**: Hiển thị tiến trình real-time từ WebSocket
const ProgressIndicator = ({ 
  progress, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // 🎨 **FADE OUT EFFECT**: Hiệu ứng mờ dần sau khi completed
  useEffect(() => {
    if (progress) {
      setIsVisible(true); // Đảm bảo hiển thị khi có progress
      
      // 🎯 **AUTO FADE OUT**: Nếu completed, hiển thị đầy đủ 2s rồi mới fade out 1.5s
      if (progress.stage === 'completed') {
        console.log('✅ [ProgressIndicator] Completed detected, starting fade sequence...');
        
        const showCompletedTimeout = setTimeout(() => {
          console.log('🎨 [ProgressIndicator] Starting fade out after 2s display...');
          setIsVisible(false);
        }, 2000); // Hiển thị đầy đủ trong 2 giây trước khi bắt đầu fade
        
        return () => {
          clearTimeout(showCompletedTimeout);
        };
      }
    }
    // Không ẩn progress khi progress = null, để component cha quyết định
  }, [progress]);

  // 📊 **PROGRESS BAR**: Hiển thị thanh tiến trình
  const renderProgressBar = () => {
    if (!progress) return null;

    const { percent = 0, stage = 'processing' } = progress;
    
    // 🎨 **STAGE COLORS**: Màu sắc theo stage
    const getStageColor = () => {
      switch (stage) {
        case 'initializing':
          return 'bg-blue-500';
        case 'processing':
          return 'bg-green-500';
        case 'completed':
          return 'bg-green-600';
        case 'error':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };

    // 🎨 **STAGE ICON**: Icon theo stage
    const getStageIcon = () => {
      switch (stage) {
        case 'initializing':
          return <Loader className="w-4 h-4 animate-spin" />;
        case 'processing':
          return <Loader className="w-4 h-4 animate-spin" />;
        case 'completed':
          return <CheckCircle className="w-4 h-4" />;
        case 'error':
          return <AlertCircle className="w-4 h-4" />;
        default:
          return <Loader className="w-4 h-4 animate-spin" />;
      }
    };

    return (
      <div className="space-y-2">
        {/* 📊 **PROGRESS INFO**: Thông tin tiến trình */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStageIcon()}
            <span className="font-medium capitalize">{stage}</span>
          </div>
          <span className="font-mono">{Math.round(percent)}%</span>
        </div>

        {/* 📊 **PROGRESS BAR**: Thanh tiến trình */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ease-out ${getStageColor()}`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>

        {/* 📊 **PROGRESS MESSAGE**: Thông điệp tiến trình */}
        {progress.message && (
          <div className="text-xs text-gray-600">
            {progress.message}
          </div>
        )}

        {/* 📊 **ADDITIONAL INFO**: Thông tin bổ sung */}
        {progress.currentTime && (
          <div className="text-xs text-gray-500">
            Current: {progress.currentTime}
            {progress.targetSize && ` | Size: ${progress.targetSize}`}
          </div>
        )}

        {/* ❌ **ERROR MESSAGE**: Hiển thị lỗi nếu có */}
        {stage === 'error' && progress.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Error: {progress.error}
          </div>
        )}
      </div>
    );
  };

  // 🎯 **MAIN RENDER**: Render chính
  if (!progress) {
    return null; // Không hiển thị gì nếu không có progress
  }

  return (
    <div 
      className={`
        bg-white border rounded-lg p-4 shadow-sm 
        transition-opacity duration-[1500ms] ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
    >
      {/* 📊 **PROGRESS BAR**: Hiển thị tiến trình */}
      {renderProgressBar()}
    </div>
  );
};

export default ProgressIndicator; 