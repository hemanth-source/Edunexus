import express from "express";
import {
  getSchoolSettings,
  updateSchoolSettings,
} from "../controllers/schoolSettings.ts";
import { protect, authorize } from "../middleware/auth.ts";

const schoolSettingsRouter = express.Router();

schoolSettingsRouter.get("/school", protect, getSchoolSettings);
schoolSettingsRouter.post("/school", protect, authorize(["admin"]), updateSchoolSettings);

export default schoolSettingsRouter;
