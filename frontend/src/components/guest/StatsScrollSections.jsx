import { useRef, useEffect, useState } from 'react';
import {
    motion,
    useScroll,
    useTransform,
    useInView,
    animate,
} from 'framer-motion';
import '../../styles/stats-scroll.css';

/* ─── Count-up hook ─────────────────────────────────────── */
function useCountUp(end, duration = 2200, trigger = false) {
    const [display, setDisplay] = useState('0');

    useEffect(() => {
        if (!trigger) return;
        const raw = parseFloat(String(end).replace(/[^0-9.]/g, '')) || 0;
        const suffix = String(end).replace(/[0-9.,]/g, '');
        let raf, t0 = null;
        const tick = (ts) => {
            if (!t0) t0 = ts;
            const progress = Math.min((ts - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
            const val = Math.round(eased * raw);
            setDisplay(val.toLocaleString() + suffix);
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [trigger, end, duration]);

    return display;
}

/* ─── Data ──────────────────────────────────────────────── */
const STATS = [
    {
        icon: '👨‍🎓',
        num: '5200+',
        label: 'Students',
        sub: 'Bright minds enrolled campus-wide, shaping tomorrow\'s innovations.',
        tag: '🏫 Enrollment',
        img: '/images/stat_students.png',
        color: '#60a5fa',
        progressPct: 92,
        gradient: 'linear-gradient(170deg, rgba(5,10,40,0.5) 0%, rgba(8,20,70,0.92) 100%)',
        blob1: '#3b82f6',
        blob2: '#6366f1',
    },
    {
        icon: '👨‍🏫',
        num: '320+',
        label: 'Faculty',
        sub: 'World-class educators and researchers dedicated to academic excellence.',
        tag: '🎓 Academic',
        img: '/images/stat_faculty.png',
        color: '#c084fc',
        progressPct: 78,
        gradient: 'linear-gradient(170deg, rgba(20,5,50,0.5) 0%, rgba(35,10,80,0.92) 100%)',
        blob1: '#8b5cf6',
        blob2: '#a78bfa',
    },
    {
        icon: '📚',
        num: '4',
        label: 'Programs',
        sub: 'Specialized academic programs crafted for tomorrow\'s industry demands.',
        tag: '📖 Academic',
        img: '/images/stat_programs.png',
        color: '#f472b6',
        progressPct: 60,
        gradient: 'linear-gradient(170deg, rgba(40,5,25,0.5) 0%, rgba(60,8,38,0.92) 100%)',
        blob1: '#ec4899',
        blob2: '#f472b6',
    },
    {
        icon: '🏆',
        num: '47',
        label: 'Awards',
        sub: 'National and international accolades celebrating our pursuit of excellence.',
        tag: '🥇 Excellence',
        img: '/images/stat_awards.png',
        color: '#fbbf24',
        progressPct: 85,
        gradient: 'linear-gradient(170deg, rgba(40,20,0,0.5) 0%, rgba(65,32,0,0.92) 100%)',
        blob1: '#f59e0b',
        blob2: '#fbbf24',
    },
    {
        icon: '💼',
        num: '95%',
        label: 'Placement',
        sub: 'Of graduates secured top-tier industry roles within 6 months of graduation.',
        tag: '🚀 Career',
        img: '/images/stat_placement.png',
        color: '#34d399',
        progressPct: 95,
        gradient: 'linear-gradient(170deg, rgba(0,30,20,0.5) 0%, rgba(0,48,32,0.92) 100%)',
        blob1: '#10b981',
        blob2: '#34d399',
    },
];

/* ─── Single full-screen section ───────────────────────── */
function StatSection({ stat, index, activeIndex, containerRef }) {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, {
        root: containerRef,
        amount: 0.55,         // must be >55% visible to count
        margin: '0px',
    });
    const count = useCountUp(stat.num, 2200, isInView);

    /* Parallax: image moves at 60% of scroll speed */
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        container: containerRef,
        offset: ['start end', 'end start'],
    });
    const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

    /* Stagger variants */
    const containerVariants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        },
    };

    const isActive = index === activeIndex;

    return (
        <div className="sss-section" ref={sectionRef} id={`stat-${index}`}>
            {/* ── Parallax background image ── */}
            <div className="sss-bg-wrap">
                <motion.img
                    src={stat.img}
                    alt={stat.label}
                    className="sss-bg-img"
                    style={{ y: imgY }}
                    loading="lazy"
                />
            </div>

            {/* ── Gradient overlay ── */}
            <div className="sss-overlay" style={{ background: stat.gradient }} />

            {/* ── Animated blobs ── */}
            <motion.div
                className="sss-blob sss-blob-1"
                style={{ background: stat.blob1 }}
                animate={isInView ? { scale: [1, 1.1, 1], opacity: [0.15, 0.22, 0.15] } : { opacity: 0 }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="sss-blob sss-blob-2"
                style={{ background: stat.blob2 }}
                animate={isInView ? { scale: [1, 0.92, 1], opacity: [0.12, 0.2, 0.12] } : { opacity: 0 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            />

            {/* ── Content ── */}
            <motion.div
                className="sss-content"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
            >
                {/* Glassmorphism card */}
                <motion.div
                    className="sss-glass"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Top badge */}
                <motion.div
                    className="sss-tag"
                    variants={itemVariants}
                    style={{
                        color: stat.color,
                        borderColor: `${stat.color}55`,
                        background: `${stat.color}20`,
                    }}
                >
                    {stat.tag}
                </motion.div>

                {/* Floating icon */}
                <motion.div
                    className="sss-icon-wrap"
                    variants={itemVariants}
                    style={{
                        background: `linear-gradient(135deg, ${stat.color}cc, ${stat.color}66)`,
                        boxShadow: `0 12px 32px ${stat.color}44`,
                    }}
                    animate={isInView ? { y: [0, -8, 0] } : {}}
                    transition={{
                        y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
                    }}
                >
                    <span style={{ fontSize: '2.2rem' }}>{stat.icon}</span>
                </motion.div>

                {/* Animated number */}
                <motion.div
                    className="sss-number"
                    variants={itemVariants}
                    style={{ color: stat.color }}
                >
                    {isInView ? count : '0'}
                </motion.div>

                {/* Label */}
                <motion.div className="sss-label" variants={itemVariants}>
                    {stat.label}
                </motion.div>

                {/* Sub text */}
                <motion.p className="sss-sub" variants={itemVariants}>
                    {stat.sub}
                </motion.p>

                {/* Progress bar */}
                <motion.div className="sss-progress-bar" variants={itemVariants}>
                    <motion.div
                        className="sss-progress-fill"
                        style={{ background: `linear-gradient(90deg, ${stat.color}88, ${stat.color})` }}
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${stat.progressPct}%` } : { width: 0 }}
                        transition={{ duration: 2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    />
                </motion.div>
            </motion.div>

            {/* Section index indicator */}
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 28,
                    zIndex: 10,
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    color: 'rgba(241,245,249,0.45)',
                    textTransform: 'uppercase',
                }}
                variants={itemVariants}
            >
                {String(index + 1).padStart(2, '0')} / {String(STATS.length).padStart(2, '0')}
            </motion.div>
        </div>
    );
}

/* ─── Main export ───────────────────────────────────────── */
export default function StatsScrollSections({ programCount = 4 }) {
    const containerRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // update programCount in STATS dynamically
    const stats = STATS.map((s, i) =>
        i === 2 ? { ...s, num: String(programCount) } : s
    );

    /* Track active section via scroll position */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = () => {
            const sectionH = el.clientHeight;
            const idx = Math.round(el.scrollTop / sectionH);
            setActiveIndex(Math.min(idx, stats.length - 1));
        };
        el.addEventListener('scroll', handler, { passive: true });
        return () => el.removeEventListener('scroll', handler);
    }, [stats.length]);

    /* Click dot → scroll to section */
    const scrollTo = (idx) => {
        const el = containerRef.current;
        if (!el) return;
        el.scrollTo({ top: idx * el.clientHeight, behavior: 'smooth' });
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* ── Section header ── */}
            <motion.div
                className="sss-header"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="sss-eyebrow">📊 By The Numbers</div>
                <h2 className="sss-main-title">Campus at a Glance</h2>
                <p className="sss-main-sub">Scroll to explore each milestone</p>
            </motion.div>

            {/* ── Scroll hint ── */}
            <div className="sss-scroll-hint">
                <span>Scroll to explore</span>
                <div className="sss-scroll-hint-line" />
            </div>

            {/* ── Snap scroll container ── */}
            <div className="sss-scroll-container" ref={containerRef}>
                {stats.map((stat, i) => (
                    <StatSection
                        key={i}
                        stat={stat}
                        index={i}
                        activeIndex={activeIndex}
                        containerRef={containerRef}
                    />
                ))}
            </div>

            {/* ── Navigation dots ── */}
            <div className="sss-nav">
                {stats.map((_, i) => (
                    <motion.div
                        key={i}
                        className={`sss-nav-dot${activeIndex === i ? ' active' : ''}`}
                        onClick={() => scrollTo(i)}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        style={activeIndex === i ? { background: stats[i].color, borderColor: stats[i].color } : {}}
                    />
                ))}
            </div>
        </div>
    );
}
