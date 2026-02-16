import React, { useState, useEffect } from 'react';
import { logEmitter } from '../../services/api.service';

function LogPanel() {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const logsEndRef = React.useRef(null);

  useEffect(() => {
    const handleLog = (log) => {
      setLogs(prev => [...prev.slice(-99), log]); // Keep last 100 logs
    };

    logEmitter.on(handleLog);

    return () => {
      // Cleanup listener
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filterType === 'all' 
    ? logs 
    : logs.filter(log => log.type === filterType);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'success': return 'text-green-400 bg-green-900 bg-opacity-30';
      case 'warning': return 'text-yellow-400 bg-yellow-900 bg-opacity-30';
      case 'error': return 'text-red-400 bg-red-900 bg-opacity-30';
      case 'critical': return 'text-red-600 bg-red-900 bg-opacity-50';
      default: return 'text-blue-400 bg-blue-900 bg-opacity-30';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'REQUEST': return '→';
      case 'RESPONSE': return '←';
      case 'ERROR': return '✗';
      case 'WARNING': return '⚠';
      case 'SUCCESS': return '✓';
      default: return '●';
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`
            px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg
            ${isVisible 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }
          `}
        >
          {isVisible ? '× Close Logs' : '◇ Open Logs'}
        </button>
      </div>

      {/* Log Panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 z-50 w-96 h-96 flex flex-col rounded-lg shadow-2xl border-2 border-cyan-500 bg-slate-900 bg-opacity-95 backdrop-blur-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-900 to-blue-900 px-4 py-3 rounded-t-lg border-b border-cyan-500 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="text-cyan-300 font-bold text-sm">DEFVAULT SYSTEM LOG</h3>
              <span className="text-xs text-cyan-400 ml-2">({filteredLogs.length})</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 bg-slate-700 rounded"
            >
              CLEAR
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-2 bg-slate-800 border-b border-cyan-500 flex gap-1 text-xs">
            {['all', 'REQUEST', 'RESPONSE', 'ERROR', 'WARNING'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === type
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-cyan-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Logs Container */}
          <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 p-3 bg-slate-950 custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-8">
                <p>░░░░░░░░░░░░░░░░░░░░░</p>
                <p>No logs yet</p>
                <p>░░░░░░░░░░░░░░░░░░░░░</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border-l-2 border-cyan-500 ${getSeverityColor(log.severity)} transition-colors hover:bg-slate-800`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-cyan-400">{getTypeIcon(log.type)}</span>
                        <span className="text-slate-400">[{formatTime(log.timestamp)}]</span>
                        <span className="text-slate-500">{log.method}</span>
                      </div>
                      <div className="text-slate-300 mt-1 break-words">{log.message}</div>
                      {log.status && log.status !== 'pending' && (
                        <div className="text-slate-400 mt-1 text-xs">
                          Status: <span className={log.status >= 200 && log.status < 300 ? 'text-green-400' : 'text-yellow-400'}>{log.status}</span>
                        </div>
                      )}
                    </div>
                    {log.severity && (
                      <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                        log.severity === 'success' ? 'bg-green-900 text-green-300' :
                        log.severity === 'critical' ? 'bg-red-900 text-red-300' :
                        log.severity === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-blue-900 text-blue-300'
                      }`}>
                        {log.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Footer Controls */}
          <div className="bg-slate-800 px-3 py-2 rounded-b-lg border-t border-cyan-500 flex justify-between items-center text-xs">
            <label className="flex items-center gap-2 text-cyan-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3 h-3 accent-cyan-500"
              />
              Auto-scroll
            </label>
            <div className="text-slate-500">
              v1.0 • {logs.length} total
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 234, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 234, 0.8);
        }
      `}</style>
    </>
  );
}

export default LogPanel;
