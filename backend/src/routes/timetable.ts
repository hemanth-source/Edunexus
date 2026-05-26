import express from "express";
import { generateTimetable, getTimetable, saveTimetable, getTeacherPersonalTimetable } from "../controllers/timetable.ts";
import { protect, authorize } from "../middleware/auth.ts";

const timeRouter = express.Router();

// Generate: Admin only (costs money/resources)
timeRouter.post("/generate", protect, authorize(["admin"]), generateTimetable);

// Save manually: Admin only
timeRouter.post("/save", protect, authorize(["admin"]), saveTimetable);

// Personal Schedule: Teachers
timeRouter.get("/teacher/personal", protect, authorize(["teacher"]), getTeacherPersonalTimetable);

// View: Everyone (Students need to see their schedule)
timeRouter.get("/:classId", protect, getTimetable);

export default timeRouter;
