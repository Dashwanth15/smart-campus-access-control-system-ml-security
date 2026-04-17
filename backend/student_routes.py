"""
Student Routes - Student Data Management API
Smart Campus Network Access Control
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from bson import ObjectId
from auth import token_required, role_required

student_bp = Blueprint('students', __name__)

# BTech Engineering Subjects
SUBJECTS = [
    "Mathematics",
    "Physics", 
    "Data Structures",
    "Computer Networks",
    "Database Systems",
    "Operating Systems"
]


def get_students_collection():
    """Get the students collection from database"""
    from database import get_database
    return get_database().students


def get_users_collection():
    """Get the users collection from database"""
    from database import get_database
    return get_database().users


def init_student_data(user_id, name):
    """Initialize student data with default marks and attendance"""
    collection = get_students_collection()
    
    # Check if student data already exists
    existing = collection.find_one({"user_id": str(user_id)})
    if existing:
        return str(existing["_id"])
    
    student_data = {
        "user_id": str(user_id),
        "name": name,
        "student_id": f"STU{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "semester": 4,
        "branch": "Computer Science",
        "attendance": {
            "total_classes": 100,
            "attended": 85,
            "percentage": 85.0
        },
        "marks": {subject: {"obtained": 0, "total": 100, "grade": "N/A"} for subject in SUBJECTS},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = collection.insert_one(student_data)
    return str(result.inserted_id)


def calculate_grade(marks):
    """Calculate grade based on marks"""
    if marks >= 90:
        return "A+"
    elif marks >= 80:
        return "A"
    elif marks >= 70:
        return "B+"
    elif marks >= 60:
        return "B"
    elif marks >= 50:
        return "C"
    elif marks >= 40:
        return "D"
    else:
        return "F"


# =========================
# STUDENT ROUTES
# =========================

@student_bp.route('/api/students', methods=['GET'])
@token_required
@role_required('Faculty', 'Admin')
def get_all_students():
    """Get all students (Faculty/Admin only)"""
    collection = get_students_collection()
    students = list(collection.find())
    
    # Convert ObjectId to string
    for student in students:
        student["_id"] = str(student["_id"])
    
    return jsonify({"students": students, "count": len(students)})


@student_bp.route('/api/students/<student_id>', methods=['GET'])
@token_required
def get_student(student_id):
    """Get student details by ID"""
    collection = get_students_collection()
    
    # Try to find by _id or user_id
    student = None
    try:
        student = collection.find_one({"_id": ObjectId(student_id)})
    except:
        student = collection.find_one({"user_id": student_id})
    
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    # Check permissions - students can only view their own data
    current_user = request.current_user
    if current_user['role'] == 'Student':
        if student.get('user_id') != current_user.get('user_id'):
            return jsonify({"error": "Access denied"}), 403
    
    student["_id"] = str(student["_id"])
    return jsonify(student)


@student_bp.route('/api/students/me', methods=['GET'])
@token_required
@role_required('Student')
def get_my_data():
    """Get current student's own data"""
    collection = get_students_collection()
    user_id = request.current_user.get('user_id')
    
    student = collection.find_one({"user_id": user_id})
    if not student:
        return jsonify({"error": "Student data not found"}), 404
    
    student["_id"] = str(student["_id"])
    return jsonify(student)


@student_bp.route('/api/students/<student_id>/marks', methods=['GET'])
@token_required
def get_student_marks(student_id):
    """Get student marks"""
    collection = get_students_collection()
    
    student = None
    try:
        student = collection.find_one({"_id": ObjectId(student_id)})
    except:
        student = collection.find_one({"user_id": student_id})
    
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    return jsonify({
        "student_id": student.get("student_id"),
        "name": student.get("name"),
        "marks": student.get("marks", {}),
        "subjects": SUBJECTS
    })


@student_bp.route('/api/students/<student_id>/marks', methods=['PUT'])
@token_required
@role_required('Faculty', 'Admin')
def update_student_marks(student_id):
    """Update student marks (Faculty/Admin only)"""
    collection = get_students_collection()
    data = request.json
    
    # Try multiple lookup strategies
    student = None
    query_id = None
    
    # Try by ObjectId first
    try:
        student = collection.find_one({"_id": ObjectId(student_id)})
        if student:
            query_id = {"_id": ObjectId(student_id)}
    except:
        pass
    
    # Try by user_id
    if not student:
        student = collection.find_one({"user_id": student_id})
        if student:
            query_id = {"user_id": student_id}
    
    # Try by student_id field
    if not student:
        student = collection.find_one({"student_id": student_id})
        if student:
            query_id = {"student_id": student_id}
    
    if not student:
        print(f"Student not found for ID: {student_id}")
        return jsonify({"error": "Student not found"}), 404
    
    # Update marks
    marks_update = {}
    for subject, score in data.get("marks", {}).items():
        if subject in SUBJECTS:
            obtained = int(score) if isinstance(score, (int, float, str)) else score.get("obtained", 0)
            marks_update[f"marks.{subject}"] = {
                "obtained": obtained,
                "total": 100,
                "grade": calculate_grade(obtained)
            }
    
    if marks_update:
        marks_update["updated_at"] = datetime.utcnow()
        collection.update_one(query_id, {"$set": marks_update})
    
    return jsonify({"message": "Marks updated successfully"})


@student_bp.route('/api/students/<student_id>/attendance', methods=['GET'])
@token_required
def get_student_attendance(student_id):
    """Get student attendance"""
    collection = get_students_collection()
    
    student = None
    try:
        student = collection.find_one({"_id": ObjectId(student_id)})
    except:
        student = collection.find_one({"user_id": student_id})
    
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    return jsonify({
        "student_id": student.get("student_id"),
        "name": student.get("name"),
        "attendance": student.get("attendance", {})
    })


@student_bp.route('/api/students/<student_id>/attendance', methods=['PUT'])
@token_required
@role_required('Faculty', 'Admin')
def update_student_attendance(student_id):
    """Update student attendance (Faculty/Admin only)"""
    collection = get_students_collection()
    data = request.json
    
    # Try multiple lookup strategies
    student = None
    query_id = None
    
    # Try by ObjectId first
    try:
        student = collection.find_one({"_id": ObjectId(student_id)})
        if student:
            query_id = {"_id": ObjectId(student_id)}
    except:
        pass
    
    # Try by user_id
    if not student:
        student = collection.find_one({"user_id": student_id})
        if student:
            query_id = {"user_id": student_id}
    
    # Try by student_id field
    if not student:
        student = collection.find_one({"student_id": student_id})
        if student:
            query_id = {"student_id": student_id}
    
    if not student:
        print(f"Student not found for attendance update, ID: {student_id}")
        return jsonify({"error": "Student not found"}), 404
    
    # Update attendance
    total = int(data.get("total_classes", student["attendance"]["total_classes"]))
    attended = int(data.get("attended", student["attendance"]["attended"]))
    percentage = round((attended / total) * 100, 2) if total > 0 else 0
    
    collection.update_one(query_id, {
        "$set": {
            "attendance": {
                "total_classes": total,
                "attended": attended,
                "percentage": percentage
            },
            "updated_at": datetime.utcnow()
        }
    })
    
    return jsonify({"message": "Attendance updated successfully"})


@student_bp.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Get list of subjects"""
    return jsonify({"subjects": SUBJECTS})
