import axios from "axios";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import { applyXpToUser, recordLearningActivity } from "../utils/studentLearning.js";



// Initialize payment
export const initializePayment = async (req, res) => {

  try {

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


    const response =
      await axios.post(

        "https://api.paystack.co/transaction/initialize",

        {

          email: req.user.email,

          amount: course.price * 100,

          reference

        },

        {

          headers: {

            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

            "Content-Type":
              "application/json"

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

      authorization_url:
        response.data.data.authorization_url

    });

  }

  catch (error) {

    res.status(500).json({

      message: error.message

    });

  }

};




// Verify payment
export const verifyPayment = async (req, res) => {

  try {

    const reference =
      req.params.reference;


    const response =
      await axios.get(

        `https://api.paystack.co/transaction/verify/${reference}`,

        {

          headers: {

            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`

          }

        }

      );



    const payment =
      await Payment.findOne({

        reference

      });


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

    }


    res.json({

      message: "Payment verified"

    });

  }

  catch (error) {

    res.status(500).json({

      message: error.message

    });

  }

};