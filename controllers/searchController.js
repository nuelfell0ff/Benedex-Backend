import Course from '../models/Course.js';
import User from '../models/User.js';

export const globalOmniboxSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    // High performance case-insensitive text matching query 
    const searchRegex = new RegExp(q.trim(), 'i');

    const [courses, users] = await Promise.all([
      Course.find({ title: searchRegex }).select('title _id').limit(5).lean(),
      User.find({ fullName: searchRegex }).select('fullName role _id').limit(5).lean() 
      // Note: Changed matching query lookup identifier key targets if your model uses 'fullName' instead of 'name'
    ]);

    // Map properties explicitly into standard titles/paths for frontend component maps
    const formattedCourses = courses.map(course => ({
      title: course.title,
      path: `/student/courses/${course._id}`, // Adjust based on your viewport navigation structure
      type: 'Course'
    }));

    const formattedUsers = users.map(u => ({
      title: u.fullName || u.name,
      path: `/admin/users?id=${u._id}`,
      type: u.role || 'User'
    }));

    return res.status(200).json([...formattedCourses, ...formattedUsers]);
  } catch (error) {
    console.error("Backend entry sync breakdown instance:", error);
    return res.status(500).json({ message: "Search service dropped" });
  }
};
