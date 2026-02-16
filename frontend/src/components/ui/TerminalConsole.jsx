import React, { useState, useEffect, useRef } from 'react';
import { logEmitter } from '../../services/api.service';

function TerminalConsole() {
  const [lines, setLines] = useState([]);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (log) => {
      setLines(prev => [...prev.slice(-499), formatLog(log)]);
    };
    logEmitter.on(handler);
    return () => {
      try { logEmitter.off(handler); } catch(e) {}
    };
  }, []);

  const formatLog = (log) => {
    const ts = log && log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString();
    const level = (log && log.severity) ? log.severity.toUpperCase() : 'INFO';
    const msg = (log && log.message) ? log.message : JSON.stringify(log);
    return `[${ts}] [${level}] ${msg}`;
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setVisible(v => !v)}
          className="btn-cyber"
        >
          {visible ? 'Hide Console' : 'Open Console'}
        </button>
      </div>

      {visible && (
        <div
          ref={containerRef}
          className={`fixed ${expanded ? 'inset-6' : 'right-6 bottom-6'} z-50 w-4/5 ${expanded ? 'h-4/5' : 'h-96'} bg-black bg-opacity-90 border-2 border-cyan-500 rounded-lg shadow-2xl overflow-hidden font-mono`}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-900 to-blue-900 border-b border-cyan-600">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h4 className="text-cyan-200 font-bold">DEFVAULT CONSOLE</h4>
              <span className="text-xs text-cyan-400">Streaming process logs</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setExpanded(e => !e)} className="btn-cyber">{expanded ? 'Restore' : 'Maximize'}</button>
              <button onClick={() => setVisible(false)} className="btn-cyber-magenta">Close</button>
            </div>
          </div>

          <div className="p-3 overflow-auto h-full text-sm text-cyan-200 bg-gradient-to-b from-black to-slate-900">
            <pre className="whitespace-pre-wrap break-words">{lines.length === 0 ? 'No logs yet...' : lines.join('\n')}</pre>
          </div>
        </div>
      )}
    </>
  );
}

export default TerminalConsole;
