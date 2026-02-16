import React from 'react';

function LoadingShield() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 animate-spin" />
        <div className="absolute inset-1 rounded-lg bg-white flex items-center justify-center">
          <span className="text-2xl">🛡️</span>
        </div>
      </div>
      <p className="ml-4 text-gray-600">Analyzing...</p>
    </div>
  );
}

export default LoadingShield;
