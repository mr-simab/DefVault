import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * AccountTypeDetection Component
 * Determines user's account type from JWT token
 * Routes to appropriate module (Enterprise or Personal)
 */

export const AccountTypeDetection = ({ token, onAccountTypeDetected }) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // Decode JWT token (frontend only - no validation)
      const decoded = decodeJWT(token);
      
      if (!decoded) {
        setError('Invalid token format');
        navigate('/login');
        return;
      }

      const accountType = decoded.accountType;

      if (!accountType || !['enterprise', 'personal'].includes(accountType)) {
        setError('Unknown account type');
        navigate('/login');
        return;
      }

      // Callback to parent component
      if (onAccountTypeDetected) {
        onAccountTypeDetected(accountType, decoded);
      }

      // Route to appropriate module
      if (accountType === 'enterprise') {
        navigate('/enterprise/dashboard');
      } else if (accountType === 'personal') {
        navigate('/personal/dashboard');
      }

      setLoading(false);
    } catch (err) {
      setError(`Token parsing error: ${err.message}`);
      navigate('/login');
    }
  }, [token, navigate, onAccountTypeDetected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Detecting account type...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <p className="text-red-400 font-semibold">Error:</p>
          <p className="text-red-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Helper function to decode JWT token
 * NOTE: This is for frontend reference only - do not use for security
 */
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (second part)
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );

    return payload;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

export default AccountTypeDetection;
