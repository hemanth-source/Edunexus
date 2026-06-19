import express from "express";
import {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  getClassAttendanceSummary,
  getSchoolAttendanceSummary,
  getTodayAttendanceSnapshot,
} from "../controllers/attendance.ts";
import { protect, authorize } from "../middleware/auth.ts";

const attendanceRouter = express.Router();

// ── Existing Routes ───────────────────────────────────────────────────────────
attendanceRouter.post("/mark", protect, authorize(["teacher", "admin"]), markAttendance);
attendanceRouter.get("/class/:classId", protect, authorize(["teacher", "admin"]), getClassAttendance);
attendanceRouter.get("/student/:studentId", protect, getStudentAttendance);

// ── Summary Routes ────────────────────────────────────────────────────────────
// GET /api/attendance/summary/today    – Today's snapshot for all classes
attendanceRouter.get("/summary/today", protect, authorize(["teacher", "admin"]), getTodayAttendanceSnapshot);

// GET /api/attendance/summary/school   – School-wide summary + 30-day trend
attendanceRouter.get("/summary/school", protect, authorize(["admin"]), getSchoolAttendanceSummary);

// GET /api/attendance/summary/class/:classId – Per-class student breakdown
// Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (both optional)
attendanceRouter.get("/summary/class/:classId", protect, authorize(["teacher", "admin"]), getClassAttendanceSummary);

export default attendanceRouter;
