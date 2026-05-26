import express from "express";
import {
  uploadMaterial,
  getClassMaterials,
} from "../controllers/material.ts";
import { protect, authorize } from "../middleware/auth.ts";

const materialRouter = express.Router();

materialRouter.post("/upload", protect, authorize(["teacher", "admin"]), uploadMaterial);
materialRouter.get("/class/:classId", protect, getClassMaterials);

export default materialRouter;
