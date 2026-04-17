import { useState, useEffect } from 'react';
import API from '../../services/api';

const SUBJECTS = [
    'Mathematics', 'Physics', 'Data Structures',
    'Computer Networks', 'Database Systems', 'Operating Systems'
];

function StudentRecords() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({ marks: {}, attendance: {} });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        try {
            const response = await API.get('/api/students');
            setStudents(response.data.students || []);
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStudentClick = (student) => {
        setSelectedStudent(student);
        setEditData({
            marks: { ...student.marks },
            attendance: { ...student.attendance }
        });
        setEditMode(false);
        setMessage({ type: '', text: '' });
    };

    const handleMarksChange = (subject, value) => {
        const numValue = Math.min(100, Math.max(0, parseInt(value) || 0));
        setEditData(prev => ({
            ...prev,
            marks: { ...prev.marks, [subject]: { ...prev.marks[subject], obtained: numValue } }
        }));
    };

    const handleAttendanceChange = (field, value) => {
        const numValue = Math.max(0, parseInt(value) || 0);
        setEditData(prev => ({
            ...prev,
            attendance: { ...prev.attendance, [field]: numValue }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const marksPayload = {};
            Object.entries(editData.marks).forEach(([subject, data]) => {
                marksPayload[subject] = data.obtained;
            });
            await API.put(`/api/students/${selectedStudent.user_id}/marks`, { marks: marksPayload });
            await API.put(`/api/students/${selectedStudent.user_id}/attendance`, {
                total_classes: editData.attendance.total_classes,
                attended: editData.attendance.attended
            });
            setMessage({ type: 'success', text: 'Changes saved successfully!' });
            setEditMode(false);
            fetchStudents();
            setSelectedStudent(prev => ({
                ...prev,
                marks: editData.marks,
                attendance: {
                    ...editData.attendance,
                    percentage: Math.round((editData.attendance.attended / editData.attendance.total_classes) * 100)
                }
            }));
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save changes' });
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const attPct = editMode
        ? Math.round((editData.attendance.attended / editData.attendance.total_classes) * 100) || 0
        : selectedStudent?.attendance?.percentage || 0;

    return (
        <div className="fd2-module">
            <h2 className="fd2-module-title">📋 Student Records</h2>
            <p className="fd2-module-sub">Select a student to view and edit their attendance and marks.</p>

            <div className="fd2-sr-layout">
                {/* LEFT – Student list */}
                <div className="fd2-sr-list-panel">
                    <div className="fd2-sr-search-wrap">
                        <span className="fd2-sr-search-icon">🔍</span>
                        <input
                            className="fd2-sr-search"
                            type="text"
                            placeholder="Search by name or ID…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="fd2-sr-loading">
                            <div className="fd2-mini-spinner" />
                            <span>Loading students…</span>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="fd2-empty-state">
                            <span>📭</span>
                            <p>No students found</p>
                        </div>
                    ) : filteredStudents.map(student => (
                        <button
                            key={student._id}
                            className={`fd2-student-item ${selectedStudent?._id === student._id ? 'fd2-student-item--active' : ''}`}
                            onClick={() => handleStudentClick(student)}
                        >
                            <div className="fd2-student-ava">
                                {student.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="fd2-student-info">
                                <span className="fd2-student-name">{student.name}</span>
                                <span className="fd2-student-id">{student.student_id}</span>
                            </div>
                            <div className={`fd2-student-pct ${(student.attendance?.percentage || 0) < 75 ? 'fd2-pct--low' : 'fd2-pct--ok'}`}>
                                {student.attendance?.percentage || 0}%
                            </div>
                        </button>
                    ))}
                </div>

                {/* RIGHT – Student details */}
                <div className="fd2-sr-detail-panel">
                    {selectedStudent ? (
                        <>
                            {/* Header */}
                            <div className="fd2-sr-detail-hdr">
                                <div className="fd2-sr-stu-profile">
                                    <div className="fd2-sr-stu-ava">
                                        {selectedStudent.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <h3 className="fd2-sr-stu-name">{selectedStudent.name}</h3>
                                        <span className="fd2-sr-stu-meta">
                                            {selectedStudent.student_id} · {selectedStudent.branch || selectedStudent.course || 'CSE'}
                                        </span>
                                    </div>
                                </div>
                                <div className="fd2-sr-actions">
                                    {editMode ? (
                                        <>
                                            <button
                                                className="fd2-btn fd2-btn--ghost"
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setEditData({ marks: { ...selectedStudent.marks }, attendance: { ...selectedStudent.attendance } });
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="fd2-btn fd2-btn--primary"
                                                onClick={handleSave}
                                                disabled={saving}
                                            >
                                                {saving ? 'Saving…' : '💾 Save'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="fd2-btn fd2-btn--primary"
                                            onClick={() => setEditMode(true)}
                                        >
                                            ✏️ Edit Records
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Message */}
                            {message.text && (
                                <div className={`fd2-msg fd2-msg--${message.type}`}>
                                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                                </div>
                            )}

                            {/* Attendance */}
                            <div className="fd2-section-card">
                                <h4 className="fd2-section-card-title">📅 Attendance</h4>
                                <div className="fd2-att-grid">
                                    <div className="fd2-att-ring-wrap">
                                        <div className="fd2-att-ring" style={{ '--pct': attPct }}>
                                            <span className="fd2-att-ring-val">{attPct}%</span>
                                            <span className="fd2-att-ring-lbl">attendance</span>
                                        </div>
                                    </div>
                                    <div className="fd2-att-fields">
                                        <div className="fd2-edit-field">
                                            <label>Total Classes</label>
                                            {editMode ? (
                                                <input
                                                    type="number"
                                                    className="fd2-edit-input"
                                                    value={editData.attendance.total_classes || 0}
                                                    onChange={e => handleAttendanceChange('total_classes', e.target.value)}
                                                />
                                            ) : (
                                                <span className="fd2-field-value">{selectedStudent.attendance?.total_classes || 0}</span>
                                            )}
                                        </div>
                                        <div className="fd2-edit-field">
                                            <label>Classes Attended</label>
                                            {editMode ? (
                                                <input
                                                    type="number"
                                                    className="fd2-edit-input"
                                                    value={editData.attendance.attended || 0}
                                                    onChange={e => handleAttendanceChange('attended', e.target.value)}
                                                    max={editData.attendance.total_classes}
                                                />
                                            ) : (
                                                <span className="fd2-field-value">{selectedStudent.attendance?.attended || 0}</span>
                                            )}
                                        </div>
                                        <div className="fd2-edit-field">
                                            <label>Percentage</label>
                                            <span className={`fd2-field-value fd2-field-pct ${attPct < 75 ? 'fd2-pct--low' : 'fd2-pct--ok'}`}>
                                                {attPct}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Marks */}
                            <div className="fd2-section-card">
                                <h4 className="fd2-section-card-title">📝 Subject Marks</h4>
                                <div className="fd2-marks-grid">
                                    {SUBJECTS.map(subject => {
                                        const val = editMode
                                            ? editData.marks[subject]?.obtained || 0
                                            : selectedStudent.marks?.[subject]?.obtained || 0;
                                        const pct = val;
                                        return (
                                            <div key={subject} className="fd2-marks-item">
                                                <div className="fd2-marks-subject">{subject}</div>
                                                {editMode ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        className="fd2-edit-input fd2-marks-input"
                                                        value={val}
                                                        onChange={e => handleMarksChange(subject, e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="fd2-marks-display">
                                                        <span className="fd2-marks-val">{val}<span className="fd2-marks-max">/100</span></span>
                                                        <div className="fd2-marks-bar-wrap">
                                                            <div
                                                                className="fd2-marks-bar"
                                                                style={{
                                                                    width: `${pct}%`,
                                                                    background: pct >= 75
                                                                        ? 'linear-gradient(90deg,#10b981,#34d399)'
                                                                        : pct >= 50
                                                                        ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                                                                        : 'linear-gradient(90deg,#ef4444,#f87171)'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="fd2-empty-details">
                            <span className="fd2-empty-big-icon">👆</span>
                            <h3>Select a Student</h3>
                            <p>Click on any student from the list to view and edit their records.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StudentRecords;
