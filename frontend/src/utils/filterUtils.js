/**
 * filterUtils.js
 * Shared utilities for building API query parameters from the unified filter state.
 */

/**
 * Build axios params object from the current filter state.
 * Week mode sends ?week_start=YYYY-MM-DD (Monday of the selected week).
 * Month mode sends ?month=YYYY-MM.
 * Day mode sends ?date=YYYY-MM-DD.
 *
 * @param {Object} filters - { search, role, dateMode, dateValue }
 * @returns {Object} plain params object for axios
 */
export function buildQueryParams(filters = {}) {
  const { search, role, dateMode, dateValue } = filters;
  const params = {};

  if (search && search.trim()) params.search = search.trim();
  if (role && role !== 'all')  params.role   = role;

  if (dateValue) {
    if      (dateMode === 'date')  params.date       = dateValue; // YYYY-MM-DD
    else if (dateMode === 'week')  params.week_start = dateValue; // YYYY-MM-DD (Monday)
    else if (dateMode === 'month') params.month      = dateValue; // YYYY-MM
  }

  return params;
}

/**
 * Given a dateMode + dateValue, returns { from: ISOString, to: ISOString }.
 * (Used client-side for display only — server does the real filtering.)
 */
export function parseDateRange(mode, value) {
  if (!value) return null;
  try {
    if (mode === 'date') {
      const from = new Date(value + 'T00:00:00');
      const to   = new Date(value + 'T23:59:59.999');
      return { from: from.toISOString(), to: to.toISOString() };
    }
    if (mode === 'week') {
      // value is Monday YYYY-MM-DD
      const [y, m, d] = value.split('-').map(Number);
      const monday    = new Date(y, m - 1, d, 0, 0, 0, 0);
      const sunday    = new Date(y, m - 1, d + 6, 23, 59, 59, 999);
      return { from: monday.toISOString(), to: sunday.toISOString() };
    }
    if (mode === 'month') {
      const [year, month] = value.split('-').map(Number);
      const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const to   = new Date(year, month,     0, 23, 59, 59, 999);
      return { from: from.toISOString(), to: to.toISOString() };
    }
  } catch (_) {
    return null;
  }
  return null;
}

/**
 * Returns a human-readable label for the active date filter pill.
 */
export function dateFilterLabel(mode, value) {
  if (!value) return '';
  if (mode === 'date') {
    const d = new Date(value + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const todayStr = new Date().toISOString().slice(0, 10);
    return value === todayStr ? `📅 Today (${label})` : `📅 ${label}`;
  }
  if (mode === 'week') {
    // value = Monday YYYY-MM-DD
    const [y, m, d] = value.split('-').map(Number);
    const monday = new Date(y, m - 1, d);
    const sunday = new Date(y, m - 1, d + 6);
    const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `📅 Week: ${fmt(monday)} – ${fmt(sunday)}`;
  }
  if (mode === 'month') {
    return `📅 ${new Date(value + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  return value;
}
