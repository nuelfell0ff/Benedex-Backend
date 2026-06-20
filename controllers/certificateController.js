// controllers/certificateController.js
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Certificate from "../models/Certificate.js";
// Make sure this path points to your exact lesson progress model
import LessonProgress from "../models/LessonProgress.js"; 
import { v4 as uuidv4 } from "uuid";

export const checkAndGenerateCertificate = async (userId, courseId) => {
  try {
    // 1. If certificate already exists, return it immediately
    const existingCert = await Certificate.findOne({ student: userId, course: courseId });
    if (existingCert) return existingCert;

    // 2. Fetch all modules belonging to this course
    const courseModules = await Module.find({ course: courseId });
    const moduleIds = courseModules.map(m => m._id);

    // 3. Count total lessons within this course's modules
    const totalLessonsCount = await Lesson.countDocuments({ module: { $in: moduleIds } });

    // 4. Count how many of these specific lessons the user completed
    const courseLessonIds = await Lesson.find({ module: { $in: moduleIds } }).select("_id");
    const completedLessonsCount = await LessonProgress.countDocuments({
      student: userId,
      lesson: { $in: courseLessonIds }
    });

    // 5. Issue the certificate if all conditions match up
    if (totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount) {
      const newCertificate = new Certificate({
        student: userId,
        course: courseId,
        certificateId: `BX-${uuidv4().substring(0, 8).toUpperCase()}`
      });

      await newCertificate.save();
      return newCertificate;
    }

    return null;
  } catch (error) {
    console.error("Error in certificate engine tracker:", error);
    throw error;
  }
};