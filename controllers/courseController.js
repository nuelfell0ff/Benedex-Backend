import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import { applyXpToUser, recordLearningActivity } from "../utils/studentLearning.js";
import sendPushNotification from "../utils/sendPushNotification.js";
import { logAdminActivity } from "../middleware/auditLogger.js";
import { generateAndSaveModules } from "./moduleController.js";
import { fetchUnsplashImage, callOpenRouterAI, slugify } from "../utils/aiHelpers.js";

// ==========================================
// AI SYLLABUS COURSE GENERATOR (ENTRY POINT)
// ==========================================
export const generateCourseFromSyllabus = async (req, res) => {
  try {
    const { syllabusText, price, duration, tools } = req.body;

    if (!syllabusText) {
      return res.status(400).json({ message: "Syllabus text is required." });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "OPENROUTER_API_KEY is missing in backend environment variables." });
    }

    // Step 1: Prompt AI for Course Overview & Module Skeleton Outline
    const outlinePrompt = `
      You are an elite academic curriculum designer. Analyze the syllabus text below and output the overarching course metadata and an outline of all modules and their respective lesson titles.
      Return ONLY a valid raw JSON object starting with '{' and ending with '}'. Do not wrap in markdown code blocks.

      REQUIRED JSON SCHEMA:
      {
        "title": "Comprehensive Course Title",
        "description": "Extensive course summary",
        "suggestedTools": ["Tool 1", "Tool 2"],
        "modules": [
          {
            "title": "Module Title",
            "description": "Module overview",
            "month": 1,
            "lessonTitles": ["Lesson Title 1", "Lesson Title 2", "Lesson Title 3", "Lesson Title 4"]
          }
        ]
      }

      SYLLABUS:
      ${syllabusText}
    `;

    console.log("Step 1: Generating course outline...");
    const courseOutline = await callOpenRouterAI(outlinePrompt, apiKey);

    // Step 2: Create Course DB Record
    const courseCover = await fetchUnsplashImage(courseOutline.title);

    let baseSlug = slugify(courseOutline.title);
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await Course.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${count}`;
      count++;
    }

    const course = await Course.create({
      title: courseOutline.title,
      slug: uniqueSlug,
      description: courseOutline.description,
      instructor: req.user._id,
      duration: duration || "3 Months",
      price: price || 0,
      tools: tools || courseOutline.suggestedTools || [],
      image: courseCover.url,
      createdByAI: true,
      status: "published",
    });

    // Step 3: Delegate module creation to moduleController
    console.log(`Step 2: Course created (${course._id}). Handing off to module controller...`);
    await generateAndSaveModules(course._id, courseOutline.title, courseOutline.modules, apiKey);

    if (req.user && req.user.role === "admin") {
      await logAdminActivity(
        req,
        "COURSES",
        "CREATE",
        `AI generated complete multi-controller course structure for: "${course.title}"`
      );
    }

    res.status(201).json({
      success: true,
      message: "Comprehensive course generated successfully via multi-controller pipeline!",
      courseId: course._id,
      course,
    });
  } catch (error) {
    console.error("AI Course Generation Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to generate course", error: error.message });
  }
};

// Create Course (Standard Manual)
export const createCourse = async (req, res) => {
  try {
    const course = await Course.create({
      title: req.body.title,
      slug: req.body.slug,
      description: req.body.description,
      price: req.body.price,
      tools: req.body.tools,
      instructor: req.user._id,
    });

    if (req.user && req.user.role === "admin") {
      await logAdminActivity(
        req,
        "COURSES",
        "CREATE",
        `Created a brand new course entitled: "${course.title}"`
      );
    }

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all courses
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("instructor", "fullName email");

    if (req.user && req.user.role === "admin") {
      await logAdminActivity(
        req,
        "COURSES",
        "VIEW",
        "Accessed and viewed the courses management data stream."
      );
    }

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

    const alreadyEnrolled = course.students.includes(req.user._id);
    if (alreadyEnrolled) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    course.students.push(req.user._id);
    await course.save();

    await Progress.create({
      student: req.user._id,
      course: course._id,
      completedModules: [],
    });

    await applyXpToUser(req.user, 10);

    await recordLearningActivity({
      student: req.user._id,
      type: "course_enrolled",
      title: `Enrolled in ${course.title}`,
      points: 10,
    });

    res.json({ message: "Enrollment successful", course });

    try {
      await sendPushNotification(req.user._id, {
        title: "🚀 Enrollment Confirmed!",
        body: `Welcome to "${course.title}". Your learning path is unlocked!`,
        url: `/student/course/${course._id}`,
      });
    } catch (pushError) {
      console.error("Background task course enrollment push failure:", pushError);
    }
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

// Get courses for instructor view
export const getInstructorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .populate({
        path: "students",
        select: "fullName profileImage role email",
      })
      .select("title students");

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};