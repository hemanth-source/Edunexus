import { type Request, type Response } from "express";
import Assignment from "../models/assignment.ts";
import User from "../models/user.ts";
import Notification from "../models/notification.ts";
import { logActivity } from "../utils/activitieslog.ts";

// @desc    Create a new LMS Assignment
// @route   POST /api/assignments/create
// @access  Private (Teacher/Admin)
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { title, description, dueDate, subject, classId } = req.body;

    if (!title || !dueDate || !subject || !classId) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const assignment = await Assignment.create({
      title,
      description,
      dueDate,
      subject,
      classId,
      teacher: (req as any).user._id,
    });

    // Auto-Notify All Students in Class
    const students = await User.find({ role: "student", studentClass: classId });
    if (students.length > 0) {
      const notificationDocs = students.map((std) => ({
        recipient: std._id,
        sender: (req as any).user._id,
        title: "New Assignment Published",
        message: `A new assignment "${title}" has been published. Due date: ${new Date(dueDate).toLocaleDateString()}.`,
        type: "assignment",
      }));
      await Notification.insertMany(notificationDocs);
    }

    await logActivity({
      userId: (req as any).user._id,
      action: `Created new assignment: ${title}`,
    });

    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get All Assignments for a Class
// @route   GET /api/assignments/class/:classId
// @access  Private
export const getClassAssignments = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const assignments = await Assignment.find({ classId })
      .populate("subject", "name code")
      .populate("teacher", "name email")
      .sort({ dueDate: 1 });

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get All Assignments created by a Teacher
// @route   GET /api/assignments/teacher/:teacherId
// @access  Private (Teacher/Admin)
export const getTeacherAssignments = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const assignments = await Assignment.find({ teacher: teacherId })
      .populate("subject", "name code")
      .populate("classId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Update an Assignment
// @route   PUT /api/assignments/update/:id
// @access  Private (Teacher/Admin)
export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const { title, description, dueDate, subject, classId } = req.body;

    if (!title || !dueDate || !subject || !classId) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { title, description, dueDate, subject, classId },
      { new: true, runValidators: true }
    );

    if (!updatedAssignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    await logActivity({
      userId: (req as any).user._id,
      action: `Updated assignment: ${title}`,
    });

    res.status(200).json(updatedAssignment);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Delete an Assignment
// @route   DELETE /api/assignments/delete/:id
// @access  Private (Teacher/Admin)
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const deletedAssignment = await Assignment.findByIdAndDelete(req.params.id);

    if (!deletedAssignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    await logActivity({
      userId: (req as any).user._id,
      action: `Deleted assignment: ${deletedAssignment.title}`,
    });

    res.status(200).json({ message: "Assignment deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
