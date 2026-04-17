import { useEffect, useState } from 'react';
import API from '../../services/api';
import { buildQueryParams } from '../../utils/filterUtils';

/**
 * SummaryStrip — KPI summary bar that fetches aggregate stats for the current filters.
 * Props:
 *   filters   {Object}  current filter state { search, role, dateMode, dateValue }
 *   visible   {boolean} whether to show the strip (hide on initial full load)
 */
const CHIPS = [
  { key: 'total_accesses',    label: 'Total Accesses',   icon: '📋', cls: 'summary-chip--accesses' },
  { key: 'unique_users',      label: 'Unique Users',     icon: '👥', cls: 'summary-chip--users'    },
  { key: 'unique_devices',    label: 'Unique Devices',   icon: '📱', cls: 'summary-chip--devices'  },
  { key: 'high_risk_attempts',label: 'High-Risk',        icon: '🔥', cls: 'summary-chip--risk'     },
];

function SummaryStrip({ filters, visible = true }) {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const params = buildQueryParams(filters);
        const res    = await API.get('/api/admin/analytics/summary', { params });
        if (!cancelled) setSummary(res.data);
      } catch (_) {
        // Silently fail — strip is supplementary info
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSummary();
    return () => { cancelled = true; };
  }, [filters, visible]);

  if (!visible) return null;

  return (
    <div className="summary-strip">
      {CHIPS.map(chip => (
        <div key={chip.key} className={`summary-chip ${chip.cls} ${loading ? 'summary-chip--loading' : ''}`}>
          <span className="summary-chip-icon">{chip.icon}</span>
          <span className="summary-chip-value">
            {loading ? '' : (summary?.[chip.key] ?? '—')}
          </span>
          <span className="summary-chip-label">{chip.label}</span>
        </div>
      ))}
    </div>
  );
}

export default SummaryStrip;
