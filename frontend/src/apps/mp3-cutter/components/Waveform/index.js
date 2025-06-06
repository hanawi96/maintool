import React from 'react';
import WaveformCanvas from './WaveformCanvas';
import TimeSelector from './TimeSelector';
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
  onMouseLeave,
  
  // Time handlers
  onStartTimeChange,
  onEndTimeChange
}) => {
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
      
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[300px]">
          <TimeSelector
            startTime={startTime}
            endTime={endTime}
            duration={duration}
            onStartTimeChange={onStartTimeChange}
            onEndTimeChange={onEndTimeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Waveform;