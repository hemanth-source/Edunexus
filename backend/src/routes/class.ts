import express from "express";
import {
  createClass,
  updateClass,
  deleteClass,
  getAllClasses,
} from "../controllers/class.ts";
import { authorize, protect } from "../middleware/auth.ts";

const classRouter = express.Router();

classRouter.post("/create", protect, authorize(["admin"]), createClass);
classRouter.get("/", protect, authorize(["admin", "teacher", "student"]), getAllClasses);
classRouter.put("/update/:id", protect, authorize(["admin"]), updateClass);
classRouter.patch("/update/:id", protect, authorize(["admin"]), updateClass);
classRouter.delete("/delete/:id", protect, authorize(["admin"]), deleteClass);

export default classRouter;
