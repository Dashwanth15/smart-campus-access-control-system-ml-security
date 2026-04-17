// src/components/guest/HeroSection.jsx
// Full-width Hero for the Guest Dashboard
import '../../styles/hero-section.css';

export default function HeroSection({ campusInfo }) {
    return (
        <section className="hs-root">
            {/* Background image */}
            <img
                src="/images/campus.png"
                alt="Smart Campus"
                className="hs-bg"
            />

            {/* Gradient overlay */}
            <div className="hs-overlay" />

            {/* Centred content — wrapped in glass pill for contrast */}
            <div className="hs-content">
                <span className="hs-badge">🎓 Guest Portal</span>

                {/* Glass text container */}
                <div className="hs-text-box">
                    <h1 className="hs-title">
                        {campusInfo?.name ?? 'Smart Campus University'}
                    </h1>
                    <p className="hs-subtitle">
                        {campusInfo?.vision ?? 'To be a global leader in technology education and research.'}
                    </p>
                </div>
            </div>

            {/* Scroll-down cue */}
            <div className="hs-scroll-cue">
                <span />
            </div>
        </section>
    );
}

