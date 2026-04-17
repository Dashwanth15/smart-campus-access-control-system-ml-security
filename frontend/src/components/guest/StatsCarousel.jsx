import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import '../../styles/stats-carousel.css';

/* ─── Count-up hook ──────────────────────── */
function useCountUp(end, duration = 2000, start = false) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!start) return;
        const raw = parseFloat(String(end).replace(/[^0-9.]/g, '')) || 0;
        const suffix = String(end).replace(/[0-9.,]/g, '');
        let raf;
        let t0 = null;
        const tick = (ts) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            setVal(Math.round(eased * raw) + suffix);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [start, end, duration]);
    return val || '0';
}

/* ─── Tilt card ─────────────────────────── */
function StatCard({ stat, idx, visible }) {
    const cardRef = useRef(null);
    const rotX = useMotionValue(0);
    const rotY = useMotionValue(0);
    const count = useCountUp(stat.num, 2000, visible);

    const handleMouseMove = (e) => {
        const card = cardRef.current;
        if (!card) return;
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;
        rotX.set(-y * 14);
        rotY.set(x * 14);
    };
    const handleMouseLeave = () => {
        animate(rotX, 0, { duration: 0.5, ease: 'easeOut' });
        animate(rotY, 0, { duration: 0.5, ease: 'easeOut' });
    };

    return (
        <motion.div
            className="sc2-card"
            ref={cardRef}
            style={{
                rotateX: rotX,
                rotateY: rotY,
                transformPerspective: 1000,
            }}
            initial={{ opacity: 0, y: 60, scale: 0.88 }}
            animate={visible ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{
                duration: 0.65,
                delay: idx * 0.1,
                ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* BG image with zoom-on-hover */}
            <div className="sc2-card-img-wrap">
                <img
                    src={stat.img}
                    alt={stat.label}
                    className="sc2-card-img"
                    loading="lazy"
                />
            </div>

            {/* Gradient overlay */}
            <div className="sc2-card-overlay" style={{ background: stat.gradient }} />

            {/* Glow ring on hover */}
            <div className="sc2-glow-ring" style={{ '--glow': stat.color }} />

            {/* Content */}
            <div className="sc2-card-body">
                {/* Top badge */}
                <div className="sc2-badge" style={{ color: stat.color, borderColor: `${stat.color}55`, background: `${stat.color}18` }}>
                    {stat.tag}
                </div>

                {/* Floating icon */}
                <motion.div
                    className="sc2-icon"
                    style={{ background: `linear-gradient(135deg, ${stat.color}dd, ${stat.color}88)` }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.4 }}
                >
                    <span>{stat.icon}</span>
                </motion.div>

                {/* Animated number */}
                <div className="sc2-num" style={{ color: stat.color }}>
                    {visible ? count : '—'}
                </div>

                {/* Label */}
                <div className="sc2-label">{stat.label}</div>

                {/* Sub */}
                <div className="sc2-sub">{stat.sub}</div>

                {/* Bottom accent */}
                <div className="sc2-accent-bar" style={{ background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)` }} />
            </div>
        </motion.div>
    );
}

/* ─── Main Carousel ─────────────────────── */
export default function StatsCarousel({ programCount = 4 }) {
    const trackRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(true);
    const startX = useRef(0);
    const startScroll = useRef(0);

    const STATS = [
        {
            icon: '👨‍🎓',
            num: '5200+',
            label: 'STUDENTS',
            sub: 'Enrolled campus-wide',
            tag: '🏫 Enrollment',
            img: '/images/stat_students.png',
            color: '#60a5fa',
            gradient: 'linear-gradient(160deg, rgba(8,14,44,0.55) 0%, rgba(10,20,60,0.93) 75%)',
        },
        {
            icon: '👨‍🏫',
            num: '320+',
            label: 'FACULTY',
            sub: 'Expert educators',
            tag: '🎓 Academic',
            img: '/images/stat_faculty.png',
            color: '#c084fc',
            gradient: 'linear-gradient(160deg, rgba(20,8,50,0.55) 0%, rgba(30,10,65,0.93) 75%)',
        },
        {
            icon: '📚',
            num: `${programCount}`,
            label: 'PROGRAMS',
            sub: 'Across disciplines',
            tag: '📖 Academic',
            img: '/images/stat_programs.png',
            color: '#f472b6',
            gradient: 'linear-gradient(160deg, rgba(40,5,25,0.55) 0%, rgba(55,8,32,0.93) 75%)',
        },
        {
            icon: '🏆',
            num: '47',
            label: 'AWARDS',
            sub: 'National & International',
            tag: '🥇 Excellence',
            img: '/images/stat_awards.png',
            color: '#fbbf24',
            gradient: 'linear-gradient(160deg, rgba(40,22,0,0.55) 0%, rgba(55,30,0,0.93) 75%)',
        },
        {
            icon: '💼',
            num: '95%',
            label: 'PLACEMENT',
            sub: 'Career placement rate',
            tag: '🚀 Career',
            img: '/images/stat_placement.png',
            color: '#34d399',
            gradient: 'linear-gradient(160deg, rgba(0,28,18,0.55) 0%, rgba(0,40,25,0.93) 75%)',
        },
    ];

    /* IntersectionObserver to trigger count-up */
    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true); },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    /* Track scroll state for arrow visibility */
    const updateArrows = () => {
        const el = trackRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 10);
        setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };
    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateArrows, { passive: true });
        updateArrows();
        return () => el.removeEventListener('scroll', updateArrows);
    }, []);

    /* Arrow scroll */
    const scrollTo = (dir) => {
        const el = trackRef.current;
        if (!el) return;
        el.scrollBy({ left: dir === 'r' ? 360 : -360, behavior: 'smooth' });
    };

    /* Mouse drag */
    const onDown = (e) => {
        setIsDragging(true);
        startX.current = e.pageX;
        startScroll.current = trackRef.current.scrollLeft;
    };
    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.pageX - startX.current;
        trackRef.current.scrollLeft = startScroll.current - dx;
    };
    const onUp = () => setIsDragging(false);

    return (
        <section className="sc2-section">
            {/* ── Header ── */}
            <motion.div
                className="sc2-header"
                initial={{ opacity: 0, y: 24 }}
                animate={visible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55 }}
            >
                <div className="sc2-eyebrow">📊 BY THE NUMBERS</div>
                <h2 className="sc2-title">Campus at a Glance</h2>
                <p className="sc2-desc">Scroll to explore what makes us exceptional</p>
            </motion.div>

            {/* ── Track wrapper ── */}
            <div className="sc2-outer">
                {/* Left arrow */}
                <motion.button
                    className={`sc2-arrow sc2-arrow-l${canLeft ? '' : ' sc2-arrow-off'}`}
                    onClick={() => scrollTo('l')}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Scroll left"
                >
                    ‹
                </motion.button>

                {/* Scrollable track */}
                <div
                    ref={trackRef}
                    className={`sc2-track${isDragging ? ' sc2-dragging' : ''}`}
                    onMouseDown={onDown}
                    onMouseMove={onMove}
                    onMouseUp={onUp}
                    onMouseLeave={onUp}
                >
                    {/* Leading spacer */}
                    <div className="sc2-spacer" />

                    {STATS.map((s, i) => (
                        <StatCard key={i} stat={s} idx={i} visible={visible} />
                    ))}

                    {/* Trailing spacer */}
                    <div className="sc2-spacer" />
                </div>

                {/* Right arrow */}
                <motion.button
                    className={`sc2-arrow sc2-arrow-r${canRight ? '' : ' sc2-arrow-off'}`}
                    onClick={() => scrollTo('r')}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Scroll right"
                >
                    ›
                </motion.button>
            </div>

            {/* ── Drag hint ── */}
            <motion.div
                className="sc2-hint"
                initial={{ opacity: 0 }}
                animate={visible ? { opacity: 1 } : {}}
                transition={{ delay: 0.9, duration: 0.5 }}
            >
                <span className="sc2-hint-dots" />
                <span>← Drag to explore →</span>
                <span className="sc2-hint-dots" />
            </motion.div>

            {/* ── Scroll indicator dots ── */}
            <div className="sc2-dots">
                {STATS.map((_, i) => (
                    <motion.div
                        key={i}
                        className="sc2-dot"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={visible ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.7 + i * 0.08 }}
                    />
                ))}
            </div>
        </section>
    );
}
