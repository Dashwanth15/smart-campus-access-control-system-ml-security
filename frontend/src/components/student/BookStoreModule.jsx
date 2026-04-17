import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const API_BASE = 'http://localhost:5000';

const SUBJECTS = [
    'Mathematics','Physics','Data Structures',
    'Computer Networks','Database Systems','Operating Systems',
    'Programming','General',
];
const COLORS = ['#6366f1','#3b82f6','#8b5cf6','#ef4444','#f59e0b','#10b981','#ec4899','#f97316','#06b6d4'];
const CATEGORY_ICONS = {
    Mathematics:'📐', Physics:'⚛️', 'Data Structures':'🌳',
    'Computer Networks':'🌐', 'Database Systems':'💾',
    'Operating Systems':'🖥️', Programming:'💻', General:'📘',
};
const ICONS_BY_IDX = ['📘','📗','📙','📕','📓','📒','📔','📖','📚'];
const ROLE_TAGS = {
    Faculty:{ label:'Faculty', bg:'rgba(16,185,129,.15)', color:'#34d399' },
    Admin:  { label:'Admin',   bg:'rgba(99,102,241,.15)', color:'#818cf8' },
    Student:{ label:'Student', bg:'rgba(245,158,11,.15)', color:'#fbbf24' },
    system: { label:'Library', bg:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.38)' },
};
const EMPTY_FORM = { title:'', author:'', category:'General', link:'', icon:'📘', color:'#6366f1' };

/* ── Confirm Delete Dialog ──────────────────────────────────────────────── */
function ConfirmDialog({ bookTitle, onConfirm, onCancel }) {
    return (
        <div className="sd-modal-overlay" onClick={onCancel}>
            <div className="sd-confirm-dialog" onClick={e => e.stopPropagation()}>
                <div className="sd-confirm-icon">🗑️</div>
                <h3 className="sd-confirm-title">Delete Book?</h3>
                <p className="sd-confirm-msg">
                    Are you sure you want to delete <strong>"{bookTitle}"</strong>?
                    This action cannot be undone.
                </p>
                <div className="sd-confirm-actions">
                    <button className="sd-btn sd-btn--ghost" onClick={onCancel}>Cancel</button>
                    <button className="sd-btn sd-btn--danger" onClick={onConfirm}>Yes, Delete</button>
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
        <div className="sd-book-menu-wrap" ref={ref} onClick={e => e.stopPropagation()}>
            <button className="sd-book-dots" title="Options" onClick={() => setOpen(s => !s)}>⋮</button>
            {open && (
                <div className="sd-book-dropdown">
                    {canEdit && (
                        <button className="sd-book-dd-item" onClick={() => { setOpen(false); onEdit(); }}>
                            <span>✏️</span> Edit Book
                        </button>
                    )}
                    {canDelete && (
                        <button className="sd-book-dd-item sd-book-dd-item--danger" onClick={() => { setOpen(false); onDelete(); }}>
                            <span>🗑️</span> Delete Book
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Edit / Add modal ────────────────────────────────────────────────── */
function BookModal({ book, onClose, onSave, mode = 'edit' }) {
    const [form, setForm] = useState(
        book
            ? { title: book.title, author: book.author, category: book.category || 'General', link: book.link || '', icon: book.icon || '📘', color: book.color || '#6366f1' }
            : EMPTY_FORM
    );
    const [selectedFile, setSelectedFile] = useState(null);
    const [saving, setSaving]   = useState(false);
    const [err,    setErr]      = useState('');
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
        <div className="sd-modal-overlay" onClick={onClose}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
                <div className="sd-modal-header">
                    <h3>{mode === 'edit' ? '✏️ Edit Book' : '📘 Add New Book'}</h3>
                    <button className="sd-modal-close" onClick={onClose}>✕</button>
                </div>

                {err && <div className="sd-form-error">⚠️ {err}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Row 1: Title + Author */}
                    <div className="sd-form-grid" style={{ marginBottom:'.85rem' }}>
                        <div className="sd-form-group">
                            <label className="sd-form-label">Title *</label>
                            <input className="sd-form-input" type="text" placeholder="e.g. Clean Code"
                                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                        </div>
                        <div className="sd-form-group">
                            <label className="sd-form-label">Author *</label>
                            <input className="sd-form-input" type="text" placeholder="e.g. Robert C. Martin"
                                value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} required />
                        </div>
                    </div>

                    {/* Row 2: Category */}
                    <div className="sd-form-group" style={{ marginBottom:'.85rem' }}>
                        <label className="sd-form-label">Category</label>
                        <select className="sd-form-select" value={form.category} onChange={e => handleCat(e.target.value)}>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Row 3: Book URL + PDF File Upload */}
                    <div className="sd-form-grid" style={{ marginBottom:'.85rem' }}>
                        <div className="sd-form-group">
                            <label className="sd-form-label">🔗 Book / Website URL</label>
                            <input className="sd-form-input" type="url" placeholder="https://book-website.com"
                                value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
                        </div>
                        <div className="sd-form-group">
                            <label className="sd-form-label">📄 Upload PDF File</label>
                            <div className="sd-file-upload-wrap">
                                <input
                                    ref={fileRef}
                                    id="book-pdf-upload"
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                                <button
                                    type="button"
                                    className="sd-file-upload-btn"
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
                                        className="sd-file-current-link"
                                    >
                                        📄 View current PDF
                                    </a>
                                )}
                            </div>
                            {selectedFile && (
                                <button
                                    type="button"
                                    className="sd-file-remove-btn"
                                    onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                                >
                                    ✕ Remove file
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Link preview */}
                    {form.link && (
                        <div className="sd-modal-preview">
                            <a href={form.link} target="_blank" rel="noopener noreferrer" className="sd-modal-preview-btn" style={{ borderColor: form.color, color: form.color }}>🔗 Preview Link</a>
                        </div>
                    )}

                    <div className="sd-form-actions" style={{ marginTop:'1.25rem' }}>
                        <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="sd-btn sd-btn--primary" disabled={saving}>
                            {saving ? <><span className="sd-btn-spinner" /> Saving…</> : mode === 'edit' ? '💾 Save Changes' : '📘 Add Book'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
function BookStoreModule() {
    const { user } = useAuth();
    const currentUserId = user?.id || user?._id || '';

    const [books,       setBooks]       = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState('');
    const [toast,       setToast]       = useState('');
    const [searchQuery, setSearchQuery] = useState('');      // T3: search
    const [newBookId,   setNewBookId]   = useState(null);    // T4: highlight
    const [editBook,    setEditBook]    = useState(null);
    const [showAdd,     setShowAdd]     = useState(false);
    const [confirmBook, setConfirmBook] = useState(null);

    const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 3200); }, []);

    const fetchBooks = async () => {
        setLoading(true); setError('');
        try {
            const res = await API.get('/api/books');
            setBooks(res.data.books || []);
        } catch { setError('Could not load books. Please try again.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchBooks(); }, []);

    const handleDeleteConfirmed = async () => {
        if (!confirmBook) return;
        const id = confirmBook._id;
        setConfirmBook(null);
        try {
            await API.delete(`/api/books/${id}`);
            setBooks(prev => prev.filter(b => b._id !== id));
            showToast('🗑️ Book removed.');
        } catch (ex) { showToast('❌ ' + (ex.response?.data?.error || 'Cannot delete.')); }
    };

    const handleSaved = (updated, isNew) => {
        if (isNew) {
            setBooks(prev => [updated, ...prev]);
            // T4: briefly highlight the newly added card
            setNewBookId(updated._id);
            setTimeout(() => setNewBookId(null), 1200);
        } else {
            setBooks(prev => prev.map(b => b._id === updated._id ? updated : b));
        }
        setEditBook(null); setShowAdd(false);
        showToast(isNew ? '✅ Book added successfully!' : '✅ Book updated!');
    };

    // Permission: user can edit/delete only their own books
    // Backend stores added_by = user_id (JWT claim)
    const canDo = (book) => {
        const owner = book.added_by || book.added_by_id || '';
        return owner && owner !== 'system' && owner === currentUserId;
    };

    // T3: filter books by search query (title, author, category)
    const q = searchQuery.toLowerCase().trim();
    const displayed = q
        ? books.filter(b =>
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.category || '').toLowerCase().includes(q)
          )
        : books;

    return (
        <div className="sd-module">
            {/* Header */}
            <div className="sd-books-header">
                <div>
                    <h2 className="sd-module-title">📚 Academic Book Store</h2>
                    <p className="sd-module-sub">Faculty &amp; student curated resources. Click ⋮ on your books to edit or delete.</p>
                </div>
                <button className="sd-btn sd-btn--primary" onClick={() => setShowAdd(true)}>＋ Add Book</button>
            </div>

            {/* T3: Search bar */}
            <div className="sd-search-wrap">
                <span className="sd-search-icon">🔍</span>
                <input
                    className="sd-search-input"
                    type="text"
                    placeholder="Search books by title, author, category..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {toast && <div className="sd-books-toast">{toast}</div>}

            {/* Loading */}
            {loading && (
                <div className="sd-books-grid">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="sd-book-card sd-book-skeleton">
                            <div className="sd-skeleton-icon" />
                            <div className="sd-skeleton-body">
                                <div className="sd-skeleton-line sd-skeleton-line--short" />
                                <div className="sd-skeleton-line sd-skeleton-line--wide" />
                                <div className="sd-skeleton-line" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {!loading && error && (
                <div className="sd-ann-error"><span>⚠️</span><p>{error}</p>
                    <button className="sd-btn sd-btn--primary" onClick={fetchBooks}>Retry</button>
                </div>
            )}

            {/* Grid */}
            {!loading && !error && (
                <div className="sd-books-grid">
                    {displayed.length === 0 ? (
                        <div className="sd-books-empty">
                            <span>{q ? '🔍' : '📭'}</span>
                            <p>{q ? `No books found for "${searchQuery}"` : 'No books yet. Be the first to add one!'}</p>
                        </div>
                    ) : displayed.map((book, i) => {
                        const color     = book.color || COLORS[i % COLORS.length];
                        const icon      = book.icon  || ICONS_BY_IDX[i % ICONS_BY_IDX.length];
                        const addedRole = book.added_by === 'system' ? 'system' : (book.added_by_role || 'Faculty');
                        const tag       = ROLE_TAGS[addedRole] || ROLE_TAGS.Faculty;
                        const ownBook   = canDo(book);
                        const pdfHref   = book.file_url ? `${API_BASE}${book.file_url}` : '';
                        const isNew     = book._id === newBookId;

                        return (
                            <div
                                key={book._id}
                                className={`sd-book-card${isNew ? ' sd-book-card--new' : ''}`}
                                style={{ '--book-color': color }}
                            >
                                {/* T1: Card top row — badge LEFT, 3-dot RIGHT, no overlap */}
                                <div className="sd-card-top">
                                    <div className="sd-book-role-tag" style={{ background: tag.bg, color: tag.color }}>
                                        {tag.label}
                                    </div>
                                    <BookMenu
                                        canEdit={ownBook}
                                        canDelete={ownBook}
                                        onEdit={() => setEditBook(book)}
                                        onDelete={() => setConfirmBook(book)}
                                    />
                                </div>

                                {/* Icon */}
                                <div className="sd-book-icon-wrap" style={{ background:`${color}18`, border:`1px solid ${color}40` }}>
                                    <span className="sd-book-icon">{icon}</span>
                                </div>

                                {/* T2: Body with improved spacing */}
                                <div className="sd-book-body">
                                    <span className="sd-book-subject" style={{ color }}>{book.category}</span>
                                    <h4 className="sd-book-title">{book.title}</h4>
                                    <p className="sd-book-author">by {book.author}</p>
                                    {book.added_by_name && book.added_by_name !== 'System' && (
                                        <p className="sd-book-added-by">Added by {book.added_by_name}</p>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="sd-book-btn-row">
                                    {book.link && (
                                        <a className="sd-book-action-btn" href={book.link} target="_blank" rel="noopener noreferrer" style={{ borderColor: color, color }}>
                                            🔗 Link
                                        </a>
                                    )}
                                    {pdfHref && (
                                        <a className="sd-book-action-btn sd-book-action-btn--pdf" href={pdfHref} target="_blank" rel="noopener noreferrer">
                                            📄 PDF
                                        </a>
                                    )}
                                    {!book.link && !pdfHref && (
                                        <span className="sd-book-no-link">No resources</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add modal */}
            {showAdd && (
                <BookModal mode="add" book={null} onClose={() => setShowAdd(false)} onSave={(b, isNew) => handleSaved(b, isNew !== false)} />
            )}
            {/* Edit modal */}
            {editBook && (
                <BookModal mode="edit" book={editBook} onClose={() => setEditBook(null)} onSave={(b, isNew) => handleSaved(b, !!isNew)} />
            )}
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

export default BookStoreModule;
