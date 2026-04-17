import SearchBar  from './SearchBar';
import DateFilter  from './DateFilter';
import RoleFilter  from './RoleFilter';
import { dateFilterLabel } from '../../utils/filterUtils';

/**
 * FilterBar — composite filter toolbar.
 * Props:
 *   filters       {Object} { search, role, dateMode, dateValue }
 *   onFilterChange {fn}   called with (key, value) patch
 *   onClearAll    {fn}    called when admin clears everything
 *   searchPlaceholder {string}  optional custom placeholder
 */
function FilterBar({ filters, onFilterChange, onClearAll, searchPlaceholder }) {
  const { search = '', role = 'all', dateMode = 'date', dateValue = '' } = filters;

  const hasActiveFilters = search || (role && role !== 'all') || dateValue;

  return (
    <div>
      {/* Main filter row */}
      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={v => onFilterChange('search', v)}
          placeholder={searchPlaceholder || 'Search user, device, IP, browser…'}
        />
        <DateFilter
          mode={dateMode}
          value={dateValue}
          onModeChange={v => onFilterChange('dateMode', v)}
          onValueChange={v => onFilterChange('dateValue', v)}
          onModeSwitch={({ mode, value }) => {
            // Atomic patch — updates both keys in ONE state update to prevent
            // a mismatched intermediate render (wrong mode + old value)
            onFilterChange('__batch__', { dateMode: mode, dateValue: value });
          }}
        />
        <RoleFilter
          value={role}
          onChange={v => onFilterChange('role', v)}
        />
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="filter-pills-row">
          {search && (
            <span className="filter-pill">
              🔍 "{search.length > 20 ? search.slice(0, 20) + '…' : search}"
              <button
                type="button"
                className="filter-pill-clear"
                onClick={() => onFilterChange('search', '')}
                aria-label="Remove search filter"
              >✕</button>
            </span>
          )}
          {role && role !== 'all' && (
            <span className="filter-pill">
              👤 {role}
              <button
                type="button"
                className="filter-pill-clear"
                onClick={() => onFilterChange('role', 'all')}
                aria-label="Remove role filter"
              >✕</button>
            </span>
          )}
          {dateValue && (
            <span className="filter-pill">
              {dateFilterLabel(dateMode, dateValue)}
              <button
                type="button"
                className="filter-pill-clear"
                onClick={() => onFilterChange('dateValue', '')}
                aria-label="Remove date filter"
              >✕</button>
            </span>
          )}
          <button type="button" className="filter-clear-all" onClick={onClearAll}>
            ✕ Clear All
          </button>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
