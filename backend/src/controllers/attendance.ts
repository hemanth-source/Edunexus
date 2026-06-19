import { type Request, type Response } from "express";
import Attendance from "../models/attendance.ts";
import User from "../models/user.ts";
import Class from "../models/class.ts";
import Notification from "../models/notification.ts";
import { logActivity } from "../utils/activitieslog.ts";

// @desc    Mark or Update Attendance for a Class
// @route   POST /api/attendance/mark
// @access  Private (Teacher/Admin)
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { classId, date, records, subject, timeSlot } = req.body; // records: [{ studentId, status: "present" | "absent" | "late" }]

    if (!classId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "Invalid request body parameters." });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0); // Normalize date to midnight UTC for clean calendar grouping

    const operations = records.map((rec: { studentId: string; status: string }) => {
      const queryObj: any = {
        student: rec.studentId,
        classId,
        date: attendanceDate,
        subject: subject || null,
        timeSlot: timeSlot || null,
      };

      return Attendance.findOneAndUpdate(
        queryObj,
        { status: rec.status },
        { upsert: true, new: true, runValidators: true }
      );
    });

    await Promise.all(operations);

    // Notify parents if their student children are marked absent
    for (const rec of records) {
      if (rec.status === "absent") {
        try {
          const studentUser = await User.findById(rec.studentId);
          if (studentUser && studentUser.parent) {
            await Notification.create({
              recipient: studentUser.parent,
              sender: (req as any).user._id,
              title: "Absence Alert",
              message: `${studentUser.name} was marked ABSENT today. Please review the attendance sheet.`,
              type: "system",
            });
          }
        } catch (err) {
          console.error("Failed to trigger parent absence alert notification:", err);
        }
      }
    }

    await logActivity({
      userId: (req as any).user._id,
      action: `Marked attendance for class: ${classId} on date: ${attendanceDate.toDateString()}`,
    });

    res.status(200).json({ message: "Attendance sheets marked successfully." });
  } catch (error) {
    console.error("❌ markAttendance API error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get Attendance History for a Class on a Specific Date
// @route   GET /api/attendance/class/:classId
// @access  Private (Teacher/Admin)
export const getClassAttendance = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { date, subject, timeSlot } = req.query;

    const query: any = { classId };

    if (date) {
      const queryDate = new Date(date as string);
      queryDate.setUTCHours(0, 0, 0, 0);
      query.date = queryDate;
    }

    query.subject = subject || null;
    query.timeSlot = timeSlot || null;

    const records = await Attendance.find(query)
      .populate("student", "name email role")
      .populate("subject", "name code")
      .sort({ date: -1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get Attendance Statistics for a Student
// @route   GET /api/attendance/student/:studentId
// @access  Private (Student self, Teacher, Admin, or Parent of student)
export const getStudentAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const requestingUser = (req as any).user;

    // Authorization: parent can only access their own children's attendance
    if (requestingUser.role === "parent") {
      const parentOf = (requestingUser.parentOf || []).map((id: any) => id.toString());
      if (!parentOf.includes(studentId?.toString())) {
        return res.status(403).json({ message: "You are not authorized to view this student's attendance." });
      }
    }

    const records = await Attendance.find({ student: studentId })
      .populate("classId", "name")
      .populate("subject", "name code")
      .sort({ date: -1 });

    const stats = {
      total: records.length,
      present: records.filter((r) => r.status === "present").length,
      absent: records.filter((r) => r.status === "absent").length,
      late: records.filter((r) => r.status === "late").length,
      percentage: 0,
    };

    if (stats.total > 0) {
      stats.percentage = Math.round(((stats.present + stats.late) / stats.total) * 100);
    }

    res.status(200).json({ stats, records });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE SUMMARY APIS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get per-class attendance summary with individual student breakdown
// @route   GET /api/attendance/summary/class/:classId
// @query   startDate (ISO string, optional), endDate (ISO string, optional)
// @access  Private (Teacher/Admin)
export const getClassAttendanceSummary = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    // Build date range filter
    const dateFilter: any = {};
    if (startDate) {
      const start = new Date(startDate as string);
      start.setUTCHours(0, 0, 0, 0);
      dateFilter.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const attendanceQuery: any = { classId };
    if (Object.keys(dateFilter).length > 0) {
      attendanceQuery.date = dateFilter;
    }

    // Fetch all records for this class in the date range
    const allRecords = await Attendance.find(attendanceQuery).lean();

    // Get all students in the class
    const students = await User.find({ role: "student", studentClass: classId })
      .select("_id name email")
      .lean();

    // Aggregate per student
    const studentSummaries = students.map((student) => {
      const studentRecords = allRecords.filter(
        (r) => r.student.toString() === student._id.toString()
      );
      const total = studentRecords.length;
      const present = studentRecords.filter((r) => r.status === "present").length;
      const absent = studentRecords.filter((r) => r.status === "absent").length;
      const late = studentRecords.filter((r) => r.status === "late").length;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        studentId: student._id,
        name: student.name,
        email: student.email,
        stats: { total, present, absent, late, percentage },
      };
    });

    // Class-wide aggregate
    const totalRecords = allRecords.length;
    const totalPresent = allRecords.filter((r) => r.status === "present").length;
    const totalAbsent = allRecords.filter((r) => r.status === "absent").length;
    const totalLate = allRecords.filter((r) => r.status === "late").length;
    const overallPercentage =
      totalRecords > 0 ? Math.round(((totalPresent + totalLate) / totalRecords) * 100) : 0;

    // Count how many unique days attendance was recorded
    const uniqueDays = [
      ...new Set(allRecords.map((r) => new Date(r.date).toISOString().split("T")[0])),
    ];

    res.status(200).json({
      classId,
      totalDaysRecorded: uniqueDays.length,
      overall: {
        total: totalRecords,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        percentage: overallPercentage,
      },
      students: studentSummaries,
    });
  } catch (error) {
    console.error("❌ getClassAttendanceSummary error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get school-wide attendance summary with per-class breakdown + 30-day daily trend
// @route   GET /api/attendance/summary/school
// @access  Private (Admin only)
export const getSchoolAttendanceSummary = async (req: Request, res: Response) => {
  try {
    // 30-day window
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    // Fetch all records in the last 30 days
    const recentRecords = await Attendance.find({ date: { $gte: thirtyDaysAgo } }).lean();

    // All-time totals
    const allTimeTotal = await Attendance.countDocuments();
    const allTimePresentLate = await Attendance.countDocuments({
      status: { $in: ["present", "late"] },
    });
    const overallPercentage =
      allTimeTotal > 0 ? Math.round((allTimePresentLate / allTimeTotal) * 100) : 0;

    // Per-class summary (last 30 days)
    const classes = await Class.find({}).select("_id name").lean();
    const classSummaries = classes.map((cls) => {
      const classRecords = recentRecords.filter(
        (r) => r.classId.toString() === cls._id.toString()
      );
      const total = classRecords.length;
      const presentLate = classRecords.filter(
        (r) => r.status === "present" || r.status === "late"
      ).length;
      const absent = classRecords.filter((r) => r.status === "absent").length;
      const percentage = total > 0 ? Math.round((presentLate / total) * 100) : 0;
      return {
        classId: cls._id,
        className: cls.name,
        stats: { total, present: presentLate, absent, percentage },
      };
    });

    // Daily trend for the last 30 days
    const trendMap: Record<
      string,
      { present: number; absent: number; late: number; total: number }
    > = {};
    for (const record of recentRecords) {
      const dayKey = new Date(record.date).toISOString().split("T")[0]!;
      const statusKey = record.status as "present" | "absent" | "late";
      
      if (!trendMap[dayKey]) {
        trendMap[dayKey] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      
      if (statusKey === "present" || statusKey === "absent" || statusKey === "late") {
        trendMap[dayKey][statusKey]++;
      }
      trendMap[dayKey].total++;
    }

    const dailyTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        ...counts,
        percentage:
          counts.total > 0
            ? Math.round(((counts.present + counts.late) / counts.total) * 100)
            : 0,
      }));

    res.status(200).json({
      allTime: {
        total: allTimeTotal,
        presentOrLate: allTimePresentLate,
        absent: allTimeTotal - allTimePresentLate,
        percentage: overallPercentage,
      },
      last30Days: {
        total: recentRecords.length,
        present: recentRecords.filter((r) => r.status === "present").length,
        absent: recentRecords.filter((r) => r.status === "absent").length,
        late: recentRecords.filter((r) => r.status === "late").length,
      },
      classSummaries,
      dailyTrend,
    });
  } catch (error) {
    console.error("❌ getSchoolAttendanceSummary error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get today's attendance snapshot across all classes
// @route   GET /api/attendance/summary/today
// @access  Private (Admin/Teacher)
export const getTodayAttendanceSnapshot = async (req: Request, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const todayRecords = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    const totalStudents = await User.countDocuments({ role: "student" });

    const present = todayRecords.filter((r) => r.status === "present").length;
    const absent = todayRecords.filter((r) => r.status === "absent").length;
    const late = todayRecords.filter((r) => r.status === "late").length;
    const totalMarked = todayRecords.length;

    // Find which classes have been marked today
    const markedClassIds = [
      ...new Set(todayRecords.map((r) => r.classId.toString())),
    ];
    const allClasses = await Class.find({}).select("_id name").lean();
    const totalClasses = allClasses.length;

    const classSnapshots = allClasses.map((cls) => {
      const classRecords = todayRecords.filter(
        (r) => r.classId.toString() === cls._id.toString()
      );
      const hasBeenMarked = classRecords.length > 0;
      const clsPresent = classRecords.filter((r) => r.status === "present").length;
      const clsAbsent = classRecords.filter((r) => r.status === "absent").length;
      const clsLate = classRecords.filter((r) => r.status === "late").length;

      return {
        classId: cls._id,
        className: cls.name,
        hasBeenMarked,
        present: clsPresent,
        absent: clsAbsent,
        late: clsLate,
        total: classRecords.length,
      };
    });

    res.status(200).json({
      date: todayStart.toISOString().split("T")[0],
      totalStudentsInSchool: totalStudents,
      totalClassesInSchool: totalClasses,
      classesMarkedToday: markedClassIds.length,
      classesNotMarkedToday: totalClasses - markedClassIds.length,
      totals: {
        marked: totalMarked,
        present,
        absent,
        late,
        attendancePercentage:
          totalMarked > 0 ? Math.round(((present + late) / totalMarked) * 100) : 0,
      },
      classSnapshots,
    });
  } catch (error) {
    console.error("❌ getTodayAttendanceSnapshot error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
