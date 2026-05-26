import express from "express";
import {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
} from "../controllers/attendance.ts";
import { protect, authorize } from "../middleware/auth.ts";

const attendanceRouter = express.Router();

attendanceRouter.post("/mark", protect, authorize(["teacher", "admin"]), markAttendance);
attendanceRouter.get("/class/:classId", protect, authorize(["teacher", "admin"]), getClassAttendance);
attendanceRouter.get("/student/:studentId", protect, getStudentAttendance);

export default attendanceRouter;
