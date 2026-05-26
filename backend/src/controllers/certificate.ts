import { type Request, type Response } from "express";
import Certificate from "../models/certificate.ts";
import { logActivity } from "../utils/activitieslog.ts";
import User from "../models/user.ts";
import Class from "../models/class.ts";

// @desc    Issue / Update Course Completion Certificate
// @route   POST /api/certificates/issue
// @access  Private (Admin only)
export const issueCertificate = async (req: Request, res: Response) => {
  try {
    const { studentId, grade, comments, courseName } = req.body;
    const adminId = (req as any).user._id;

    if (!studentId || !grade) {
      return res.status(400).json({ message: "Student and Grade are required." });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Find if certificate already exists, update it or create new
    let cert = await Certificate.findOne({ student: studentId });
    if (cert) {
      cert.grade = grade;
      cert.comments = comments;
      cert.courseName = courseName || cert.courseName;
      cert.issuedBy = adminId;
      cert.issueDate = new Date();
      await cert.save();
    } else {
      cert = await Certificate.create({
        student: studentId,
        issuedBy: adminId,
        grade,
        comments,
        courseName: courseName || "Full Academy Curriculum Completion",
      });
    }

    await logActivity({
      userId: adminId,
      action: `Issued completion certificate to student: ${student.name}`,
    });

    res.status(200).json({ message: "Certificate issued successfully", cert });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Certificate by Student ID
// @route   GET /api/certificates/student/:studentId
// @access  Private
export const getCertificateByStudentId = async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    const cert = await Certificate.findOne({ student: studentId })
      .populate("student", "name email role studentClass")
      .populate("issuedBy", "name email");

    if (!cert) {
      return res.status(404).json({ message: "No completion certificate found for this student." });
    }

    res.json(cert);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all certificates
// @route   GET /api/certificates
// @access  Private (Admin only)
export const getAllCertificates = async (req: Request, res: Response) => {
  try {
    const certs = await Certificate.find({})
      .populate("student", "name email studentClass")
      .populate("issuedBy", "name email");
    res.json(certs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an issued certificate
// @route   DELETE /api/certificates/:id
// @access  Private (Admin only)
export const deleteCertificate = async (req: Request, res: Response) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    await Certificate.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: (req as any).user._id,
      action: `Deleted completion certificate for student: ${cert.student}`,
    });

    res.json({ message: "Certificate deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
