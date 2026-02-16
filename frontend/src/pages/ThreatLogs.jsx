import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

function ThreatLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Fetch audit logs on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchLogs();
  }, [navigate]);

  // Apply filters
  useEffect(() => {
    let filtered = logs;

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(log => log.severity === filterSeverity);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.eventType === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.eventType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateRange.start) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(dateRange.start));
    }

    if (dateRange.end) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(dateRange.end));
    }

    setFilteredLogs(filtered);
  }, [logs, filterSeverity, filterType, searchTerm, dateRange]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/audit/logs');
      setLogs(response.logs || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch audit logs: ' + (err.response?.data?.message || err.message));
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    try {
      setLoading(true);
      const response = await apiService.post('/api/audit/verify-integrity', {});
      
      setIntegrityStatus({
        verified: response.verified,
        chainLength: response.chainLength,
        lastHash: response.lastHash,
        timestamp: new Date().toLocaleString()
      });

      if (response.verified) {
        setError('');
      } else {
        setError('⚠️ Audit chain integrity check FAILED! Logs may have been tampered with.');
      }
    } catch (err) {
      setError('Integrity verification failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const response = await apiService.post('/api/audit/export', {
        format: 'csv',
        logs: filteredLogs.map(l => l._id)
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      const response = await apiService.post('/api/audit/export', {
        format: 'json',
        logs: filteredLogs.map(l => l._id)
      });

      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEventIcon = (type) => {
    const icons = {
      LOGIN_SUCCESS: '✓',
      LOGIN_FAILED: '✗',
      LOGIN_2FA_SUCCESS: '✓',
      LOGOUT: '👋',
      URL_SCANNED: '🔍',
      FILE_SCANNED: '📁',
      THREAT_DETECTED: '🚨',
      VISUAL_AUTH_SUCCESS: '✓',
      VISUAL_AUTH_FAILED: '✗',
      HONEYTRAP_TRIGGERED: '🍯',
      JWT_ISSUED: '🔑',
      JWT_VERIFIED: '✓',
      JWT_REVOKED: '✗',
      AUDIT_EXPORTED: '📊'
    };
    return icons[type] || '●';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Phase 5: Audit Logs</h1>
            <p className="text-slate-300 mt-2">SHA-256 Chained Integrity Verification</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Integrity Status */}
        {integrityStatus && (
          <div className={`p-4 rounded-lg mb-6 border-l-4 ${integrityStatus.verified ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'}`}>
            <p className="font-semibold">
              {integrityStatus.verified ? '✓ Audit Chain Verified' : '✗ Audit Chain Compromised'}
            </p>
            <p className="text-sm">Chain Length: {integrityStatus.chainLength} | Last Hash: {integrityStatus.lastHash?.substring(0, 16)}...</p>
            <p className="text-xs mt-1">{integrityStatus.timestamp}</p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Event Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="THREAT_DETECTED">Threat Detected</option>
                <option value="VISUAL_AUTH_SUCCESS">Visual Auth Success</option>
                <option value="HONEYTRAP_TRIGGERED">Honeytrap Triggered</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Date Range</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleVerifyIntegrity}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm font-semibold transition-colors"
            >
              🔗 Verify Audit Chain
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading || exporting || filteredLogs.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold transition-colors"
            >
              📥 Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={loading || exporting || filteredLogs.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-semibold transition-colors"
            >
              📥 Export JSON
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:bg-gray-400 text-sm font-semibold transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading && !logs.length ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-slate-600">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No audit logs found matching your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Event</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Details</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Severity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {getEventIcon(log.eventType)} {log.eventType}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-xs">
                          {log.email || log.url || log.fileName || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getSeverityColor(log.severity)}`}>
                            {log.severity?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            {expandedRow === idx ? '▼ Hide' : '▶ View'}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === idx && (
                        <tr className="bg-slate-50 border-b">
                          <td colSpan="5" className="px-4 py-4">
                            <div className="space-y-2 text-sm">
                              {Object.entries(log).map(([key, value]) => (
                                key !== '_id' && (
                                  <div key={key} className="flex">
                                    <span className="font-semibold text-slate-700 w-32">{key}:</span>
                                    <span className="text-slate-600 flex-1">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                )
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-90">Total Logs</p>
            <p className="text-3xl font-bold">{logs.length}</p>
          </div>
          <div className="bg-red-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-90">Critical Events</p>
            <p className="text-3xl font-bold">{logs.filter(l => l.severity === 'critical').length}</p>
          </div>
          <div className="bg-yellow-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-90">Warnings</p>
            <p className="text-3xl font-bold">{logs.filter(l => l.severity === 'warning').length}</p>
          </div>
          <div className="bg-green-600 text-white p-4 rounded-lg">
            <p className="text-sm opacity-90">Info Events</p>
            <p className="text-3xl font-bold">{logs.filter(l => l.severity === 'info').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThreatLogs;
