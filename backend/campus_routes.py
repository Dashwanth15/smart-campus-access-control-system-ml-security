"""
Campus Routes - Shared modules: Announcements, Feedback, Books
Student ↔ Faculty real-time integration
"""

import os
from flask import Blueprint, request, jsonify, send_from_directory
from datetime import datetime
from bson import ObjectId
from werkzeug.utils import secure_filename
from auth import token_required, role_required

campus_bp = Blueprint('campus', __name__)

# ─── Upload Configuration ──────────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'books')
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXT = {'pdf'}


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT


def save_uploaded_pdf(file_obj):
    """Save an uploaded PDF and return its URL path. Returns '' on failure."""
    if not file_obj or not file_obj.filename:
        return ''
    if not allowed_file(file_obj.filename):
        return ''
    fname = secure_filename(file_obj.filename)
    unique_fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{fname}"
    file_obj.save(os.path.join(UPLOAD_DIR, unique_fname))
    return f'/api/uploads/books/{unique_fname}'


def delete_file_if_exists(file_url):
    """Remove a previously uploaded PDF from disk given its API URL path.
    Silently ignores missing files or invalid paths."""
    if not file_url:
        return
    # file_url looks like '/api/uploads/books/<filename>'
    try:
        fname = file_url.split('/')[-1]
        if fname:
            fpath = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(fpath):
                os.remove(fpath)
    except Exception:
        pass  # Never crash the API over a cleanup failure


# ─── Helpers ───────────────────────────────────────────────────────────────

def get_db():
    from database import get_database
    return get_database()


def serial(doc):
    """Convert MongoDB doc to JSON-safe dict."""
    doc = dict(doc)
    doc['_id'] = str(doc['_id'])
    for k, v in doc.items():
        if hasattr(v, 'isoformat'):
            doc[k] = v.isoformat()
    return doc


# ═══════════════════════════════════════════════════════════════════════════
# ANNOUNCEMENTS
# ═══════════════════════════════════════════════════════════════════════════

@campus_bp.route('/api/announcements', methods=['GET'])
@token_required
def get_announcements():
    """Fetch announcements.
    Students → all announcements (newest first).
    Faculty  → all announcements (they see everything).
    """
    db = get_db()
    docs = list(db.announcements.find().sort('created_at', -1))
    return jsonify({'announcements': [serial(d) for d in docs]})


@campus_bp.route('/api/announcements', methods=['POST'])
@token_required
@role_required('Faculty', 'Admin')
def create_announcement():
    """Faculty / Admin creates an announcement."""
    data = request.json or {}
    title        = data.get('title', '').strip()
    desc         = data.get('desc', '').strip()
    ann_type     = data.get('type', 'notice')       # notice | assignment | hallticket
    subject      = data.get('subject', 'General')
    target       = data.get('target', 'all')         # all | specific_batch
    link         = data.get('link', '').strip()      # optional URL
    attachment_name = data.get('attachment_name', '').strip()  # optional label

    if not title or not desc:
        return jsonify({'error': 'Title and description are required'}), 400

    user = request.current_user
    doc = {
        'title':            title,
        'desc':             desc,
        'type':             ann_type,
        'subject':          subject,
        'target':           target,
        'link':             link,
        'attachment_name':  attachment_name or (link.split('/')[-1] if link else ''),
        'created_by':       user.get('user_id'),
        'created_by_name':  user.get('name', 'Faculty'),
        'created_at':       datetime.utcnow(),
    }
    db = get_db()
    result = db.announcements.insert_one(doc)
    doc['_id'] = str(result.inserted_id)
    doc['created_at'] = doc['created_at'].isoformat()
    return jsonify({'message': 'Announcement created', 'announcement': doc}), 201


@campus_bp.route('/api/announcements/<ann_id>', methods=['DELETE'])
@token_required
@role_required('Faculty', 'Admin')
def delete_announcement(ann_id):
    """Delete an announcement. Faculty can only delete their own."""
    db = get_db()
    try:
        oid = ObjectId(ann_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    doc = db.announcements.find_one({'_id': oid})
    if not doc:
        return jsonify({'error': 'Not found'}), 404

    user = request.current_user
    # Admin can delete any; Faculty only their own
    if user.get('role') != 'Admin' and doc.get('created_by') != user.get('user_id'):
        return jsonify({'error': 'Access denied'}), 403

    db.announcements.delete_one({'_id': oid})
    return jsonify({'message': 'Deleted'})


# ═══════════════════════════════════════════════════════════════════════════
# FEEDBACK
# ═══════════════════════════════════════════════════════════════════════════

@campus_bp.route('/api/faculty', methods=['GET'])
@token_required
def get_faculty_list():
    """Return all users with role=Faculty (for student feedback dropdown)."""
    db = get_db()
    faculty = list(db.users.find({'role': 'Faculty'}, {'_id': 1, 'name': 1, 'email': 1}))
    for f in faculty:
        f['_id'] = str(f['_id'])
    return jsonify({'faculty': faculty})


@campus_bp.route('/api/feedback', methods=['POST'])
@token_required
@role_required('Student')
def send_feedback():
    """Student sends feedback to a faculty member."""
    data = request.json or {}
    receiver_id   = data.get('receiver_id', '').strip()
    receiver_name = data.get('receiver_name', '').strip()
    fb_type       = data.get('type', 'general')
    message       = data.get('message', '').strip()

    if not receiver_id or not message:
        return jsonify({'error': 'Receiver and message are required'}), 400

    user = request.current_user
    doc = {
        'sender_id':      user.get('user_id'),
        'sender_name':    user.get('name', 'Student'),
        'receiver_id':    receiver_id,
        'receiver_name':  receiver_name,
        'type':           fb_type,
        'message':        message,
        'created_at':     datetime.utcnow(),
    }
    db = get_db()
    result = db.feedback.insert_one(doc)
    doc['_id'] = str(result.inserted_id)
    doc['created_at'] = doc['created_at'].isoformat()
    return jsonify({'message': 'Feedback submitted', 'feedback': doc}), 201


@campus_bp.route('/api/feedback', methods=['GET'])
@token_required
@role_required('Faculty', 'Admin')
def get_feedback():
    """Faculty fetches feedback sent to them.
    Filtered automatically by the authenticated user's ID.
    Admin can pass ?all=1 to see everything.
    """
    db   = get_db()
    user = request.current_user

    if user.get('role') == 'Admin' and request.args.get('all') == '1':
        docs = list(db.feedback.find().sort('created_at', -1))
    else:
        docs = list(db.feedback.find(
            {'receiver_id': user.get('user_id')}
        ).sort('created_at', -1))

    return jsonify({'feedback': [serial(d) for d in docs]})


# ═══════════════════════════════════════════════════════════════════════════
# BOOKS
# ═══════════════════════════════════════════════════════════════════════════

DEFAULT_BOOKS = [
    {'title': 'Introduction to Algorithms',   'author': 'Cormen, Leiserson, Rivest & Stein', 'category': 'Data Structures',   'link': 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',           'icon': '🌳', 'color': '#6366f1'},
    {'title': 'Computer Networks',            'author': 'Andrew S. Tanenbaum',               'category': 'Networks',           'link': 'https://www.pearson.com/en-us/subject-catalog/p/computer-networks/P200000003188', 'icon': '🌐', 'color': '#3b82f6'},
    {'title': 'Database System Concepts',     'author': 'Silberschatz, Korth & Sudarshan',   'category': 'Database',           'link': 'https://www.db-book.com/',                                                       'icon': '💾', 'color': '#8b5cf6'},
    {'title': 'Operating System Concepts',    'author': 'Silberschatz & Galvin',             'category': 'Operating Systems',  'link': 'https://www.os-book.com/',                                                       'icon': '🖥️', 'color': '#ef4444'},
    {'title': 'Engineering Mathematics',      'author': 'B.S. Grewal',                       'category': 'Mathematics',        'link': 'https://www.khannaeducation.com/higher-engineering-mathematics/',                 'icon': '📐', 'color': '#f59e0b'},
    {'title': 'Concepts of Physics Vol. 1 & 2','author': 'H.C. Verma',                      'category': 'Physics',            'link': 'https://www.bharatibhawan.org/books/concepts-of-physics',                        'icon': '⚛️', 'color': '#10b981'},
    {'title': 'The Pragmatic Programmer',     'author': 'Hunt & Thomas',                     'category': 'Programming',        'link': 'https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/', 'icon': '💻', 'color': '#ec4899'},
    {'title': 'Clean Code',                   'author': 'Robert C. Martin',                  'category': 'Programming',        'link': 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882', 'icon': '🧹', 'color': '#f97316'},
    {'title': 'Discrete Mathematics',         'author': 'Kenneth H. Rosen',                  'category': 'Mathematics',        'link': 'https://www.mheducation.com/highered/product/discrete-mathematics-its-applications-rosen/M9781259676512.html', 'icon': '🔢', 'color': '#06b6d4'},
]


def seed_books_if_empty(db):
    """Insert default books once if collection is empty."""
    if db.books.count_documents({}) == 0:
        now = datetime.utcnow()
        for b in DEFAULT_BOOKS:
            db.books.insert_one({
                **b,
                'file_url':      '',
                'added_by':      'system',
                'added_by_name': 'System',
                'created_at':    now,
            })
        print('📚 Default books seeded into DB.')


@campus_bp.route('/api/uploads/books/<path:filename>')
def serve_book_upload(filename):
    """Serve uploaded book PDF files (no auth required so PDFs open directly in browser)."""
    return send_from_directory(UPLOAD_DIR, filename)


@campus_bp.route('/api/books', methods=['GET'])
@token_required
def get_books():
    """Return books scoped to the caller's role.

    - Admin   → every book (full visibility)
    - Faculty → system/library books + books they personally added
    - Student → system/library books + faculty-added books + books they personally added
    """
    db = get_db()
    seed_books_if_empty(db)

    user    = request.current_user
    role    = user.get('role', 'Student')
    user_id = user.get('user_id')

    if role == 'Admin':
        # Admin sees everything
        query = {}
    elif role == 'Faculty':
        # Faculty sees: shared system/library books + their own uploads only
        query = {'$or': [
            {'added_by': 'system'},
            {'added_by': user_id},
        ]}
    else:
        # Student sees: shared system/library books + anything a Faculty uploaded + their own
        query = {'$or': [
            {'added_by': 'system'},
            {'added_by_role': 'Faculty'},
            {'added_by': user_id},
        ]}

    docs = list(db.books.find(query).sort('created_at', -1))
    return jsonify({'books': [serial(d) for d in docs]})


@campus_bp.route('/api/books', methods=['POST'])
@token_required
def add_book():
    """Any authenticated user (Student, Faculty, Admin) can add a book.
    Accepts multipart/form-data (with optional pdf_file) or JSON.
    """
    ct = request.content_type or ''

    if 'multipart/form-data' in ct:
        title    = request.form.get('title', '').strip()
        author   = request.form.get('author', '').strip()
        category = request.form.get('category', 'General')
        link     = request.form.get('link', '').strip()
        icon     = request.form.get('icon', '📘')
        color    = request.form.get('color', '#6366f1')
        file_url = save_uploaded_pdf(request.files.get('pdf_file'))
    else:
        data     = request.json or {}
        title    = data.get('title', '').strip()
        author   = data.get('author', '').strip()
        category = data.get('category', 'General')
        link     = data.get('link', '').strip()
        icon     = data.get('icon', '📘')
        color    = data.get('color', '#6366f1')
        file_url = data.get('file_url', '').strip()

    if not title or not author:
        return jsonify({'error': 'Title and author are required'}), 400

    user = request.current_user
    doc = {
        'title':          title,
        'author':         author,
        'category':       category,
        'link':           link,
        'file_url':       file_url,
        'icon':           icon,
        'color':          color,
        'added_by':       user.get('user_id'),
        'added_by_name':  user.get('name', 'Unknown'),
        'added_by_role':  user.get('role', 'Student'),
        'created_at':     datetime.utcnow(),
    }
    db = get_db()
    result = db.books.insert_one(doc)
    doc['_id'] = str(result.inserted_id)
    doc['created_at'] = doc['created_at'].isoformat()
    return jsonify({'message': 'Book added', 'book': doc}), 201


@campus_bp.route('/api/books/<book_id>', methods=['PUT'])
@token_required
def update_book(book_id):
    """Edit a book — same ownership rules as delete.
    Accepts multipart/form-data (with optional pdf_file) or JSON.
    If a new PDF is uploaded, the old PDF file is deleted from disk.
    """
    db = get_db()
    try:
        oid = ObjectId(book_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    doc = db.books.find_one({'_id': oid})
    if not doc:
        return jsonify({'error': 'Not found'}), 404

    user     = request.current_user
    role     = user.get('role', 'Student')
    user_id  = user.get('user_id')
    owner_id = doc.get('added_by')

    if role == 'Admin':
        pass
    elif role == 'Faculty':
        if owner_id != user_id and owner_id != 'system':
            return jsonify({'error': 'You can only edit your own books'}), 403
    elif role == 'Student':
        if owner_id != user_id:
            return jsonify({'error': 'Students can only edit books they added'}), 403
    else:
        return jsonify({'error': 'Access denied'}), 403

    ct = request.content_type or ''
    update = {}

    if 'multipart/form-data' in ct:
        for field in ('title', 'author', 'category', 'link', 'icon', 'color'):
            val = request.form.get(field)
            if val is not None:
                update[field] = val.strip() if isinstance(val, str) else val
        # Handle optional new PDF upload — delete old file first
        new_file_url = save_uploaded_pdf(request.files.get('pdf_file'))
        if new_file_url:
            delete_file_if_exists(doc.get('file_url', ''))
            update['file_url'] = new_file_url
    else:
        data = request.json or {}
        for field in ('title', 'author', 'category', 'link', 'file_url', 'icon', 'color'):
            if field in data:
                update[field] = data[field].strip() if isinstance(data[field], str) else data[field]

    update['updated_at'] = datetime.utcnow()
    db.books.update_one({'_id': oid}, {'$set': update})
    updated = db.books.find_one({'_id': oid})
    return jsonify({'message': 'Book updated', 'book': serial(updated)})


@campus_bp.route('/api/books/<book_id>', methods=['DELETE'])
@token_required
def delete_book(book_id):
    """Delete a book with strict role-based ownership control.
    - Admin   → can delete any book
    - Faculty → can delete their own books + system books
    - Student → can ONLY delete books they personally added
    Uploaded PDF file is removed from disk on successful delete.
    """
    db = get_db()
    try:
        oid = ObjectId(book_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    doc = db.books.find_one({'_id': oid})
    if not doc:
        return jsonify({'error': 'Not found'}), 404

    user     = request.current_user
    role     = user.get('role', 'Student')
    user_id  = user.get('user_id')
    owner_id = doc.get('added_by')

    if role == 'Admin':
        pass  # full access
    elif role == 'Faculty':
        if owner_id != user_id and owner_id != 'system':
            return jsonify({'error': 'You can only delete your own books'}), 403
    elif role == 'Student':
        # Students may ONLY delete books they added themselves
        if owner_id != user_id:
            return jsonify({'error': 'Students can only delete books they added'}), 403
    else:
        return jsonify({'error': 'Access denied'}), 403

    # Remove uploaded PDF from disk before deleting the DB record
    delete_file_if_exists(doc.get('file_url', ''))

    db.books.delete_one({'_id': oid})
    return jsonify({'message': 'Book deleted'})
