import { useEffect, useRef } from 'react';
import '../styles/homepage.css';

function HomePage({ onGetStarted }) {
    const featuresRef = useRef(null);
    const securityRef = useRef(null);
    const statsRef = useRef(null);

    useEffect(() => {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe all sections
        const sections = [featuresRef.current, securityRef.current, statsRef.current];
        sections.forEach(section => {
            if (section) observer.observe(section);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="homepage">
            {/* Animated Background */}
            <div className="animated-background">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
            </div>

            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-content">
                    <div className="hero-icon animate-float">🏛️</div>
                    <h1 className="hero-title animate-fade-in">
                        Smart Campus Access Control
                    </h1>
                    <p className="hero-subtitle animate-fade-in-up">
                        Intelligent security powered by Machine Learning
                    </p>
                    <p className="hero-description animate-fade-in-up">
                        Experience next-generation campus security with AI-driven access control,
                        real-time monitoring, and advanced threat detection.
                    </p>
                    <button
                        className="cta-button btn-primary btn-lg animate-scale-in"
                        onClick={onGetStarted}
                    >
                        <span>🚀</span>
                        Get Started
                    </button>
                </div>
            </div>

            {/* Features Section */}
            <div className="features-section scroll-reveal" ref={featuresRef}>
                <h2 className="section-title">Key Features</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🤖</div>
                        <h3>AI-Powered Security</h3>
                        <p>Machine Learning models detect suspicious login patterns and prevent unauthorized access in real-time.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🔐</div>
                        <h3>Multi-Factor Authentication</h3>
                        <p>Secure login with email, password, and automatic device fingerprinting for enhanced protection.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Real-Time Analytics</h3>
                        <p>Monitor access patterns, detect intrusions, and view comprehensive security analytics instantly.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">👥</div>
                        <h3>Role-Based Access</h3>
                        <p>Different dashboards for Students, Faculty, Guests, and Administrators with tailored permissions.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📱</div>
                        <h3>Device Fingerprinting</h3>
                        <p>Automatically track and manage authorized devices using browser fingerprinting and SHA-256 device ID registration.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">⚡</div>
                        <h3>Lightning Fast</h3>
                        <p>Built with modern technologies for instant responses and seamless user experience.</p>
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="security-section scroll-reveal" ref={securityRef}>
                <div className="security-content">
                    <h2 className="section-title">Advanced Security Technologies</h2>
                    <div className="tech-grid">
                        <div className="tech-item">
                            <span className="tech-badge">Random Forest</span>
                            <p>Smart access control decisions</p>
                        </div>
                        <div className="tech-item">
                            <span className="tech-badge">SVM</span>
                            <p>Intrusion detection system</p>
                        </div>
                        <div className="tech-item">
                            <span className="tech-badge">MongoDB</span>
                            <p>Secure data storage</p>
                        </div>
                        <div className="tech-item">
                            <span className="tech-badge">Real-Time</span>
                            <p>Instant threat response</p>
                        </div>
                        <div className="tech-item">
                            <span className="tech-badge">Analytics</span>
                            <p>Interactive dashboard charts</p>
                        </div>
                        <div className="tech-item">
                            <span className="tech-badge">Risk Scoring</span>
                            <p>0–100 dynamic risk engine</p>
                        </div>
                        <div className="tech-item">
                            <span className="tech-badge">Fingerprinting</span>
                            <p>SHA-256 device identification</p>
                        </div>
                        <div className="tech-item">
                            <span className="tech-badge">Anomaly AI</span>
                            <p>Behavioural anomaly detection</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="stats-section scroll-reveal" ref={statsRef}>
                <div className="stats-grid">
                    <div className="stat-item">
                        <div className="stat-value">99.9%</div>
                        <div className="stat-label">Accuracy</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">&lt;100ms</div>
                        <div className="stat-label">Response Time</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">24/7</div>
                        <div className="stat-label">Monitoring</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">4+</div>
                        <div className="stat-label">User Roles</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">2</div>
                        <div className="stat-label">ML Models</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">100%</div>
                        <div className="stat-label">Threat Detection</div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="cta-section">
                <h2 className="cta-title">Ready to Experience Smart Security?</h2>
                <p className="cta-text">Join our secure campus access control system today</p>
                <button
                    className="cta-button btn-primary btn-lg"
                    onClick={onGetStarted}
                >
                    <span>🔑</span>
                    Access Dashboard
                </button>
            </div>

            {/* Footer */}
            <div className="homepage-footer">
                <p>© 2026 Smart Campus Access Control. Powered by AI & Machine Learning.</p>
            </div>
        </div>
    );
}

export default HomePage;
