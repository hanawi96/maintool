import { useRef, useCallback, useEffect } from 'react';

// 🎚️ EQ configuration - optimized frequency distribution (moved outside to avoid re-renders)
const EQ_CONFIG = {
  frequencies: [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000],
  type: 'peaking',
  Q: 1.0, // Moderate bandwidth for musical response
  gainRange: { min: -12, max: 12 }
};

/**
 * 🎚️ Real-time Equalizer Hook - Ultra-optimized Web Audio API implementation
 * Provides instant EQ processing with BiquadFilterNode chain
 */
export const useEqualizerRealtime = () => {
  // Filter chain refs for direct parameter updates
  const filtersRef = useRef(null);
  const isConnectedRef = useRef(false);
  const audioContextRef = useRef(null);

  /**
   * 🔧 Create optimized BiquadFilter chain
   */
  const createEqualizerChain = useCallback((audioContext) => {
    if (!audioContext || filtersRef.current) return filtersRef.current;
    
    try {
      const filters = EQ_CONFIG.frequencies.map((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = EQ_CONFIG.type;
        filter.frequency.value = freq;
        filter.Q.value = EQ_CONFIG.Q;
        filter.gain.value = 0; // Start flat
        
        // Optimize for performance - disable unnecessary processing
        if (filter.channelCount !== undefined) filter.channelCount = 2;
        if (filter.channelCountMode !== undefined) filter.channelCountMode = 'explicit';
        
        return filter;
      });
      
      filtersRef.current = filters;
      console.log('🎚️ Equalizer chain created:', filters.length, 'bands');
      return filters;
    } catch (error) {
      console.warn('Failed to create equalizer chain:', error);
      return null;
    }
  }, []);
  /**
   * 🔗 Connect equalizer into audio graph
   * Position: Source → [EQ Chain] → MasterGain → Output
   */
  const connectEqualizer = useCallback((audioContext, sourceNode, destinationNode) => {
    if (!audioContext || !sourceNode || !destinationNode) return false;
    if (isConnectedRef.current) return true;
    
    const filters = createEqualizerChain(audioContext);
    if (!filters || filters.length === 0) return false;
    
    try {
      // 🔧 Safely disconnect existing connection (may not exist)
      try {
        sourceNode.disconnect(destinationNode);
      } catch (e) {
        // Connection may not exist yet, this is fine
        console.log('🔗 No existing direct connection to disconnect (expected on first run)');
      }
      
      // Create filter chain: Source → Filter1 → Filter2 → ... → FilterN → Destination
      sourceNode.connect(filters[0]);
      
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      
      filters[filters.length - 1].connect(destinationNode);
      
      audioContextRef.current = audioContext;
      isConnectedRef.current = true;
      
      console.log('🔗 Equalizer chain connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect equalizer chain:', error);
      return false;
    }
  }, [createEqualizerChain]);

  /**
   * ⚡ Ultra-fast parameter update - direct filter manipulation
   */
  const updateEqualizerBand = useCallback((bandIndex, gainDB) => {
    if (!filtersRef.current || !isConnectedRef.current) return;
    if (bandIndex < 0 || bandIndex >= filtersRef.current.length) return;
    
    const clampedGain = Math.max(EQ_CONFIG.gainRange.min, 
                               Math.min(EQ_CONFIG.gainRange.max, gainDB));
    
    try {
      // Direct parameter update - zero latency
      filtersRef.current[bandIndex].gain.value = clampedGain;
    } catch (error) {
      console.warn(`Failed to update EQ band ${bandIndex}:`, error);
    }
  }, []);

  /**
   * 🎯 Batch update all bands for smooth preset changes
   */
  const updateEqualizerValues = useCallback((eqValues) => {
    if (!filtersRef.current || !isConnectedRef.current) return;
    if (!Array.isArray(eqValues) || eqValues.length !== EQ_CONFIG.frequencies.length) return;
    
    try {
      // Batch update using requestAnimationFrame for smooth transitions
      requestAnimationFrame(() => {
        eqValues.forEach((gainDB, index) => {
          if (index < filtersRef.current.length) {
            const clampedGain = Math.max(EQ_CONFIG.gainRange.min, 
                                       Math.min(EQ_CONFIG.gainRange.max, gainDB));
            filtersRef.current[index].gain.value = clampedGain;
          }
        });
      });
    } catch (error) {
      console.warn('Failed to batch update equalizer:', error);
    }
  }, []);

  /**
   * 🔄 Reset all bands to flat response
   */
  const resetEqualizer = useCallback(() => {
    if (!filtersRef.current || !isConnectedRef.current) return;
    
    try {
      filtersRef.current.forEach(filter => {
        filter.gain.value = 0;
      });
      console.log('🔄 Equalizer reset to flat');
    } catch (error) {
      console.warn('Failed to reset equalizer:', error);
    }
  }, []);

  /**
   * 🧹 Cleanup resources
   */
  const disconnectEqualizer = useCallback(() => {
    if (!isConnectedRef.current || !filtersRef.current) return;
    
    try {
      filtersRef.current.forEach(filter => {
        try {
          filter.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      });
      
      filtersRef.current = null;
      isConnectedRef.current = false;
      audioContextRef.current = null;
      
      console.log('🧹 Equalizer disconnected and cleaned up');
    } catch (error) {
      console.warn('Error during equalizer cleanup:', error);
    }
  }, []);

  /**
   * 📊 Get current EQ state for debugging
   */
  const getEqualizerState = useCallback(() => {
    if (!filtersRef.current || !isConnectedRef.current) {
      return { connected: false, bands: [] };
    }
    
    return {
      connected: true,
      bands: filtersRef.current.map((filter, index) => ({
        frequency: EQ_CONFIG.frequencies[index],
        gain: filter.gain.value,
        Q: filter.Q.value
      }))
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectEqualizer();
    };
  }, [disconnectEqualizer]);

  return {
    // Core functions
    connectEqualizer,
    disconnectEqualizer,
    
    // Parameter updates
    updateEqualizerBand,
    updateEqualizerValues,
    resetEqualizer,
    
    // State
    isConnected: isConnectedRef.current,
    getEqualizerState,
    
    // Configuration
    frequencies: EQ_CONFIG.frequencies,
    gainRange: EQ_CONFIG.gainRange
  };
};

export default useEqualizerRealtime;
