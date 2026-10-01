import axios from "axios";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import {
  applyXpToUser,
  recordLearningActivity,
} from "../utils/studentLearning.js";

// Central audit logger service
import { logAdminActivity } from "../middleware/auditLogger.js";

// ==========================================
// INITIALIZE PAYMENT
// ==========================================

export const initializePayment = async (req, res) => {
  try {
    // Ensure Paystack secret is configured
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey || paystackKey === "your_secret_key") {
      console.error(
        "PAYSTACK_SECRET_KEY is not set or is a placeholder."
      );

      return res.status(500).json({
        message:
          "Server misconfiguration: PAYSTACK_SECRET_KEY is not set. Please set it in the .env file.",
      });
    }

    const course = await Course.findById(req.body.courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const reference = "BEN_" + Date.now();
    const callbackUrl = req.body.callbackUrl;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: course.price * 100,
        reference,
        callback_url: callbackUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    await Payment.create({
      student: req.user._id,
      course: course._id,
      amount: course.price,
      reference,
    });

    res.json({
      authorization_url:
        response.data.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error(
      "Payment initialize error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        "Payment initialization failed",
    });
  }
};

// ==========================================
// VERIFY PAYMENT
// ==========================================

export const verifyPayment = async (req, res) => {
  try {
    // Ensure Paystack secret is configured
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey || paystackKey === "your_secret_key") {
      console.error(
        "PAYSTACK_SECRET_KEY is not set or is a placeholder."
      );

      return res.status(500).json({
        message:
          "Server misconfiguration: PAYSTACK_SECRET_KEY is not set. Please set it in the .env file.",
      });
    }

    const reference = req.params.reference;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
        },
      }
    );

    const payment = await Payment.findOne({ reference });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found in database.",
      });
    }

    if (
      payment.student.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This payment does not belong to the authenticated user.",
      });
    }

    // Prevent processing an already successful payment
    if (payment.status === "success") {
      return res.json({
        success: true,
        courseId: payment.course,
        message: "Payment already verified",
      });
    }

    // ==========================================
    // PAYMENT SUCCESSFUL
    // ==========================================

    if (response.data.data.status === "success") {
      payment.status = "success";

      await payment.save();

      // Auto enrollment
      const course = await Course.findById(payment.course);

      if (!course) {
        return res.status(404).json({
          success: false,
          message:
            "Payment verified, but associated course was not found.",
        });
      }

      if (!course.students.includes(payment.student)) {
        course.students.push(payment.student);
        await course.save();
      }

      // Create progress record
      await Progress.create({
        student: payment.student,
        course: payment.course,
        completedModules: [],
      });

      // Award XP and record learning activity
      const student = await User.findById(payment.student);

      if (student) {
        await applyXpToUser(student, 10);

        await recordLearningActivity({
          student: payment.student,
          type: "course_enrolled",
          title: `Enrolled in ${course.title}`,
          points: 10,
        });
      }

      return res.json({
        success: true,
        courseId: payment.course,
        message:
          "Payment verified and enrollment completed",
      });
    }

    // ==========================================
    // PAYMENT FAILED
    // ==========================================

    payment.status = "failed";

    await payment.save();

    res.status(400).json({
      success: false,
      courseId: payment.course,
      message: "Paystack did not confirm this payment",
    });
  } catch (error) {
    console.error(
      "Payment verify error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        "Payment verification failed",
    });
  }
};

// ==========================================
// GET ALL PAYMENTS FOR ADMIN
// PAGINATED: 20 PER REQUEST
// ==========================================

export const getAllPaymentsForAdmin = async (req, res) => {
  try {
    // ==========================================
    // ADMIN SECURITY CHECK
    // ==========================================

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Administrator privileges required.",
      });
    }

    // ==========================================
    // PAGINATION
    // ==========================================

    const {
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    // Never allow more than 20 payments per request
    const paymentsPerPage = Math.min(
      Math.max(parseInt(limit, 10) || 20, 1),
      20
    );

    const skip =
      (currentPage - 1) * paymentsPerPage;

    // ==========================================
    // FETCH PAYMENTS
    // ==========================================

    const payments = await Payment.find({})
      .populate("student", "fullName email")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(paymentsPerPage)
      .lean();

    // ==========================================
    // CHECK IF MORE PAYMENTS EXIST
    // ==========================================

    const nextPayment = await Payment.findOne({})
      .sort({ createdAt: -1 })
      .skip(skip + paymentsPerPage)
      .select("_id")
      .lean();

    const hasMore = Boolean(nextPayment);

    // ==========================================
    // SECURITY AUDIT TRAIL
    // ==========================================

    await logAdminActivity(
      req,
      "PAYMENT",
      "VIEW",
      `Accessed payment transaction registry page ${currentPage} with ${paymentsPerPage} records per request.`
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    res.json({
      success: true,
      payments,
      page: currentPage,
      limit: paymentsPerPage,
      hasMore,
    });
  } catch (error) {
    console.error(
      "Admin payments fetch failure:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to retrieve ecosystem transactions",
    });
  }
};