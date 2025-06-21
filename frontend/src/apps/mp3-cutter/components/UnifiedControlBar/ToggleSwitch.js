import React from 'react';

const ToggleSwitch = ({ 
  id, 
  checked, 
  onChange, 
  label, 
  color = 'purple', 
  disabled = false,
  debug = false
}) => {
  const handleToggle = () => {
    if (disabled) return;
    if (debug) console.log(`🎛️ Toggle ${id}: ${!checked}`);
    onChange(!checked);
  };

  const colorClasses = {
    purple: {
      on: 'bg-purple-500',
      badge: 'bg-purple-100 text-purple-700'
    },
    teal: {
      on: 'bg-teal-500', 
      badge: 'bg-teal-100 text-teal-700'
    },
    green: {
      on: 'bg-green-500',
      badge: 'bg-green-100 text-green-700'
    }
  };

  const colors = colorClasses[color] || colorClasses.purple;

  return (
    <div className="flex items-center gap-3">
      <div 
        className={`relative w-8 h-4 rounded-full transition-all duration-200 ease-in-out cursor-pointer
          ${checked ? colors.on : 'bg-slate-300 hover:bg-slate-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleToggle}
      >
        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out transform
          absolute top-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
      </div>
      
      <label 
        htmlFor={id}
        className="text-slate-700 cursor-pointer select-none text-sm"
        onClick={handleToggle}
      >
        {label}
      </label>
    </div>
  );
};

export default ToggleSwitch; 