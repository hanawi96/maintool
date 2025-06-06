import React, { useRef } from 'react';
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
  // 🔥 **FIX INFINITE LOG**: Throttle logging để tránh spam
  const lastLogTimeRef = useRef(0);
  const renderCountRef = useRef(0);
  
  renderCountRef.current += 1;
  const now = performance.now();
  
  // 🔥 **THROTTLED LOGGING**: Chỉ log mỗi 5 giây
  if (now - lastLogTimeRef.current > 5000) {
    console.log(`🌊 [Waveform] Render #${renderCountRef.current} (throttled - last 5s)`, {
      waveformLength: waveformData.length,
      duration: duration.toFixed(2) + 's',
      note: 'TimeSelector moved to UnifiedControlBar'
    });
    lastLogTimeRef.current = now;
  }
  
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