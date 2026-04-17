import { useRef, useState, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import '../../styles/about-section.css';

/* ─── Count-up hook ─────────────────────────────────────────── */
function useCountUp(end, trigger, duration = 2000) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!trigger) return;
        const n = parseInt(String(end).replace(/\D/g, '')) || 0;
        let raf, t0 = null;
        const run = ts => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - p, 3)) * n));
            if (p < 1) raf = requestAnimationFrame(run);
        };
        raf = requestAnimationFrame(run);
        return () => cancelAnimationFrame(raf);
    }, [trigger, end, duration]);
    return count;
}

/* ─── Scroll-reveal wrapper ─────────────────────────────────── */
function Reveal({ children, delay = 0, y = 36, className = '' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.12 });
    return (
        <motion.div ref={ref} className={className}
            initial={{ opacity: 0, y, filter: 'blur(4px)' }}
            animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );
}

/* ─── Blob decoration ───────────────────────────────────────── */
function Blob({ className }) {
    return <div className={`ab-blob ${className}`} aria-hidden />;
}

/* ─── Impact stat with count-up ─────────────────────────────── */
function ImpactStat({ num, suffix, label, color, delay }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const count = useCountUp(num, inView);
    return (
        <motion.div ref={ref} className="ab-impact-card"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -5, transition: { duration: 0.18 } }}>
            <div className="ab-impact-num" style={{ color }}>
                {count.toLocaleString()}<span className="ab-impact-suf">{suffix}</span>
            </div>
            <div className="ab-impact-label">{label}</div>
            <div className="ab-impact-bar" style={{ background: `linear-gradient(90deg,${color},transparent)` }} />
        </motion.div>
    );
}

/* ─── How It Works step ─────────────────────────────────────── */
function Step({ n, icon, title, desc, delay }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.25 });
    return (
        <motion.div ref={ref} className="ab-step"
            initial={{ opacity: 0, x: -28 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ x: 5, transition: { duration: 0.16 } }}>
            <div className="ab-step-bubble">
                <span className="ab-step-n">{n}</span>
                <div className="ab-step-connector" />
            </div>
            <div className="ab-step-body">
                <div className="ab-step-icon">{icon}</div>
                <div className="ab-step-title">{title}</div>
                <p className="ab-step-desc">{desc}</p>
            </div>
        </motion.div>
    );
}

/* ─── Leadership data ───────────────────────────────────────── */
const LEADERS = [
    { img: 'https://randomuser.me/api/portraits/men/52.jpg',   name: 'Prof. Rajesh Sharma',  role: 'Vice Chancellor',        quote: 'Our mission is to produce leaders, not just graduates.',         hue: '#6366f1' },
    { img: 'https://randomuser.me/api/portraits/women/44.jpg', name: 'Dr. Meera Krishnan',   role: 'Pro-Vice Chancellor',    quote: 'Inclusion and excellence are never opposing goals.',              hue: '#ec4899' },
    { img: 'https://randomuser.me/api/portraits/men/36.jpg',   name: 'Prof. Arjun Mehta',    role: 'Dean of Engineering',    quote: 'Every great engineer starts with relentless curiosity.',          hue: '#10b981' },
    { img: 'https://randomuser.me/api/portraits/women/68.jpg', name: 'Dr. Priya Nambiar',    role: 'Director of Research',   quote: 'Research is how we learn to ask better questions.',               hue: '#f59e0b' },
    { img: 'https://randomuser.me/api/portraits/men/71.jpg',   name: 'Mr. Kiran Desai',      role: 'Director, Placements',   quote: 'We do not find jobs — we launch careers that matter.',            hue: '#60a5fa' },
    { img: 'https://randomuser.me/api/portraits/women/29.jpg', name: 'Dr. Ananya Pillai',    role: 'Dean, Student Affairs',  quote: 'Campus life shapes character, not just career-ready skill.',      hue: '#a78bfa' },
];

const CARD_W   = 248;   /* px — fixed card width */
const CARD_GAP = 20;    /* px — gap between cards */
const VISIBLE  = 3;     /* cards shown in viewport at once */
const TOTAL    = LEADERS.length; /* = 6 */
const MAX_IDX  = TOTAL - VISIBLE; /* = 3 */
const AUTO_INTERVAL = 3500; /* ms between auto-slides */

/* ─── Single founder card ───────────────────────────────────── */
function FounderCard({ person, isCenter }) {
    return (
        <motion.div
            className={`fc-card${isCenter ? ' fc-card--center' : ''}`}
            whileHover={{
                y: -10,
                scale: 1.04,
                boxShadow: `0 32px 72px rgba(0,0,0,0.62), 0 0 0 1.5px ${person.hue}70`,
                transition: { duration: 0.22 },
            }}
            style={{ '--hue': person.hue }}
        >
            {/* Real AI-style profile photo */}
            <div className="fc-img-shell">
                <img
                    src={person.img}
                    alt={person.name}
                    className="fc-img"
                    loading="lazy"
                    onError={e => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                />
                {/* Fallback initials in case image fails */}
                <div className="fc-img-fallback" style={{ background: `linear-gradient(145deg,#1a1a3e,${person.hue})`, display: 'none' }}>
                    <span className="fc-av-init">{person.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                </div>
                <div className="fc-img-glow" style={{ background: `radial-gradient(ellipse at bottom, ${person.hue}55 0%, transparent 70%)` }} />
                <div className="fc-img-stripe" style={{ background: `linear-gradient(90deg, ${person.hue}00, ${person.hue}cc, ${person.hue}00)` }} />
            </div>

            <div className="fc-card-body">
                <p className="fc-quote">"{person.quote}"</p>
                <div className="fc-name">{person.name}</div>
                <div className="fc-role" style={{ color: person.hue }}>{person.role}</div>
            </div>
        </motion.div>
    );
}

/* ─── Founders slider carousel ──────────────────────────────── */
function FoundersCarousel() {
    const [idx, setIdx]       = useState(0);
    const [paused, setPaused] = useState(false);
    const dragStartX          = useRef(null);
    const autoRef             = useRef(null);

    /* ── Infinite-loop next (wraps at MAX_IDX) ── */
    const nextLoop = () => setIdx(i => (i >= MAX_IDX ? 0 : i + 1));
    const prevLoop = () => setIdx(i => (i <= 0 ? MAX_IDX : i - 1));

    /* ── Arrow click — override auto-slide for 6 s ── */
    const handlePrev = () => { prevLoop(); resetAuto(); };
    const handleNext = () => { nextLoop(); resetAuto(); };

    /* ── Auto-slide engine ── */
    const resetAuto = () => {
        setPaused(true);
        clearInterval(autoRef.current);
        autoRef.current = setTimeout(() => setPaused(false), 6000);
    };

    useEffect(() => {
        if (paused) return;
        const id = setInterval(nextLoop, AUTO_INTERVAL);
        return () => clearInterval(id);
    }, [paused, idx]);

    useEffect(() => () => clearInterval(autoRef.current), []);

    /* ── Drag / swipe ── */
    const onPointerDown = e => {
        dragStartX.current = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    };
    const onPointerUp = e => {
        if (dragStartX.current === null) return;
        const end   = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const delta = dragStartX.current - end;
        if (Math.abs(delta) > 44) delta > 0 ? handleNext() : handlePrev();
        dragStartX.current = null;
    };

    const slideX   = -(idx * (CARD_W + CARD_GAP));
    const centerIdx = idx + 1; /* middle card out of 3 visible */

    return (
        <div
            className="fc-root"
            onMouseEnter={() => !paused && setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Header bar: arrows only (counter removed) */}
            <div className="fc-top-bar">
                <div className="fc-arrows">
                    <motion.button
                        className="fc-arrow"
                        onClick={handlePrev}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Previous founders"
                    >‹</motion.button>
                    <motion.button
                        className="fc-arrow"
                        onClick={handleNext}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Next founders"
                    >›</motion.button>
                </div>
            </div>

            {/* Auto-slide progress bar */}
            <div className="fc-progress-bar">
                <div
                    key={`${idx}-${paused}`}
                    className={`fc-progress-fill${paused ? ' fc-progress-fill--paused' : ''}`}
                    style={{ '--dur': `${AUTO_INTERVAL}ms` }}
                />
            </div>

            {/* Clipping window — exactly 3 cards visible */}
            <div
                className="fc-window"
                onMouseDown={onPointerDown}
                onMouseUp={onPointerUp}
                onTouchStart={onPointerDown}
                onTouchEnd={onPointerUp}
            >
                <motion.div
                    className="fc-track"
                    animate={{ x: slideX }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                >
                    {LEADERS.map((p, i) => (
                        <FounderCard
                            key={i}
                            person={p}
                            isCenter={i === centerIdx}
                        />
                    ))}
                </motion.div>
            </div>

            {/* Dot pagination */}
            <div className="fc-dots">
                {Array.from({ length: MAX_IDX + 1 }).map((_, i) => (
                    <button
                        key={i}
                        className={`fc-dot${i === idx ? ' fc-dot--on' : ''}`}
                        onClick={() => { setIdx(i); resetAuto(); }}
                        aria-label={`Slide ${i + 1}`}
                    />
                ))}
            </div>

            <p className="ab-drag-hint">← Swipe, drag, or use arrows · Auto-sliding every 3.5 s →</p>
        </div>
    );
}

/* ─── Explore card ──────────────────────────────────────────── */
function ExploreCard({ img, title, sub, icon, color, onClick, delay }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.2 });
    return (
        <motion.div ref={ref} className="ab-explore-card"
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay }}
            whileHover={{ y: -8, transition: { duration: 0.18 } }}
            onClick={onClick}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onClick()}>
            <div className="ab-explore-img-wrap">
                <img src={img} alt={title} className="ab-explore-img" loading="lazy" />
                <div className="ab-explore-overlay" />
                <div className="ab-explore-icon">{icon}</div>
            </div>
            <div className="ab-explore-body">
                <div className="ab-explore-label" style={{ color }}>Explore →</div>
                <div className="ab-explore-title">{title}</div>
                <p className="ab-explore-sub">{sub}</p>
            </div>
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function AboutSection({ campusInfo, onTabChange }) {
    const whoRef = useRef(null);
    const { scrollYProgress: whoScroll } = useScroll({ target: whoRef, offset: ['start end', 'end start'] });
    const whoImgY = useTransform(whoScroll, [0, 1], ['-8%', '8%']);

    const STORY_STEPS = [
        { icon: '🎯', title: 'Started with a Problem',  desc: 'Campus management was fragmented — attendance on paper, fees by counter, access via outdated cards. Students and faculty lost hours every week to avoidable friction.' },
        { icon: '💡', title: 'An Idea Took Shape',      desc: 'In 2019, a small team of faculty and students asked: "What if the entire campus ran on one intelligent platform?" Smart Campus was born from that question.' },
        { icon: '🚀', title: 'Built for Everyone',      desc: 'From smart QR access to AI-powered advisors, every feature was co-designed with students, faculty and administrators — not built in isolation.' },
        { icon: '🌐', title: 'Growing Every Day',       desc: `Today Smart Campus serves 12,000+ students and 400+ faculty across every department, with new features shipping every semester.` },
    ];

    const HOW_STEPS = [
        { n: '01', icon: '📱', title: 'One Login',       desc: 'Students and staff access everything — attendance, fees, timetables, gate entry — through a single secure account.' },
        { n: '02', icon: '🔑', title: 'Smart Access',    desc: 'QR and RFID codes replace physical ID cards. Entry logs are instant and tamper-proof.' },
        { n: '03', icon: '🤖', title: 'AI Assistance',   desc: 'The built-in AI advisor answers queries 24/7 — from exam schedules to hostel rules — with context-aware responses.' },
        { n: '04', icon: '📊', title: 'Live Analytics',  desc: 'Administrators get real-time dashboards on attendance, facility usage and student engagement.' },
    ];

    return (
        <div className="ab-root">

            {/* ════════════════ S1 — WHO WE ARE ════════════════ */}
            <section className="ab-section ab-s1" ref={whoRef}>
                <Blob className="ab-blob--1" />
                <Blob className="ab-blob--2" />
                <div className="ab-container ab-split">
                    <div className="ab-split-text">
                        <Reveal delay={0.05}>
                            <p className="ab-eyebrow">About Us</p>
                            <h2 className="ab-h2">Who We Are</h2>
                        </Reveal>
                        <Reveal delay={0.16}>
                            <p className="ab-lead">
                                Smart Campus is {campusInfo?.name ?? 'our university'}'s unified digital backbone — built to eliminate friction, unlock potential, and give every student a seamless campus experience.
                            </p>
                        </Reveal>
                        <Reveal delay={0.26}>
                            <p className="ab-body">
                                Founded in {campusInfo?.established ?? '2000'}, we have grown from a single building to a {campusInfo?.accreditation ?? 'NAAC A+'} accredited university spanning 100 acres, 12,000+ students, and 30+ programmes — all unified through one intelligent platform.
                            </p>
                        </Reveal>
                        <Reveal delay={0.36}>
                            <div className="ab-tag-row">
                                {[
                                    `📍 ${campusInfo?.location ?? 'India'}`,
                                    `🏆 ${campusInfo?.accreditation ?? 'NAAC A+'}`,
                                    `📅 Est. ${campusInfo?.established ?? '2000'}`,
                                ].map(t => <span key={t} className="ab-tag">{t}</span>)}
                            </div>
                        </Reveal>
                    </div>

                    <Reveal delay={0} className="ab-split-right">
                        <motion.div className="ab-who-img-frame" style={{ y: whoImgY }}>
                            <img src="/images/fac_academic_hub.png" alt="Smart Campus" className="ab-who-img" loading="lazy" />
                            <div className="ab-who-img-glow" />
                        </motion.div>
                    </Reveal>
                </div>
            </section>

            {/* ════════════════ S2 — IMPACT ═══════════════════ */}
            <section className="ab-section ab-s2">
                <Blob className="ab-blob--3" />
                <div className="ab-container">
                    <Reveal>
                        <p className="ab-eyebrow ab-eyebrow--green">Our Impact</p>
                        <h2 className="ab-h2 ab-center">Numbers That Matter</h2>
                    </Reveal>
                    <div className="ab-impact-grid">
                        <ImpactStat num={12000} suffix="+" label="Students Enrolled"    color="#818cf8" delay={0.05} />
                        <ImpactStat num={420}   suffix="+" label="Expert Faculty"       color="#34d399" delay={0.12} />
                        <ImpactStat num={95}    suffix="%" label="Placement Rate"       color="#f472b6" delay={0.19} />
                        <ImpactStat num={30}    suffix="+" label="Global Partnerships"  color="#fbbf24" delay={0.26} />
                    </div>
                </div>
            </section>

            {/* ════════════════ S3 — OUR STORY ════════════════ */}
            <section className="ab-section ab-s3">
                <Blob className="ab-blob--4" />
                <Blob className="ab-blob--5" />
                <div className="ab-container">
                    <Reveal>
                        <p className="ab-eyebrow ab-eyebrow--purple">Our Story</p>
                        <h2 className="ab-h2">From Idea to Institution</h2>
                        <p className="ab-sub">Every great platform begins with a real problem. Here is ours.</p>
                    </Reveal>
                    <div className="ab-story-split">
                        <div className="ab-story-img-col">
                            <Reveal delay={0}>
                                <div className="ab-story-img-frame">
                                    <img src="/images/fac_computer_labs.png" alt="Our Story" className="ab-story-img" loading="lazy" />
                                    <div className="ab-story-badge-box">
                                        <span>🚀</span>
                                        <span>Est. {campusInfo?.established ?? '2000'}</span>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                        <div className="ab-story-steps">
                            {STORY_STEPS.map((s, i) => (
                                <Reveal key={i} delay={i * 0.1}>
                                    <div className="ab-story-step">
                                        <div className="ab-story-step-icon">{s.icon}</div>
                                        <div>
                                            <div className="ab-story-step-title">{s.title}</div>
                                            <p className="ab-story-step-desc">{s.desc}</p>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════ S4 — HOW IT WORKS ═════════════ */}
            <section className="ab-section ab-s4">
                <Blob className="ab-blob--6" />
                <div className="ab-container">
                    <Reveal>
                        <p className="ab-eyebrow">Platform</p>
                        <h2 className="ab-h2 ab-center">How Smart Campus Works</h2>
                        <p className="ab-sub ab-center">Four seamless steps that replace a dozen fragmented systems.</p>
                    </Reveal>
                    <div className="ab-steps-grid">
                        {HOW_STEPS.map((s, i) => <Step key={i} {...s} delay={i * 0.09} />)}
                    </div>
                </div>
            </section>

            {/* ════════════════ S5 — LEADERSHIP CAROUSEL ══════ */}
            <section className="ab-section ab-s5">
                <Blob className="ab-blob--7" />
                <div className="ab-container">
                    <Reveal>
                        <p className="ab-eyebrow ab-eyebrow--pink">The People</p>
                        <h2 className="ab-h2">Leadership Team</h2>
                        <p className="ab-sub">The visionaries who shape every student's journey.</p>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <FoundersCarousel />
                    </Reveal>
                </div>
            </section>

            {/* ════════════════ S6 — TEAM CULTURE ═════════════ */}
            <section className="ab-section ab-s6">
                <Blob className="ab-blob--8" />
                <div className="ab-container">
                    <Reveal>
                        <p className="ab-eyebrow ab-eyebrow--gold">Culture</p>
                        <h2 className="ab-h2 ab-center">Life at Smart Campus</h2>
                    </Reveal>
                    <div className="ab-culture-mosaic">
                        {[
                            { src: '/images/fac_sports.png',   caption: 'World-class sports facilities' },
                            { src: '/images/events.png',        caption: 'Vibrant cultural events'       },
                            { src: '/images/library.jpg',       caption: '2-lakh book library'           },
                            { src: '/images/fac_gym.png',       caption: 'Modern fitness centre'         },
                            { src: '/images/prog_cse.png',      caption: 'State-of-the-art labs'         },
                            { src: '/images/fac_placement.png', caption: '200+ campus recruiters'        },
                        ].map((item, i) => (
                            <Reveal key={i} delay={i * 0.07}
                                className={`ab-culture-cell${i === 0 || i === 4 ? ' ab-culture-cell--tall' : ''}`}>
                                <motion.div className="ab-culture-img-wrap"
                                    whileHover={{ scale: 1.04, transition: { duration: 0.25 } }}>
                                    <img src={item.src} alt={item.caption} className="ab-culture-img" loading="lazy" />
                                    <div className="ab-culture-caption">{item.caption}</div>
                                </motion.div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════ S7 — YOU MIGHT ALSO LIKE ══════ */}
            <section className="ab-section ab-s7">
                <Blob className="ab-blob--9" />
                <div className="ab-container">
                    <Reveal>
                        <p className="ab-eyebrow">Discover More</p>
                        <h2 className="ab-h2 ab-center">You Might Also Like</h2>
                        <p className="ab-sub ab-center">Everything the campus has to offer — one click away.</p>
                    </Reveal>
                    <div className="ab-explore-grid">
                        <ExploreCard img="/images/fac_academic_hub.png" title="Facilities"    sub="Labs, library, sports, hostels and more."      icon="🏢" color="#818cf8" onClick={() => onTabChange?.('facilities')} delay={0.06} />
                        <ExploreCard img="/images/events.png"            title="Campus Life"   sub="TechFest, sports meet, cultural week & more."  icon="🎉" color="#34d399" onClick={() => onTabChange?.('life')}       delay={0.13} />
                        <ExploreCard img="/images/prog_cse.png"          title="Fee Structure" sub="Transparent, programme-wise fee breakdown."    icon="💰" color="#f472b6" onClick={() => onTabChange?.('fees')}      delay={0.20} />
                    </div>
                </div>
            </section>

        </div>
    );
}
