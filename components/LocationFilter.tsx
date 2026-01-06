
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
    <div className="flex-shrink-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 py-2">
      <div className="flex items-center gap-2 px-3 overflow-x-auto scrollbar-hide">
        {/* Label / Icon */}
        <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs whitespace-nowrap bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 flex-shrink-0 shadow-sm">
           <span className="material-symbols-outlined text-[18px] text-red-600">tune</span>
           <span>Filter</span>
        </div>

        {/* State Select */}
        <div className="relative flex-shrink-0 group">
            <select 
                value={selectedState} 
                onChange={(e) => setSelectedState(e.target.value)} 
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 block w-full py-2 pl-3 pr-8 min-w-[110px] shadow-sm transition-all"
            >
                <option value="">State</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
            </div>
        </div>

        {/* District Select */}
        <div className="relative flex-shrink-0 group">
            <select 
                value={selectedDistrict} 
                onChange={(e) => setSelectedDistrict(e.target.value)} 
                disabled={!selectedState}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 block w-full py-2 pl-3 pr-8 min-w-[110px] shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:shadow-none transition-all"
            >
                <option value="">District</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
            </div>
        </div>

        {/* Block Select */}
        <div className="relative flex-shrink-0 group">
            <select 
                value={selectedBlock} 
                onChange={(e) => setSelectedBlock(e.target.value)} 
                disabled={!selectedDistrict}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 block w-full py-2 pl-3 pr-8 min-w-[110px] shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:shadow-none transition-all"
            >
                <option value="">Block</option>
                {blocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
            </div>
        </div>
        
        {/* Reset Button */}
        {(selectedState || selectedDistrict) && (
             <button 
                onClick={() => {
                    setSelectedState('');
                    setSelectedDistrict('');
                    setSelectedBlock('');
                }}
                className="flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-full flex-shrink-0 hover:bg-red-100 transition-all shadow-sm border border-red-100"
                title="Reset Filters"
             >
                <span className="material-symbols-outlined text-[16px]">close</span>
             </button>
        )}
      </div>
    </div>
  );
};

export default LocationFilter;
