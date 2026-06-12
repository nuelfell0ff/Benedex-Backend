import axios from "axios";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import { applyXpToUser, recordLearningActivity } from "../utils/studentLearning.js";



// Initialize payment
export const initializePayment = async (req, res) => {

  try {

    // Ensure Paystack secret is configured
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey || paystackKey === "your_secret_key") {
      console.error("PAYSTACK_SECRET_KEY is not set or is a placeholder.");
      return res.status(500).json({
        message: "Server misconfiguration: PAYSTACK_SECRET_KEY is not set. Please set it in the .env file."
      });
    }
    const course = await Course.findById(
      req.body.courseId
    );

    if (!course) {

      return res.status(404).json({

        message: "Course not found"

      });

    }

    const reference =
      "BEN_" + Date.now();

    const callbackUrl = req.body.callbackUrl;


    const response = await axios.post(

      "https://api.paystack.co/transaction/initialize",

      {

        email: req.user.email,

        amount: course.price * 100,

        reference,

        callback_url: callbackUrl

      },

      {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json"
        }
      }
    );



    await Payment.create({

      student: req.user._id,
      course: course._id,
      amount: course.price,
      reference

    });


    res.json({
      authorization_url: response.data.data.authorization_url,
      reference
    });

  } catch (error) {
    console.error("Payment initialize error:", error.response?.data || error.message);
    res.status(500).json({
      message: error.response?.data?.message || error.message || "Payment initialization failed"
    });
  }
};




// Verify payment
export const verifyPayment = async (req, res) => {

  try {

    // Ensure Paystack secret is configured
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey || paystackKey === "your_secret_key") {
      console.error("PAYSTACK_SECRET_KEY is not set or is a placeholder.");
      return res.status(500).json({
        message: "Server misconfiguration: PAYSTACK_SECRET_KEY is not set. Please set it in the .env file."
      });
    }

    const reference = req.params.reference;


    const response =
      await axios.get(

        `https://api.paystack.co/transaction/verify/${reference}`,

        {
          headers: {
            Authorization: `Bearer ${paystackKey}`
          }
        }

      );



    const payment =
      await Payment.findOne({

        reference

      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found in database."
      });
    }

    if (payment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "This payment does not belong to the authenticated user."
      });
    }

    if (payment.status === "success") {
      return res.json({
        success: true,
        courseId: payment.course,
        message: "Payment already verified"
      });
    }


    if (
      response.data.data.status ===
      "success"
    ) {

      payment.status =
        "success";

      await payment.save();



      // auto enrollment
      const course =
        await Course.findById(
          payment.course
        );


      if (
        !course.students.includes(
          payment.student
        )
      ) {

        course.students.push(
          payment.student
        );

        await course.save();

      }



      await Progress.create({

        student: payment.student,
        course: payment.course,
        completedModules: []

      });

      const student = await User.findById(payment.student);

      if (student) {
        await applyXpToUser(student, 10);

        await recordLearningActivity({
          student: payment.student,
          type: "course_enrolled",
          title: `Enrolled in ${course.title}`,
          points: 10
        });
      }

      return res.json({
        success: true,
        courseId: payment.course,
        message: "Payment verified and enrollment completed"
      });

    }

    payment.status = "failed";
    await payment.save();


    // send structured response back to client with course id and success flag
    res.status(400).json({
      success: false,
      courseId: payment.course,
      message: "Paystack did not confirm this payment"
    });

  } catch (error) {
    console.error("Payment verify error:", error.response?.data || error.message);
    res.status(500).json({
      message: error.response?.data?.message || error.message || "Payment verification failed"
    });
  }
};

// Get all payments for admin audit ledger
export const getAllPaymentsForAdmin = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized as an admin" });
    }

    const payments = await Payment.find({})
      .populate("student", "fullName email")
      .populate("course", "title")
      .sort({ createdAt: -1 }); // Newest payments first

    res.json(payments);
  } catch (error) {
    console.error("Admin payments fetch failure:", error.message);
    res.status(500).json({ message: "Failed to retrieve ecosystem transactions" });
  }
};
