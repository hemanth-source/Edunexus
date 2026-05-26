import { type Request, type Response } from "express";
import Attendance from "../models/attendance.ts";
import User from "../models/user.ts";
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
      if (!parentOf.includes(studentId.toString())) {
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
