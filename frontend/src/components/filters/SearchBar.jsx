import { useState, useEffect, useRef } from 'react';

/**
 * SearchBar — debounced text input for filtering records.
 * Props:
 *   value        {string}   controlled value
 *   onChange     {fn}       called with debounced string
 *   placeholder  {string}   input hint text
 *   debounceMs   {number}   delay in ms (default 300)
 */
function SearchBar({ value, onChange, placeholder = 'Search…', debounceMs = 300 }) {
  const [local, setLocal] = useState(value ?? '');
  const timerRef = useRef(null);

  // Sync external value reset (e.g., "clear all filters")
  useEffect(() => { setLocal(value ?? ''); }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounceMs);
  };

  const handleClear = () => {
    setLocal('');
    clearTimeout(timerRef.current);
    onChange('');
  };

  return (
    <div className="filter-search-wrap">
      <span className="filter-search-icon">🔍</span>
      <input
        type="text"
        className="filter-search-input"
        placeholder={placeholder}
        value={local}
        onChange={handleChange}
        aria-label="Search"
        autoComplete="off"
        spellCheck={false}
      />
      {local && (
        <button
          className="filter-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >✕</button>
      )}
    </div>
  );
}

export default SearchBar;
