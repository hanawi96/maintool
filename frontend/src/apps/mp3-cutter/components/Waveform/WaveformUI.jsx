import React from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

export const WaveformUI = ({ hoverTooltip, handleTooltips }) => {
  return (
    <>
      {/* Hover Time Tooltip */}
      {hoverTooltip?.visible && (
        <div
          className="absolute pointer-events-none text-xs font-bold z-50"
          style={{
            left: `${hoverTooltip.x}px`,
            top: '-25px',
            transform: 'translateX(-50%)',
            color: '#1e293b',
            whiteSpace: 'nowrap',
            fontWeight: '700',
            fontSize: '11px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            padding: '2px 6px'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* Start Handle Tooltip */}
      {handleTooltips.startHandle?.visible && (
        <div
          className="absolute pointer-events-none text-xs px-2 py-1 rounded font-medium z-40"
          style={{
            left: `${handleTooltips.startHandle.x}px`,
            top: `${WAVEFORM_CONFIG.HEIGHT + 5}px`,
            transform: 'translateX(-50%)',
            backgroundColor: WAVEFORM_CONFIG.COLORS.HANDLE_START,
            color: 'white',
            whiteSpace: 'nowrap',
            border: '1px solid #0d9488'
          }}
        >
          {handleTooltips.startHandle.formattedTime}
        </div>
      )}

      {/* End Handle Tooltip */}
      {handleTooltips.endHandle?.visible && (
        <div
          className="absolute pointer-events-none text-xs px-2 py-1 rounded font-medium z-40"
          style={{
            left: `${handleTooltips.endHandle.x}px`,
            top: `${WAVEFORM_CONFIG.HEIGHT + 5}px`,
            transform: 'translateX(-50%)',
            backgroundColor: WAVEFORM_CONFIG.COLORS.HANDLE_END,
            color: 'white',
            whiteSpace: 'nowrap',
            border: '1px solid #ea580c'
          }}
        >
          {handleTooltips.endHandle.formattedTime}
        </div>
      )}

      {/* Selection Duration Tooltip */}
      {handleTooltips.selectionDuration?.visible && (
        <div
          className="absolute pointer-events-none text-sm font-semibold z-30"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_CONFIG.HEIGHT - 30}px`,
            transform: 'translateX(-50%)',
            color: '#1e293b',
            whiteSpace: 'nowrap',
            fontWeight: '600',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            padding: '4px 8px'
          }}
        >
          {handleTooltips.selectionDuration.formattedDuration}
        </div>
      )}
    </>
  );
};