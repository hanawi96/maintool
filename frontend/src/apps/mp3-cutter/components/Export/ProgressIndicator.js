import React, { useState, useEffect, useRef } from 'react';
import { Loader, CheckCircle } from 'lucide-react';

const ProgressIndicator = ({ progress, className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [displayPercent, setDisplayPercent] = useState(0);
  const animationRef = useRef(null);
  const lastProgressRef = useRef(0);

  // Clean progress animation without loops
  useEffect(() => {
    if (progress?.percent === undefined) return;

    const targetPercent = Math.max(0, Math.min(100, progress.percent));
    
    // Debug key progress updates
    if (targetPercent === 0 || targetPercent === 100 || targetPercent % 10 === 0) {
      console.log(`🎯 Frontend Received: ${targetPercent}%`);
    }
    lastProgressRef.current = targetPercent;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Get current display percent at animation start
    const currentPercent = displayPercent;

    // For first 10% (startup phase), use immediate updates to prevent flickering
    if (targetPercent <= 10 || Math.abs(targetPercent - currentPercent) <= 1) {
      setDisplayPercent(targetPercent);
      console.log(`🎯 Frontend: Immediate update ${currentPercent}% → ${targetPercent}%`);
      return;
    }

    // For backward progress, update immediately
    if (targetPercent < currentPercent) {
      setDisplayPercent(targetPercent);
      return;
    }

    // Smooth animation only for larger forward progress (>10%)
    const startTime = Date.now();
    const startPercent = currentPercent;
    const distance = targetPercent - startPercent;
    // Optimized duration for smooth progression
    const duration = Math.min(200, Math.max(80, distance * 8));

    console.log(`🎯 Frontend: Smooth animation ${startPercent}% → ${targetPercent}% (${duration}ms)`);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth linear progression for consistency
      const newPercent = Math.round(startPercent + distance * progress);
      setDisplayPercent(newPercent);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setDisplayPercent(targetPercent); // Ensure exact target
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [progress?.percent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Auto-hide when complete
  useEffect(() => {
    if (progress?.percent >= 100) {
      const timeout = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timeout);
    } else {
      setIsVisible(true);
    }
  }, [progress?.percent]);

  if (!progress) return null;

  const isCompleted = displayPercent >= 100;

  return (
    <div
      className={`
        bg-white border rounded-lg p-4 shadow-sm 
        transition-opacity duration-500 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Loader className="w-4 h-4 animate-spin text-green-600" />
            )}
            <span className="font-medium text-gray-800">
              {isCompleted ? 'Completed' : 'Processing'}
            </span>
          </div>
          <span className="font-mono text-lg font-bold text-gray-900">
            {displayPercent}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ 
              width: `${displayPercent}%`,
              transition: 'none' // Remove CSS transition to prevent conflicts
            }}
          />
        </div>

        <div className="text-xs text-gray-600 font-medium">
          {isCompleted ? 'Audio processing completed' : 'Processing audio...'}
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
