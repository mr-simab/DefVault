import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingShield from '../components/ui/LoadingShield';
// FingerprintCollector removed — device fingerprinting deprecated
import apiService from '../services/api.service';

function Dashboard() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanHistory, setScanHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('url-scanner');
  
  const [useDetails, setUseDetails] = useState(false);
  const [stats, setStats] = useState(null);

  // Device fingerprinting removed — session-scoped behavior used
  useEffect(() => {
    loadStats();
  }, []);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const loadStats = async () => {
    try {
      const response = await apiService.get('/api/scanner/stats');
      setStats(response);
    } catch (err) {
      console.warn('Failed to load stats:', err);
    }
  };

  const handleAnalyzeUrl = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      console.log('Phase 1: Starting parallel threat analysis...');
      
      // Call backend scanner which runs all 8 Sentinel services in parallel
      const result = await apiService.post('/api/scanner/analyze-url', {
        url,
        timestamp: new Date().toISOString(),
        includeDetails: useDetails
      });

      setAnalysisResult(result);
      
      // Add to history
      setScanHistory([
        {
          url,
          threatLevel: result.threatLevel,
          timestamp: new Date().toLocaleString(),
          threats: result.threats.length
        },
        ...scanHistory.slice(0, 9)
      ]);

      // Log scan event for Phase 5 Audit
      await apiService.post('/api/audit/log', {
        eventType: 'URL_SCANNED',
        url,
        threatLevel: result.threatLevel,
        timestamp: new Date().toISOString(),
        severity: result.threatLevel === 'critical' ? 'critical' : result.threatLevel === 'high' ? 'warning' : 'info'
      }).catch(() => {});

      // If threat detected, log security event
      if (result.threatLevel !== 'safe') {
        await apiService.post('/api/audit/log', {
          eventType: 'THREAT_DETECTED',
          url,
          threatCount: result.threats.length,
          threats: result.threats.map(t => t.type),
          severity: 'warning'
        }).catch(() => {});
      }
    } catch (err) {
      setError('Analysis failed: ' + (err.response?.data?.message || err.message));
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeFile = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // deviceFingerprint removed

      console.log('Phase 1: Analyzing file with APK permission detector...');
      const result = await apiService.post('/api/scanner/analyze-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAnalysisResult(result);

      // Log file scan
      await apiService.post('/api/audit/log', {
        eventType: 'FILE_SCANNED',
        fileName: file.name,
        fileSize: file.size,
        threatLevel: result.threatLevel,
        severity: result.threatLevel !== 'safe' ? 'warning' : 'info'
      }).catch(() => {});
    } catch (err) {
      setError('File analysis failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = async () => {
    if (!analysisResult) return;
    
    setLoading(true);
    try {
      const result = await apiService.post('/api/scanner/rescan', {
        url: analysisResult.url || '',
        fileName: analysisResult.fileName || '',
        timestamp: new Date().toISOString()
      });

      setAnalysisResult(result);
      setError('');
    } catch (err) {
      setError('Rescan failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getThreatLevelColor = (level) => {
    switch(level) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'safe': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getThreatIcon = (type) => {
    const icons = {
      phishing: '🎣',
      malware: '🦠',
      unsafe: '⚠️',
      suspicious: '🚨',
      expired_ssl: '🔓',
      invalid_cert: '❌',
      dangerous_permissions: '🔐',
      entropy_high: '📊',
      domain_young: '📅',
      spoofed_domain: '🪞'
    };
    return icons[type] || '●';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">DefVault Dashboard</h1>
            <p className="text-slate-300 mt-2">Advanced Threat Detection System</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/login');
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            🚪 Logout
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-600 text-white p-4 rounded-lg">
              <p className="text-sm opacity-90">Total Scanned</p>
              <p className="text-3xl font-bold">{stats.totalScanned}</p>
            </div>
            <div className="bg-red-600 text-white p-4 rounded-lg">
              <p className="text-sm opacity-90">Threats Found</p>
              <p className="text-3xl font-bold">{stats.threatsFound}</p>
            </div>
            <div className="bg-green-600 text-white p-4 rounded-lg">
              <p className="text-sm opacity-90">Safe URLs</p>
              <p className="text-3xl font-bold">{stats.safeUrls}</p>
            </div>
            <div className="bg-purple-600 text-white p-4 rounded-lg">
              <p className="text-sm opacity-90">Avg Response Time</p>
              <p className="text-3xl font-bold">{stats.avgResponseTime}ms</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 bg-white rounded-lg p-1 shadow-lg">
          <button
            onClick={() => setActiveTab('url-scanner')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'url-scanner'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔗 URL Scanner
          </button>
          <button
            onClick={() => setActiveTab('file-analyzer')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'file-analyzer'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📁 File Analyzer
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Scan History
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2">
            {activeTab === 'url-scanner' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-slate-900">🔗 URL Threat Analysis</h2>
                <form onSubmit={handleAnalyzeUrl}>
                  <div className="mb-4">
                    <label className="block text-slate-700 font-semibold mb-2">Enter URL to Scan</label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-6 flex items-center">
                    <input
                      type="checkbox"
                      id="useDetails"
                      checked={useDetails}
                      onChange={(e) => setUseDetails(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="useDetails" className="text-slate-600 text-sm">
                      Request detailed threat analysis report
                    </label>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p><strong>Phase 1 Threat Detection (8 mechanisms running in parallel):</strong></p>
                    <p>✓ Google Web Risk API • VirusTotal • URL Entropy • Domain Reputation</p>
                    <p>✓ NLP Phishing Analysis • Email Authentication Protocols • SSL Validation • APK Permissions</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                  >
                    {loading ? '🔄 Analyzing with 8 Sentinel Services...' : '🔍 Analyze URL'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'file-analyzer' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-slate-900">📁 File Security Analysis</h2>
                <form onSubmit={handleAnalyzeFile}>
                  <div className="mb-6">
                    <label className="block text-slate-700 font-semibold mb-2">Select File</label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      disabled={loading}
                      accept=".apk,.exe,.zip,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    {file && <p className="text-sm text-slate-600 mt-2">📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !file}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all"
                  >
                    {loading ? '🔄 Analyzing File...' : '📋 Scan File'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-slate-900">📋 Recent Scans</h2>
                {scanHistory.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No scan history yet</p>
                ) : (
                  <div className="space-y-3">
                    {scanHistory.map((scan, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${getThreatLevelColor(scan.threatLevel)}`}>
                        <p className="font-semibold text-sm truncate">{scan.url}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs">{scan.timestamp}</span>
                          <span className="font-bold">{scan.threats} threats</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold mb-4 text-slate-900">📊 Analysis Result</h2>
              
              {loading && (
                <div className="text-center py-8">
                  <LoadingShield />
                  <p className="text-slate-600 mt-4">Scanning with all 8 Sentinel mechanisms...</p>
                </div>
              )}

              {!loading && analysisResult && (
                <div className="space-y-6">
                  {/* Threat Level */}
                  <div className={`p-4 rounded-lg border ${getThreatLevelColor(analysisResult.threatLevel)}`}>
                    <p className="text-xs font-semibold uppercase">Threat Level</p>
                    <p className="text-2xl font-bold mt-1">{analysisResult.threatLevel.toUpperCase()}</p>
                  </div>

                  {/* Score */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex justify-between mb-2">
                      <p className="font-semibold text-slate-700">Risk Score</p>
                      <p className="font-bold text-blue-600">{analysisResult.riskScore}/100</p>
                    </div>
                    <div className="w-full bg-slate-300 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          analysisResult.riskScore > 70 ? 'bg-red-600' :
                          analysisResult.riskScore > 40 ? 'bg-orange-600' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${analysisResult.riskScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Threats Found */}
                  <div>
                    <p className="font-semibold text-slate-700 mb-3">🚨 Threats Detected ({analysisResult.threats.length})</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {analysisResult.threats.length === 0 ? (
                        <p className="text-green-600 text-sm">✓ No threats detected</p>
                      ) : (
                        analysisResult.threats.map((threat, idx) => (
                          <div key={idx} className="bg-slate-50 p-2 rounded text-xs border border-slate-200">
                            <p className="font-semibold">{getThreatIcon(threat.type)} {threat.type.replace(/_/g, ' ').toUpperCase()}</p>
                            <p className="text-slate-600">{threat.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Rescan Button */}
                  <button
                    onClick={handleRescan}
                    disabled={loading}
                    className="w-full bg-slate-300 text-slate-800 font-semibold py-2 rounded-lg hover:bg-slate-400 transition-all"
                  >
                    🔄 Rescan
                  </button>

                  {/* Metadata */}
                  <div className="text-xs text-slate-500 space-y-1 pt-4 border-t">
                    <p>Scan Time: {new Date(analysisResult.timestamp).toLocaleString()}</p>
                    <p>Mechanisms: {analysisResult.mechanisms?.length || 8}</p>
                  </div>
                </div>
              )}

              {!loading && !analysisResult && (
                <p className="text-slate-600 text-center py-8">Enter a URL or upload a file to scan</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
