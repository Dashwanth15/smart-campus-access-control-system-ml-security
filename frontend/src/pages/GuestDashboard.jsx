import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import '../styles/guest-dashboard.css';
import StatsOrganicTimeline from '../components/guest/StatsOrganicTimeline';
import FacilityDetail from '../components/guest/FacilityDetail';
import { FACILITY_LIST } from '../data/facilitiesData';
import FeeDetail from '../components/guest/FeeDetail';
import { PROGRAM_LIST } from '../data/feesData';
import EventDetail from '../components/guest/EventDetail';
import { CAMPUS_EVENTS } from '../data/campusLifeData';
import AboutSection from '../components/guest/AboutSection';
import HeroSection from '../components/guest/HeroSection';

const QUICK_REPLIES = [
    { label: '🎓 Programs offered?', text: 'What programs does the campus offer?' },
    { label: '💰 Annual fees?', text: 'What are the annual fees?' },
    { label: '🏆 Scholarships?', text: 'Tell me about scholarships?' },
    { label: '🏢 Facilities?', text: 'What facilities are on campus?' },
    { label: '📅 How to apply?', text: 'How can I apply for admission?' },
];

// ─── AI Chat Component ────────────────────────────────────────────────────────
function CampusAIChat({ campusInfo, fees, facilities }) {
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState([{ role: 'assistant', text: "👋 Hi! I'm your Smart Campus AI. Ask me anything about admissions, fees, programs or campus life!" }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

    const systemPrompt = () =>
        `You are a helpful, friendly campus assistant for ${campusInfo?.name || 'Smart Campus University'}.

Campus facts:
- Location: ${campusInfo?.location || 'Technology Park, Innovation City'}
- Established: ${campusInfo?.established || 2010}
- Accreditation: ${campusInfo?.accreditation || 'NAAC A+'}
- About: ${campusInfo?.about || ''}
- Vision: ${campusInfo?.vision || ''}
- Mission: ${campusInfo?.mission || ''}

Programs & Annual Fees:
${fees?.programs?.map(p => `- ${p.name} (${p.duration}): Tuition ₹${p.annual_fee?.toLocaleString()}, Hostel ₹${p.hostel_fee?.toLocaleString()}`).join('\n') || 'N/A'}

Scholarships: ${fees?.scholarships?.join(' | ') || 'N/A'}
Payment modes: ${fees?.payment_modes?.join(', ') || 'N/A'}
Facilities: ${facilities?.facilities?.map(f => f.name).join(', ') || 'N/A'}
Contact: admissions@smartcampus.edu | +91 1234 567 890

Reply in a concise, friendly tone. Use bullet points for lists. Keep answers under 150 words.`;

    // Core fetch helper — AbortController timeout via CancelToken + throws on non-ok
    const fetchReply = async (payload, timeoutMs = 15000) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await API.post('/api/campus/chat', payload, {
                signal: ctrl.signal,
            });
            return res.data;
        } catch (err) {
            // Rethrow AbortError as-is so the retry logic in send() can detect it
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                const abortErr = new Error('Request timed out');
                abortErr.name = 'AbortError';
                throw abortErr;
            }
            // Surface server-side error messages, or rethrow
            const status = err.response?.status;
            const msg = err.response?.data?.error;
            throw new Error(msg || (status ? `Server error ${status}` : err.message));
        } finally {
            clearTimeout(timer);
        }
    };

    const send = async (msgText) => {
        const text = (msgText || input).trim();
        if (!text || loading) return;
        setError('');
        setInput('');
        const newMsgs = [...msgs, { role: 'user', text }];
        setMsgs(newMsgs);
        setLoading(true);

        const payload = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt() },
                ...newMsgs.map(m => ({ role: m.role, content: m.text }))
            ],
            max_tokens: 400,
            temperature: 0.7,
        };

        try {
            // First attempt
            let data;
            try {
                data = await fetchReply(payload);
            } catch (firstErr) {
                // Auto-retry once on timeout or network failure
                if (firstErr.name === 'AbortError' || firstErr.message.startsWith('Server error 5')) {
                    data = await fetchReply(payload);   // second attempt
                } else {
                    throw firstErr;
                }
            }
            setMsgs(prev => [...prev, { role: 'assistant', text: data.reply || 'Sorry, I got an empty response.' }]);
        } catch (e) {
            const friendly = e.name === 'AbortError'
                ? 'Request timed out. Please try again.'
                : 'Unable to fetch response. Please try again.';
            setError(friendly);
        } finally {
            setLoading(false);
        }
    };

    const showChips = msgs.length === 1 && !loading;

    return (
        <>
            {!open && (
                <button className="gd-fab" onClick={() => setOpen(true)}>
                    <span>🤖</span>
                    <span>Ask AI</span>
                    <span className="gd-fab-dot" />
                </button>
            )}

            <div className={`gd-chat-panel ${open ? 'gd-chat-panel--open' : ''}`}>
                {/* Header */}
                <div className="gd-chat-hdr">
                    <div className="gd-chat-hdr-left">
                        <div className="gd-chat-avatar">🤖</div>
                        <div>
                            <div className="gd-chat-name">Campus AI Assistant</div>
                            <div className="gd-chat-status"><span className="gd-dot" /> Online</div>
                        </div>
                    </div>
                    <button className="gd-chat-close" onClick={() => setOpen(false)}>✕</button>
                </div>

                {/* Messages */}
                <div className="gd-chat-msgs">
                    {msgs.map((m, i) => (
                        <div key={i} className={`gd-msg ${m.role === 'user' ? 'gd-msg--user' : 'gd-msg--bot'}`}>
                            {m.role === 'assistant' && <span className="gd-msg-av">🤖</span>}
                            <div className="gd-bubble">
                                {m.text.split('\n').map((line, j, arr) => (
                                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="gd-msg gd-msg--bot">
                            <span className="gd-msg-av">🤖</span>
                            <div className="gd-bubble gd-typing"><span /><span /><span /></div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Quick chips */}
                {showChips && (
                    <div className="gd-chips">
                        {QUICK_REPLIES.map((q, i) => (
                            <button key={i} className="gd-chip" onClick={() => send(q.text)}>{q.label}</button>
                        ))}
                    </div>
                )}

                {/* Inline error banner (replaces ugly error chat bubbles) */}
                {error && (
                    <div style={{
                        margin: '0 0.75rem 0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        color: '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                    }}>
                        <span>⚠️</span> {error}
                        <button
                            onClick={() => setError('')}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}
                        >✕</button>
                    </div>
                )}

                {/* Input area */}
                <div className="gd-chat-footer">
                    <input
                        className="gd-chat-input"
                        placeholder="Type your question..."
                        value={input}
                        disabled={loading}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                    />
                    <button className="gd-chat-send" disabled={loading || !input.trim()} onClick={() => send()}>
                        {loading ? '…' : '➤'}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function GuestDashboard({ onLogout }) {
    const { user } = useAuth();

    // ── header state (mirrors StudentDashboard exactly) ──────────────
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [currentTime,  setCurrentTime]  = useState(new Date());
    const menuRef = useRef(null);

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fmtDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    // ─────────────────────────────────────────────────────────────────

    const [campusInfo, setCampusInfo] = useState(null);
    const [fees, setFees] = useState(null);
    const [facilities, setFacilities] = useState(null);
    const [tab, setTab] = useState('about');
    const [selProg, setSelProg] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeFacility, setActiveFacility] = useState(null);
    const [activeProgram, setActiveProgram] = useState(null);
    const [activeEvent, setActiveEvent] = useState(null);
    const clTrackRef = useRef(null); // Netflix scroll track ref

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [a, b, c] = await Promise.all([
                API.get('/api/campus/info'),
                API.get('/api/campus/fees'),
                API.get('/api/campus/facilities'),
            ]);
            setCampusInfo(a.data);
            setFees(b.data);
            setFacilities(c.data);
        } catch (e) {
            console.error('Failed to load campus data:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="gd-loader">
            <div className="gd-spinner" />
            <p>Loading campus info…</p>
        </div>
    );

    /* ── Facility detail — replace entire dashboard content ── */
    if (activeFacility) {
        return (
            <FacilityDetail
                facility={activeFacility}
                onBack={() => {
                    // 1. grab saved position BEFORE clearing state
                    const saved = sessionStorage.getItem('fac_scroll_pos');
                    sessionStorage.removeItem('fac_scroll_pos');

                    setActiveFacility(null);
                    setTab('facilities');

                    // 2. restore after React re-renders the dashboard
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (saved) {
                                window.scrollTo({ top: parseInt(saved, 10), behavior: 'smooth' });
                            } else {
                                document.getElementById('facilities-section')
                                    ?.scrollIntoView({ behavior: 'smooth' });
                            }
                        });
                    });
                }}
            />
        );
    }
    /* ── Program detail — replace entire dashboard content ── */
    if (activeProgram) {
        return (
            <FeeDetail
                program={activeProgram}
                onBack={() => {
                    const saved = sessionStorage.getItem('prog_scroll_pos');
                    sessionStorage.removeItem('prog_scroll_pos');
                    setActiveProgram(null);
                    setTab('fees');
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (saved) {
                                window.scrollTo({ top: parseInt(saved, 10), behavior: 'smooth' });
                            } else {
                                document.getElementById('fees-section')
                                    ?.scrollIntoView({ behavior: 'smooth' });
                            }
                        });
                    });
                }}
            />
        );
    }
    /* ── Event detail — replace entire dashboard content ── */
    if (activeEvent) {
        return (
            <EventDetail
                event={activeEvent}
                onBack={() => {
                    const saved = sessionStorage.getItem('event_scroll_pos');
                    sessionStorage.removeItem('event_scroll_pos');
                    setActiveEvent(null);
                    setTab('life');
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (saved) {
                                window.scrollTo({ top: parseInt(saved, 10), behavior: 'smooth' });
                            } else {
                                document.getElementById('life-section')
                                    ?.scrollIntoView({ behavior: 'smooth' });
                            }
                        });
                    });
                }}
            />
        );
    }

    return (
        <div className="gd-wrap gd-wrap--no-pad">

            {/* ══ TOPBAR — identical structure to StudentDashboard ══ */}
            <div className="sd-topbar" style={{ position: 'sticky', top: 0, zIndex: 200 }}>

                {/* Brand */}
                <div className="sd-topbar-brand">
                    <div className="sd-topbar-brand-icon">🏛️</div>
                    <div className="sd-topbar-brand-text">
                        <span className="sd-topbar-brand-name">Smart Campus</span>
                        <span className="sd-topbar-brand-sub">Guest Portal</span>
                    </div>
                </div>

                {/* Breadcrumb */}
                <div className="sd-topbar-breadcrumb">
                    <span className="sd-topbar-icon">🎓</span>
                    <span className="sd-topbar-label">Campus Information</span>
                </div>

                {/* Right section — live clock + user dropdown */}
                <div className="sd-topbar-right">

                    {/* Live clock */}
                    <div className="sd-time-display">
                        <span className="sd-time">{fmtTime(currentTime)}</span>
                        <span className="sd-date">{fmtDate(currentTime)}</span>
                    </div>

                    {/* User profile + dropdown — ref for outside-click close */}
                    <div className="sd-user-profile-wrapper" ref={menuRef}>
                        <div
                            className="sd-user-profile"
                            onClick={() => setShowUserMenu(m => !m)}
                            title="Account options"
                        >
                            <div className="sd-top-avatar">👤</div>
                            <div className="sd-user-info">
                                <span className="sd-user-name">{user?.name || 'Guest'}</span>
                                <span className="sd-user-role">GUEST</span>
                            </div>
                            <span className="sd-dropdown-arrow">▼</span>
                        </div>

                        {showUserMenu && (
                            <div className="sd-user-menu animate-fade-in">
                                <div className="sd-menu-header">
                                    <span className="sd-menu-email">{user?.email || user?.name}</span>
                                </div>
                                <div className="sd-menu-divider" />
                                <button
                                    className="sd-menu-item"
                                    onClick={() => { setShowUserMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                >
                                    <span>🏠</span> My Dashboard
                                </button>
                                <div className="sd-menu-divider" />
                                <button
                                    className="sd-menu-item sd-menu-item--logout"
                                    onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                                >
                                    <span>🚪</span> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ HERO ══ */}
            <HeroSection campusInfo={campusInfo} onTabChange={setTab} />

            {/* ══ STATS – ORGANIC BRANCHING TIMELINE ══ */}
            <StatsOrganicTimeline programCount={fees?.programs?.length || 4} />

            {/* ══ TABS ══ */}
            <nav className="gd-tabs">
                {[
                    { key: 'about', label: '🏛️ About' },
                    { key: 'fees', label: '💰 Fees' },
                    { key: 'facilities', label: '🏢 Facilities' },
                    { key: 'life', label: '🎉 Campus Life' },
                ].map(t => (
                    <button
                        key={t.key}
                        className={`gd-tab ${tab === t.key ? 'gd-tab--on' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            {/* ══ CONTENT ══ */}
            <div className="gd-content gd-fade" key={tab}>

                {/* ══ ABOUT ══ */}
                {tab === 'about' && (
                    <AboutSection campusInfo={campusInfo} onTabChange={setTab} />
                )}




                {/* ══ FEES ══ */}
                {tab === 'fees' && (
                    <div id="fees-section">
                        <p className="gd-hint">Click a program to explore fee details</p>
                        <div className="gd-fac-img-grid">
                            {PROGRAM_LIST.map((prog) => (
                                <div
                                    key={prog.slug}
                                    className="gd-fac-img-card gd-fac-img-card--click"
                                    onClick={() => {
                                        sessionStorage.setItem('prog_scroll_pos', String(window.scrollY));
                                        setActiveProgram(prog);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            sessionStorage.setItem('prog_scroll_pos', String(window.scrollY));
                                            setActiveProgram(prog);
                                        }
                                    }}
                                >
                                    <div className="gd-fac-img-wrap">
                                        <img src={prog.heroImg} alt={prog.name} className="gd-fac-img" />
                                        <div className="gd-fac-img-overlay" />
                                        <div className="gd-fac-badge">
                                            <span className="gd-fac-badge-icon">{prog.icon}</span>
                                        </div>
                                        <div className="gd-prog-fee-badge">
                                            ₹{(prog.annual_fee / 1000).toFixed(0)}K / yr
                                        </div>
                                        <div className="gd-fac-arrow">›</div>
                                    </div>
                                    <div className="gd-fac-img-body">
                                        <h4 className="gd-fac-img-name">{prog.name}</h4>
                                        <p className="gd-fac-img-desc">{prog.duration} · {prog.shortName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}





                {/* ══ FACILITIES ══ */}
                {tab === 'facilities' && (
                    <div id="facilities-section">
                        <p className="gd-hint">Click a card to explore details</p>
                        <div className="gd-fac-img-grid">
                            {FACILITY_LIST.map((fac) => (
                                <div
                                    key={fac.slug}
                                    className="gd-fac-img-card gd-fac-img-card--click"
                                    onClick={() => {
                                        sessionStorage.setItem('fac_scroll_pos', String(window.scrollY));
                                        setActiveFacility(fac);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            sessionStorage.setItem('fac_scroll_pos', String(window.scrollY));
                                            setActiveFacility(fac);
                                        }
                                    }}
                                >
                                    <div className="gd-fac-img-wrap">
                                        <img src={fac.gridImg} alt={fac.name} className="gd-fac-img" />
                                        <div className="gd-fac-img-overlay" />
                                        <div className="gd-fac-badge">
                                            <span className="gd-fac-badge-icon">{fac.icon}</span>
                                        </div>
                                        <div className="gd-fac-arrow">›</div>
                                    </div>
                                    <div className="gd-fac-img-body">
                                        <h4 className="gd-fac-img-name">{fac.name}</h4>
                                        <p className="gd-fac-img-desc">{fac.tagline}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}





                {/* ══ CAMPUS LIFE — Netflix Carousel ══ */}
                {tab === 'life' && (
                    <div id="life-section" className="cl-section">
                        <div className="cl-header">
                            <div>
                                <div className="cl-title">🎉 Life Beyond the Classroom</div>
                                <div className="cl-subtitle">Scroll to explore — click any card to dive in</div>
                            </div>
                            <div className="cl-scroll-btns">
                                <button
                                    className="cl-scroll-btn"
                                    onClick={() => clTrackRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
                                    aria-label="Scroll left"
                                >‹</button>
                                <button
                                    className="cl-scroll-btn"
                                    onClick={() => clTrackRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
                                    aria-label="Scroll right"
                                >›</button>
                            </div>
                        </div>

                        <div
                            className="cl-track"
                            ref={clTrackRef}
                            onMouseDown={e => {
                                const t = clTrackRef.current;
                                if (!t) return;
                                t._dragging = true;
                                t._startX = e.pageX - t.offsetLeft;
                                t._scrollL = t.scrollLeft;
                            }}
                            onMouseMove={e => {
                                const t = clTrackRef.current;
                                if (!t?._dragging) return;
                                e.preventDefault();
                                t.scrollLeft = t._scrollL - (e.pageX - t.offsetLeft - t._startX);
                            }}
                            onMouseUp={() => { if (clTrackRef.current) clTrackRef.current._dragging = false; }}
                            onMouseLeave={() => { if (clTrackRef.current) clTrackRef.current._dragging = false; }}
                        >
                            {CAMPUS_EVENTS.map(ev => (
                                <div
                                    key={ev.slug}
                                    className="cl-card"
                                    style={{ '--cl-glow': `${ev.categoryColor}88` }}
                                    onClick={() => {
                                        sessionStorage.setItem('event_scroll_pos', String(window.scrollY));
                                        setActiveEvent(ev);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            sessionStorage.setItem('event_scroll_pos', String(window.scrollY));
                                            setActiveEvent(ev);
                                        }
                                    }}
                                >
                                    <img src={ev.cardImg} alt={ev.title} className="cl-card-img" draggable={false} />
                                    <div className="cl-card-overlay" />
                                    <div
                                        className="cl-cat-badge"
                                        style={{ background: `${ev.categoryColor}22`, borderColor: `${ev.categoryColor}66`, color: ev.categoryColor }}
                                    >
                                        {ev.category}
                                    </div>
                                    <div className="cl-icon-badge">{ev.icon}</div>
                                    <div className="cl-card-body">
                                        <div className="cl-card-title">{ev.title}</div>
                                        <div className="cl-card-date">📅 {ev.date}</div>
                                        <p className="cl-card-desc">{ev.tagline}</p>
                                        <div className="cl-card-cta" style={{ color: ev.categoryColor }}>
                                            Explore event →
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="cl-drag-hint">← Drag or use arrows to scroll →</p>
                    </div>
                )}

            </div>

            {/* ══ CONTACT BAR ══ */}
            <div className="gd-contact">
                <div className="gd-ct"><span>📧</span><div><small>Email</small><strong>admissions@smartcampus.edu</strong></div></div>
                <div className="gd-ct-sep" />
                <div className="gd-ct"><span>📱</span><div><small>Phone</small><strong>+91 1234 567 890</strong></div></div>
                <div className="gd-ct-sep" />
                <div className="gd-ct"><span>🌐</span><div><small>Website</small><strong>www.smartcampus.edu</strong></div></div>
                <button className="gd-apply-btn">📋 Apply Now</button>
            </div>

            <CampusAIChat campusInfo={campusInfo} fees={fees} facilities={facilities} />
        </div>
    );
}

export default GuestDashboard;
