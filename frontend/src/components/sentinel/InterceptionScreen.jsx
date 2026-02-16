import React from 'react';

function InterceptionScreen() {
  return (
    <div className="bg-red-900 text-white p-8 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Threat Detected</h2>
      <p className="mb-4">This website has been flagged as a potential security threat.</p>
      <button className="bg-white text-red-900 px-4 py-2 rounded font-bold hover:bg-red-100">
        Go Back
      </button>
    </div>
  );
}

export default InterceptionScreen;
