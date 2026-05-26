import express from "express";
import {
  createAssignment,
  getClassAssignments,
  getTeacherAssignments,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignment.ts";
import { protect, authorize } from "../middleware/auth.ts";

const assignmentRouter = express.Router();

assignmentRouter.post("/create", protect, authorize(["teacher", "admin"]), createAssignment);
assignmentRouter.get("/class/:classId", protect, getClassAssignments);
assignmentRouter.get("/teacher/:teacherId", protect, authorize(["teacher", "admin"]), getTeacherAssignments);
assignmentRouter.put("/update/:id", protect, authorize(["teacher", "admin"]), updateAssignment);
assignmentRouter.delete("/delete/:id", protect, authorize(["teacher", "admin"]), deleteAssignment);

export default assignmentRouter;
