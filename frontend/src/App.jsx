import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LogPanel from './components/ui/LogPanel';
import TerminalConsole from './components/ui/TerminalConsole';
import ModuleErrorBoundary from './components/ModuleErrorBoundary';
import Home from './pages/Home';
import Login from './pages/Login';
import VisualAuth from './pages/VisualAuth';
import Dashboard from './pages/Dashboard';
import ThreatLogs from './pages/ThreatLogs';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <ModuleErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/visual-auth" element={<VisualAuth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/threat-logs" element={<ThreatLogs />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </ModuleErrorBoundary>
        </main>
        <Footer />
        <LogPanel />
        <TerminalConsole />
      </div>
    </Router>
  );
}

export default App;
