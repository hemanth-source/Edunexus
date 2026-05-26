import { type Request, type Response } from "express";
import Material from "../models/material.ts";
import { logActivity } from "../utils/activitieslog.ts";

// @desc    Upload new study resource/material
// @route   POST /api/materials/upload
// @access  Private (Teacher/Admin)
export const uploadMaterial = async (req: Request, res: Response) => {
  try {
    const { title, description, fileUrl, subject, classId } = req.body;

    if (!title || !fileUrl || !subject || !classId) {
      return res.status(400).json({ message: "Please provide all required parameters." });
    }

    const material = await Material.create({
      title,
      description,
      fileUrl,
      subject,
      classId,
      uploadedBy: (req as any).user._id,
    });

    await logActivity({
      userId: (req as any).user._id,
      action: `Uploaded study material: ${title}`,
    });

    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get All Study Materials for a Class
// @route   GET /api/materials/class/:classId
// @access  Private
export const getClassMaterials = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const materials = await Material.find({ classId })
      .populate("subject", "name code")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
