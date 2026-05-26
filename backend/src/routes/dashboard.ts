import express from "express";
import { getDashboardStats, generateDashboardInsight } from "../controllers/dashboard.ts";
import { protect } from "../middleware/auth.ts";

const dashboardRouter = express.Router();

// Get Stats (Role is determined by token)
dashboardRouter.get("/stats", protect, getDashboardStats);

// Get AI Insight
dashboardRouter.post("/insight", protect, generateDashboardInsight);

export default dashboardRouter;
