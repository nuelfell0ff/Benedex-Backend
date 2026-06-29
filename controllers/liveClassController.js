import LiveClass from "../models/LiveClass.js";
import { recordLearningActivity } from "../utils/studentLearning.js";
// 1. Import your new push notification utility
import sendPushNotification from "../utils/sendPushNotification.js";
// Assuming you have access to a Course model to get the student list
import Course from "../models/Course.js"; 

// Create live class
export const createLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.create({
      title: req.body.title,
      description: req.body.description,
      course: req.body.course,
      meetingLink: req.body.meetingLink,
      platform: req.body.platform,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      instructor: req.user._id
    });

    // Send HTTP response immediately so the admin/instructor interface stays snappy
    res.status(201).json(liveClass);

    // 2. BACKGROUND TASK: Broadcast Chrome Push Notifications to all enrolled students
    try {
      const courseData = await Course.findById(req.body.course);
      
      if (courseData && Array.isArray(courseData.students)) {
        // Map through all student IDs and fire notifications in parallel
        courseData.students.forEach(async (studentId) => {
          await sendPushNotification(studentId, {
            title: "🔴 New Live Class Scheduled!",
            body: `"${req.body.title}" has been scheduled. Check your dashboard timeline.`,
            url: "/student/live-classes" // Redirects them to live classes view when clicked
          });
        });
      }
    } catch (pushError) {
      console.error("Background broadcast push notification failure:", pushError);
    }

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Get classes for a course
export const getCourseLiveClasses = async (req, res) => {
  try {
    const classes = await LiveClass.find({
      course: req.params.courseId
    })
      .populate("instructor", "fullName")
      .sort({
        startTime: 1
      });

    res.json(classes);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Get classes available to the logged-in student
export const getStudentLiveClasses = async (req, res) => {
  try {
    const classes = await LiveClass.find()
      .populate("instructor", "fullName")
      .populate("course", "title students")
      .sort({
        startTime: 1
      });

    const visibleClasses = classes.filter((liveClass) =>
      Array.isArray(liveClass.course?.students)
        ? liveClass.course.students.some((id) => id.toString() === req.user._id.toString())
        : false
    );

    res.json(visibleClasses);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// Join a live class
export const joinLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.classId)
      .populate("course", "title students");

    if (!liveClass) {
      return res.status(404).json({
        message: "Live class not found"
      });
    }

    const enrolled = Array.isArray(liveClass.course?.students)
      ? liveClass.course.students.some((id) => id.toString() === req.user._id.toString())
      : false;

    if (!enrolled) {
      return res.status(403).json({
        message: "You need to enroll in this course before joining the live class"
      });
    }

    const alreadyJoined = Array.isArray(liveClass.attendees)
      ? liveClass.attendees.some((id) => id.toString() === req.user._id.toString())
      : false;

    if (!alreadyJoined) {
      liveClass.attendees.push(req.user._id);
      await liveClass.save();

      await recordLearningActivity({
        student: req.user._id,
        type: "live_class_joined",
        title: `Joined live class: ${liveClass.title}`,
        points: 0
      });
    }

    res.json({
      message: "Live class joined",
      meetingLink: liveClass.meetingLink,
      liveClassId: liveClass._id
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};