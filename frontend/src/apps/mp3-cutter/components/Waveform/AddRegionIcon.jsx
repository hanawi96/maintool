import React, { memo } from 'react';

// 🎯 Optimized Add Region Icon Component
const AddRegionIcon = memo(({ 
  x, 
  y, 
  onClick,
  spaceStart,
  spaceEnd,
  spaceDuration 
}) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('➕ Add region icon clicked:', {
      spaceStart: spaceStart.toFixed(2),
      spaceEnd: spaceEnd.toFixed(2),
      spaceDuration: spaceDuration.toFixed(2)
    });
    
    onClick?.(spaceStart, spaceEnd);
  };

  return (
    <div
      className="add-region-icon"
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: '#22c55e',
        border: '2px solid white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'white',
        zIndex: 10, // Below regions (which are z-index 15+)
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
      onPointerDown={handleClick}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translate(-50%, -50%) scale(1.1)';
        e.target.style.backgroundColor = '#16a34a';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translate(-50%, -50%) scale(1)';
        e.target.style.backgroundColor = '#22c55e';
      }}
      title={`Add new region (${spaceDuration.toFixed(1)}s available)`}
    >
      +
    </div>
  );
});

AddRegionIcon.displayName = 'AddRegionIcon';

export default AddRegionIcon; 