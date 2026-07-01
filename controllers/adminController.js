import User from "../models/User.js";
import Course from "../models/Course.js";
import Payment from "../models/Payment.js";
import Submission from "../models/Submission.js";
import PaymentTicket from "../models/PaymentTicket.js"; 
import AiMessage from "../models/AiMessage.js";        

// 👇 IMPORT THE LOGGING SERVICE HERE
import { logAdminActivity } from "../middleware/auditLogger.js";

export const getAdminAnalytics = async (req, res) => {
  try {
    // Users
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalInstructors = await User.countDocuments({ role: "instructor" });

    // Courses
    const totalCourses = await Course.countDocuments();

    // Enrollments
    const courses = await Course.find();
    const totalEnrollments = courses.reduce(
      (total, course) => total + course.students.length,
      0
    );

    // Revenue
    const successfulPayments = await Payment.find({ status: "success" });
    const totalRevenue = successfulPayments.reduce(
      (total, payment) => total + payment.amount,
      0
    );

    // Pending submissions
    const pendingSubmissions = await Submission.countDocuments({ status: "pending" });

    // Recent payments
    const recentPayments = await Payment.find({ status: "success" })
      .populate("student", "fullName email")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    // 🛡️ SECURITY AUDIT TRAIL: Log analytics data view entry
    await logAdminActivity(
      req,
      "ANALYTICS",
      "VIEW",
      "Loaded and viewed the main metrics dashboard and financial data streams."
    );

    res.json({
      overview: {
        totalStudents,
        totalInstructors,
        totalCourses,
        totalEnrollments,
        totalRevenue,
        pendingSubmissions
      },
      recentPayments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🆕 FETCH ALL PENDING AND RESOLVED AI-GENERATED TICKETS FOR ADMIN DASHBOARD
export const getPaymentTickets = async (req, res) => {
  try {
    const tickets = await PaymentTicket.find()
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 });
    
    // 🛡️ SECURITY AUDIT TRAIL: Log viewing support tickets
    await logAdminActivity(
      req,
      "SUPPORT_TICKETS",
      "VIEW",
      "Opened and audited the active support tickets data grid."
    );

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🆕 RESOLVE OR REJECT PAYMENT TICKETS FROM THE ADMIN PANEL
export const resolvePaymentTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { action, adminNotes } = req.body; // action: 'resolved' or 'rejected'

    const ticket = await PaymentTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Payment ticket tracking record not found." });
    }

    ticket.status = action === "resolved" ? "resolved" : "rejected";
    ticket.adminNotes = adminNotes || "Processed by Admin Console Operations.";
    await ticket.save();

    // Dynamically insert an update notice into the user's AI assistant history log window
    const systemNoticeText = action === "resolved"
      ? `🚨 ADMIN UPDATE: Your payment reference "${ticket.paymentReference}" for the course "${ticket.courseName}" has been verified and APPROVED. Your access has been provisioned.`
      : `🚨 ADMIN UPDATE: Your payment reference "${ticket.paymentReference}" has been REJECTED. Reason: ${ticket.adminNotes}`;

    await AiMessage.create({
      userId: ticket.userId,
      role: "model",
      message: systemNoticeText
    });

    // 🛡️ SECURITY AUDIT TRAIL: Log exact action details, target ticket, and payment reference code
    const actionUppercase = action.toUpperCase(); // 'RESOLVED' or 'REJECTED'
    await logAdminActivity(
      req,
      "SUPPORT_TICKETS",
      "UPDATE",
      `${actionUppercase} payment ticket reference [${ticket.paymentReference}] for course: "${ticket.courseName}".`
    );

    res.status(200).json({ message: "Ticket processed successfully and user notified.", ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};