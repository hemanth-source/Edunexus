import express from "express";
import {
  generateTimetable,
  getTimetable,
  saveTimetable,
  getTeacherPersonalTimetable,
  getActiveClassesNow,
  getStudentActiveClass,
} from "../controllers/timetable.ts";
import { protect, authorize } from "../middleware/auth.ts";

const timeRouter = express.Router();

// ── Management Routes ─────────────────────────────────────────────────────────
// Generate: Admin only (costs money/resources)
timeRouter.post("/generate", protect, authorize(["admin"]), generateTimetable);

// Save manually: Admin only
timeRouter.post("/save", protect, authorize(["admin"]), saveTimetable);

// ── Active Class Routes (must come before /:classId to avoid param collision) ─
// GET /api/timetables/active-now          – School-wide live class view
timeRouter.get(
  "/active-now",
  protect,
  authorize(["admin", "teacher"]),
  getActiveClassesNow
);

// GET /api/timetables/active-now/student  – Student's own current period
timeRouter.get(
  "/active-now/student",
  protect,
  authorize(["student"]),
  getStudentActiveClass
);

// ── Personal & Class Schedule Routes ─────────────────────────────────────────
// Personal Schedule: Teachers
timeRouter.get("/teacher/personal", protect, authorize(["teacher"]), getTeacherPersonalTimetable);

// View: Everyone (Students need to see their schedule)
timeRouter.get("/:classId", protect, getTimetable);

export default timeRouter;
