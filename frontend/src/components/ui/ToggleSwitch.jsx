import React from 'react';

function ToggleSwitch({ checked, onChange }) {
  return (
    <label className="flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
      </div>
    </label>
  );
}

export default ToggleSwitch;
