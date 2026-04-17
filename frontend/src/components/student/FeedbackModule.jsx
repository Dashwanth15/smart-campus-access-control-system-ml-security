import { useState, useEffect } from 'react';
import API from '../../services/api';

const FEEDBACK_TYPES = [
    { key: 'attendance', icon: '📅', label: 'Attendance Issue' },
    { key: 'marks',      icon: '📝', label: 'Marks Issue'      },
    { key: 'general',    icon: '💬', label: 'General Feedback' },
];

function FeedbackModule({ user }) {
    const [type,        setType]        = useState('general');
    const [recipient,   setRecipient]   = useState('');
    const [message,     setMessage]     = useState('');
    const [loading,     setLoading]     = useState(false);
    const [submitted,   setSubmitted]   = useState(false);
    const [facultyList, setFacultyList] = useState([]);
    const [fetchErr,    setFetchErr]    = useState('');

    // Load real faculty from DB
    useEffect(() => {
        API.get('/api/faculty')
            .then(res => setFacultyList(res.data.faculty || []))
            .catch(() => setFetchErr('Could not load faculty list.'));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || !recipient) return;
        setLoading(true);
        try {
            const selected = facultyList.find(f => f._id === recipient);
            await API.post('/api/feedback', {
                receiver_id:   recipient,
                receiver_name: selected?.name || recipient,
                type,
                message,
            });
            setSubmitted(true);
        } catch {
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSubmitted(false);
        setMessage('');
        setRecipient('');
        setType('general');
    };

    const selectedFaculty = facultyList.find(f => f._id === recipient);

    if (submitted) {
        return (
            <div className="sd-module">
                <div className="sd-feedback-success">
                    <div className="sd-success-icon">✅</div>
                    <h3>Feedback Submitted Successfully!</h3>
                    <p>
                        Your feedback has been sent to <b>{selectedFaculty?.name || recipient}</b>.<br />
                        You'll receive a response within 2–3 working days.
                    </p>
                    <button className="sd-btn sd-btn--primary" onClick={reset}>
                        Submit Another Feedback
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="sd-module">
            <h2 className="sd-module-title">💬 Submit Feedback</h2>
            <p className="sd-module-sub">Your feedback helps us improve. All submissions are confidential.</p>

            <form className="sd-feedback-form" onSubmit={handleSubmit}>
                {/* Feedback type */}
                <div className="sd-form-group">
                    <label className="sd-form-label">Feedback Type</label>
                    <div className="sd-type-selector">
                        {FEEDBACK_TYPES.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                className={`sd-type-btn ${type === t.key ? 'sd-type-btn--on' : ''}`}
                                onClick={() => setType(t.key)}
                            >
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recipient — real faculty from DB */}
                <div className="sd-form-group">
                    <label className="sd-form-label">Send To</label>
                    {fetchErr ? (
                        <p style={{ color: '#f87171', fontSize: '.82rem' }}>⚠️ {fetchErr}</p>
                    ) : (
                        <select
                            className="sd-form-select"
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            required
                        >
                            <option value="">
                                {facultyList.length === 0 ? 'Loading faculty…' : '— Select faculty member —'}
                            </option>
                            {facultyList.map(f => (
                                <option key={f._id} value={f._id}>
                                    {f.name}  {f.email ? `(${f.email})` : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Message */}
                <div className="sd-form-group">
                    <label className="sd-form-label">Your Message</label>
                    <textarea
                        className="sd-form-textarea"
                        rows={5}
                        placeholder="Describe your issue or feedback in detail…"
                        value={message}
                        onChange={e => setMessage(e.target.value.slice(0, 500))}
                        required
                    />
                    <div className="sd-char-count">
                        <span className={message.length > 450 ? 'sd-char-warn' : ''}>{message.length}</span> / 500
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="sd-btn sd-btn--primary"
                    disabled={loading || !message.trim() || !recipient}
                >
                    {loading
                        ? <><span className="sd-btn-spinner" /> Submitting…</>
                        : '📤 Submit Feedback'
                    }
                </button>
            </form>
        </div>
    );
}

export default FeedbackModule;
