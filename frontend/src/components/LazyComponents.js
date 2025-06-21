import React, { lazy, Suspense } from 'react';

// Universal Skeleton Loader
const SkeletonLoader = ({ type }) => {
  switch (type) {
    case 'waveform':
      return (
        <div className="w-full bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 relative overflow-hidden animate-pulse" style={{ height: '120px' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 animate-pulse" style={{ animation: 'shimmer 2s infinite linear', width: '200%', left: '-100%' }} />
          <div className="flex items-center justify-center h-full">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-indigo-300 rounded-full animate-pulse" style={{ width: '2px', height: `${6 + Math.sin(i * 0.5) * 4}px`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      );
    case 'export':
      return (
        <div className="bg-gradient-to-br from-white/80 to-slate-50/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 shadow-sm animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-10 bg-slate-200 rounded w-full"></div>
          </div>
        </div>
      );
    case 'bar':
      return (
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-3 border border-slate-200/50 shadow-sm animate-pulse">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-8 h-8 bg-slate-200 rounded-lg" />
              ))}
            </div>
            <div className="flex-1 flex items-center justify-center gap-4">
              <div className="h-6 bg-slate-200 rounded w-20"></div>
              <div className="h-6 bg-slate-200 rounded w-20"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-6 bg-slate-200 rounded-full"></div>
              <div className="w-16 h-6 bg-slate-200 rounded-full"></div>
            </div>
          </div>
        </div>
      );
    default:
      return <div className="h-16 w-full bg-slate-100 animate-pulse rounded" />;
  }
};

// DRY lazy factory
const createLazyComponent = (importFn, fallbackType) => {
  const LazyComp = lazy(importFn);
  return props => (
    <Suspense fallback={fallbackType ? <SkeletonLoader type={fallbackType} /> : null}>
      <LazyComp {...props} />
    </Suspense>
  );
};

// Lazy component definitions
export const SmartWaveformLazy = createLazyComponent(
  () => import('../apps/mp3-cutter/components/Waveform/SmartWaveform'),
  'waveform'
);
export const ExportPanelLazy = createLazyComponent(
  () => import('../apps/mp3-cutter/components/Export'),
  'export'
);
export const UnifiedControlBarLazy = createLazyComponent(
  () => import('../apps/mp3-cutter/components/UnifiedControlBar'),
  'bar'
);
export const EnhancedWaveformLazy = createLazyComponent(
  () => import('../apps/mp3-cutter/components/Waveform/EnhancedWaveform'),
  'waveform'
);
export const WaveformCanvasLazy = createLazyComponent(
  () => import('../apps/mp3-cutter/components/Waveform/WaveformCanvas'),
  'waveform'
);

// Universal preloader
export const preloadHeavyComponents = (list) => {
  const preloadList = list || [
    () => import('../apps/mp3-cutter/components/Waveform/SmartWaveform'),
    () => import('../apps/mp3-cutter/components/Export'),
    () => import('../apps/mp3-cutter/components/UnifiedControlBar')
  ];
  preloadList.forEach((load, i) => setTimeout(() => load().catch(console.warn), i * 100));
};

// Optional: Lightweight tracking for loading time
export const trackComponentLoadTime = (name, start) => {
  if (typeof window !== 'undefined') {
    const ms = performance.now() - start;
    if (!window.lazyLoadMetrics) window.lazyLoadMetrics = {};
    window.lazyLoadMetrics[name] = ms;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`⚡ [LazyLoad] ${name} loaded in ${ms.toFixed(2)}ms`);
    }
  }
};

// CSS: shimmer effect for all loaders (inject once)
if (typeof window !== 'undefined' && !document.getElementById('lazy-components-css')) {
  const style = document.createElement('style');
  style.id = 'lazy-components-css';
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%) skewX(-12deg); }
      100% { transform: translateX(200%) skewX(-12deg); }
    }
  `;
  document.head.appendChild(style);
}
