import { useRef, useCallback, useEffect, useState } from "react";

// Cấu hình EQ (bên ngoài để không re-create)
const EQ_CONFIG = {
  frequencies: [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000],
  type: "peaking",
  Q: 1.0,
  gainRange: { min: -12, max: 12 }
};

/**
 * useEqualizerRealtime - Real-time, clean, high-perf EQ hook (Web Audio API)
 * - Vẫn giữ nguyên logic, API, UI, chỉ tối ưu code & memory
 */
export const useEqualizerRealtime = () => {
  const filtersRef = useRef(null);
  const audioContextRef = useRef(null);
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  // Tạo chuỗi BiquadFilter một lần duy nhất cho mỗi audioContext
  const createEqualizerChain = useCallback((audioContext) => {
    if (!audioContext || filtersRef.current) return filtersRef.current;
    const filters = EQ_CONFIG.frequencies.map(freq => {
      const filter = audioContext.createBiquadFilter();
      filter.type = EQ_CONFIG.type;
      filter.frequency.value = freq;
      filter.Q.value = EQ_CONFIG.Q;
      filter.gain.value = 0;
      if (filter.channelCount !== undefined) filter.channelCount = 2;
      if (filter.channelCountMode !== undefined) filter.channelCountMode = "explicit";
      return filter;
    });
    filtersRef.current = filters;
    return filters;
  }, []);

  // Kết nối EQ vào chuỗi audio (source -> EQ chain -> dest)
  const connectEqualizer = useCallback((audioContext, sourceNode, destinationNode) => {
    if (!audioContext || !sourceNode || !destinationNode || isConnectedRef.current) return false;
    const filters = createEqualizerChain(audioContext);
    if (!filters?.length) return false;

    // Ngắt kết nối cũ nếu có
    try { sourceNode.disconnect?.(destinationNode); } catch {}
    // Nối chuỗi EQ
    sourceNode.connect(filters[0]);
    filters.forEach((filter, i) => filter.connect(filters[i + 1] || destinationNode));

    audioContextRef.current = audioContext;
    isConnectedRef.current = true;
    setIsConnected(true);
    return true;
  }, [createEqualizerChain]);

  // Cập nhật 1 band (direct filter param)
  const updateEqualizerBand = useCallback((bandIndex, gainDB) => {
    const filters = filtersRef.current;
    if (!filters?.length || !isConnectedRef.current) return;
    if (bandIndex < 0 || bandIndex >= filters.length) return;
    const clamped = Math.max(EQ_CONFIG.gainRange.min, Math.min(EQ_CONFIG.gainRange.max, gainDB));
    filters[bandIndex].gain.value = clamped;
  }, []);

  // Cập nhật toàn bộ band (update array)
  const updateEqualizerValues = useCallback((eqValues) => {
    const filters = filtersRef.current;
    if (!filters?.length || !isConnectedRef.current) return;
    if (!Array.isArray(eqValues) || eqValues.length !== EQ_CONFIG.frequencies.length) return;
    eqValues.forEach((gainDB, i) => {
      filters[i].gain.value = Math.max(EQ_CONFIG.gainRange.min, Math.min(EQ_CONFIG.gainRange.max, gainDB));
    });
  }, []);

  // Reset tất cả band về 0dB
  const resetEqualizer = useCallback(() => {
    const filters = filtersRef.current;
    if (!filters?.length || !isConnectedRef.current) return;
    filters.forEach(filter => { filter.gain.value = 0; });
  }, []);

  // Ngắt kết nối và cleanup memory
  const disconnectEqualizer = useCallback(() => {
    const filters = filtersRef.current;
    if (!isConnectedRef.current) return;
    filters?.forEach(filter => filter.disconnect?.());
    filtersRef.current = null;
    audioContextRef.current = null;
    isConnectedRef.current = false;
    setIsConnected(false);
  }, []);

  // Trả về filter đầu cho mục đích advanced (vd: chèn effect)
  const getFirstEqualizerFilter = useCallback(() => (
    isConnectedRef.current && filtersRef.current?.length ? filtersRef.current[0] : null
  ), []);

  // Lấy trạng thái hiện tại của EQ (debug)
  const getEqualizerState = useCallback(() => ({
    connected: isConnectedRef.current,
    bands: filtersRef.current?.map((filter, i) => ({
      frequency: EQ_CONFIG.frequencies[i],
      gain: filter.gain.value,
      Q: filter.Q.value
    })) || []
  }), []);

  // Cleanup khi component unmount
  useEffect(() => disconnectEqualizer, [disconnectEqualizer]);

  // API trả ra: **KHÔNG ĐỔI tên hàm, biến**
  return {
    connectEqualizer,
    disconnectEqualizer,
    updateEqualizerBand,
    updateEqualizerValues,
    resetEqualizer,
    isConnected,
    getEqualizerState,
    getFirstEqualizerFilter,
    frequencies: EQ_CONFIG.frequencies,
    gainRange: EQ_CONFIG.gainRange
  };
};

export default useEqualizerRealtime;
