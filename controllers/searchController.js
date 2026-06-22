import Course from '../models/Course.js';
import User from '../models/User.js';

export const globalOmniboxSearch = async (req, res) => {
  try {
    const { q } = req.query;

    // If query string is missing or too short, return clean, empty payloads
    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    const searchRegex = new RegExp(q, 'i'); // 'i' flag ensures case-insensitive matching

    // Execute queries in parallel using Promise.all to save network execution time
    const [courses, users] = await Promise.all([
      // 1. Search Courses matching titles
      Course.find({ title: searchRegex })
        .select('title _id')
        .limit(5)
        .lean(),

      // 2. Search Users (Students, Instructors, Admins) matching names
      User.find({ name: searchRegex })
        .select('name role _id')
        .limit(5)
        .lean()
    ]);

    // Format both datasets into a single layout array matching what your React UI expects
    const formattedCourses = courses.map(course => ({
      id: course._id,
      title: course.title,
      type: 'course',
      path: `/courses/${course._id}`
    }));

    const formattedUsers = users.map(user => ({
      id: user._id,
      title: user.name,
      type: user.role, // Dynamically tracks 'student', 'instructor', or 'admin'
      path: `/dashboard/admin/users?id=${user._id}` // Example dashboard target link
    }));

    // Combine arrays into one unified list
    const unifiedResults = [...formattedCourses, ...formattedUsers];

    return res.status(200).json(unifiedResults);
  } catch (error) {
    console.error("Backend global search error instance:", error);
    return res.status(500).json({ message: "Internal server routing search failure" });
  }
};
