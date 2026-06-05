import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import { applyXpToUser, recordLearningActivity } from "../utils/studentLearning.js";

// Create Course
export const createCourse = async (req, res) => {
  try {
    const course = await Course.create({
      title: req.body.title,
      slug: req.body.slug,
      description: req.body.description,
      price: req.body.price,
      tools: req.body.tools,
      instructor: req.user._id
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all courses
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructor", "fullName email");
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get one course
export const getSingleCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Student enrollment
export const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // prevent duplicate enrollment
    const alreadyEnrolled = course.students.includes(req.user._id);
    if (alreadyEnrolled) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    // add student
    course.students.push(req.user._id);
    await course.save();

    // create progress tracking
    await Progress.create({
      student: req.user._id,
      course: course._id,
      completedModules: []
    });

    await applyXpToUser(req.user, 10);

    await recordLearningActivity({
      student: req.user._id,
      type: "course_enrolled",
      title: `Enrolled in ${course.title}`,
      points: 10
    });

    res.json({ message: "Enrollment successful", course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get registered courses for student chat view
export const getStudentCourses = async (req, res) => {
  try {
    const enrolledCourses = await Course.find({ students: req.user._id })
      .populate("instructor", "fullName profileImage role")
      .select("title instructor");

    res.status(200).json(enrolledCourses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// NEW: Get courses for instructor view with fully populated student rosters
export const getInstructorCourses = async (req, res) => {
  try {
    // Find courses taught by this instructor and swap in the actual student data
    const courses = await Course.find({ instructor: req.user._id })
      .populate({
        path: "students",
        select: "fullName profileImage role email" // Selects everything the chat dashboard needs
      })
      .select("title students");

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
