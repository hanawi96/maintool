import React, { useRef, useCallback, useEffect } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { WAVEFORM_CONFIG } from '../../utils/constants';

const Waveform = ({
  // Waveform props
  canvasRef,
  waveformData,
  currentTime,
  duration,
  startTime,
  endTime,
  hoveredHandle,
  isDragging,
  isPlaying,
  
  // Canvas handlers
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {
  // 🔥 **FIX INFINITE LOG**: Refs để track render mà không gây setState
  const lastLogTimeRef = useRef(0);
  const renderCountRef = useRef(0);
  const setupCompleteRef = useRef(false);
  
  // 🔥 **SMART RENDER TRACKING**: Passive tracking không gây re-render
  const trackRender = useCallback(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    
    // 🔥 **INITIAL SETUP LOG**: Chỉ log setup lần đầu
    if (!setupCompleteRef.current && waveformData.length > 0 && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      setTimeout(() => {
        console.log('🌊 [Waveform] Initial setup complete:', {
          waveformLength: waveformData.length,
          duration: duration.toFixed(2) + 's',
          renderCount: renderCountRef.current,
          note: 'TimeSelector moved to UnifiedControlBar'
        });
      }, 0);
    }
    
    // 🔥 **PERIODIC STATUS**: Log trạng thái mỗi 60s để debug
    if (now - lastLogTimeRef.current > 60000) {
      lastLogTimeRef.current = now;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle  
      setTimeout(() => {
        console.log(`🌊 [Waveform] Status check (60s interval):`, {
          renders: renderCountRef.current,
          waveformLength: waveformData.length,
          duration: duration.toFixed(2) + 's',
          isPlaying,
          timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`
        });
      }, 0);
    }
  }, [waveformData.length, duration, isPlaying, startTime, endTime]);
  
  // 🔥 **PASSIVE RENDER TRACKING**: Track render chỉ để debug, không gây re-render
  useEffect(() => {
    trackRender();
  });
  
  const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;
  
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: `${minWidth}px` }}>
          <WaveformCanvas
            canvasRef={canvasRef}
            waveformData={waveformData}
            currentTime={currentTime}
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            hoveredHandle={hoveredHandle}
            isDragging={isDragging}
            isPlaying={isPlaying}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          />
        </div>
      </div>
    </div>
  );
};

export default Waveform;