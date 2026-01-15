'use client';
import { useState } from 'react';

export default function FilterSidebar({ filters, selectedFilters, onFilterChange }) {
  const [openSections, setOpenSections] = useState({
    dateRange: true,
    journals: true,
    years: true,
    keywords: false, 
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (category, value) => {
    const current = selectedFilters[category];

    if (category === 'dateRange') {
        const isSelected = current === value;
        const updated = isSelected ? null : value;
        onFilterChange(category, updated);
    } else {
        const currentArr = Array.isArray(current) ? current : [];
        const isSelected = currentArr.includes(value);
        const updated = isSelected
        ? currentArr.filter(item => item !== value)
        : [...currentArr, value];
        onFilterChange(category, updated);
    }
  };

  const renderSection = (title, category, items, isSingleSelect = false) => (
    <div className="mb-1 border-b border-slate-100 last:border-0">
      <button 
        onClick={() => toggleSection(category)}
        className="flex justify-between items-center w-full text-left py-3 px-1 font-bold text-slate-700 hover:text-indigo-600 transition-colors text-sm"
      >
        {title}
        <span className={`text-slate-400 text-xs transition-transform duration-200 ${openSections[category] ? 'rotate-180' : ''}`}>▼</span>
      </button>
      
      {openSections[category] && (
        <div className="pb-4 pl-1 max-h-56 overflow-y-auto pr-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item) => {
               const label = item.label || item;
               const value = item.value || item;
               
               const isChecked = isSingleSelect 
                  ? selectedFilters[category] === value
                  : (selectedFilters[category] || []).includes(value);

               return (
                <label key={value} className={`flex items-center text-sm p-1.5 rounded-md cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className={`w-4 h-4 border flex items-center justify-center mr-2.5 transition-colors ${isSingleSelect ? 'rounded-full' : 'rounded'} ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {isChecked && (
                        isSingleSelect 
                        ? <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        : <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    )}
                  </div>
                  {/* Hidden native input for accessibility */}
                  <input
                    type={isSingleSelect ? "radio" : "checkbox"}
                    checked={isChecked || false}
                    onChange={() => handleCheckboxChange(category, value)}
                    onClick={(e) => {
                        if(isSingleSelect && isChecked) {
                            e.preventDefault();
                            handleCheckboxChange(category, value);
                        }
                    }}
                    className="hidden"
                  />
                  <span className="truncate font-medium" title={label}>
                      {label}
                  </span>
                </label>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 italic ml-1">No options available</p>
          )}
        </div>
      )}
    </div>
  );

  const dateAddedOptions = [
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'This Year', value: 'thisYear' },
  ];

  const safeFilters = filters || {};

  return (
    <div className="w-full bg-white px-5 py-4 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Filters</h3>
        <button 
            onClick={() => onFilterChange('reset')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
        >
            Reset
        </button>
      </div>

      {renderSection('Date Added', 'dateRange', dateAddedOptions, true)}
      {renderSection('Journal / Source', 'journal', safeFilters.journals || [])}
      {renderSection('Publication Year', 'year', safeFilters.years || [])}
     
      {renderSection('Keywords', 'keywords', safeFilters.keywords || [])}
    </div>
  );
}