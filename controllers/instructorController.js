// controllers/instructorController.js
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Submission = require("../models/Submission");
// const User = require("../models/User"); // Fallback if your scheme relies heavily on base collections

/**
 * @desc    Fetch comprehensive aggregated data matrices for an isolated instructor account
 * @route   GET /api/instructor/dashboard
 * @access  Private (Instructor only)
 */
exports.getInstructorDashboardTelemetry = async (req, res) => {
  try {
    const instructorId = req.user.id; // Harvested straight from decoded JWT payload

    // 1. Fetch all course architectures owned explicitly by this instructor
    const instructorCourses = await Course.find({ instructor: instructorId });
    const courseIds = instructorCourses.map(course => course._id);

    // 2. Metrics Pipeline calculations
    const totalCoursesCount = instructorCourses.length;

    // Aggregate unique student allocations across all owned courses
    const uniqueStudentsData = await Enrollment.distinct("student", { 
      course: { $in: courseIds } 
    });
    const totalStudentsCount = uniqueStudentsData.length;

    // Calculate dynamic processing queue length (e.g., Unmarked assessment arrays)
    const pendingGradingCount = await Submission.countDocuments({
      course: { $in: courseIds },
      status: "pending"
    });

    // Dummy/Simulated completion rate metrics logic—replace with actual structural db aggregations if tracked
    const calculatedMeanCompletion = 74; 

    // 3. Structural Course Blueprint mappings with metrics embedding
    const courseDirectoryBlueprint = await Promise.all(
      instructorCourses.map(async (course) => {
        const studentEnrollmentCount = await Enrollment.countDocuments({ course: course._id });
        
        // Extract tasks awaiting human verification parameters matching your frontend loop structure
        const rawPendingSubmissions = await Submission.find({ 
          course: course._id, 
          status: "pending" 
        }).populate("student", "fullName");

        const pendingTasksArray = rawPendingSubmissions.map(sub => ({
          submissionId: sub._id,
          taskName: sub.assignmentTitle || "Module Assessment Assignment",
          courseCode: course.code || "LMS-CORE",
          submittedAt: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "Just Now"
        }));

        return {
          _id: course._id,
          title: course.title,
          studentsCount: studentEnrollmentCount,
          modulesCount: course.modules?.length || 0,
          completionRate: course.averageCompletionProgress || 68, // fallback baseline ratio
          pendingTasks: pendingTasksArray
        };
      })
    );

    // 4. Time-series Engagement Deltas and Predictive Risk Warnings (Telemetry simulations)
    // Replace array simulations below with direct aggregate queries if your log metrics collection captures this deep telemetry
    const simulatedWeeklyEngagement = [45, 58, 62, 79, 84, 92];

    const simulatedAtRiskRadar = [
      { studentName: "Emmanuel Nduka", lastActiveWindow: "Absent 5 days", performanceDropPercentage: 14 },
      { studentName: "Sarah Alao", lastActiveWindow: "Absent 9 days", performanceDropPercentage: 28 },
      { studentName: "Chidi Okechukwu", lastActiveWindow: "Overdue 2 tasks", performanceDropPercentage: 19 }
    ];

    // Payload structures mapped entirely to expected client-side data layout keys
    return res.status(200).json({
      metrics: {
        totalStudents: totalStudentsCount,
        completionRate: calculatedMeanCompletion,
        pendingGrading: pendingGradingCount,
        activeCourses: totalCoursesCount
      },
      courses: courseDirectoryBlueprint,
      weeklyEngagement: simulatedWeeklyEngagement,
      atRiskStudents: simulatedAtRiskRadar
    });

  } catch (error) {
    console.error("Critical Backend Instructor Telemetry Compiler Fault:", error);
    return res.status(500).json({
      success: false,
      message: "Internal framework execution failure. Dashboard aggregation processing pipeline failed."
    });
  }
};
