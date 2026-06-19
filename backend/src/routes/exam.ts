import express from "express";
import {
  triggerExamGeneration,
  getExams,
  submitExam,
  getExamById,
  toggleExamStatus,
  getExamResult,
  deleteExam,
  updateExamQuestions,
  getExamStats,
  getTeacherExamStats,
  getClassExamStats,
  getExamOverview,
} from "../controllers/exam.ts";
import { protect, authorize } from "../middleware/auth.ts";

const examRouter = express.Router();

// ── Generation & Listing ──────────────────────────────────────────────────────
examRouter.post("/generate", protect, authorize(["teacher", "admin"]), triggerExamGeneration);
examRouter.get("/", protect, authorize(["teacher", "student", "admin"]), getExams);

// ── Statistics Routes (must come before /:id routes to avoid param collision) ─
// GET /api/exams/stats/overview    – Admin platform-wide overview
examRouter.get("/stats/overview", protect, authorize(["admin"]), getExamOverview);

// GET /api/exams/stats/teacher     – Teacher portfolio stats (?teacherId=... for admin)
examRouter.get("/stats/teacher", protect, authorize(["teacher", "admin"]), getTeacherExamStats);

// GET /api/exams/stats/class/:classId – All exams + stats for a specific class
examRouter.get("/stats/class/:classId", protect, authorize(["teacher", "admin"]), getClassExamStats);

// ── Exam-level Actions ────────────────────────────────────────────────────────
// GET /api/exams/:id/stats  – Detailed stats for a single exam
examRouter.get("/:id/stats", protect, authorize(["teacher", "admin"]), getExamStats);

examRouter.post("/:id/submit", protect, authorize(["student", "admin"]), submitExam);
examRouter.patch("/:id/status", protect, authorize(["teacher", "admin"]), toggleExamStatus);
examRouter.get("/:id/result", protect, authorize(["student", "admin", "teacher"]), getExamResult);
examRouter.get("/:id", protect, authorize(["teacher", "student", "admin"]), getExamById);
examRouter.delete("/:id", protect, authorize(["teacher", "admin"]), deleteExam);
examRouter.put("/:id/questions", protect, authorize(["teacher", "admin"]), updateExamQuestions);

export default examRouter;
