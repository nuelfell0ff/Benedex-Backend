import Course from '../models/Course.js';
import User from '../models/User.js';

export const globalOmniboxSearch = async (req, res) => {
  try {
    const { q } = req.query;
    // Assume your authentication middleware attaches user context to req.user
    const userRole = req.user?.role?.toLowerCase() || 'student';

    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    // 1. Build dynamic parallel database tasks based on user role permission layers
    const databaseTasks = [
      Course.find({ title: searchRegex }).select('title _id').limit(5).lean()
    ];

    // ONLY Instructors and Admins are permitted to look up student profiles
    if (userRole === 'instructor' || userRole === 'admin') {
      databaseTasks.push(
        User.find({ fullName: searchRegex, role: 'student' })
          .select('fullName role _id profileImage')
          .limit(5)
          .lean()
      );
    }

    const [courses, students] = await Promise.all(databaseTasks);

    // 2. Standardize property formatting keys for the frontend
    const formattedCourses = (courses || []).map(course => ({
      title: course.title,
      path: userRole === 'admin' ? `/admin/courses` : `/student/courses`,
      type: 'Course'
    }));

    const formattedStudents = (students || []).map(student => ({
      title: student.fullName,
      type: 'Student',
      // Pass crucial routing configurations directly downstream
      isStudentRedirect: true,
      studentData: {
        _id: student._id,
        fullName: student.fullName,
        profileImage: student.profileImage,
        courseContext: "Searched Profile Link"
      }
    }));

    return res.status(200).json([...formattedCourses, ...formattedStudents]);
  } catch (error) {
    console.error("Backend omnibox route query breakdown:", error);
    return res.status(500).json({ message: "Search compilation failed" });
  }
};
