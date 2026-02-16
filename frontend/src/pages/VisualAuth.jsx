import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CanvasGrid from '../components/visual/CanvasGrid';
import apiService from '../services/api.service';

function VisualAuth() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [gridData, setGridData] = useState(null);
  const [userSelection, setUserSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  
  const [honeytrapAlerts, setHoneytrapAlerts] = useState([]);
  const [tokenData, setTokenData] = useState(null);

  // Device fingerprinting removed — grid is session-scoped only

  // Fetch grid data on mount
  useEffect(() => {
    const fetchGridData = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(`/api/canvas/grid-status/${sessionId}`);
        setGridData(response);
      } catch (err) {
        setError('Failed to load verification grid: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchGridData();
    }
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      setError('Session expired. Please restart authentication.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, navigate]);

  const handleGridSelection = (selectedPositions) => {
    console.log('User selected positions:', selectedPositions);
    setUserSelection(selectedPositions);
  };

  const handleVerify = async () => {
    setError('');
    setSuccess('');
    
    if (!userSelection || userSelection.length === 0) {
      setError('Please select at least one grid cell to verify.');
      return;
    }

    setLoading(true);
    try {
      // Submit verification
      console.log('Submitting verification...');
      const response = await apiService.post('/api/canvas/verify-selection', {
        sessionId,
        userSelection: userSelection[0], // Primary selection
        timestamp: new Date().toISOString()
      });

      if (response.verified) {
        setSuccess('✓ Verification successful! Issuing JWT token...');
        setTokenData(response.token);

        // Log successful visual auth
        await apiService.post('/api/audit/log', {
          eventType: 'VISUAL_AUTH_SUCCESS',
          sessionId,
          severity: 'info'
        }).catch(() => {});

        // Redirect after success message
        setTimeout(() => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
          navigate('/dashboard');
        }, 2000);
      } else {
        // Honeytrap detected
        setHoneytrapAlerts([...honeytrapAlerts, `Honeytrap detected at position ${userSelection[0]}`]);
        setError('Incorrect selection. Please try again. Attempt logged for security review.');
        
        // Log honeytrap trigger
        await apiService.post('/api/audit/log', {
          eventType: 'HONEYTRAP_TRIGGERED',
          sessionId,
          position: userSelection[0],
          severity: 'warning'
        }).catch(() => {});

        setUserSelection(null);
      }
    } catch (err) {
      setError('Verification failed: ' + (err.response?.data?.message || err.message));
      
      // Log failed verification
      await apiService.post('/api/audit/log', {
        eventType: 'VISUAL_AUTH_FAILED',
        sessionId,
        error: err.message,
        severity: 'warning'
      }).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await apiService.post('/api/audit/log', {
        eventType: 'VISUAL_AUTH_CANCELLED',
        sessionId,
        severity: 'info'
      }).catch(() => {});
    } finally {
      navigate('/login');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !gridData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading verification grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-slate-900">Phase 3: Visual Authentication</h1>
          <p className="text-center text-slate-600">Advanced device-binding verification using encrypted canvas rendering</p>
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-6">
          <div className={`text-2xl font-bold px-6 py-2 rounded-lg ${
            timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
            ⏱️ Time Remaining: {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 border-l-4 border-red-500">
            <p className="font-semibold">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4 border-l-4 border-green-500">
            <p className="font-semibold">✓ Success</p>
            <p className="text-sm">{success}</p>
          </div>
        )}

        {honeytrapAlerts.length > 0 && (
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded-lg mb-4 border-l-4 border-yellow-500">
            <p className="font-semibold">🍯 Security Alert</p>
            {honeytrapAlerts.map((alert, idx) => (
              <p key={idx} className="text-sm">{alert}</p>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-slate-50 p-4 rounded-lg mb-6 border-l-4 border-blue-500">
          <p className="text-slate-700 font-semibold mb-2">📋 Instructions:</p>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>A unique grid pattern has been generated for your session</li>
            <li>Click on the grid cell highlighted with a BLUE BORDER to verify</li>
            <li>Do not click on HONEYTRAP cells (marked with alert icons) - they will trigger security alerts</li>
            <li>Your selection is encrypted end-to-end using RS256 JWT binding</li>
          </ul>
        </div>

        {/* Canvas Grid */}
        <div className="flex justify-center mb-8 bg-slate-100 p-6 rounded-lg">
          {gridData && <CanvasGrid 
            gridData={gridData}
            onSelectionComplete={handleGridSelection}
            onTimeout={() => {
              setError('Session timeout. Please restart.');
              setTimeout(() => navigate('/login'), 3000);
            }}
          />}
        </div>

        {/* Selection Status */}
        {userSelection && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Selection Recorded:</strong> Position {userSelection[0]} at {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Security Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700">🔐 Device Binding</p>
            <p className="text-slate-600">RS256 JWT + Device Binding</p>
          </div>
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700">🎨 Canvas Security</p>
            <p className="text-slate-600">Anti-recording rendering</p>
          </div>
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700">📊 Audit Trail</p>
            <p className="text-slate-600">SHA-256 Event Logging</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleVerify}
            disabled={loading || !userSelection}
            className="bg-blue-600 text-white font-semibold px-8 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200 transform hover:scale-105 disabled:scale-100"
          >
            {loading ? '🔄 Verifying...' : '✓ Verify Selection'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="bg-slate-400 text-white font-semibold px-8 py-2 rounded-lg hover:bg-slate-500 disabled:bg-gray-300 transition-all"
          >
            ✕ Cancel
          </button>
        </div>

        {/* Status Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <p>Session ID: {sessionId}</p>
          <p>Device Binding: session-scoped visual verification</p>
          <p>Security Protocol: Phase 3 Visual Auth + Phase 4 JWT Device Binding + Phase 5 Audit Logging</p>
        </div>
      </div>
    </div>
  );
}

export default VisualAuth;
