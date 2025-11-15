import React from 'react';
import { indianLocations } from '../data/locations';

interface LocationSelectorProps {
  state: string;
  setState: (state: string) => void;
  district: string;
  setDistrict: (district: string) => void;
  block: string;
  setBlock: (block: string) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  state, setState,
  district, setDistrict,
  block, setBlock,
}) => {
  const states = Object.keys(indianLocations);
  const districts = state ? Object.keys(indianLocations[state] || {}) : [];
  const blocks = state && district ? (indianLocations[state]?.[district] || []) : [];

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState(e.target.value);
    setDistrict('');
    setBlock('');
  };
  
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDistrict(e.target.value);
    setBlock('');
  };

  return (
    <div className="space-y-4 p-4 bg-gray-100/50 rounded-lg border">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State (राज्य)</label>
          <select id="state" value={state} onChange={handleStateChange} className="w-full p-2 border border-gray-300 bg-white rounded-lg focus:ring-blue-500">
            <option value="">Select State (राज्य)</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">District (जिला)</label>
          <select id="district" value={district} onChange={handleDistrictChange} disabled={!state} className="w-full p-2 border border-gray-300 bg-white rounded-lg focus:ring-blue-500 disabled:bg-gray-200">
            <option value="">Select District (जिला)</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="block" className="block text-sm font-medium text-gray-700 mb-1">Block (प्रखंड)</label>
          <select id="block" value={block} onChange={e => setBlock(e.target.value)} disabled={!district} className="w-full p-2 border border-gray-300 bg-white rounded-lg focus:ring-blue-500 disabled:bg-gray-200">
            <option value="">Select Block (प्रखंड)</option>
            {blocks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;