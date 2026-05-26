import { type Request, type Response } from "express";
import User from "../models/user.ts";
import Class from "../models/class.ts";
import Exam from "../models/exam.ts";
import Submission from "../models/submission.ts";
import ActivityLog from "../models/activitieslog.ts";
import Timetable from "../models/timetable.ts";
import Attendance from "../models/attendance.ts";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// Helper to get day name (e.g., "Monday")
const getTodayName = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long" });

// @desc    Get Dashboard Statistics (Role Based)
// @route   GET /api/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let stats = {};
    // Get last 5 activities system-wide (Admin) or personal (Others)
    const activityQuery = user.role === "admin" ? {} : { user: user._id };
    const recentActivities = await ActivityLog.find(activityQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name");

    const formattedActivity = recentActivities.map(
      (log) =>
        `${(log.user as any).name}: ${log.action} (${new Date(
          log.createdAt as any
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
    );

    if (user.role === "admin") {
      const totalStudents = await User.countDocuments({ role: "student" });
      const totalTeachers = await User.countDocuments({ role: "teacher" });
      const activeExams = await Exam.countDocuments({ isActive: true });

      // Mocking Attendance (You'd need an Attendance model for real data)
      const avgAttendance = "94.5%";

      stats = {
        totalStudents,
        totalTeachers,
        activeExams,
        avgAttendance,
        recentActivity: formattedActivity,
      };
    } else if (user.role === "teacher") {
      // 1. Count classes assigned to teacher
      const myClassesCount = await Class.countDocuments({
        classTeacher: user._id,
      });

      // 2. Pending Grading: Submissions for my exams that have no score yet
      // First find exams created by this teacher
      const myExams = await Exam.find({ teacher: user._id }).select("_id");
      const myExamIds = myExams.map((exam) => exam._id);
      const pendingGrading = await Submission.countDocuments({
        exam: { $in: myExamIds },
        score: 0, // Assuming 0 or null means ungraded
      });

      // 3. Next Class (Simplified Logic)
      // Find timetables where teacher is teaching today
      const today = getTodayName();
      // Complex aggregation could go here, but let's do a simple find for now
      // This is a placeholder for the logic to find the specific period based on current time
      const nextClass = "Mathematics - Grade 10";
      const nextClassTime = "10:00 AM";

      stats = {
        myClassesCount,
        pendingGrading,
        nextClass,
        nextClassTime,
        recentActivity: formattedActivity,
      };
    } else if (user.role === "student") {
      // 1. Assignments/Exams Due
      const nextExam = await Exam.findOne({
        class: user.studentClass,
        dueDate: { $gte: new Date() },
      }).sort({ dueDate: 1 });

      const pendingAssignments = await Exam.countDocuments({
        class: user.studentClass,
        isActive: true,
        dueDate: { $gte: new Date() },
      });

      // 2. Attendance (Dynamic Count)
      const totalAttendanceDays = await Attendance.countDocuments({ student: user._id });
      let myAttendance = "N/A";
      if (totalAttendanceDays > 0) {
        const presentOrLate = await Attendance.countDocuments({
          student: user._id,
          status: { $in: ["present", "late"] },
        });
        myAttendance = `${Math.round((presentOrLate / totalAttendanceDays) * 100)}%`;
      }

      stats = {
        myAttendance,
        pendingAssignments,
        nextExam: nextExam?.title || "No upcoming exams",
        nextExamDate: nextExam
          ? new Date(nextExam.dueDate).toLocaleDateString()
          : "",
        recentActivity: formattedActivity,
      };
    } else if (user.role === "parent") {
      const studentIds = user.parentOf || [];
      
      let nextExam = null;
      let pendingAssignments = 0;
      let myAttendance = "N/A";

      if (studentIds.length > 0) {
        const studentClasses = await User.find({ _id: { $in: studentIds } }).distinct("studentClass");
        
        nextExam = await Exam.findOne({
          class: { $in: studentClasses },
          dueDate: { $gte: new Date() },
        }).sort({ dueDate: 1 });

        pendingAssignments = await Exam.countDocuments({
          class: { $in: studentClasses },
          isActive: true,
          dueDate: { $gte: new Date() },
        });

        const totalAttendanceDays = await Attendance.countDocuments({ student: { $in: studentIds } });
        if (totalAttendanceDays > 0) {
          const presentOrLate = await Attendance.countDocuments({
            student: { $in: studentIds },
            status: { $in: ["present", "late"] },
          });
          myAttendance = `${Math.round((presentOrLate / totalAttendanceDays) * 100)}%`;
        }
      }

      stats = {
        myAttendance,
        pendingAssignments,
        nextExam: nextExam?.title || "No upcoming exams",
        nextExamDate: nextExam
          ? new Date(nextExam.dueDate).toLocaleDateString()
          : "",
        recentActivity: formattedActivity,
      };
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get AI Academic Advisor Insight (Dynamic & Custom)
// @route   POST /api/dashboard/insight
export const generateDashboardInsight = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (user.role === "student") {
      const classId = user.studentClass;
      const totalAttendanceDays = await Attendance.countDocuments({ student: user._id });
      const totalSubmissions = await Submission.countDocuments({ student: user._id });
      const upcomingExams = await Exam.find({
        class: classId,
        dueDate: { $gte: new Date() },
      }).sort({ dueDate: 1 });

      // IDENTIFY A NEW STUDENT (No attendance, no quiz/submission logs yet)
      if (totalAttendanceDays === 0 && totalSubmissions === 0) {
        return res.json({
          text: `Welcome to your student dashboard, ${user.name}! We don't have enough academic data yet to generate insights. Explore your course modules and study materials, or review your class timetable to get started!`,
        });
      }

      // Compile actual context details
      let dynamicContext = `Student Name: ${user.name}\n`;
      let presentDays = 0;
      let attendancePercentage = 100;
      
      if (totalAttendanceDays > 0) {
        presentDays = await Attendance.countDocuments({
          student: user._id,
          status: { $in: ["present", "late"] },
        });
        attendancePercentage = Math.round((presentDays / totalAttendanceDays) * 100);
        dynamicContext += `Attendance Rate: ${attendancePercentage}% (${presentDays}/${totalAttendanceDays} days)\n`;
      }
      
      if (totalSubmissions > 0) {
        const gradedSubmissions = await Submission.find({ student: user._id, score: { $gt: 0 } });
        dynamicContext += `Total Quiz Submissions: ${totalSubmissions}\n`;
        if (gradedSubmissions.length > 0) {
          const avgScore = gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length;
          dynamicContext += `Average Quiz Score: ${avgScore.toFixed(1)}%\n`;
        }
      }

      if (upcomingExams.length > 0) {
        dynamicContext += `Upcoming Exams: ${upcomingExams.map(e => `"${e.title}" due on ${new Date(e.dueDate).toLocaleDateString()}`).join(", ")}\n`;
      }

      if (apiKey) {
        try {
          const google = createGoogleGenerativeAI({ apiKey });
          const { text } = await generateText({
            model: google("gemini-1.5-flash"),
            prompt: `You are an AI Academic Advisor. Give a concise, professional study tip or recommendation (max 2 sentences) based on this student context:\n${dynamicContext}`,
          });
          return res.json({ text: text.trim() });
        } catch (geminiError: any) {
          console.warn("⚠️ Dashboard student insight Gemini call failed, using fallback:", geminiError.message);
        }
      }

      let adviceText = `Study Tip: `;
      if (upcomingExams.length > 0) {
        const nextExam = upcomingExams[0];
        adviceText += `Your exam "${nextExam.title}" is scheduled soon. Focus on reviewing key concepts and study materials to prepare! `;
      } else {
        adviceText += `Review your course syllabus and keep ahead of assignment timelines. `;
      }

      if (attendancePercentage < 90) {
        adviceText += `Additionally, your attendance is at ${attendancePercentage}%. Try attending all upcoming classes to stay on track.`;
      } else {
        adviceText += `Great job keeping a strong attendance of ${attendancePercentage}%! Keep up the high standard.`;
      }

      return res.json({ text: adviceText });
    } else if (user.role === "teacher") {
      const myClassesCount = await Class.countDocuments({ classTeacher: user._id });
      const myExams = await Exam.find({ teacher: user._id }).select("_id");
      const ungradedSubmissions = await Submission.countDocuments({
        exam: { $in: myExams.map((e) => e._id) },
        score: 0,
      });

      if (apiKey) {
        try {
          const google = createGoogleGenerativeAI({ apiKey });
          const { text } = await generateText({
            model: google("gemini-1.5-flash"),
            prompt: `You are an AI School Advisor. Give a concise, professional notification or class observation (max 2 sentences) for a teacher with ${myClassesCount} assigned classes and ${ungradedSubmissions} ungraded quiz submissions.`,
          });
          return res.json({ text: text.trim() });
        } catch (geminiError: any) {
          console.warn("⚠️ Dashboard teacher insight Gemini call failed, using fallback:", geminiError.message);
        }
      }

      let advice = `Advisor Observation: You have ${myClassesCount} classes assigned. `;
      if (ungradedSubmissions > 0) {
        advice += `There are ${ungradedSubmissions} pending quiz submissions that require grading. Consider reviewing them today!`;
      } else {
        advice += `All student quizzes are currently graded. Keep up the great organization!`;
      }
      return res.json({ text: advice });
    } else if (user.role === "parent") {
      const studentIds = user.parentOf || [];
      const numStudents = studentIds.length;
      
      if (apiKey) {
        try {
          const google = createGoogleGenerativeAI({ apiKey });
          const { text } = await generateText({
            model: google("gemini-1.5-flash"),
            prompt: `You are an AI School Advisor for parents. Give a concise, encouraging message (max 2 sentences) for a parent overseeing ${numStudents} enrolled students at Edunexus.`,
          });
          return res.json({ text: text.trim() });
        } catch (geminiError: any) {
          console.warn("⚠️ Dashboard parent insight Gemini call failed, using fallback:", geminiError.message);
        }
      }

      let advice = `Parent Advisor: You are actively tracking ${numStudents} students. `;
      advice += `Check the Student Records and Attendance tabs to stay updated on their academic progress.`;
      return res.json({ text: advice });
    } else {
      const totalStudents = await User.countDocuments({ role: "student" });
      const totalTeachers = await User.countDocuments({ role: "teacher" });
      return res.json({
        text: `Platform Analytics: Edunexus is currently hosting ${totalStudents} students and ${totalTeachers} teachers across all grades. Systems are fully operational.`,
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to generate AI insight" });
  }
};
