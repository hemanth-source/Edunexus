import { type Request, type Response } from "express";
import Class from "../models/class.ts";
import User from "../models/user.ts";
import { logActivity } from "../utils/activitieslog.ts";

// @desc    Create a new Class
// @route   POST /api/classes
// @access  Private/Admin
export const createClass = async (req: Request, res: Response) => {
  try {
    const { name, academicYear, classTeacher, capacity, subjects } = req.body;

    const existingClass = await Class.findOne({ name, academicYear });
    if (existingClass) {
      return res.status(400).json({
        message:
          "Class with this name already exists for the specified academic year.",
      });
    }

    const newClass = await Class.create({
      name,
      academicYear,
      classTeacher,
      capacity,
      subjects: Array.isArray(subjects) ? subjects : [],
    });
    await logActivity({
      userId: (req as any).user.id,
      action: `Created new class: ${newClass.name}`,
    });
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get All Classes
// @route   GET /api/classes
// @access  Private
export const getAllClasses = async (req: Request, res: Response) => {
  try {
    // 1. Parse Query Parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    // 2. Build Search Query (Case-insensitive regex on Name)
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // 3. Execute Query (Count & Find)
    const [total, classes] = await Promise.all([
      Class.countDocuments(query),
      Class.find(query)
        .populate("academicYear", "name")
        .populate("classTeacher", "name email")
        .populate("subjects", "_id name code")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    // Query active enrolled students dynamically to maintain dynamic accuracy and details
    const classesWithStudents = await Promise.all(
      classes.map(async (c) => {
        const enrolledStudents = await User.find({
          role: "student",
          studentClass: c._id as any,
        }).select("_id name email");

        const obj = c.toObject();
        obj.students = enrolledStudents as any;
        return obj;
      })
    );

    // 4. Return Data + Pagination Meta
    res.json({
      classes: classesWithStudents,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const { name, academicYear } = req.body;

    if (name && academicYear) {
      const existingClass = await Class.findOne({
        name,
        academicYear,
        _id: { $ne: classId },
      });
      if (existingClass) {
        return res.status(400).json({
          message:
            "Another class with this name already exists for the specified academic year.",
        });
      }
    }

    const updatedClass = await Class.findByIdAndUpdate(classId, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!updatedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    await logActivity({
      userId: (req as any).user.id,
      action: `Updated class: ${updatedClass.name}`,
    });

    return res.status(200).json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Delete Class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
export const deleteClass = async (req: Request, res: Response) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `Deleted class: ${deletedClass?.name}`,
    });
    if (!deletedClass) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.json({ message: "Class removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
