import { useEffect, useState, useCallback, useRef } from 'react';
import API from '../services/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement, ArcElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';
import '../styles/analytics.css';
import '../components/filters/filters.css';
import { FilterBar } from '../components/filters';
import { buildQueryParams } from '../utils/filterUtils';

ChartJS.register(
  BarElement, ArcElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler
);

// ── Global Chart.js defaults: disable ALL shadow/glow effects ────
// This prevents any inherited browser canvas shadow from bleeding
// onto chart elements and making lines look blurry or glowing.
ChartJS.defaults.elements.line.borderCapStyle = 'round';
ChartJS.defaults.elements.line.borderJoinStyle = 'round';
ChartJS.defaults.elements.line.fill = false;
ChartJS.defaults.elements.point.hoverBorderWidth = 2;
// Explicitly zero out shadows at the global defaults level
ChartJS.defaults.plugins.shadow = undefined;
// Ensure devicePixelRatio is respected (Chart.js 3+ does this when
// responsive:true, but explicit > 1 guard ensures retina crispness)
if (typeof window !== 'undefined') {
  ChartJS.defaults.devicePixelRatio = window.devicePixelRatio || 1;
}

// ── Palette (flat, no neon) ───────────────────────────────────────
const P = {
  green: '#34d399',
  greenBg: 'rgba(52,211,153,0.12)',
  red: '#f87171',
  redBg: 'rgba(248,113,113,0.1)',
  blue: '#60a5fa',
  blueBg: 'rgba(96,165,250,0.12)',
  purple: '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.12)',
  amber: '#fbbf24',
  amberBg: 'rgba(251,191,36,0.12)',
  cyan: '#22d3ee',
  cyanBg: 'rgba(34,211,238,0.12)',
  grid: 'rgba(51,65,85,0.5)',
  tick: '#64748b',
  border: '#334155',
  card: '#1e293b',
  bg: '#0f172a',
};

const ROLE_COLORS = {
  Student: P.blue, Faculty: P.purple, Guest: P.amber, Admin: P.green,
};

const DEFAULT_FILTERS = { search: '', role: 'all', dateMode: 'date', dateValue: '' };

// ── Shared tooltip config ─────────────────────────────────────────
const TT = {
  backgroundColor: '#1e293b',
  titleColor: '#e2e8f0',
  bodyColor: '#94a3b8',
  borderColor: '#334155',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
  displayColors: true,
  boxPadding: 3,
};

// ── Chart options factory ─────────────────────────────────────────
function makeOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350, easing: 'easeOutQuart' },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11.5, family: 'Inter, -apple-system, sans-serif' }, padding: 14, usePointStyle: true } },
      tooltip: TT,
    },
    scales: {
      x: { grid: { color: 'rgba(71,85,105,0.55)', drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 11.5, family: 'Inter, sans-serif' } }, border: { display: false } },
      y: { grid: { color: 'rgba(71,85,105,0.55)', drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 11.5, family: 'Inter, sans-serif' } }, beginAtZero: true, border: { display: false } },
      ...extra,
    },
  };
}

// Donut plugin for center text
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, data, chartArea } = chart;
    if (!chartArea) return;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText(total.toLocaleString(), cx, cy - 8);
    ctx.font = '400 10px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('total', cx, cy + 10);
    ctx.restore();
  },
};
ChartJS.register(centerTextPlugin);

// ── Sparkline canvas (HiDPI-ready) ─────────────────────────────────
function Sparkline({ data, color, height = 36 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !data?.length || data.length < 2) return;

    // — Handle devicePixelRatio for crisp HiDPI rendering —
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = Math.round(rect.width * dpr);
    const H = Math.round(rect.height * dpr);

    // Only resize if dimensions changed (avoid constant redraws)
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.scale(dpr, dpr);    // scale to logical pixels

    const logW = rect.width;
    const logH = rect.height;
    const pad = 2;

    // Compute value range
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * logW,
      y: logH - pad - ((v - min) / range) * (logH - pad * 2),
    }));

    // — Area fill —
    const grad = ctx.createLinearGradient(0, 0, 0, logH);
    grad.addColorStop(0, color + '28');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, logH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, logH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // — Line — (no shadow, no glow)
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;   // thin, crisp
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowBlur = 0;     // explicitly disable any inherited glow
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Reset scale for next paint
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [data, color]);

  // No fixed width/height attrs — set via CSS to fill container,
  // actual buffer size is set in useEffect with the DPR correction.
  return (
    <canvas
      ref={ref}
      style={{
        display: 'block',
        width: '100%',
        height: `${height}px`,
        imageRendering: 'crisp-edges',
      }}
    />
  );
}

// ── KPI Card (compact, professional) ─────────────────────────────
function KpiCard({ icon, value, label, color, sparkData, sparkColor, changePct, onClick }) {
  const isUp = changePct >= 0;
  return (
    <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="kpi-top">
        <div className="kpi-icon-wrap" style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
          <span className="kpi-icon" style={{ color }}>{icon}</span>
        </div>
        {changePct !== undefined && (
          <span className={`kpi-delta ${isUp ? 'up' : 'down'}`}>
            {isUp ? '↑' : '↓'}{Math.abs(changePct)}%
          </span>
        )}
      </div>
      <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="kpi-label">{label}</div>
      {sparkData?.length > 1 && (
        <div className="kpi-spark">
          <Sparkline data={sparkData} color={sparkColor || color} />
        </div>
      )}
    </div>
  );
}

// ── Insights panel ────────────────────────────────────────────────
function InsightsPanel({ data, trendData, totalLogins, authorized, blocked, highRisk, intrusions }) {
  const insights = [];

  const authRate = totalLogins > 0 ? Math.round((authorized / totalLogins) * 100) : 0;
  const blockRate = totalLogins > 0 ? Math.round((blocked / totalLogins) * 100) : 0;

  if (authRate >= 80) insights.push({ type: 'ok', text: `${authRate}% authorization rate — healthy` });
  else if (authRate >= 60) insights.push({ type: 'warn', text: `${authRate}% auth rate — monitor closely` });
  else if (totalLogins > 0) insights.push({ type: 'alert', text: `Low auth rate: only ${authRate}% of logins allowed` });

  if (blocked > 0) insights.push({ type: blockRate > 20 ? 'alert' : 'warn', text: `${blocked} blocked attempts (${blockRate}% of total)` });
  if (highRisk > 0) insights.push({ type: 'alert', text: `${highRisk} high-risk access attempt${highRisk > 1 ? 's' : ''} detected` });
  else insights.push({ type: 'ok', text: 'No high-risk activity in this period' });
  if (intrusions > 0) insights.push({ type: 'alert', text: `⚠ ${intrusions} intrusion event${intrusions > 1 ? 's' : ''} flagged` });

  // Peak from trend
  if (trendData?.length) {
    const peak = trendData.reduce((a, b) => (a.total || a.allowed || 0) > (b.total || b.allowed || 0) ? a : b, trendData[0]);
    if (peak?.label) insights.push({ type: 'info', text: `Peak activity at ${peak.label}` });
  }

  if (totalLogins === 0) {
    return (
      <div className="insights-panel">
        <div className="insights-header"><span className="insights-icon">◆</span> Insights</div>
        <div className="insights-empty">No data for selected range</div>
      </div>
    );
  }

  const iconMap = { ok: '✓', warn: '!', alert: '⚠', info: '→' };
  return (
    <div className="insights-panel">
      <div className="insights-header"><span className="insights-dot" />Insights</div>
      <div className="insights-list">
        {insights.map((ins, i) => (
          <div key={i} className={`insight-row insight-${ins.type}`}>
            <span className="insight-icon">{iconMap[ins.type]}</span>
            <span className="insight-text">{ins.text}</span>
          </div>
        ))}
      </div>
      <div className="insights-divider" />
      <div className="insights-metric-row">
        <div className="insights-metric">
          <span className="im-val" style={{ color: P.green }}>{authRate}%</span>
          <span className="im-label">Auth Rate</span>
        </div>
        <div className="insights-metric">
          <span className="im-val" style={{ color: P.red }}>{blockRate}%</span>
          <span className="im-label">Block Rate</span>
        </div>
        <div className="insights-metric">
          <span className="im-val" style={{ color: P.amber }}>{totalLogins}</span>
          <span className="im-label">Total</span>
        </div>
      </div>
    </div>
  );
}

// ── Horizontal role bar ───────────────────────────────────────────
function HorizontalRoleBar({ roleNames, roleDist }) {
  const max = Math.max(...roleNames.map(r => roleDist[r].total), 1);
  return (
    <div className="role-hbar-list">
      {roleNames.map(r => {
        const stats = roleDist[r];
        const pct = Math.round((stats.total / max) * 100);
        const aPct = stats.total > 0 ? Math.round((stats.allowed / stats.total) * 100) : 0;
        const color = ROLE_COLORS[r] || P.blue;
        return (
          <div key={r} className="role-hbar-row">
            <div className="role-hbar-meta">
              <span className="role-hbar-name">{r}</span>
              <span className="role-hbar-count">{stats.total.toLocaleString()}</span>
            </div>
            <div className="role-hbar-track">
              <div className="role-hbar-allowed" style={{ width: `${(stats.allowed / max) * 100}%`, background: color }} />
              {stats.blocked > 0 && (
                <div className="role-hbar-blocked" style={{ width: `${(stats.blocked / max) * 100}%`, background: P.red }} />
              )}
            </div>
            <span className="role-hbar-pct" style={{ color }}>{aPct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Role breakdown table ──────────────────────────────────────────
function RoleTable({ roleNames, roleDist, total, onClickRole }) {
  return (
    <div className="role-table-wrap">
      <table className="role-table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Total</th>
            <th>Allowed</th>
            <th>Blocked</th>
            <th>Auth Rate</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {roleNames.map(r => {
            const s = roleDist[r];
            const authRate = s.total > 0 ? Math.round((s.allowed / s.total) * 100) : 0;
            const share = total > 0 ? Math.round((s.total / total) * 100) : 0;
            const color = ROLE_COLORS[r] || P.blue;
            return (
              <tr key={r} className="role-table-row" onClick={() => onClickRole(r)} style={{ cursor: 'pointer' }}>
                <td>
                  <span className="role-dot" style={{ background: color }} />
                  {r}
                </td>
                <td className="num">{s.total}</td>
                <td className="num success">{s.allowed}</td>
                <td className="num danger">{s.blocked}</td>
                <td>
                  <div className="mini-bar-track">
                    <div className="mini-bar-fill" style={{ width: `${authRate}%`, background: color }} />
                  </div>
                  <span className="mini-bar-label">{authRate}%</span>
                </td>
                <td className="num muted">{share}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Heatmap (professional) ────────────────────────────────────────
function LoginHeatmap({ trendData }) {
  const [tooltip, setTooltip] = useState(null);
  const wrapRef = useRef(null);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Build 7×24 grid
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  if (trendData?.length) {
    trendData.forEach(d => {
      if (d.timestamp) {
        const dt = new Date(d.timestamp);
        grid[dt.getDay()][dt.getHours()] += d.total || d.allowed || 0;
      } else {
        // Spread values across grid for label-based data
        trendData.forEach((d, idx) => {
          const v = d.total || d.allowed || 0;
          grid[idx % 7][idx % 24] = Math.max(grid[idx % 7][idx % 24], v);
        });
      }
    });
  }

  const maxVal = Math.max(...grid.flat(), 1);

  // Find peak and min
  let peakDay = 0, peakHr = 0, peakVal = 0, minVal = Infinity, minDay = 0, minHr = 0;
  grid.forEach((row, di) => row.forEach((v, hi) => {
    if (v > peakVal) { peakVal = v; peakDay = di; peakHr = hi; }
    if (v < minVal) { minVal = v; minDay = di; minHr = hi; }
  }));

  // 5-step color scale: empty → indigo dim → indigo → teal → green
  const cellColor = (val) => {
    if (val === 0) return '#0f1a2e';
    const r = val / maxVal;
    if (r < 0.15) return 'rgba(99,102,241,0.2)';
    if (r < 0.35) return 'rgba(99,102,241,0.45)';
    if (r < 0.6) return 'rgba(34,197,94,0.55)';
    if (r < 0.85) return 'rgba(34,211,153,0.78)';
    return '#34d399';
  };

  return (
    <div className="hm-root" ref={wrapRef}>
      {/* Summary strip */}
      <div className="hm-summary">
        <span className="hm-summary-item peak">
          <span className="hm-summary-dot" style={{ background: '#34d399' }} />
          Peak: <strong>{DAYS[peakDay]} {peakHr}:00</strong>
          {peakVal > 0 && <span className="hm-summary-count">{peakVal} logins</span>}
        </span>
        <span className="hm-summary-sep" />
        <span className="hm-summary-item low">
          <span className="hm-summary-dot" style={{ background: '#475569' }} />
          Least active: <strong>{DAYS[minDay]} {minHr}:00</strong>
        </span>
      </div>

      {/* Grid */}
      <div className="hm-grid-wrap" style={{ position: 'relative' }}>
        {/* Hour labels */}
        <div className="hm-hour-row">
          <div className="hm-label-cell" />
          {HOURS.map(h => (
            <div key={h} className="hm-hour-label">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {DAYS.map((day, di) => (
          <div key={day} className="hm-day-row">
            <div className="hm-day-label">{day}</div>
            {HOURS.map(hi => {
              const val = grid[di][hi];
              const isPeak = di === peakDay && hi === peakHr && val > 0;
              return (
                <div
                  key={hi}
                  className={`hm-cell ${isPeak ? 'hm-cell-peak' : ''}`}
                  style={{ background: cellColor(val) }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const wrap = wrapRef.current?.getBoundingClientRect();
                    setTooltip({
                      day: DAYS[di], hour: hi, val,
                      x: rect.left - (wrap?.left || 0) + rect.width / 2,
                      y: rect.top - (wrap?.top || 0) - 8,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <div className="hm-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            <div className="hm-tt-head">{tooltip.day} · {tooltip.hour}:00–{tooltip.hour + 1}:00</div>
            <div className="hm-tt-val">
              {tooltip.val > 0 ? <><strong>{tooltip.val}</strong> login{tooltip.val !== 1 ? 's' : ''}</> : 'No activity'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="hm-legend">
        <span className="hm-legend-label">Less</span>
        {['#0f1a2e', 'rgba(99,102,241,0.2)', 'rgba(99,102,241,0.45)', 'rgba(34,197,94,0.55)', 'rgba(34,211,153,0.78)', '#34d399']
          .map((c, i) => <div key={i} className="hm-legend-swatch" style={{ background: c }} />)}
        <span className="hm-legend-label">More</span>
      </div>
    </div>
  );
}

// ── Log drill-down modal ──────────────────────────────────────────
function LogsModal({ title, logs, loading, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content premium-modal" onClick={e => e.stopPropagation()}>
        <div className="premium-modal-header">
          <div>
            <div className="modal-title">{title}</div>
            <div className="modal-subtitle">{logs.length} records</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading"><div className="premium-spinner" /><span>Fetching…</span></div>
          ) : logs.length > 0 ? (
            <table className="logs-table premium-table">
              <thead>
                <tr><th>Time</th><th>User</th><th>Role</th><th>Device</th><th>Access</th><th>Risk</th></tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log._id || i}>
                    <td className="text-muted-sm">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '–'}</td>
                    <td className="text-truncate">{log.username || '–'}</td>
                    <td><span className={`badge badge-${log.role?.toLowerCase()}`}>{log.role}</span></td>
                    <td className="mono-sm">{log.device_id ? log.device_id.slice(0, 14) + '…' : '–'}</td>
                    <td><span className={`badge ${log.access === 'Allowed' ? 'badge-success' : 'badge-danger'}`}>{log.access}</span></td>
                    <td>
                      <span className="risk-badge" style={{
                        color: log.risk_score >= 70 ? P.red : log.risk_score >= 40 ? P.amber : P.green,
                        background: log.risk_score >= 70 ? P.redBg : log.risk_score >= 40 ? P.amberBg : P.greenBg,
                      }}>{log.risk_score ?? 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data"><span className="no-data-icon">⊘</span><p>No records found</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// ANALYTICS  ·  Main component
// ═════════════════════════════════════════════════════════════════
function Analytics() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [modal, setModal] = useState({ show: false, title: '', logs: [], loading: false });

  // ── Data fetch ──────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (f = filters) => {
    setTabLoading(true);
    setError(null);
    try {
      const res = await API.get('/api/admin/analytics/filtered', { params: buildQueryParams(f) });
      setData(res.data);
    } catch (err) {
      setError('Unable to load analytics: ' + (err.response?.data?.error || err.message));
    } finally { setLoading(false); setTabLoading(false); }
  }, []);

  useEffect(() => { fetchAnalytics(DEFAULT_FILTERS); }, []);
  useEffect(() => { if (!loading) fetchAnalytics(filters); }, [filters]);

  const handleFilter = (key, value) => {
    if (key === '__batch__' && typeof value === 'object') setFilters(p => ({ ...p, ...value }));
    else setFilters(p => ({ ...p, [key]: value }));
  };

  const openModal = async (title, extra = {}) => {
    setModal({ show: true, title, logs: [], loading: true });
    try {
      const res = await API.get('/api/admin/access-logs', { params: { limit: 50, ...buildQueryParams(filters), ...extra } });
      setModal(m => ({ ...m, logs: res.data.logs || [], loading: false }));
    } catch { setModal(m => ({ ...m, logs: [], loading: false })); }
  };

  const closeModal = () => setModal(m => ({ ...m, show: false }));

  // ── Skeleton loader ─────────────────────────────────────────────
  if (loading) return (
    <div className="analytics-premium">
      <div style={{ display: 'flex', gap: '0.375rem', paddingBottom: '0.625rem', borderBottom: `1px solid ${P.border}` }}>
        {[72, 64, 60, 72].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 28, borderRadius: 5 }} />)}
      </div>
      <div className="skeleton" style={{ height: 42, borderRadius: 7 }} />
      <div className="kpi-skeleton-grid">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton kpi-skeleton-card" />)}
      </div>
      <div className="chart-skeleton-grid">
        <div className="skeleton" style={{ height: 260, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 10 }} />
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="analytics-error">
      <span style={{ fontSize: '2rem', opacity: .5 }}>⚠</span>
      <p>{error}</p>
      <button className="btn-refresh" onClick={() => fetchAnalytics(filters)}>Retry</button>
    </div>
  );

  // ── Derived values ──────────────────────────────────────────────
  const totalLogins = data?.total_logins ?? 0;
  const authorized = data?.authorized ?? 0;
  const blocked2 = data?.blocked ?? 0;
  const highRisk = data?.high_risk ?? 0;
  const intrusions = data?.intrusions ?? 0;
  const roleDist = data?.role_distribution ?? {};
  const trendData = data?.trend_data ?? [];
  const trendType = data?.trend_type ?? 'daily';
  const roleNames = Object.keys(roleDist);
  const roleTotals = roleNames.map(r => roleDist[r].total);

  // Sparklines from trend
  const aSpark = trendData.map(d => d.allowed || 0);
  const bSpark = trendData.map(d => d.blocked || 0);
  const allSpark = trendData.map(d => (d.allowed || 0) + (d.blocked || 0));

  const hasFilters = !!(filters.search || (filters.role && filters.role !== 'all') || filters.dateValue);
  const trendLabel = trendType === 'hourly' ? 'Today · hourly' : trendType === 'weekly' ? 'Weekly · daily' : 'Monthly · daily';

  // ── Chart data ──────────────────────────────────────────────────
  const heroLineData = {
    labels: trendData.map(d => d.label),
    datasets: [
      {
        label: 'Allowed',
        data: trendData.map(d => d.allowed),
        fill: true,
        backgroundColor: ctx => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return P.greenBg;
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(52,211,153,0.18)');
          g.addColorStop(1, 'rgba(52,211,153,0)');
          return g;
        },
        borderColor: P.green, borderWidth: 2.5, tension: 0.22,
        pointRadius: trendData.length > 20 ? 0 : 3,
        pointHoverRadius: 5, pointBackgroundColor: P.green, pointBorderColor: P.card, pointBorderWidth: 2,
      },
      {
        label: 'Blocked',
        data: trendData.map(d => d.blocked),
        fill: true,
        backgroundColor: ctx => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return P.redBg;
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(248,113,113,0.12)');
          g.addColorStop(1, 'rgba(248,113,113,0)');
          return g;
        },
        borderColor: P.red, borderWidth: 2.5, tension: 0.22,
        pointRadius: trendData.length > 20 ? 0 : 3,
        pointHoverRadius: 5, pointBackgroundColor: P.red, pointBorderColor: P.card, pointBorderWidth: 2,
      },
    ],
  };

  const heroLineOpts = {
    ...makeOpts(),
    interaction: { mode: 'index', intersect: false },
    plugins: {
      ...makeOpts().plugins,
      tooltip: { ...TT, mode: 'index', intersect: false },
      legend: { labels: { color: '#94a3b8', font: { size: 11.5, family: 'Inter, sans-serif' }, padding: 14, usePointStyle: true } },
    },
    scales: {
      x: { grid: { color: 'rgba(71,85,105,0.55)', drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter, sans-serif' }, maxTicksLimit: 12 }, border: { display: false } },
      y: { grid: { color: 'rgba(71,85,105,0.55)', drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 11.5, family: 'Inter, sans-serif' } }, beginAtZero: true, border: { display: false } },
    },
  };

  const accessBarData = {
    labels: ['Allowed', 'Blocked'],
    datasets: [{
      label: 'Logins', data: [authorized, blocked2],
      backgroundColor: ['rgba(52,211,153,0.75)', 'rgba(248,113,113,0.75)'],
      hoverBackgroundColor: [P.green, P.red],
      borderWidth: 0, borderRadius: 5, borderSkipped: false,
    }],
  };

  const accessBarOpts = {
    ...makeOpts(),
    plugins: { ...makeOpts().plugins, tooltip: { ...TT, callbacks: { label: ctx => `  ${ctx.label}: ${ctx.parsed.y} logins` } }, legend: { display: false } },
    onClick: (_, elems) => { if (!elems.length) return; const l = accessBarData.labels[elems[0].index]; openModal(`${l} Logins`, { access: l }); },
  };

  const donutData = {
    labels: roleNames,
    datasets: [{
      data: roleTotals,
      backgroundColor: roleNames.map(r => ROLE_COLORS[r] || P.blue),
      hoverBackgroundColor: roleNames.map(r => (ROLE_COLORS[r] || P.blue) + 'dd'),
      borderWidth: 0, hoverOffset: 4,
    }],
  };

  const donutOpts = {
    responsive: true, maintainAspectRatio: false,
    cutout: '68%',
    animation: { duration: 400, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'right', labels: { color: P.tick, font: { size: 11 }, padding: 14, usePointStyle: true } },
      tooltip: { ...TT, callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return `  ${ctx.label}: ${ctx.parsed} (${t ? Math.round(ctx.parsed / t * 100) : 0}%)`; } } },
    },
    onClick: (_, elems) => { if (!elems.length) return; const role = donutData.labels[elems[0].index]; openModal(`${role} Logins`, { role }); },
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'roles', label: 'By Role' },
    { key: 'trends', label: 'Trends' },
    { key: 'heatmap', label: 'Heatmap' },
  ];

  return (
    <div className="analytics-premium animate-fade-in">

      {/* ── Sticky header ── */}
      <div className="analytics-sticky-header">
        <nav className="analytics-tabs-premium" role="tablist">
          {tabs.map(({ key, label }) => (
            <button key={key} role="tab" aria-selected={activeTab === key}
              className={`tab-btn-premium ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Filter bar ── */}
      <div className="analytics-filter-wrap">
        <FilterBar filters={filters} onFilterChange={handleFilter}
          onClearAll={() => setFilters(DEFAULT_FILTERS)}
          searchPlaceholder="Search not applied to analytics…" />
        {(hasFilters || tabLoading) && (
          <div className="filter-status">
            {hasFilters && <span className="filter-pill">Filtered · {trendLabel}</span>}
            {tabLoading && <span className="filter-refreshing">Refreshing…</span>}
          </div>
        )}
      </div>

      {/* ── KPI Row ── */}
      <div className="kpi-grid">
        <KpiCard icon="◈" value={totalLogins} label="Total Logins" color={P.blue}
          sparkData={allSpark} sparkColor={P.blue} onClick={() => openModal('All Logins')} />
        <KpiCard icon="✓" value={authorized} label="Authorized" color={P.green}
          sparkData={aSpark} sparkColor={P.green} onClick={() => openModal('Allowed Logins', { access: 'Allowed' })} />
        <KpiCard icon="✕" value={blocked2} label="Blocked" color={P.red}
          sparkData={bSpark} sparkColor={P.red} onClick={() => openModal('Blocked Logins', { access: 'Blocked' })} />
        <KpiCard icon="△" value={highRisk} label="High-Risk" color={P.amber}
          sparkData={trendData.map(d => d.high_risk || 0)} sparkColor={P.amber} />
        <KpiCard icon="!" value={intrusions} label="Intrusions" color={P.purple}
          sparkData={trendData.map(d => d.intrusions || 0)} sparkColor={P.purple} />
      </div>

      {/* ══════ TAB: OVERVIEW ══════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="overview-layout">

          {/* Hero: trends + insights */}
          <div className="overview-hero-row">
            <div className="chart-card-premium overview-hero-chart">
              <div className="chart-header-premium">
                <div>
                  <div className="chart-title-premium">Login Trends</div>
                  <div className="chart-subtitle-premium">Allowed vs Blocked · {trendLabel}</div>
                </div>
                <span className="trend-type-pill">{trendLabel}</span>
              </div>
              <div style={{ height: 220 }}>
                {trendData.length === 0 || trendData.every(d => (d.total || 0) === 0)
                  ? <div className="no-data"><span className="no-data-icon">⊘</span><p>No trend data</p></div>
                  : <Line data={heroLineData} options={heroLineOpts} />}
              </div>
            </div>

            <InsightsPanel
              totalLogins={totalLogins} authorized={authorized}
              blocked={blocked2} highRisk={highRisk} intrusions={intrusions}
              trendData={trendData} />
          </div>

          {/* Bottom: access bar + donut */}
          <div className="overview-bottom-row">
            <div className="chart-card-premium">
              <div className="chart-header-premium">
                <div>
                  <div className="chart-title-premium">Access Distribution</div>
                  <div className="chart-subtitle-premium">Click bars to drill into logs</div>
                </div>
                <span className="chart-badge allowed">Allowed vs Blocked</span>
              </div>
              <div style={{ height: 200 }}>
                {totalLogins === 0
                  ? <div className="no-data"><span className="no-data-icon">⊘</span><p>No data</p></div>
                  : <Bar data={accessBarData} options={accessBarOpts} />}
              </div>
            </div>

            <div className="chart-card-premium">
              <div className="chart-header-premium">
                <div>
                  <div className="chart-title-premium">Login by Role</div>
                  <div className="chart-subtitle-premium">Click segments to filter</div>
                </div>
              </div>
              <div style={{ height: 200 }}>
                {roleTotals.every(v => v === 0)
                  ? <div className="no-data"><span className="no-data-icon">⊘</span><p>No role data</p></div>
                  : <Doughnut data={donutData} options={donutOpts} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB: BY ROLE ═══════════════════════════════════════ */}
      {activeTab === 'roles' && (
        <div className="roles-layout">
          {/* Top: donut + horizontal bars */}
          <div className="roles-top-row">
            {/* Donut */}
            <div className="chart-card-premium roles-donut-card">
              <div className="chart-header-premium">
                <div>
                  <div className="chart-title-premium">Role Distribution</div>
                  <div className="chart-subtitle-premium">Click to drill into logs</div>
                </div>
              </div>
              <div style={{ height: 240 }}>
                {roleTotals.every(v => v === 0)
                  ? <div className="no-data"><span className="no-data-icon">⊘</span><p>No data</p></div>
                  : <Doughnut data={donutData} options={donutOpts} />}
              </div>
            </div>

            {/* Horizontal bars */}
            <div className="chart-card-premium roles-hbar-card">
              <div className="chart-header-premium">
                <div>
                  <div className="chart-title-premium">Login Volume by Role</div>
                  <div className="chart-subtitle-premium">Allowed (colored) · Blocked (red) per role</div>
                </div>
              </div>
              {roleNames.length === 0
                ? <div className="no-data"><span className="no-data-icon">⊘</span><p>No data</p></div>
                : <HorizontalRoleBar roleNames={roleNames} roleDist={roleDist} />}
            </div>
          </div>

          {/* Bottom: role breakdown table */}
          <div className="chart-card-premium">
            <div className="chart-header-premium">
              <div>
                <div className="chart-title-premium">Role Breakdown</div>
                <div className="chart-subtitle-premium">Click a row to view logs for that role</div>
              </div>
            </div>
            {roleNames.length === 0
              ? <div className="no-data"><span className="no-data-icon">⊘</span><p>No data</p></div>
              : <RoleTable roleNames={roleNames} roleDist={roleDist} total={totalLogins}
                onClickRole={r => openModal(`${r} Login History`, { role: r })} />}
          </div>
        </div>
      )}

      {/* ══════ TAB: TRENDS ════════════════════════════════════════ */}
      {activeTab === 'trends' && (
        <div className="trends-layout">
          <div className="chart-card-premium">
            <div className="chart-header-premium">
              <div>
                <div className="chart-title-premium">
                  {trendType === 'hourly' ? 'Hourly Activity' : 'Daily Login Trends'}
                </div>
                <div className="chart-subtitle-premium">Allowed vs Blocked · hover for details</div>
              </div>
              <span className="trend-type-pill">{trendLabel}</span>
            </div>
            <div style={{ height: 320 }}>
              {trendData.length === 0 || trendData.every(d => (d.total || 0) === 0)
                ? <div className="no-data"><span className="no-data-icon">⊘</span><p>No trend data for selected range</p></div>
                : <Line data={heroLineData} options={heroLineOpts} />}
            </div>
          </div>

          {/* Role bar below */}
          {roleNames.length > 0 && !roleTotals.every(v => v === 0) && (
            <div className="chart-card-premium">
              <div className="chart-header-premium">
                <div>
                  <div className="chart-title-premium">Role Breakdown</div>
                  <div className="chart-subtitle-premium">Allowed vs Blocked per role</div>
                </div>
              </div>
              <HorizontalRoleBar roleNames={roleNames} roleDist={roleDist} />
            </div>
          )}
        </div>
      )}

      {/* ══════ TAB: HEATMAP ═══════════════════════════════════════ */}
      {activeTab === 'heatmap' && (
        <div className="chart-card-premium">
          <div className="chart-header-premium">
            <div>
              <div className="chart-title-premium">Login Activity Heatmap</div>
              <div className="chart-subtitle-premium">Hour × Day intensity · hover cells for details</div>
            </div>
          </div>
          <LoginHeatmap trendData={trendData} />
        </div>
      )}

      {/* ── Footer ── */}
      <div className="analytics-footer-premium">
        <button className="btn-refresh" onClick={() => fetchAnalytics(filters)}>
          <span>↺</span> Refresh
        </button>
        <span className="footer-info">
          {data?.filter_applied?.date_from
            ? `${new Date(data.filter_applied.date_from).toLocaleDateString()} – ${new Date(data.filter_applied.date_to).toLocaleDateString()}`
            : 'All-time data — use filters to narrow'}
        </span>
        <span className="footer-count">{totalLogins.toLocaleString()} events</span>
      </div>

      {modal.show && <LogsModal title={modal.title} logs={modal.logs} loading={modal.loading} onClose={closeModal} />}
    </div>
  );
}

export default Analytics;
