import express from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Certificate from "../models/Certificate.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import LessonProgress from "../models/LessonProgress.js";
import { protect } from "../middleware/authMiddleware.js"; // Adjust based on your auth middleware path

const router = express.Router();

/* -------------------------------------------------------------
   1. GET CERTIFICATE STATUS (Checks eligibility & payment status)
------------------------------------------------------------- */
router.get("/course/:courseId", protect, async (req, res) => {
  try {
    const studentId = req.user._id;
    const { courseId } = req.params;

    // Fetch total and completed counts dynamically to verify eligibility
    const courseModules = await Module.find({ course: courseId });
    const moduleIds = courseModules.map(m => m._id);
    const totalLessons = await Lesson.countDocuments({ module: { $in: moduleIds } });

    const courseLessonIds = await Lesson.find({ module: { $in: moduleIds } }).select("_id");
    const completedLessons = await LessonProgress.countDocuments({
      student: studentId,
      lesson: { $in: courseLessonIds }
    });

    const isEligible = totalLessons > 0 && completedLessons >= totalLessons;

    // Check if certificate profile record exists
    const certificate = await Certificate.findOne({ student: studentId, course: courseId });

    return res.status(200).json({
      isEligible,
      totalLessons,
      completedLessons,
      hasCertificate: !!certificate,
      isPaid: certificate ? certificate.isPaid : false,
      certificateId: certificate ? certificate.certificateId : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* -------------------------------------------------------------
   2. INITIALIZE PAYMENT (Creates Paystack checkout session link)
------------------------------------------------------------- */
router.post("/initialize-payment", protect, async (req, res) => {
  try {
    const studentId = req.user._id;
    const { courseId } = req.body;

    // Verify completion safety metrics before allowing payment flow
    const courseModules = await Module.find({ course: courseId });
    const moduleIds = courseModules.map(m => m._id);
    const totalLessons = await Lesson.countDocuments({ module: { $in: moduleIds } });
    const courseLessonIds = await Lesson.find({ module: { $in: moduleIds } }).select("_id");
    const completedLessons = await LessonProgress.countDocuments({
      student: studentId,
      lesson: { $in: courseLessonIds }
    });

    if (totalLessons === 0 || completedLessons < totalLessons) {
      return res.status(400).json({ message: "You must finish all course lessons before buying a certificate." });
    }

    // Set your static price for a certificate (e.g., ₦5,000 = 500000 kobo)
    const certificatePriceKobo = 5000 * 100;

    // Initialize Paystack Gateway Request
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: certificatePriceKobo,
        // The frontend route where students land after paying successfully
        callback_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/student/certificate-callback`,
        metadata: {
          studentId,
          courseId,
          paymentType: "certificate_purchase"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json(paystackResponse.data.data);
  } catch (error) {
    console.error("Certificate initial payment error:", error);
    res.status(500).json({ message: "Failed to connect to gateway processing systems." });
  }
});

/* -------------------------------------------------------------
   3. VERIFY PAYMENT (The Callback handler that issues the certificate)
------------------------------------------------------------- */
router.get("/verify-payment/:reference", protect, async (req, res) => {
  try {
    const { reference } = req.params;

    // Call Paystack API to verify reference authenticity
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const transactionData = paystackResponse.data.data;

    if (transactionData.status === "success" && transactionData.metadata.paymentType === "certificate_purchase") {
      const { studentId, courseId } = transactionData.metadata;

      // Find or create structural record entry
      let certificate = await Certificate.findOne({ student: studentId, course: courseId });

      if (!certificate) {
        certificate = new Certificate({
          student: studentId,
          course: courseId,
          certificateId: `BX-${uuidv4().substring(0, 8).toUpperCase()}`
        });
      }

      certificate.isPaid = true;
      certificate.paymentReference = reference;
      await certificate.save();

      return res.status(200).json({
        message: "Payment verified. Certificate is officially issued!",
        certificate
      });
    }

    return res.status(400).json({ message: "Transaction validation rejected by gateway network." });
  } catch (error) {
    console.error("Verification endpoint error layout:", error);
    res.status(500).json({ message: "Internal server verification fault error." });
  }
});

export default router;