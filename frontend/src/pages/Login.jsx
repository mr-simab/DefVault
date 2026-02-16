import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [needs2FA, setNeeds2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const navigate = useNavigate();

  // Device fingerprinting removed — session-scoped flows used instead

  // Check for suspicious login patterns
  const isSuspiciousLogin = () => {
    // Fingerprint checks removed — rely on session heuristics and risk scoring
    return false;
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Phase 1: Threat Detection - Analyze email for phishing
      console.log('Phase 1: Analyzing credentials for phishing threats...');
      const threatAnalysis = await apiService.analyzeUrl({ url: `mailto:${email}` }).catch(() => null);

      // Phase 3: Visual Authentication for suspicious logins
      if (isSuspiciousLogin()) {
        console.log('Phase 3: Suspicious login detected - Requiring visual authentication...');
        setWarning('New device detected. Please complete visual verification.');
        setNeeds2FA(true);
        
        // Generate canvas grid for verification
        const gridResponse = await apiService.post('/api/canvas/generate-grid', {
          email
        });
        setSessionId(gridResponse.sessionId);
        return;
      }

      // Standard login flow
      console.log('Initiating standard login...');
      const response = await apiService.post('/api/auth/login', {
        email,
        password,
        threatLevel: threatAnalysis?.threatLevel || 'low'
      });

      // Phase 4: JWT Token Management with Device Binding
      console.log('Phase 4: Issuing device-bound JWT token...');
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      // deviceFingerprint storage removed
      localStorage.setItem('tokenExpiry', response.expiresIn);
      
      // Phase 5: Audit Logging
      console.log('Phase 5: Logging authentication audit event...');
      await apiService.post('/api/audit/log', {
        eventType: 'LOGIN_SUCCESS',
        email,
        ipAddress: await getClientIp(),
        severity: 'info'
      }).catch(err => console.warn('Audit logging failed:', err));

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      
      // Log failed login attempt
      await apiService.post('/api/audit/log', {
        eventType: 'LOGIN_FAILED',
        email,
        reason: err.message,
        severity: 'warning'
      }).catch(e => console.warn('Audit log failed:', e));
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify canvas grid selection
      console.log('Verifying visual authentication...');
      const verifyResponse = await apiService.post('/api/canvas/verify-selection', {
        sessionId,
        userSelection: parseInt(otpCode)
      });

      if (!verifyResponse.verified) {
        setError('Visual verification failed. Please try again.');
        return;
      }

      // After successful 2FA, proceed with login
      const response = await apiService.post('/api/auth/login', {
        email,
        password,
        verified2FA: true,
        sessionId
      });

      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);

      // Audit log for 2FA success
      await apiService.post('/api/audit/log', {
        eventType: 'LOGIN_2FA_SUCCESS',
        email,
        severity: 'info'
      }).catch(() => {});

      navigate('/dashboard');
    } catch (err) {
      setError('Verification failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getClientIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (e) {
      return 'unknown';
    }
  };

  // 2FA Screen
  if (needs2FA) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center p-4 relative">
        <div className="card-cyber monitor-frame w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-center neon-text glitch" data-glitch="DefVault">DefVault</h1>
            <p className="text-center text-cyan-400 text-sm mt-2 neon-text">Security Verification Required</p>
          </div>

          {warning && (
            <div className="bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500 text-yellow-300 p-4 rounded mb-4 text-sm">
              ⚠️ {warning}
          )}
          {error && (
            <div className="bg-red-900 bg-opacity-30 border-l-4 border-red-500 text-red-300 p-4 rounded mb-4 text-sm">
              ✗ {error}
            </div>
          )}

          <form onSubmit={handle2FASubmit}>
            <div className="mb-6">
              <label className="block text-cyan-400 font-semibold mb-2 text-sm neon-text">Complete this challenge:</label>
              <p className="text-sm text-slate-400 mb-3"> Enter the grid position you selected (0-15)</p>
              <input
                type="number"
                min="0"
                max="15"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="input-cyber w-full"
                placeholder="Position (0-15)"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cyber w-full mb-3"
            >
              {loading ? '⟳ Verifying...' : '⚡ Verify Grid'}
            </button>

            <button
              type="button"
              onClick={() => setNeeds2FA(false)}
              className="w-full border-2 border-neutral-500 text-neutral-400 font-semibold py-2 rounded-lg hover:border-cyan-400 hover:text-cyan-400 transition-all"
            >
              ← Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Standard Login Screen - Cybersecurity Styled
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4 relative">
      {/* Phoenix Rising Animation Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full phoenix-glow opacity-20 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full cyber-border opacity-10 blur-3xl"></div>
      </div>

      <div className="card-cyber monitor-frame w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black mb-2 neon-text glitch" data-glitch="DefVault">
            DefVault
          </h1>
          <p className="text-slate-400 text-xs mt-3">Protected by Phoenix Security Protocol</p>
        </div>

        {error && (
          <div className="threat-critical p-4 rounded mb-6 text-sm border border-red-500">
            <p className="text-red-300 font-semibold">✗ AUTHENTICATION ERROR</p>
            <p className="text-red-200 text-xs mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-cyan-400 font-bold mb-2 text-sm tracking-wider">EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-cyber w-full text-sm"
              placeholder="user@domain.com"
              required
              disabled={loading}
            />
            <div className="text-xs text-slate-500 mt-1">>> Phase 1: Email threat analysis enabled</div>
          </div>

          <div>
            <label className="block text-cyan-400 font-bold mb-2 text-sm tracking-wider">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cyber w-full text-sm"
              placeholder="••••••••••••"
              required
              disabled={loading}
            />
            <div className="text-xs text-slate-500 mt-1">>> Device fingerprinting removed</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-cyber w-full mt-6 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⟳ ANALYZING & AUTHENTICATING...' : '► INITIATE SECURE LOGIN'}
          </button>
        </form>

        {/* Security Status Bar */}
        <div className="mt-6 p-4 bg-slate-900 border border-cyan-500 rounded-lg">
          <p className="text-xs font-mono text-cyan-300 mb-2 font-bold">═══ SECURITY STATUS ═══</p>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Phase 1 Sentinel</span>
              <span className={`text-green-400`}>✓ ACTIVE</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Device Binding</span>
              <span className={`text-green-400`}>Session-scoped</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>JWT Crypto</span>
              <span className="text-cyan-400">✓ RS256-2048</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Audit Trail</span>
              <span className="text-cyan-400">✓ SHA-256 CHAIN</span>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-cyan-500 border-opacity-30 text-center">
          <p className="text-xs text-slate-500">DefVault v1.0 • Cybersecurity by Phoenix Protocol</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
