import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { SHARED_FEES } from '../../data/feesData';
import '../../styles/fee-detail.css';

/* ── Scroll-reveal ───────────────────────────────────────── */
function Reveal({ children, delay = 0, dir = 'up' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.15 });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: dir === 'up' ? 32 : 0, x: dir === 'left' ? -36 : dir === 'right' ? 36 : 0, filter: 'blur(5px)' }}
            animate={inView ? { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}

/* ── Fee bar — visual proportional bar ──────────────────── */
function FeeBar({ label, amount, total, color, icon }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const pct = Math.round((amount / total) * 100);
    return (
        <div ref={ref} className="fdb-bar-row">
            <div className="fdb-bar-meta">
                <span className="fdb-bar-icon">{icon}</span>
                <span className="fdb-bar-label">{label}</span>
                <span className="fdb-bar-amt">₹{amount.toLocaleString()}</span>
            </div>
            <div className="fdb-bar-track">
                <motion.div
                    className="fdb-bar-fill"
                    style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${pct}%` } : {}}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                />
            </div>
        </div>
    );
}

/* ── Count-up ────────────────────────────────────────────── */
function CountUp({ end, trigger, prefix = '₹' }) {
    const [val, setVal] = [null, null];
    // Simple version using CSS animation approach via state
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const displayRef = useRef(null);

    useEffect(() => {
        if (!inView) return;
        let raf, t0 = null;
        const run = (ts) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / 1500, 1);
            const e = 1 - Math.pow(1 - p, 3);
            if (displayRef.current) {
                displayRef.current.textContent = prefix + Math.round(e * end).toLocaleString();
            }
            if (p < 1) raf = requestAnimationFrame(run);
        };
        raf = requestAnimationFrame(run);
        return () => cancelAnimationFrame(raf);
    }, [inView, end, prefix]);

    return <span ref={ref}><span ref={displayRef}>{prefix}0</span></span>;
}

/* ── Gallery image ───────────────────────────────────────── */
function GalleryImg({ src, alt, idx }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.3 });
    return (
        <motion.div
            ref={ref}
            className="fdb-gallery-wrap"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
        >
            <img src={src} alt={alt} className="fdb-gallery-img" loading="lazy" />
            <div className="fdb-gallery-overlay" />
        </motion.div>
    );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════ */
export default function FeeDetail({ program, onBack }) {
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [program.slug]);

    const { name, icon, tagline, heroImg, color, duration,
            annual_fee, hostel_fee, other_charges,
            yearWise, highlights, careers, placement, gallery } = program;

    const totalPerYear = annual_fee + hostel_fee + other_charges;
    const grandTotal   = yearWise.reduce((s, y) => s + y.tuition + y.hostel + y.other, 0);

    return (
        <div className="fdb-root">
            {/* Back btn */}
            <motion.button
                className="fdb-back-btn"
                onClick={onBack}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
            >
                ← Back to Programs
            </motion.button>

            {/* ══ HERO ══ */}
            <div className="fdb-hero">
                <img src={heroImg} alt={name} className="fdb-hero-img" />
                <div className="fdb-hero-overlay" style={{ background: `linear-gradient(160deg, rgba(5,8,30,0.45) 0%, rgba(8,12,40,0.88) 70%, ${color}22 100%)` }} />
                <motion.div
                    className="fdb-hero-content"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                    <motion.div
                        className="fdb-hero-icon"
                        style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}
                        animate={{ y: [0, -7, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >{icon}</motion.div>
                    <h1 className="fdb-hero-title">{name}</h1>
                    <p className="fdb-hero-tag">{tagline}</p>
                    <div className="fdb-hero-pills">
                        <span className="fdb-pill">⏱️ {duration}</span>
                        <span className="fdb-pill">💰 From ₹{(annual_fee / 1000).toFixed(0)}K / yr</span>
                        <span className="fdb-pill">🏆 {placement.rate} placement</span>
                    </div>
                    <div className="fdb-hero-bar" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                </motion.div>
            </div>

            {/* ══ BODY ══ */}
            <div className="fdb-body">

                {/* ── Fee Breakdown ── */}
                <section className="fdb-section">
                    <Reveal>
                        <div className="fdb-section-label" style={{ color }}>Breakdown</div>
                        <h2 className="fdb-section-title">Annual Fees — Year 1</h2>
                    </Reveal>

                    {/* Summary cards */}
                    <Reveal delay={0.08}>
                        <div className="fdb-summary-grid">
                            {[
                                { icon: '🎓', label: 'Tuition',        amt: annual_fee,    color: color },
                                { icon: '🏠', label: 'Hostel',         amt: hostel_fee,    color: '#34d399' },
                                { icon: '📦', label: 'Other Charges',  amt: other_charges, color: '#f59e0b' },
                                { icon: '💳', label: 'Total / Year',   amt: totalPerYear,  color: '#ec4899', big: true },
                            ].map((f, i) => (
                                <motion.div
                                    key={i}
                                    className={`fdb-summary-card ${f.big ? 'fdb-summary-card--big' : ''}`}
                                    style={{ '--sc': f.color }}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.45, delay: i * 0.07 }}
                                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                                >
                                    <div className="fdb-summary-icon">{f.icon}</div>
                                    <div className="fdb-summary-label">{f.label}</div>
                                    <div className="fdb-summary-amt" style={{ color: f.color }}>
                                        ₹{f.amt.toLocaleString()}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </Reveal>

                    {/* Proportional bars */}
                    <Reveal delay={0.12}>
                        <div className="fdb-bars">
                            <FeeBar label="Tuition Fee"    amount={annual_fee}    total={totalPerYear} color={color}     icon="🎓" />
                            <FeeBar label="Hostel Fee"     amount={hostel_fee}    total={totalPerYear} color="#34d399"   icon="🏠" />
                            <FeeBar label="Other Charges"  amount={other_charges} total={totalPerYear} color="#f59e0b"   icon="📦" />
                        </div>
                    </Reveal>
                </section>

                {/* ── Year-wise Table ── */}
                <section className="fdb-section">
                    <Reveal>
                        <div className="fdb-section-label" style={{ color }}>Year-wise</div>
                        <h2 className="fdb-section-title">Fee Schedule by Year</h2>
                    </Reveal>
                    <Reveal delay={0.08}>
                        <div className="fdb-year-table">
                            <div className="fdb-year-head">
                                <span>Year</span><span>Tuition</span><span>Hostel</span><span>Other</span><span>Total</span>
                            </div>
                            {yearWise.map((y, i) => {
                                const rowTotal = y.tuition + y.hostel + y.other;
                                return (
                                    <motion.div
                                        key={i}
                                        className="fdb-year-row"
                                        style={{ '--yc': color }}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: i * 0.08 }}
                                    >
                                        <span className="fdb-year-label">{y.year}</span>
                                        <span>₹{y.tuition.toLocaleString()}</span>
                                        <span>₹{y.hostel.toLocaleString()}</span>
                                        <span>₹{y.other.toLocaleString()}</span>
                                        <span className="fdb-year-total" style={{ color }}>₹{rowTotal.toLocaleString()}</span>
                                    </motion.div>
                                );
                            })}
                            <div className="fdb-year-grand">
                                <span>Total ({duration})</span>
                                <span></span><span></span><span></span>
                                <span style={{ color }}>₹{grandTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </Reveal>
                </section>

                {/* ── Scholarships ── */}
                <section className="fdb-section">
                    <Reveal>
                        <div className="fdb-section-label" style={{ color }}>Financial Aid</div>
                        <h2 className="fdb-section-title">Scholarships Available</h2>
                    </Reveal>
                    <div className="fdb-schol-grid">
                        {SHARED_FEES.scholarships.map((s, i) => (
                            <motion.div
                                key={i}
                                className="fdb-schol-card"
                                style={{ '--sc': color }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: i * 0.08 }}
                                whileHover={{ y: -5, transition: { duration: 0.15 } }}
                            >
                                <div className="fdb-schol-icon">{s.icon}</div>
                                <div className="fdb-schol-title">{s.title}</div>
                                <div className="fdb-schol-desc">{s.desc}</div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Payment Modes ── */}
                <section className="fdb-section">
                    <Reveal>
                        <div className="fdb-section-label" style={{ color }}>Payment</div>
                        <h2 className="fdb-section-title">Payment Options</h2>
                    </Reveal>
                    <div className="fdb-pay-grid">
                        {SHARED_FEES.paymentModes.map((p, i) => (
                            <motion.div
                                key={i}
                                className="fdb-pay-card"
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.07 }}
                            >
                                <div className="fdb-pay-icon">{p.icon}</div>
                                <div className="fdb-pay-title">{p.title}</div>
                                <div className="fdb-pay-desc">{p.desc}</div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Course Highlights ── */}
                <section className="fdb-section">
                    <Reveal>
                        <div className="fdb-section-label" style={{ color }}>Curriculum</div>
                        <h2 className="fdb-section-title">Course Highlights</h2>
                    </Reveal>
                    <div className="fdb-highlight-grid">
                        {highlights.map((h, i) => (
                            <motion.div
                                key={i}
                                className="fdb-highlight-card"
                                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: i * 0.07 }}
                                whileHover={{ y: -5, transition: { duration: 0.15 } }}
                            >
                                <div className="fdb-highlight-icon">{h.icon}</div>
                                <div className="fdb-highlight-title">{h.title}</div>
                                <div className="fdb-highlight-desc">{h.desc}</div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Placement & Careers ── */}
                <section className="fdb-section">
                    <Reveal>
                        <div className="fdb-section-label" style={{ color }}>Careers</div>
                        <h2 className="fdb-section-title">Placement & Career Paths</h2>
                    </Reveal>
                    <Reveal delay={0.07}>
                        <div className="fdb-placement-row">
                            {[
                                { label: 'Avg Package', value: placement.avg, icon: '📊' },
                                { label: 'Highest CTC', value: placement.highest, icon: '🏆' },
                                { label: 'Placement Rate', value: placement.rate, icon: '✅' },
                            ].map((stat, i) => (
                                <div key={i} className="fdb-stat-badge" style={{ '--sc': color }}>
                                    <div className="fdb-stat-icon">{stat.icon}</div>
                                    <div className="fdb-stat-val" style={{ color }}>{stat.value}</div>
                                    <div className="fdb-stat-label">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <div className="fdb-section-sub">Top Recruiters</div>
                        <div className="fdb-chip-row">
                            {placement.topCompanies.map((c, i) => (
                                <span key={i} className="fdb-chip" style={{ borderColor: `${color}66`, color }}>{c}</span>
                            ))}
                        </div>
                        <div className="fdb-section-sub" style={{ marginTop: '20px' }}>Career Paths</div>
                        <div className="fdb-chip-row">
                            {careers.map((c, i) => (
                                <span key={i} className="fdb-chip fdb-chip--career">{c}</span>
                            ))}
                        </div>
                    </Reveal>
                </section>

                {/* ── Gallery ── */}
                <section className="fdb-section">
                    <Reveal>
                        <div className="fdb-section-label" style={{ color }}>Gallery</div>
                        <h2 className="fdb-section-title">Visual Tour</h2>
                    </Reveal>
                    <div className="fdb-gallery">
                        {gallery.map((src, i) => (
                            <GalleryImg key={i} src={src} alt={`${name} ${i + 1}`} idx={i} />
                        ))}
                    </div>
                </section>

                {/* ── CTA ── */}
                <Reveal>
                    <div className="fdb-cta">
                        <p className="fdb-cta-text">Ready to enrol in {name}?</p>
                        <div className="fdb-cta-btns">
                            <button
                                className="fdb-cta-btn"
                                style={{ background: `linear-gradient(135deg, ${color}cc, ${color}88)`, boxShadow: `0 8px 24px ${color}44` }}
                            >📋 Apply Now</button>
                            <button className="fdb-cta-btn fdb-cta-btn--ghost" onClick={onBack}>
                                ← View Other Programs
                            </button>
                        </div>
                    </div>
                </Reveal>
            </div>
        </div>
    );
}
