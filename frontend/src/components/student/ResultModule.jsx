import { useState } from 'react';

const RESULT_DATA = {
    1: [
        { subject: 'Engineering Mathematics I', internal: 45, external: 72, total: 117, max: 150, grade: 'B+' },
        { subject: 'Engineering Physics',        internal: 42, external: 68, total: 110, max: 150, grade: 'B'  },
        { subject: 'Programming in C',           internal: 48, external: 80, total: 128, max: 150, grade: 'A'  },
        { subject: 'Engineering Drawing',        internal: 40, external: 65, total: 105, max: 150, grade: 'B'  },
        { subject: 'Communication English',      internal: 44, external: 70, total: 114, max: 150, grade: 'B+' },
    ],
    2: [
        { subject: 'Engineering Mathematics II', internal: 46, external: 75, total: 121, max: 150, grade: 'A'  },
        { subject: 'Engineering Chemistry',      internal: 38, external: 60, total:  98, max: 150, grade: 'C+' },
        { subject: 'Data Structures',            internal: 49, external: 85, total: 134, max: 150, grade: 'A+' },
        { subject: 'Digital Electronics',        internal: 42, external: 70, total: 112, max: 150, grade: 'B+' },
        { subject: 'Computer Organization',      internal: 44, external: 74, total: 118, max: 150, grade: 'A'  },
    ],
    3: [
        { subject: 'Discrete Mathematics',       internal: 47, external: 78, total: 125, max: 150, grade: 'A'  },
        { subject: 'OOP with Java',              internal: 50, external: 88, total: 138, max: 150, grade: 'A+' },
        { subject: 'Computer Networks',          internal: 43, external: 72, total: 115, max: 150, grade: 'B+' },
        { subject: 'Database Management',        internal: 48, external: 82, total: 130, max: 150, grade: 'A'  },
        { subject: 'Operating Systems',          internal: 45, external: 76, total: 121, max: 150, grade: 'A'  },
    ],
    4: [
        { subject: 'Engineering Mathematics IV', internal: 46, external: 78, total: 124, max: 150, grade: 'A'  },
        { subject: 'Physics',                    internal: 40, external: 66, total: 106, max: 150, grade: 'B'  },
        { subject: 'Data Structures & Algos',    internal: 49, external: 83, total: 132, max: 150, grade: 'A+' },
        { subject: 'Computer Networks',          internal: 44, external: 74, total: 118, max: 150, grade: 'A'  },
        { subject: 'Database Systems',           internal: 47, external: 79, total: 126, max: 150, grade: 'A'  },
        { subject: 'Operating Systems',          internal: 43, external: 71, total: 114, max: 150, grade: 'B+' },
    ],
};

const GRADE_COLORS = {
    'A+': '#10b981', 'A': '#34d399',
    'B+': '#3b82f6', 'B': '#60a5fa',
    'C+': '#f59e0b', 'C': '#fbbf24',
    'D':  '#f97316', 'F': '#ef4444',
};

function ResultModule({ studentData }) {
    const currentSem = studentData?.semester || 4;
    const [sem, setSem] = useState(currentSem);
    const results = RESULT_DATA[sem] || [];

    const totalObtained = results.reduce((s, r) => s + r.total, 0);
    const totalMax      = results.reduce((s, r) => s + r.max,   0);
    const pct           = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

    const gradeColor = (g) => GRADE_COLORS[g] || '#94a3b8';

    return (
        <div className="sd-module">
            <h2 className="sd-module-title">📊 Final Result</h2>

            {/* Semester selector + summary */}
            <div className="sd-result-top">
                <div className="sd-form-group sd-form-group--inline">
                    <label className="sd-form-label">Semester</label>
                    <select
                        className="sd-form-select"
                        value={sem}
                        onChange={e => setSem(Number(e.target.value))}
                    >
                        {[1, 2, 3, 4].map(s => (
                            <option key={s} value={s}>Semester {s}</option>
                        ))}
                    </select>
                </div>

                <div className="sd-result-summary">
                    <div className="sd-result-sum-item">
                        <span className="sd-result-sum-val">{totalObtained}</span>
                        <span className="sd-result-sum-lbl">Marks Obtained</span>
                    </div>
                    <div className="sd-result-sum-sep" />
                    <div className="sd-result-sum-item">
                        <span className="sd-result-sum-val">{totalMax}</span>
                        <span className="sd-result-sum-lbl">Total Marks</span>
                    </div>
                    <div className="sd-result-sum-sep" />
                    <div className="sd-result-sum-item">
                        <span className="sd-result-sum-val sd-result-pct">{pct}%</span>
                        <span className="sd-result-sum-lbl">Percentage</span>
                    </div>
                </div>
            </div>

            {/* Result table */}
            <div className="sd-result-table-wrap">
                <table className="sd-result-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Subject</th>
                            <th>Internal <span className="sd-th-sub">/50</span></th>
                            <th>External <span className="sd-th-sub">/100</span></th>
                            <th>Total <span className="sd-th-sub">/150</span></th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r, i) => (
                            <tr key={i}>
                                <td className="sd-td-num">{i + 1}</td>
                                <td className="sd-td-sub">{r.subject}</td>
                                <td>{r.internal}</td>
                                <td>{r.external}</td>
                                <td className="sd-td-total">{r.total}</td>
                                <td>
                                    <span
                                        className="sd-grade-badge"
                                        style={{
                                            color: gradeColor(r.grade),
                                            background: `${gradeColor(r.grade)}18`,
                                            border: `1px solid ${gradeColor(r.grade)}44`,
                                        }}
                                    >
                                        {r.grade}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ResultModule;
