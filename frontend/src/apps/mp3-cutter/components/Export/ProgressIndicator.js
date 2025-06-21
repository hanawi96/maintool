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
    
    // Debug every progress update for smooth tracking
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

    // For very small changes (≤1%), update immediately for ultra-smooth feel
    if (Math.abs(targetPercent - currentPercent) <= 1) {
      setDisplayPercent(targetPercent);
      return;
    }

    // For backward progress, update immediately
    if (targetPercent < currentPercent) {
      setDisplayPercent(targetPercent);
      return;
    }

    // Smooth animation for forward progress
    const startTime = Date.now();
    const startPercent = currentPercent;
    const distance = targetPercent - startPercent;
    // Faster animation for smaller distances, slower for larger jumps
    const duration = Math.min(300, Math.max(100, distance * 15));

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ultra-smooth easing function (ease-out-cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      const newPercent = Math.round(startPercent + distance * easeProgress);
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
