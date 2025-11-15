import React from 'react';
import { indianLocations } from '../data/locations';

interface LocationFilterProps {
  selectedState: string;
  setSelectedState: (state: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  selectedBlock: string;
  setSelectedBlock: (block: string) => void;
}

const LocationFilter: React.FC<LocationFilterProps> = ({
  selectedState, setSelectedState,
  selectedDistrict, setSelectedDistrict,
  selectedBlock, setSelectedBlock,
}) => {
  const states = Object.keys(indianLocations);
  const districts = selectedState ? Object.keys(indianLocations[selectedState] || {}) : [];
  const blocks = selectedState && selectedDistrict ? (indianLocations[selectedState]?.[selectedDistrict] || []) : [];
  
  return (
    <div className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 p-3">
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <span
          className="px-4 py-2 text-sm font-bold text-gray-700 whitespace-nowrap"
        >
          News Filter
        </span>
        <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="flex-1 w-full sm:w-auto p-2 border border-gray-300 bg-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">Select State (राज्य)</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedState} className="flex-1 w-full sm:w-auto p-2 border border-gray-300 bg-white rounded-lg text-sm disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500">
          <option value="">Select District (जिला)</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} disabled={!selectedDistrict} className="flex-1 w-full sm:w-auto p-2 border border-gray-300 bg-white rounded-lg text-sm disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500">
          <option value="">Select Block (प्रखंड)</option>
          {blocks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
    </div>
  );
};

export default LocationFilter;