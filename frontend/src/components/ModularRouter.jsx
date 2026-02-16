import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

/**
 * ModularRouter Component
 * Handles routing for Enterprise and Personal modules
 * Prevents cross-module access
 */

// Import module-specific components
import EnterpriseLayout from './layouts/EnterpriseLayout';
import EnterpriseDashboard from './pages/enterprise/Dashboard';
import EnterpriseCanvas from './pages/enterprise/Canvas';
import EnterpriseAudit from './pages/enterprise/Audit';

import PersonalLayout from './layouts/PersonalLayout';
import PersonalDashboard from './pages/personal/Dashboard';
import PersonalGmail from './pages/personal/Gmail';
import PersonalThreatAnalysis from './pages/personal/ThreatAnalysis';
import PersonalQuarantine from './pages/personal/Quarantine';

// Shared pages
import LoginPage from './pages/Login';
import NotFoundPage from './pages/NotFound';

export const ModularRouter = ({ userAccountType }) => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to={userAccountType ? `/${userAccountType}/dashboard` : '/login'} replace />} />

      {/* Enterprise Module Routes */}
      <Route path="/enterprise/*" element={
        userAccountType === 'enterprise' ? (
          <EnterpriseLayout>
            <Routes>
              <Route path="dashboard" element={<EnterpriseDashboard />} />
              <Route path="canvas" element={<EnterpriseCanvas />} />
              <Route path="audit" element={<EnterpriseAudit />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </EnterpriseLayout>
        ) : (
          <Navigate to="/unauthorized" replace />
        )
      } />

      {/* Personal Module Routes */}
      <Route path="/personal/*" element={
        userAccountType === 'personal' ? (
          <PersonalLayout>
            <Routes>
              <Route path="dashboard" element={<PersonalDashboard />} />
              <Route path="gmail" element={<PersonalGmail />} />
              <Route path="threat-analysis" element={<PersonalThreatAnalysis />} />
              <Route path="quarantine" element={<PersonalQuarantine />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PersonalLayout>
        ) : (
          <Navigate to="/unauthorized" replace />
        )
      } />

      {/* Error Routes */}
      <Route path="/unauthorized" element={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md text-center">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Unauthorized</h1>
            <p className="text-red-300 mb-6">You don't have permission to access this module.</p>
            <a href="/login" className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition">
              Return to Login
            </a>
          </div>
        </div>
      } />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default ModularRouter;
