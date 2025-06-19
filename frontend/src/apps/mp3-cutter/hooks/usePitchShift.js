import { useRef, useCallback, useState } from 'react';

/**
 * Simplified Pitch Shift Hook - Works with existing audio chain
 * Focuses on pitch value management and basic node operations
 */
export const usePitchShift = () => {
  const pitchNodeRef = useRef(null);
  const [pitchValue, setPitchValue] = useState(0);

  // Update pitch value
  const updatePitch = useCallback((newPitch) => {
    console.log('🎵 usePitchShift: updatePitch called with', newPitch);
    setPitchValue(newPitch);
    
    // If we have an active pitch node, update its parameters
    if (pitchNodeRef.current && pitchNodeRef.current.parameters) {
      try {
        pitchNodeRef.current.parameters.get('pitchSemitones').value = newPitch;
        console.log('✅ usePitchShift: Updated existing pitch node to', newPitch);
      } catch (error) {
        console.warn('⚠️ usePitchShift: Failed to update pitch parameter:', error);
      }
    }
  }, []);

  // Set the pitch node reference (called from main component)
  const setPitchNode = useCallback((pitchNode) => {
    console.log('🎵 usePitchShift: setPitchNode called', !!pitchNode);
    pitchNodeRef.current = pitchNode;
    
    // Set initial pitch value if node is provided
    if (pitchNode && pitchNode.parameters && pitchValue !== 0) {
      try {
        pitchNode.parameters.get('pitchSemitones').value = pitchValue;
        console.log('✅ usePitchShift: Set initial pitch on new node:', pitchValue);
      } catch (error) {
        console.warn('⚠️ usePitchShift: Failed to set initial pitch:', error);
      }
    }
  }, [pitchValue]);

  // Get current pitch node reference
  const getPitchNode = useCallback(() => {
    return pitchNodeRef.current;
  }, []);

  // Reset pitch to 0
  const resetPitch = useCallback(() => {
    console.log('🎵 usePitchShift: resetPitch called');
    updatePitch(0);
  }, [updatePitch]);

  // Clear pitch node reference
  const clearPitchNode = useCallback(() => {
    console.log('🎵 usePitchShift: clearPitchNode called');
    pitchNodeRef.current = null;
  }, []);

  return {
    pitchValue,
    updatePitch,
    resetPitch,
    setPitchNode,
    getPitchNode,
    clearPitchNode,
    pitchNode: pitchNodeRef.current,
    isEnabled: pitchValue !== 0
  };
}; 