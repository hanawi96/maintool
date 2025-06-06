import React from 'react';
import { AUDIO_FORMATS } from '../../utils/constants';

const FormatSelector = ({ selectedFormat, onFormatChange }) => {
  return (
    <div>
      <label className="block text-xs text-slate-600 mb-1">Output Format</label>
      <select
        value={selectedFormat}
        onChange={(e) => onFormatChange(e.target.value)}
        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all"
      >
        {Object.values(AUDIO_FORMATS).map(format => (
          <option key={format.value} value={format.value}>
            {format.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FormatSelector;