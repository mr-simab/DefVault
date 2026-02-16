import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-4xl neon-text phoenix-glow">DefVault</h1>
        <p className="text-cyan-300 mt-2">Enterprise-grade threat detection and secure content protection platform.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 cyber-border rounded-lg">
          <h2 className="text-2xl">Modules</h2>
          <ul className="mt-4 space-y-2 text-cyan-200">
            <li><strong>Core Threat Engine</strong> — Shared sentinel checks, orchestration, and resilient scanning.</li>
            <li><strong>Enterprise</strong> — B2B features: centralized audit, canvas integrations, JWT management.</li>
            <li><strong>Personal</strong> — B2C features: Gmail scanning, quarantine, user threat dashboard.</li>
          </ul>
        </div>

        <div className="p-6 cyber-border rounded-lg">
          <h2 className="text-2xl">Key Features</h2>
          <ul className="mt-4 space-y-2 text-cyan-200">
            <li>Resilient sentinel execution with graceful degradation.</li>
            <li>RS256 JWT verification and SDK support for offline verification.</li>
            <li>Modular architecture with namespace separation and fault isolation.</li>
            <li>Developer-friendly SDK and minimal infra examples for local or cloud deploy.</li>
          </ul>
        </div>
      </section>

      <section className="mt-8 p-6 cyber-border rounded-lg">
        <h2 className="text-2xl">Get started</h2>
        <p className="mt-2 text-cyan-200">Choose a path to continue:</p>
        <div className="mt-4 flex gap-3">
          <Link to="/login" className="btn-phoenix">Login</Link>
          <Link to="/dashboard" className="btn-cyber">Open Dashboard</Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
