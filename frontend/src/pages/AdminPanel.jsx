import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

function AdminPanel() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [navigate]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load stats
      const statsResponse = await apiService.get('/api/scanner/stats');
      setStats(statsResponse);

      // Load system health
      const healthResponse = await apiService.get('/api/admin/system-health').catch(() => ({
        database: 'healthy',
        cache: 'healthy',
        externalAPIs: 'healthy'
      }));
      setSystemStatus(healthResponse);

      // Load recent activity/threats
      const activityResponse = await apiService.get('/api/audit/logs?limit=10').catch(() => ({ logs: [] }));
      const topThreats = activityResponse.logs?.filter(l => l.eventType === 'THREAT_DETECTED').slice(0, 5) || [];
      setThreats(topThreats);
      setRecentActivity(activityResponse.logs || []);

    } catch (err) {
      setError('Failed to load admin data: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      await apiService.post('/api/admin/clear-cache', {});
      setError('');
      alert('Cache cleared successfully');
      loadAdminData();
    } catch (err) {
      setError('Failed to clear cache: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRotateKeys = async () => {
    try {
      setLoading(true);
      const response = await apiService.post('/api/crypto/rotate-keys', {});
      alert(`Keys rotated successfully. New key ID: ${response.keyId}`);
      setError('');
    } catch (err) {
      setError('Failed to rotate keys: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getThreatLevelColor = (level) => {
    switch(level) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">🛡️ Admin Control Panel</h1>
            <p className="text-slate-300 mt-2">System Management & Threat Intelligence</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            ← Back
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-lg">
          {['dashboard', 'system', 'threats', 'activity'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'system' && '⚙️ System'}
              {tab === 'threats' && '🚨 Threats'}
              {tab === 'activity' && '📋 Activity'}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Total Scans</p>
                <p className="text-4xl font-bold">{stats?.totalScanned || 0}</p>
              </div>
              <div className="bg-red-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Threats Detected</p>
                <p className="text-4xl font-bold">{stats?.threatsFound || 0}</p>
              </div>
              <div className="bg-green-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Safe URLs</p>
                <p className="text-4xl font-bold">{stats?.safeUrls || 0}</p>
              </div>
              <div className="bg-purple-600 text-white p-6 rounded-lg shadow-lg">
                <p className="text-sm opacity-90">Detection Rate</p>
                <p className="text-4xl font-bold">
                  {stats?.totalScanned ? (((stats?.threatsFound || 0) / stats?.totalScanned) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            {/* System Status Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-slate-900">System Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border ${getStatusColor(systemStatus.database || 'healthy')}`}>
                  <p className="font-semibold text-sm">Database</p>
                  <p className="text-lg font-bold mt-1">{systemStatus.database?.toUpperCase() || 'HEALTHY'}</p>
                </div>
                <div className={`p-4 rounded-lg border ${getStatusColor(systemStatus.cache || 'healthy')}`}>
                  <p className="font-semibold text-sm">Cache (Redis)</p>
                  <p className="text-lg font-bold mt-1">{systemStatus.cache?.toUpperCase() || 'HEALTHY'}</p>
                </div>
                <div className={`p-4 rounded-lg border ${getStatusColor(systemStatus.externalAPIs || 'healthy')}`}>
                  <p className="font-semibold text-sm">External APIs</p>
                  <p className="text-lg font-bold mt-1">{systemStatus.externalAPIs?.toUpperCase() || 'HEALTHY'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Management Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-slate-900">System Management</h2>

              <div className="space-y-4">
                <div className="border border-slate-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">🗑️ Cache Management</h3>
                  <p className="text-slate-600 text-sm mb-4">Clear all cached threat data and reset detection cache</p>
                  <button
                    onClick={handleClearCache}
                    disabled={loading}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold transition-colors"
                  >
                    Clear Cache
                  </button>
                </div>

                <div className="border border-slate-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">🔑 Key Management</h3>
                  <p className="text-slate-600 text-sm mb-4">Rotate RSA-2048 signing keys for JWT token generation</p>
                  <button
                    onClick={handleRotateKeys}
                    disabled={loading}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold transition-colors"
                  >
                    Rotate Keys
                  </button>
                </div>

                <div className="border border-slate-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">📊 Audit Maintenance</h3>
                  <p className="text-slate-600 text-sm mb-4">Archive old audit logs and verify chain integrity</p>
                  <button
                    onClick={() => navigate('/threat-logs')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                  >
                    View Audit Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Threats Tab */}
        {activeTab === 'threats' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-slate-900">🚨 Top Recent Threats</h2>

              {threats.length === 0 ? (
                <p className="text-slate-600 text-center py-8">No threats detected recently</p>
              ) : (
                <div className="space-y-3">
                  {threats.map((threat, idx) => (
                    <div key={idx} className="border border-slate-200 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-slate-900">{threat.url || threat.fileName}</p>
                        <span className={`text-sm font-bold ${getThreatLevelColor(threat.threatLevel)}`}>
                          {threat.threatLevel?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(threat.timestamp).toLocaleString()} • {threat.threats?.length || 0} threats
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-slate-900">📋 Recent Activity</h2>

              {recentActivity.length === 0 ? (
                <p className="text-slate-600 text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentActivity.map((activity, idx) => (
                    <div key={idx} className="border-b border-slate-200 py-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{activity.eventType}</p>
                          <p className="text-xs text-slate-600">{activity.email || activity.url || 'System'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            activity.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            activity.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {activity.severity?.toUpperCase()}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-slate-600 text-center">Processing...</p>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-slate-700 rounded-lg text-xs text-slate-300 space-y-1">
          <p>𝕷 DefVault Security Administration</p>
          <p>Phase 1: Sentinel Threat Detection • Phase 3: Visual Authentication • Phase 4: JWT Device Binding • Phase 5: Audit Trail</p>
          <p>Last Updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
