import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import '../../styles/event-detail.css';

/* ── Scroll-reveal ───────────────────────────────────────── */
function Reveal({ children, delay = 0 }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.15 });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 28, filter: 'blur(5px)' }}
            animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
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
            className="evd-gallery-wrap"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            whileHover={{ scale: 1.04, transition: { duration: 0.2 } }}
        >
            <img src={src} alt={alt} className="evd-gallery-img" loading="lazy" />
            <div className="evd-gallery-overlay" />
        </motion.div>
    );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════ */
export default function EventDetail({ event, onBack }) {
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [event.slug]);

    const {
        title, category, categoryColor, icon, date, tagline,
        heroImg, description, activities, highlights, stats,
        testimonials, gallery,
    } = event;

    return (
        <div className="evd-root">

            {/* Back button */}
            <motion.button
                className="evd-back-btn"
                onClick={onBack}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
            >
                ← Back to Events
            </motion.button>

            {/* ══ HERO ══ */}
            <div className="evd-hero">
                <img src={heroImg} alt={title} className="evd-hero-img" />
                <div className="evd-hero-overlay" style={{ background: `linear-gradient(160deg, rgba(5,8,30,0.3) 0%, rgba(8,12,40,0.9) 70%, ${categoryColor}22 100%)` }} />
                <motion.div
                    className="evd-hero-content"
                    initial={{ opacity: 0, y: 44 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="evd-category-pill" style={{ background: `${categoryColor}33`, borderColor: `${categoryColor}66`, color: categoryColor }}>
                        {icon} {category}
                    </div>
                    <h1 className="evd-hero-title">{title}</h1>
                    <p className="evd-hero-tag">{tagline}</p>
                    <div className="evd-hero-date">📅 {date}</div>
                    <div className="evd-hero-bar" style={{ background: `linear-gradient(90deg, ${categoryColor}, transparent)` }} />
                </motion.div>

                {/* Stats strip on hero */}
                <div className="evd-hero-stats">
                    {stats.map((s, i) => (
                        <motion.div
                            key={i}
                            className="evd-stat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                        >
                            <div className="evd-stat-val" style={{ color: categoryColor }}>{s.value}</div>
                            <div className="evd-stat-label">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ══ BODY ══ */}
            <div className="evd-body">

                {/* ── Overview ── */}
                <section className="evd-section">
                    <Reveal>
                        <div className="evd-section-label" style={{ color: categoryColor }}>Overview</div>
                        <h2 className="evd-section-title">About the Event</h2>
                    </Reveal>
                    <Reveal delay={0.08}>
                        <p className="evd-overview">{description}</p>
                    </Reveal>
                </section>

                {/* ── Activities ── */}
                <section className="evd-section">
                    <Reveal>
                        <div className="evd-section-label" style={{ color: categoryColor }}>Schedule</div>
                        <h2 className="evd-section-title">Activities & Events</h2>
                    </Reveal>
                    <div className="evd-act-grid">
                        {activities.map((act, i) => (
                            <motion.div
                                key={i}
                                className="evd-act-card"
                                style={{ '--ec': categoryColor }}
                                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: i * 0.07 }}
                                whileHover={{ y: -5, transition: { duration: 0.15 } }}
                            >
                                <div className="evd-act-icon">{act.icon}</div>
                                <div className="evd-act-name">{act.name}</div>
                                <div className="evd-act-desc">{act.desc}</div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Highlights ── */}
                <section className="evd-section">
                    <Reveal>
                        <div className="evd-section-label" style={{ color: categoryColor }}>Highlights</div>
                        <h2 className="evd-section-title">Key Achievements</h2>
                    </Reveal>
                    <Reveal delay={0.08}>
                        <ul className="evd-highlight-list">
                            {highlights.map((h, i) => (
                                <motion.li
                                    key={i}
                                    className="evd-highlight-item"
                                    style={{ '--ec': categoryColor }}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: i * 0.07 }}
                                >
                                    <span className="evd-check" style={{ background: `${categoryColor}33`, color: categoryColor }}>✓</span>
                                    {h}
                                </motion.li>
                            ))}
                        </ul>
                    </Reveal>
                </section>

                {/* ── Gallery ── */}
                <section className="evd-section">
                    <Reveal>
                        <div className="evd-section-label" style={{ color: categoryColor }}>Gallery</div>
                        <h2 className="evd-section-title">Visual Moments</h2>
                    </Reveal>
                    <div className="evd-gallery">
                        {gallery.map((src, i) => (
                            <GalleryImg key={i} src={src} alt={`${title} ${i + 1}`} idx={i} />
                        ))}
                    </div>
                </section>

                {/* ── Testimonials ── */}
                <section className="evd-section">
                    <Reveal>
                        <div className="evd-section-label" style={{ color: categoryColor }}>Voices</div>
                        <h2 className="evd-section-title">Student Testimonials</h2>
                    </Reveal>
                    <div className="evd-testi-grid">
                        {testimonials.map((t, i) => (
                            <motion.div
                                key={i}
                                className="evd-testi-card"
                                style={{ '--ec': categoryColor }}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                whileHover={{ y: -4, transition: { duration: 0.15 } }}
                            >
                                <div className="evd-testi-quote">"</div>
                                <p className="evd-testi-text">{t.text}</p>
                                <div className="evd-testi-author">
                                    <div className="evd-testi-avatar" style={{ background: `linear-gradient(135deg, ${categoryColor}88, ${categoryColor}44)` }}>
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="evd-testi-name">{t.name}</div>
                                        <div className="evd-testi-branch">{t.branch}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── CTA ── */}
                <Reveal>
                    <div className="evd-cta">
                        <p className="evd-cta-label">Want to be part of the action?</p>
                        <div className="evd-cta-btns">
                            <button
                                className="evd-cta-btn"
                                style={{ background: `linear-gradient(135deg, ${categoryColor}cc, ${categoryColor}88)`, boxShadow: `0 8px 24px ${categoryColor}44` }}
                            >
                                🎉 Register Now
                            </button>
                            <button className="evd-cta-btn evd-cta-btn--ghost" onClick={onBack}>
                                ← Explore More Events
                            </button>
                        </div>
                    </div>
                </Reveal>
            </div>
        </div>
    );
}
