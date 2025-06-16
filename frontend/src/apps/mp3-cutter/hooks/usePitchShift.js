import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Pitch Shift Hook - Integrates with existing audio chain
 * Works with useRealTimeFadeEffects without creating duplicate MediaElementSource
 */
export const usePitchShift = () => {
  const pitchNodeRef = useRef(null);
  const isInitializedRef = useRef(false);
  const [pitchValue, setPitchValue] = useState(0);

  // Initialize SoundTouch worklet (without creating MediaElementSource)
  const initializePitchWorklet = useCallback(async (audioContext) => {
    if (isInitializedRef.current || !audioContext) return true;
    
    try {
      // Load SoundTouch worklet
      await audioContext.audioWorklet.addModule('./soundtouch-worklet.js');
      
      // Create SoundTouch worklet node
      pitchNodeRef.current = new AudioWorkletNode(audioContext, 'soundtouch-processor');
      
      // Set initial parameters
      pitchNodeRef.current.parameters.get('pitchSemitones').value = pitchValue;
      pitchNodeRef.current.parameters.get('tempo').value = 1.0;
      pitchNodeRef.current.parameters.get('rate').value = 1.0;
      
      isInitializedRef.current = true;
      return true;
    } catch (error) {
      console.warn('SoundTouch worklet initialization:', error);
      return false;
    }
  }, [pitchValue]);

  // Update pitch value and apply to node if available
  const updatePitch = useCallback((newPitch) => {
    setPitchValue(newPitch);
    
    if (pitchNodeRef.current && isInitializedRef.current) {
      pitchNodeRef.current.parameters.get('pitchSemitones').value = newPitch;
    }
  }, []);

  // Set the active pitch node reference (called from main component)
  const setPitchNode = useCallback((pitchNode) => {
    pitchNodeRef.current = pitchNode;
    isInitializedRef.current = !!pitchNode;
  }, []);

  // Get current pitch node reference
  const getPitchNode = useCallback(() => {
    return pitchNodeRef.current;
  }, []);

  // Reset pitch to 0
  const resetPitch = useCallback(() => updatePitch(0), [updatePitch]);

  // Clear pitch node reference
  const clearPitchNode = useCallback(() => {
    pitchNodeRef.current = null;
    isInitializedRef.current = false;
  }, []);

  // Insert pitch node into existing audio chain
  const insertPitchNode = useCallback((sourceNode, destinationNode, audioContext) => {
    if (!audioContext || !sourceNode || !destinationNode) return false;
    
    // Initialize worklet if needed
    initializePitchWorklet(audioContext);
    
    if (!pitchNodeRef.current) return false;
    
    try {
      // Disconnect existing connection
      sourceNode.disconnect(destinationNode);
      
      // Insert pitch node: source -> pitch -> destination
      sourceNode.connect(pitchNodeRef.current);
      pitchNodeRef.current.connect(destinationNode);
      
      return true;
    } catch (error) {
      console.warn('Failed to insert pitch node:', error);
      // Fallback: reconnect without pitch
      try {
        sourceNode.connect(destinationNode);
      } catch (e) {
        console.error('Failed to restore connection:', e);
      }
      return false;
    }
  }, [initializePitchWorklet]);

  // Remove pitch node from audio chain
  const removePitchNode = useCallback((sourceNode, destinationNode) => {
    if (!pitchNodeRef.current || !sourceNode || !destinationNode) return;
    
    try {
      // Disconnect pitch node
      sourceNode.disconnect(pitchNodeRef.current);
      pitchNodeRef.current.disconnect(destinationNode);
      
      // Direct connection: source -> destination
      sourceNode.connect(destinationNode);
    } catch (error) {
      console.warn('Failed to remove pitch node:', error);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pitchNodeRef.current) {
        try {
          pitchNodeRef.current.disconnect();
        } catch (e) {
          // Already disconnected
        }
      }
      isInitializedRef.current = false;
    };
  }, []);

  return {
    pitchValue,
    updatePitch,
    resetPitch,
    setPitchNode,
    getPitchNode,
    clearPitchNode,
    insertPitchNode,
    removePitchNode,
    pitchNode: pitchNodeRef.current,
    isEnabled: isInitializedRef.current && pitchValue !== 0
  };
}; 