import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Trash2, 
  Play, 
  Pause, 
  Filter, 
  Search, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  AlertTriangle,
  MessageSquare,
  X,
  Copy,
  Download,
  Settings
} from 'lucide-react';

const DebugPanel = ({ 
  logs, 
  isCapturing, 
  clearLogs, 
  toggleCapturing, 
  getLogsCounts 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState('');
  const logsEndRef = useRef(null);
  const logContainerRef = useRef(null);

  // 🎯 Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // 🎯 Get counts for badge display
  const counts = getLogsCounts();
  const totalLogs = logs.length;
  const errorCount = counts.error || 0;
  const warningCount = counts.warn || 0;

  // 🎯 Filter logs based on type and search
  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // 🎯 Copy logs to clipboard
  const copyLogsToClipboard = async () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(logText);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (err) {
      setCopyFeedback('Copy failed');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  // 🎯 Export logs as file
  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mp3-cutter-debug-${new Date().toISOString().slice(0, 19)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 🎯 Get icon for log type
  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'info':
        return <Info className="w-3 h-3 text-blue-500" />;
      default:
        return <MessageSquare className="w-3 h-3 text-gray-500" />;
    }
  };

  // 🎯 Get log styling based on type
  const getLogTextColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-300';
      case 'warn':
        return 'text-yellow-300';
      case 'info':
        return 'text-blue-300';
      default:
        return 'text-green-300';
    }
  };

  // 🎯 Format timestamp
  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // 🎯 Button size based on expansion state
  const buttonSize = isExpanded ? 'w-auto' : 'w-auto';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 🎯 Debug Panel Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`mb-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 ${buttonSize} ${
          errorCount > 0 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : warningCount > 0
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-white'
        }`}
      >
        <Terminal className="w-4 h-4" />
        <span className="text-sm font-medium">Debug</span>
        {totalLogs > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {totalLogs}
          </span>
        )}
        {errorCount > 0 && (
          <span className="bg-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {errorCount} ❌
          </span>
        )}
        {warningCount > 0 && errorCount === 0 && (
          <span className="bg-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {warningCount} ⚠️
          </span>
        )}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {/* 🎯 Debug Panel */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-[480px] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 bg-slate-50 rounded-t-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-800 text-sm">Debug Console</span>
                <span className="text-xs text-slate-500">
                  {isCapturing ? '🟢 Live' : '🔴 Paused'}
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Main Controls */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={toggleCapturing}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  isCapturing 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {isCapturing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isCapturing ? 'Pause' : 'Start'}
              </button>
              
              <button
                onClick={clearLogs}
                className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  autoScroll 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Auto-scroll
              </button>

              <button
                onClick={copyLogsToClipboard}
                className="px-2 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                title="Copy visible logs to clipboard"
              >
                <Copy className="w-3 h-3" />
                {copyFeedback || 'Copy'}
              </button>

              <button
                onClick={exportLogs}
                className="px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                title="Export all logs to file"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>

            {/* Filter and Search */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="w-3 h-3 absolute left-2 top-1.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All ({totalLogs})</option>
                <option value="error">Errors ({counts.error || 0})</option>
                <option value="warn">Warnings ({counts.warn || 0})</option>
                <option value="info">Info ({counts.info || 0})</option>
                <option value="log">Logs ({counts.log || 0})</option>
              </select>
            </div>

            {/* Settings */}
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showTimestamps}
                  onChange={(e) => setShowTimestamps(e.target.checked)}
                  className="w-3 h-3"
                />
                <span className="text-gray-600">Timestamps</span>
              </label>
            </div>
          </div>

          {/* Logs Container */}
          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-2 bg-slate-900 font-mono text-xs leading-relaxed max-h-96 min-h-48"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                {logs.length === 0 ? (
                  <div>
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div>No logs yet...</div>
                    <div className="text-xs mt-1">Logs will appear here as they're generated</div>
                  </div>
                ) : (
                  <div>No logs match your filter</div>
                )}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="mb-1 hover:bg-slate-800 p-1 rounded transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {getLogIcon(log.type)}
                    {showTimestamps && (
                      <span className="text-gray-500 text-xs font-mono min-w-[80px]">
                        {formatTime(log.timestamp)}
                      </span>
                    )}
                    <span className={`text-xs font-semibold uppercase min-w-[50px] ${
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'warn' ? 'text-yellow-400' :
                      log.type === 'info' ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {log.type}
                    </span>
                    <div className={`font-mono text-xs whitespace-pre-wrap break-words flex-1 ${getLogTextColor(log.type)}`}>
                      {log.message}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Stats Footer */}
          <div className="p-2 border-t border-gray-200 bg-slate-50 rounded-b-lg">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>
                Showing {filteredLogs.length} of {totalLogs} logs
              </span>
              <div className="flex gap-3">
                {errorCount > 0 && (
                  <span className="text-red-600 font-medium">
                    ❌ {errorCount}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-yellow-600 font-medium">
                    ⚠️ {warningCount}
                  </span>
                )}
                <span className="text-blue-600 font-medium">
                  ℹ️ {counts.info || 0}
                </span>
                <span className="text-gray-500">
                  📊 {totalLogs}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel; 