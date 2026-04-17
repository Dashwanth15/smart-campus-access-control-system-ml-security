import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import '../../styles/stats-organic-timeline.css';

/* ─── Count-up ──────────────────────────── */
function CountUp({ end, trigger }) {
    const [val, setVal] = useState('0');
    useEffect(() => {
        if (!trigger) return;
        const raw = parseFloat(String(end).replace(/[^0-9.]/g, '')) || 0;
        const sfx = String(end).replace(/[0-9.,]/g, '');
        let raf, t0 = null;
        const run = (ts) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / 1800, 1);
            const e = 1 - Math.pow(1 - p, 4);
            setVal(Math.round(e * raw).toLocaleString() + sfx);
            if (p < 1) raf = requestAnimationFrame(run);
        };
        raf = requestAnimationFrame(run);
        return () => cancelAnimationFrame(raf);
    }, [trigger, end]);
    return <>{val}</>;
}

/* ─── Stats data ────────────────────────── */
/* stagger: intentionally uneven but controlled (no randomness) */
const STATS = [
    { num: '5200+', label: 'Students',  sub: 'Enrolled campus-wide',       icon: '👨‍🎓', color: '#60a5fa', img: '/images/stat_students.png',  side: 'left',  mt: 0   },
    { num: '320+',  label: 'Faculty',   sub: 'Expert educators',            icon: '👨‍🏫', color: '#c084fc', img: '/images/stat_faculty.png',   side: 'right', mt: 80  },
    { num: '4',     label: 'Programs',  sub: 'Across disciplines',          icon: '📚',  color: '#f472b6', img: '/images/stat_programs.png', side: 'left',  mt: 100 },
    { num: '47',    label: 'Awards',    sub: 'National & International',    icon: '🏆',  color: '#fbbf24', img: '/images/stat_awards.png',   side: 'right', mt: 90  },
    { num: '95%',   label: 'Placement', sub: 'Career placement rate',       icon: '💼',  color: '#34d399', img: '/images/stat_placement.png', side: 'left', mt: 110 },
];

/* ─── One card node ─────────────────────── */
function Node({ stat, idx, programCount }) {
    const ref   = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });
    const isLeft = stat.side === 'left';
    const num    = idx === 2 ? String(programCount) : stat.num;

    return (
        <div
            ref={ref}
            style={{
                display:        'flex',
                alignItems:     'center',
                width:          '100%',
                marginTop:      idx === 0 ? 0 : stat.mt,
                position:       'relative',
            }}
        >
            {/* ── LEFT HALF ── */}
            <div style={{
                width:          '50%',
                display:        'flex',
                justifyContent: 'flex-end',   /* card hugs right = close to stem */
                alignItems:     'center',
                paddingRight:   isLeft ? 0 : 0,
            }}>
                {isLeft && (
                    <>
                        {/* Card */}
                        <motion.div
                            className="sot-card"
                            style={{ '--acc': stat.color }}
                            initial={{ opacity: 0, x: -40 }}
                            animate={inView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                            whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.18 } }}
                        >
                            <CardInner stat={{ ...stat, num }} inView={inView} idx={idx} />
                        </motion.div>

                        {/* Short connector → stem */}
                        <motion.div
                            className="sot-connector"
                            style={{ background: `linear-gradient(90deg, ${stat.color}66, ${stat.color})` }}
                            initial={{ scaleX: 0 }}
                            animate={inView ? { scaleX: 1 } : {}}
                            transition={{ duration: 0.35, delay: 0.2, transformOrigin: 'left' }}
                        />
                    </>
                )}
            </div>

            {/* ── STEM DOT (center) ── */}
            {inView && (
                <motion.div
                    className="sot-dot"
                    style={{ background: stat.color, boxShadow: `0 0 10px ${stat.color}` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                />
            )}
            {!inView && <div className="sot-dot sot-dot--hidden" />}

            {/* ── RIGHT HALF ── */}
            <div style={{
                width:          '50%',
                display:        'flex',
                justifyContent: 'flex-start',  /* card hugs left = close to stem */
                alignItems:     'center',
            }}>
                {!isLeft && (
                    <>
                        {/* Short connector stem → */}
                        <motion.div
                            className="sot-connector"
                            style={{ background: `linear-gradient(90deg, ${stat.color}, ${stat.color}66)` }}
                            initial={{ scaleX: 0 }}
                            animate={inView ? { scaleX: 1 } : {}}
                            transition={{ duration: 0.35, delay: 0.2, transformOrigin: 'left' }}
                        />

                        {/* Card */}
                        <motion.div
                            className="sot-card"
                            style={{ '--acc': stat.color }}
                            initial={{ opacity: 0, x: 40 }}
                            animate={inView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                            whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.18 } }}
                        >
                            <CardInner stat={{ ...stat, num }} inView={inView} idx={idx} />
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Card inner content ────────────────── */
function CardInner({ stat, inView, idx }) {
    return (
        <>
            {/* Image */}
            <div className="sot-img-wrap">
                <img src={stat.img} alt={stat.label} className="sot-img" loading="lazy" />
                <div className="sot-img-grad" style={{ background: `linear-gradient(180deg, transparent 30%, rgba(8,12,36,0.92) 100%)` }} />
                {/* Floating icon */}
                <motion.div
                    className="sot-icon"
                    style={{ background: `linear-gradient(135deg, ${stat.color}ee, ${stat.color}77)` }}
                    animate={inView ? { y: [0, -5, 0] } : {}}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.4 }}
                >
                    {stat.icon}
                </motion.div>
            </div>

            {/* Body */}
            <div className="sot-body">
                <div className="sot-num" style={{ color: stat.color }}>
                    <CountUp end={stat.num} trigger={inView} />
                </div>
                <div className="sot-label">{stat.label}</div>
                <div className="sot-sub">{stat.sub}</div>
                <div className="sot-bar" style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
            </div>
        </>
    );
}

/* ─── Main export ───────────────────────── */
export default function StatsOrganicTimeline({ programCount = 4 }) {
    return (
        <section className="sot-section">
            {/* Header */}
            <motion.div
                className="sot-header"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <span className="sot-eyebrow">📊 By The Numbers</span>
                <h2 className="sot-title">Campus at a Glance</h2>
                <p className="sot-desc">Our story told through milestones</p>
            </motion.div>

            {/* Tree */}
            <div className="sot-tree">
                {/* Vertical stem — grows from top */}
                <motion.div
                    className="sot-stem"
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: 'easeInOut' }}
                />

                {/* Nodes */}
                {STATS.map((s, i) => (
                    <Node key={i} stat={s} idx={i} programCount={programCount} />
                ))}
            </div>
        </section>
    );
}
