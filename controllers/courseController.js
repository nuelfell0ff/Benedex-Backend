import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Progress from "../models/Progress.js";
import { applyXpToUser, recordLearningActivity } from "../utils/studentLearning.js";
import sendPushNotification from "../utils/sendPushNotification.js";
import { logAdminActivity } from "../middleware/auditLogger.js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import axios from "axios";

// Helper: Slugify string
const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
};

// Helper: Fetch Unsplash Photo
const fetchUnsplashImage = async (query) => {
  try {
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query,
        per_page: 1,
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const photo = response.data.results[0];
      return {
        url: photo.urls.regular,
        photographerName: photo.user.name,
        photographerUrl: photo.user.links.html,
      };
    }
  } catch (error) {
    console.error(`Unsplash image query failed for "${query}":`, error.message);
  }

  return {
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
    photographerName: "Unsplash",
    photographerUrl: "https://unsplash.com",
  };
};

// ==========================================
// AI SYLLABUS COURSE GENERATOR (ADMIN ONLY)
// ==========================================
export const generateCourseFromSyllabus = async (req, res) => {
  try {
    const { syllabusText, price, duration, tools } = req.body;

    if (!syllabusText) {
      return res.status(400).json({ message: "Syllabus text is required." });
    }

    if (!process.env.BENEDEX_AI_API_KEY) {
      return res.status(500).json({ message: "BENEDEX_AI_API_KEY is missing in backend environment." });
    }

    const genAI = new GoogleGenerativeAI(process.env.BENEDEX_AI_API_KEY);

    // Schema for Course Architecture
    const outlineSchema = {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        suggestedTools: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        modules: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              month: { type: SchemaType.NUMBER },
              lessons: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    title: { type: SchemaType.STRING },
                    summary: { type: SchemaType.STRING },
                    imageSearchTerm: {
                      type: SchemaType.STRING,
                      description: "2-3 word photographic search keyword for Unsplash",
                    },
                  },
                  required: ["title", "summary", "imageSearchTerm"],
                },
              },
            },
            required: ["title", "lessons"],
          },
        },
      },
      required: ["title", "description", "modules"],
    };

    // Stage 1: Generate Curriculum Outline
    const outlineModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: outlineSchema,
      },
    });

    const outlinePrompt = `
      You are an expert curriculum designer. Break down this syllabus into a course structure with modules and lessons.
      Assign each module a month number starting at 1. Provide an image search keyword for each lesson.

      SYLLABUS:
      ${syllabusText}
    `;

    const outlineResult = await outlineModel.generateContent(outlinePrompt);
    const parsedOutline = JSON.parse(outlineResult.response.text());

    // Stage 2: Create Course DB Record
    const courseCover = await fetchUnsplashImage(parsedOutline.title);

    let baseSlug = slugify(parsedOutline.title);
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await Course.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${count}`;
      count++;
    }

    const course = await Course.create({
      title: parsedOutline.title,
      slug: uniqueSlug,
      description: parsedOutline.description,
      instructor: req.user._id,
      duration: duration || "3 Months",
      price: price || 0,
      tools: tools || parsedOutline.suggestedTools || [],
      image: courseCover.url,
      createdByAI: true,
      status: "published",
    });

    // Stage 3: Generate and Save Modules & Lessons sequentially into relational MongoDB Collections
    const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let moduleOrder = 1;
    for (const modData of parsedOutline.modules) {
      const createdModule = await Module.create({
        title: modData.title,
        description: modData.description || "",
        course: course._id,
        month: modData.month || 1,
        order: moduleOrder++,
      });

      let lessonOrder = 1;
      for (const lesData of modData.lessons) {
        const lessonPrompt = `
          Write a detailed educational lesson for the topic: "${lesData.title}".
          Lesson Context: ${lesData.summary}.

          Requirements:
          - Write comprehensive markdown text using headers, bullet points, and practical examples.
          - Conclude with 3 key takeaway bullet points.
        `;

        const lessonResult = await textModel.generateContent(lessonPrompt);
        const markdownContent = lessonResult.response.text();

        const imageData = await fetchUnsplashImage(lesData.imageSearchTerm || lesData.title);

        await Lesson.create({
          title: lesData.title,
          type: "text",
          content: markdownContent,
          illustrationUrl: imageData.url,
          photographerName: imageData.photographerName,
          photographerUrl: imageData.photographerUrl,
          module: createdModule._id,
          order: lessonOrder++,
          isPreview: lessonOrder === 2, // Make first lesson previewable
        });
      }
    }

    if (req.user && req.user.role === "admin") {
      await logAdminActivity(
        req,
        "COURSES",
        "CREATE",
        `AI generated full course structure for: "${course.title}"`
      );
    }

    res.status(201).json({
      success: true,
      message: "Course, modules, and lessons generated successfully!",
      courseId: course._id,
      course,
    });
  } catch (error) {
    console.error("AI Course Generation Error:", error);
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