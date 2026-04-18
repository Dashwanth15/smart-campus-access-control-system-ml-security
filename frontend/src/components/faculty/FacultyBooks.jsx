import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

const SUBJECTS = [
    'Mathematics','Physics','Data Structures',
    'Computer Networks','Database Systems','Operating Systems',
    'Programming','General',
];
const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#ef4444','#06b6d4'];
const CATEGORY_ICONS = {
    Mathematics:'📐', Physics:'⚛️', 'Data Structures':'🌳',
    'Computer Networks':'🌐', 'Database Systems':'💾',
    'Operating Systems':'🖥️', Programming:'💻', General:'📘',
};
const ICONS_BY_IDX = ['📘','📐','⚛️','🌐','💾','🖥️','💻','🧹'];
const EMPTY_FORM = { title:'', author:'', category:'General', link:'', icon:'📘', color:'#6366f1' };

/* ── Spinner for save button ─────────────────────────────────────────────── */
function BtnSpinner() {
    return <span className="fd2-btn-spinner" style={{ display:'inline-block', verticalAlign:'middle', marginRight:'.35rem' }} />;
}

/* ── Confirm Delete Dialog ──────────────────────────────────────────────── */
function ConfirmDialog({ bookTitle, onConfirm, onCancel }) {
    return (
        <div className="fd2-modal-overlay" onClick={onCancel}>
            <div className="fd2-confirm-dialog" onClick={e => e.stopPropagation()}>
                <div className="fd2-confirm-icon">🗑️</div>
                <h3 className="fd2-confirm-title">Delete Book?</h3>
                <p className="fd2-confirm-msg">
                    Are you sure you want to delete <strong>"{bookTitle}"</strong>?
                    This action cannot be undone.
                </p>
                <div className="fd2-confirm-actions">
                    <button className="fd2-btn fd2-btn--ghost" onClick={onCancel}>Cancel</button>
                    <button className="fd2-btn fd2-btn--danger" onClick={onConfirm}>Yes, Delete</button>
                </div>
            </div>
        </div>
    );
}

/* ── Three-dot menu ─────────────────────────────────────────────────── */
function BookMenu({ canEdit, canDelete, onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    if (!canEdit && !canDelete) return null;

    return (
        <div className="fd2-book-menu-wrap" ref={ref} onClick={e => e.stopPropagation()}>
            <button className="fd2-book-dots" title="Options" onClick={() => setOpen(s => !s)}>⋮</button>
            {open && (
                <div className="fd2-book-dropdown">
                    {canEdit && (
                        <button className="fd2-book-dd-item" onClick={() => { setOpen(false); onEdit(); }}>
                            <span>✏️</span> Edit Book
                        </button>
                    )}
                    {canDelete && (
                        <button className="fd2-book-dd-item fd2-book-dd-item--danger" onClick={() => { setOpen(false); onDelete(); }}>
                            <span>🗑️</span> Delete Book
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Shared Edit / Add Modal ─────────────────────────────────────────── */
function BookModal({ book, onClose, onSave, mode = 'edit' }) {
    const [form, setForm] = useState(
        book
            ? { title: book.title, author: book.author, category: book.category || 'General', link: book.link || '', icon: book.icon || '📘', color: book.color || '#6366f1' }
            : EMPTY_FORM
    );
    const [selectedFile, setSelectedFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [err,    setErr]    = useState('');
    const fileRef = useRef(null);

    // Existing uploaded PDF (edit mode)
    const existingFileUrl = book?.file_url || '';

    const handleCat = (cat) => {
        const idx = SUBJECTS.indexOf(cat);
        setForm(f => ({ ...f, category: cat, icon: CATEGORY_ICONS[cat] || ICONS_BY_IDX[idx % ICONS_BY_IDX.length], color: COLORS[idx % COLORS.length] }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setErr('Only PDF files are allowed.');
                e.target.value = '';
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                setErr('File size must be under 50 MB.');
                e.target.value = '';
                return;
            }
            setErr('');
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setErr('');
        if (!form.title.trim() || !form.author.trim()) { setErr('Title and Author are required.'); return; }
        setSaving(true);
        try {
            // Always use FormData so the backend can handle the optional PDF file
            const fd = new FormData();
            fd.append('title',    form.title.trim());
            fd.append('author',   form.author.trim());
            fd.append('category', form.category);
            fd.append('link',     form.link.trim());
            fd.append('icon',     form.icon);
            fd.append('color',    form.color);
            if (selectedFile) fd.append('pdf_file', selectedFile);

            // Clear Content-Type so browser sets correct multipart/form-data boundary
            const config = { headers: { 'Content-Type': undefined } };

            let res;
            if (mode === 'edit') res = await API.put(`/api/books/${book._id}`, fd, config);
            else                  res = await API.post('/api/books', fd, config);

            // Pass book + isNew flag to parent
            onSave(res.data.book, mode !== 'edit');
        } catch (ex) { setErr(ex.response?.data?.error || 'Failed to save. Try again.'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fd2-modal-overlay" onClick={onClose}>
            <div className="fd2-modal" onClick={e => e.stopPropagation()}>
                <div className="fd2-modal-header">
                    <h3>{mode === 'edit' ? '✏️ Edit Book' : '📘 Add New Book'}</h3>
                    <button className="fd2-modal-close" onClick={onClose}>✕</button>
                </div>

                {err && <div className="fd2-msg fd2-msg--error" style={{ marginBottom:'.75rem' }}>⚠️ {err}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="fd2-form-row">
                        <div className="fd2-form-group fd2-form-group--half">
                            <label>Title *</label>
                            <input className="fd2-form-input" type="text" placeholder="e.g. Clean Code"
                                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                        </div>
                        <div className="fd2-form-group fd2-form-group--half">
                            <label>Author *</label>
                            <input className="fd2-form-input" type="text" placeholder="e.g. Robert C. Martin"
                                value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} required />
                        </div>
                    </div>

                    <div className="fd2-form-row">
                        <div className="fd2-form-group fd2-form-group--full">
                            <label>Category</label>
                            <select className="fd2-form-select" value={form.category} onChange={e => handleCat(e.target.value)}>
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="fd2-form-row">
                        <div className="fd2-form-group fd2-form-group--half">
                            <label>🔗 Book / Website URL</label>
                            <input className="fd2-form-input" type="url" placeholder="https://book-website.com"
                                value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
                        </div>
                        <div className="fd2-form-group fd2-form-group--half">
                            <label>📄 Upload PDF File</label>
                            <div className="fd2-file-upload-wrap">
                                <input
                                    ref={fileRef}
                                    id="fd-book-pdf-upload"
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                                <button
                                    type="button"
                                    className="fd2-file-upload-btn"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    {selectedFile ? '✅ ' + selectedFile.name : '📁 Choose PDF…'}
                                </button>
                                {/* Show existing uploaded file in edit mode */}
                                {!selectedFile && existingFileUrl && (
                                    <a
                                        href={`${API_BASE}${existingFileUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="fd2-file-current-link"
                                    >
                                        📄 View current PDF
                                    </a>
                                )}
                            </div>
                            {selectedFile && (
                                <button
                                    type="button"
                                    className="fd2-file-remove-btn"
                                    onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                                >
                                    ✕ Remove file
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Link preview */}
                    {form.link && (
                        <div className="fd2-modal-preview">
                            <a href={form.link} target="_blank" rel="noopener noreferrer" className="fd2-modal-preview-btn" style={{ borderColor: form.color, color: form.color }}>🔗 Preview Link</a>
                        </div>
                    )}

                    <div className="fd2-form-actions">
                        <button type="button" className="fd2-btn fd2-btn--ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="fd2-btn fd2-btn--primary" disabled={saving}>
                            {saving ? <><BtnSpinner />Saving…</> : mode === 'edit' ? '💾 Save Changes' : '📘 Add Book'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
function FacultyBooks() {
    const { user } = useAuth();
    const currentUserId = user?.id || user?._id || '';

    const [materials,    setMaterials]   = useState([]);
    const [loading,      setLoading]     = useState(true);
    const [error,        setError]       = useState('');
    const [filterSub,    setFilterSub]   = useState('All');
    const [toast,        setToast]       = useState('');
    const [editBook,     setEditBook]    = useState(null);
    const [showAdd,      setShowAdd]     = useState(false);
    const [confirmBook,  setConfirmBook] = useState(null);  // book pending delete confirmation

    const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 3200); }, []);

    const fetchBooks = async () => {
        setLoading(true); setError('');
        try {
            const res = await API.get('/api/books');
            setMaterials(res.data.books || []);
        } catch { setError('Could not load books.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchBooks(); }, []);

    const handleDeleteConfirmed = async () => {
        if (!confirmBook) return;
        const id = confirmBook._id;
        setConfirmBook(null);
        try {
            await API.delete(`/api/books/${id}`);
            setMaterials(prev => prev.filter(m => m._id !== id));
            showToast('🗑️ Book removed.');
        } catch (ex) { showToast('❌ ' + (ex.response?.data?.error || 'Cannot delete.')); }
    };

    const handleSaved = (updated, isNew) => {
        if (isNew) setMaterials(prev => [updated, ...prev]);
        else       setMaterials(prev => prev.map(b => b._id === updated._id ? updated : b));
        setEditBook(null); setShowAdd(false);
        showToast(isNew ? '✅ Book added! Students can see it now.' : '✅ Book updated!');
    };

    // Permission: user can edit/delete only their own books
    // Backend stores added_by = user_id (JWT claim). Guard against system books.
    const canDo = (mat) => {
        const owner = mat.added_by || mat.added_by_id || '';
        return owner && owner !== 'system' && owner === currentUserId;
    };

    const allCategories = ['All', ...SUBJECTS];
    const filtered = filterSub === 'All' ? materials : materials.filter(m => m.category === filterSub);

    return (
        <div className="fd2-module">
            <div className="fd2-module-header">
                <div>
                    <h2 className="fd2-module-title">📖 Books &amp; Materials</h2>
                    <p className="fd2-module-sub">Upload PDF books — they appear instantly in the Student Book Store. Click ⋮ on your books to edit or delete.</p>
                </div>
                <button className="fd2-btn fd2-btn--primary" onClick={() => setShowAdd(true)}>＋ Add Book</button>
            </div>

            {toast && <div className="fd2-msg fd2-msg--success">{toast}</div>}

            {/* Category filter */}
            <div className="fd2-filter-row">
                {allCategories.map(s => (
                    <button key={s} className={`fd2-filter-btn fd2-filter-btn--sm ${filterSub === s ? 'fd2-filter-btn--on' : ''}`} onClick={() => setFilterSub(s)}>{s}</button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="fd2-books-grid">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="fd2-book-card" style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', padding:'1.2rem', borderRadius:'14px' }}>
                            <div className="sd-skeleton-icon" />
                            <div className="sd-skeleton-body">
                                <div className="sd-skeleton-line sd-skeleton-line--short" />
                                <div className="sd-skeleton-line sd-skeleton-line--wide" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <div className="fd2-msg fd2-msg--error">⚠️ {error}
                    <button className="fd2-btn fd2-btn--ghost" style={{ marginLeft:'1rem' }} onClick={fetchBooks}>Retry</button>
                </div>
            )}

            {/* Grid */}
            {!loading && !error && (
                <div className="fd2-books-grid">
                    {filtered.length === 0 ? (
                        <div className="fd2-empty-state"><span>📭</span><p>No books in this category. Add the first one!</p></div>
                    ) : filtered.map((mat) => {
                        const color    = mat.color || '#6366f1';
                        const icon     = mat.icon  || '📘';
                        const ownBook  = canDo(mat);
                        const pdfHref  = mat.file_url ? `${API_BASE}${mat.file_url}` : '';

                        return (
                            <div key={mat._id} className="fd2-book-card" style={{ '--book-color': color }}>
                                {/* Three-dot menu — only show if user owns the book */}
                                <BookMenu
                                    canEdit={ownBook}
                                    canDelete={ownBook}
                                    onEdit={() => setEditBook(mat)}
                                    onDelete={() => setConfirmBook(mat)}
                                />

                                <div className="fd2-book-icon-wrap" style={{ background:`${color}18`, border:`1px solid ${color}40` }}>
                                    <span className="fd2-book-icon">{icon}</span>
                                </div>
                                <div className="fd2-book-body">
                                    <span className="fd2-book-subject" style={{ color }}>{mat.category}</span>
                                    <h4 className="fd2-book-title">{mat.title}</h4>
                                    <p style={{ fontSize:'.75rem', color:'rgba(255,255,255,.45)', margin:'2px 0 4px' }}>by {mat.author}</p>
                                    {mat.added_by_name && mat.added_by_name !== 'System' && (
                                        <p style={{ fontSize:'.7rem', color:'rgba(255,255,255,.3)', margin:'0 0 4px' }}>
                                            Added by {mat.added_by_name}
                                        </p>
                                    )}

                                    {/* Link + PDF buttons */}
                                    <div className="fd2-book-btn-row">
                                        {mat.link && (
                                            <a href={mat.link} target="_blank" rel="noopener noreferrer"
                                                className="fd2-book-action-btn" style={{ borderColor: color, color }}
                                                onClick={e => e.stopPropagation()}>
                                                🔗 Link
                                            </a>
                                        )}
                                        {pdfHref && (
                                            <a href={pdfHref} target="_blank" rel="noopener noreferrer"
                                                className="fd2-book-action-btn fd2-book-action-btn--pdf"
                                                onClick={e => e.stopPropagation()}>
                                                📄 PDF
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add modal */}
            {showAdd && <BookModal mode="add" book={null} onClose={() => setShowAdd(false)} onSave={handleSaved} />}
            {/* Edit modal */}
            {editBook && <BookModal mode="edit" book={editBook} onClose={() => setEditBook(null)} onSave={handleSaved} />}
            {/* Delete confirmation */}
            {confirmBook && (
                <ConfirmDialog
                    bookTitle={confirmBook.title}
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setConfirmBook(null)}
                />
            )}
        </div>
    );
}

export default FacultyBooks;
