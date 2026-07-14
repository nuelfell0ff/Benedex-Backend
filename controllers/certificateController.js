// controllers/certificateController.js
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Certificate from "../models/Certificate.js";
import LessonProgress from "../models/LessonProgress.js"; 
import { v4 as uuidv4 } from "uuid";

/**
 * INTERNAL ENGINE HELPER
 * Checks if a student has completed all lessons in a course and generates a certificate if eligible.
 */
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

/**
 * PUBLIC HTTP CONTROLLER
 * Looks up a certificate by its custom short unique string (e.g., BX-A1B2C3D4).
 * Completely public route used by QR scanners—no auth middleware required.
 */
export const getCertificateByUniqueId = async (req, res) => {
  try {
    const { certificateId } = req.params;

    // Find the certificate and populate the student's name and the course title
    const certificate = await Certificate.findOne({ certificateId })
      .populate("student", "fullName") 
      .populate("course", "title");    

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: "This certificate is invalid or does not exist in the Benedex registry." 
      });
    }

    // Return the safe, public data parameters to display on the frontend page
    res.status(200).json({
      success: true,
      data: {
        studentName: certificate.student.fullName,
        courseTitle: certificate.course.title,
        issueDate: certificate.createdAt,
        certificateId: certificate.certificateId
      }
    });
  } catch (error) {
    console.error("Error in public certificate lookup:", error);
    res.status(500).json({ 
      success: false,
      message: "Verification lookup failure: " + error.message 
    });
  }
};
