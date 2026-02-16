import React from 'react';

function SecureBadge({ status = 'secure' }) {
  const statusColor = status === 'secure' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${status === 'secure' ? 'bg-green-600' : 'bg-red-600'}`} />
      {status === 'secure' ? 'Secure' : 'Vulnerable'}
    </div>
  );
}

export default SecureBadge;
