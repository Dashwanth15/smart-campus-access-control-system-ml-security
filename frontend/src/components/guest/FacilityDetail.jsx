import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import '../../styles/facility-detail.css';

/* ── Scroll-reveal wrapper ───────────────────────────────── */
function Reveal({ children, delay = 0, direction = 'up' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.18 });
    const variants = {
        hidden: {
            opacity: 0,
            y: direction === 'up' ? 36 : 0,
            x: direction === 'left' ? -40 : direction === 'right' ? 40 : 0,
            filter: 'blur(6px)',
        },
        visible: {
            opacity: 1, y: 0, x: 0, filter: 'blur(0px)',
            transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
        },
    };
    return (
        <motion.div ref={ref} variants={variants} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
            {children}
        </motion.div>
    );
}

/* ── Feature card ────────────────────────────────────────── */
function FeatureCard({ feat, idx }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });
    return (
        <motion.div
            ref={ref}
            className="fd-feat-card"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, transition: { duration: 0.18 } }}
        >
            <div className="fd-feat-icon">{feat.icon}</div>
            <div className="fd-feat-title">{feat.title}</div>
            <div className="fd-feat-desc">{feat.desc}</div>
        </motion.div>
    );
}

/* ── Gallery image ───────────────────────────────────────── */
function GalleryImg({ src, alt, idx }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.3 });
    return (
        <motion.div
            ref={ref}
            className="fd-gallery-img-wrap"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.55, delay: idx * 0.1 }}
            whileHover={{ scale: 1.03, transition: { duration: 0.22 } }}
        >
            <img src={src} alt={alt} className="fd-gallery-img" loading="lazy" />
            <div className="fd-gallery-overlay" />
        </motion.div>
    );
}

/* ── Extra info renderers ────────────────────────────────── */
function ExtraInfo({ extra, color }) {
    if (!extra) return null;
    const { type } = extra;

    if (type === 'library') return (
        <div className="fd-extra-grid">
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Sections</div>
                <ul className="fd-extra-list">{extra.sections.map((s, i) => <li key={i}>📂 {s}</li>)}</ul>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Operating Hours</div>
                <p className="fd-extra-value">🕐 {extra.hours}</p>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Popular Titles</div>
                <ul className="fd-extra-list">{extra.popular.map((b, i) => <li key={i}>📘 {b}</li>)}</ul>
            </div>
        </div>
    );

    if (type === 'labs') return (
        <div className="fd-extra-grid">
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Available Labs</div>
                <ul className="fd-extra-list">{extra.labs.map((l, i) => <li key={i}>🖥️ {l}</li>)}</ul>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Software Available</div>
                <ul className="fd-extra-list">{extra.software.map((s, i) => <li key={i}>💾 {s}</li>)}</ul>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Hours</div>
                <p className="fd-extra-value">🕐 {extra.hours}</p>
            </div>
        </div>
    );

    if (type === 'cafeteria') return (
        <div className="fd-extra-grid">
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Meal Timings</div>
                <ul className="fd-extra-list">{extra.menu.map((m, i) => <li key={i}>🕐 {m}</li>)}</ul>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Cuisines</div>
                <ul className="fd-extra-list">{extra.cuisines.map((c, i) => <li key={i}>🍴 {c}</li>)}</ul>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Seating</div>
                <p className="fd-extra-value">🪑 {extra.seating}</p>
            </div>
        </div>
    );

    if (type === 'placement') return (
        <div className="fd-extra-grid">
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Package Stats</div>
                <p className="fd-extra-value">📊 Average: {extra.avgPackage}</p>
                <p className="fd-extra-value">🏆 Highest: {extra.highestPackage}</p>
            </div>
            <div className="fd-extra-card fd-extra-card--wide" style={{ '--ec': color }}>
                <div className="fd-extra-label">Top Recruiters</div>
                <div className="fd-recruiter-chips">
                    {extra.companies.map((c, i) => (
                        <span key={i} className="fd-chip" style={{ borderColor: `${color}66`, color }}>{c}</span>
                    ))}
                </div>
            </div>
        </div>
    );

    if (type === 'laundry') return (
        <div className="fd-extra-grid">
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Pricing</div>
                <ul className="fd-extra-list">{extra.pricing.map((p, i) => <li key={i}>💰 {p}</li>)}</ul>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Hours</div>
                <p className="fd-extra-value">🕐 {extra.hours}</p>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Turnaround</div>
                <p className="fd-extra-value">⏱️ {extra.turnaround}</p>
            </div>
        </div>
    );

    if (type === 'academic') return (
        <div className="fd-extra-grid">
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Smart Tools</div>
                <ul className="fd-extra-list">{extra.tools.map((t, i) => <li key={i}>🔧 {t}</li>)}</ul>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Rooms</div>
                <p className="fd-extra-value">🏫 {extra.rooms} classrooms & labs</p>
            </div>
            <div className="fd-extra-card" style={{ '--ec': color }}>
                <div className="fd-extra-label">Hours</div>
                <p className="fd-extra-value">🕐 {extra.hours}</p>
            </div>
        </div>
    );

    // Generic fallback
    return (
        <div className="fd-extra-grid">
            {Object.entries(extra).filter(([k]) => k !== 'type').map(([key, val], i) => (
                <div key={i} className="fd-extra-card" style={{ '--ec': color }}>
                    <div className="fd-extra-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                    <p className="fd-extra-value">
                        {Array.isArray(val) ? val.join(' · ') : String(val)}
                    </p>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function FacilityDetail({ facility, onBack }) {
    // Scroll to top when detail opens
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [facility.slug]);

    const { name, icon, tagline, heroImg, color, overview, features, gallery, extra } = facility;

    return (
        <div className="fd-root">
            {/* ── Back button (sticky) ── */}
            <motion.button
                className="fd-back-btn"
                onClick={onBack}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
            >
                ← Back to Facilities
            </motion.button>

            {/* ══════════════════════════════════
                HERO
            ══════════════════════════════════ */}
            <div className="fd-hero">
                <img src={heroImg} alt={name} className="fd-hero-img" />
                <div className="fd-hero-overlay" style={{ background: `linear-gradient(160deg, rgba(5,8,30,0.45) 0%, rgba(8,12,40,0.88) 70%, ${color}22 100%)` }} />

                <motion.div
                    className="fd-hero-content"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                    <motion.div
                        className="fd-hero-icon"
                        style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        {icon}
                    </motion.div>
                    <h1 className="fd-hero-title">{name}</h1>
                    <p className="fd-hero-tag">{tagline}</p>
                    <div className="fd-hero-bar" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                </motion.div>
            </div>

            {/* ══════════════════════════════════
                BODY
            ══════════════════════════════════ */}
            <div className="fd-body">

                {/* ── Overview ── */}
                <section className="fd-section">
                    <Reveal>
                        <div className="fd-section-label" style={{ color }}>Overview</div>
                        <h2 className="fd-section-title">About {name}</h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="fd-overview-text">{overview}</p>
                    </Reveal>
                </section>

                {/* ── Key Features ── */}
                <section className="fd-section">
                    <Reveal>
                        <div className="fd-section-label" style={{ color }}>Features</div>
                        <h2 className="fd-section-title">Key Highlights</h2>
                    </Reveal>
                    <div className="fd-feat-grid">
                        {features.map((feat, i) => (
                            <FeatureCard key={i} feat={feat} idx={i} />
                        ))}
                    </div>
                </section>

                {/* ── Gallery ── */}
                <section className="fd-section">
                    <Reveal>
                        <div className="fd-section-label" style={{ color }}>Gallery</div>
                        <h2 className="fd-section-title">Visual Tour</h2>
                    </Reveal>
                    <div className="fd-gallery">
                        {gallery.map((src, i) => (
                            <GalleryImg key={i} src={src} alt={`${name} ${i + 1}`} idx={i} />
                        ))}
                    </div>
                </section>

                {/* ── Additional Info ── */}
                {extra && (
                    <section className="fd-section">
                        <Reveal>
                            <div className="fd-section-label" style={{ color }}>Details</div>
                            <h2 className="fd-section-title">Additional Information</h2>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <ExtraInfo extra={extra} color={color} />
                        </Reveal>
                    </section>
                )}

                {/* ── CTA ── */}
                <Reveal>
                    <div className="fd-cta">
                        <p className="fd-cta-text">Interested in this facility?</p>
                        <button
                            className="fd-cta-btn"
                            style={{ background: `linear-gradient(135deg, ${color}cc, ${color}88)`, boxShadow: `0 8px 24px ${color}44` }}
                            onClick={onBack}
                        >
                            ← Explore More Facilities
                        </button>
                    </div>
                </Reveal>
            </div>
        </div>
    );
}
