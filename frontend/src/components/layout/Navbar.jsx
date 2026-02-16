import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-slate-900 text-white p-4 shadow-lg relative">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3">
          <img src="/src/assets/icon.jpeg" alt="DefVault" className="h-10 w-10 rounded-lg" onError={(e)=>{e.target.style.display='none'}} />
          <div>
            <div className="text-2xl font-bold"><span className="text-amber-500">Def</span>Vault</div>
            <div className="text-xs text-slate-400">Secure content protection — Team RescueVault</div>
          </div>
        </Link>
        <div className="space-x-4">
          <Link to="/login" className="hover:text-amber-500">Login</Link>
          <Link to="/dashboard" className="hover:text-amber-500">Dashboard</Link>
          <Link to="/threat-logs" className="hover:text-amber-500">Threats</Link>
        </div>
      </div>

      {/* Watermark */}
      <div className="pointer-events-none absolute right-6 top-6 opacity-10 text-right">
        <div className="text-6xl neon-text">DefVault</div>
        <div className="text-sm text-slate-600">Team RescueVault</div>
      </div>
    </nav>
  );
}

export default Navbar;
