import { useState } from 'react';

// ── Pure date helpers ─────────────────────────────────────────────

/** Date → "YYYY-MM-DD" */
function toDateStr(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Date → "YYYY-MM" */
function toMonthStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Get the Monday (YYYY-MM-DD) for the week containing a given date */
function getMondayStr(d) {
  const date = new Date(d);
  const dow  = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  date.setDate(date.getDate() - dow);
  return toDateStr(date);
}

/** Parse "YYYY-MM-DD" → Date (midnight local) */
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format date as "Apr 7" */
function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Build week label: "Apr 7 – Apr 13, 2026" */
function weekLabel(mondayStr) {
  if (!mondayStr) return 'Pick a week';
  const monday = parseDate(mondayStr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${fmtShort(monday)} – ${fmtShort(sunday)}, ${monday.getFullYear()}`;
}

/** Build month label: "April 2026" */
function monthLabel(monthStr) {
  if (!monthStr) return 'Pick a month';
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });
}

// ── DateFilter component ──────────────────────────────────────────

/**
 * DateFilter — unified date-range picker with Today shortcut, and
 * navigable Week / Month views.
 *
 * Props:
 *   mode          {'date'|'week'|'month'}
 *   value         {string}  YYYY-MM-DD (date/week) or YYYY-MM (month)
 *   onModeChange  {fn(mode)}
 *   onValueChange {fn(value)}
 *   onModeSwitch  {fn({mode, value})}  optional — batches mode+value into one update
 */
function DateFilter({ mode = 'date', value = '', onModeChange, onValueChange, onModeSwitch }) {
  const today      = new Date();
  const todayStr   = toDateStr(today);
  const isTodayActive = mode === 'date' && value === todayStr;

  // ── Mode switching — atomically updates BOTH mode and value ───
  // This prevents two separate React state updates which would cause
  // an intermediate fetch with a mismatched mode/value pair.
  const switchMode = (m) => {
    const newValue =
      m === 'date'  ? todayStr :
      m === 'week'  ? getMondayStr(today) :
      m === 'month' ? toMonthStr(today) : '';

    if (onModeSwitch) {
      // Single atomic update — preferred
      onModeSwitch({ mode: m, value: newValue });
    } else {
      // Fallback: two separate updates (legacy behaviour)
      onModeChange(m);
      onValueChange(newValue);
    }
  };

  // ── Week navigation ───────────────────────────────────────────
  const stepWeek = (dir) => {
    const base = value ? parseDate(value) : today;
    base.setDate(base.getDate() + dir * 7);
    onValueChange(getMondayStr(base));
  };

  // ── Month navigation ──────────────────────────────────────────
  const stepMonth = (dir) => {
    const base     = value || toMonthStr(today);
    const [y, m]   = base.split('-').map(Number);
    const newDate  = new Date(y, m - 1 + dir, 1);
    onValueChange(toMonthStr(newDate));
  };

  return (
    <div className="filter-date-wrap">

      {/* ── Today shortcut ── */}
      <button
        type="button"
        className={`filter-today-btn ${isTodayActive ? 'active' : ''}`}
        onClick={() => { onModeChange('date'); onValueChange(todayStr); }}
        title="Show today's data"
      >
        Today
      </button>

      {/* ── Mode tab row ── */}
      <div className="filter-date-mode-group">
        {[
          { key: 'date',  label: 'Day'   },
          { key: 'week',  label: 'Week'  },
          { key: 'month', label: 'Month' },
        ].map(item => (
          <button
            key={item.key}
            type="button"
            className={`filter-date-mode-btn ${mode === item.key ? 'active' : ''}`}
            onClick={() => switchMode(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Mode-specific input ── */}
      {mode === 'date' && (
        <input
          type="date"
          className="filter-date-input"
          value={value}
          onChange={e => onValueChange(e.target.value)}
          aria-label="Pick a date"
        />
      )}

      {mode === 'week' && (
        <div className="filter-nav-row">
          <button
            type="button"
            className="filter-nav-btn"
            onClick={() => stepWeek(-1)}
            title="Previous week"
          >‹</button>
          <span className="filter-nav-label">
            📅 {weekLabel(value || getMondayStr(today))}
          </span>
          <button
            type="button"
            className="filter-nav-btn"
            onClick={() => stepWeek(1)}
            title="Next week"
          >›</button>
        </div>
      )}

      {mode === 'month' && (
        <div className="filter-nav-row">
          <button
            type="button"
            className="filter-nav-btn"
            onClick={() => stepMonth(-1)}
            title="Previous month"
          >‹</button>
          <span className="filter-nav-label">
            📅 {monthLabel(value || toMonthStr(today))}
          </span>
          <button
            type="button"
            className="filter-nav-btn"
            onClick={() => stepMonth(1)}
            title="Next month"
          >›</button>
        </div>
      )}

      {/* ── Clear (except "today" which is a no-op quick access) ── */}
      {value && !isTodayActive && (
        <button
          type="button"
          className="filter-date-clear"
          onClick={() => onValueChange('')}
          aria-label="Clear date filter"
          title="Clear"
        >✕</button>
      )}
    </div>
  );
}

export default DateFilter;
