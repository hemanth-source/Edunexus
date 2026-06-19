import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog.ts";
import Exam from "../models/exam.ts";
import Subject from "../models/subject.ts";
import Class from "../models/class.ts";
import Submission from "../models/submission.ts";
import { inngest } from "../inngest/index.ts";
import User from "../models/user.ts";
import { sendEmail } from "../utils/sendEmail.ts";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// @desc    Trigger AI Exam Generation
// @route   POST /api/exams/generate
export const triggerExamGeneration = async (req: Request, res: Response) => {
  try {
    const {
      title,
      subject,
      class: classId,
      duration,
      dueDate,
      topic,
      difficulty,
      count,
    } = req.body;
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc)
      return res.status(404).json({ message: "Subject not found" });

    const teacherId = (req as any).user._id;
    const draftExam = await Exam.create({
      title: title || `Auto-Generated: ${topic}`,
      subject,
      class: classId,
      teacher: teacherId,
      duration: duration || 60,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week
      isActive: false, // Draft mode
      questions: [], // Empty for now, Inngest will fill this
    });

    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `User triggered exam generation: ${draftExam._id}`,
    });

    try {
      await inngest.send({
        name: "exam/generate",
        data: {
          examId: draftExam._id,
          topic,
          subjectName: subjectDoc.name,
          difficulty: difficulty || "Medium",
          count: count || 10,
        },
      });
      res.status(202).json({
        message: "Exam generation started.",
        examId: draftExam._id,
      });
    } catch (inngestError) {
      console.warn("⚠️ Inngest dev server not reachable. Running synchronous exam generation fallback...");

      // Synchronous Generator Fallback
      let generatedQuestions = [];
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      if (!apiKey) {
        // Dynamic Mock Exam Generator
        for (let i = 1; i <= (count || 5); i++) {
          generatedQuestions.push({
            questionText: `Question ${i}: Which of the following is a key component of ${topic || "general concepts"} in ${subjectDoc.name}?`,
            type: "MCQ",
            options: [
              `Incorrect theory A about ${topic}`,
              `Incorrect theory B about ${topic}`,
              `The verified core principle of ${topic}`,
              `An unproven hypothesis regarding ${topic}`
            ],
            correctAnswer: `The verified core principle of ${topic}`,
            points: 1
          });
        }
      } else {
        // Live Gemini Question Builder
        const prompt = `
          You are a strict teacher. Create a JSON array of ${count || 10} multiple-choice questions for a high school exam.

          CONTEXT:
          - Subject: ${subjectDoc.name}
          - Topic: ${topic}
          - Difficulty: ${difficulty || "Medium"}

          STRICT JSON SCHEMA (Array of Objects):
          [
            {
              "questionText": "Question string",
              "type": "MCQ",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctAnswer": "The exact string of the correct option",
              "points": 1
            }
          ]

          RULES:
          1. Output ONLY raw JSON. No Markdown.
          2. Ensure correct answer matches one of the options exactly.
        `;

        const google = createGoogleGenerativeAI({ apiKey });
        const activeModel = google("gemini-3-flash-preview");
        const { text } = await generateText({ prompt, model: activeModel });
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        generatedQuestions = JSON.parse(cleanJson);
      }

      // Save generated questions to the draft exam
      draftExam.questions = generatedQuestions;
      draftExam.isActive = true; // Auto-activate on synchronous fallback for instant usability!
      await draftExam.save();

      res.status(201).json({
        message: "Exam generated successfully synchronously.",
        examId: draftExam._id,
        redirect: true,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Create/Publish Exam we won't use it
// @route   POST /api/exams
export const createExam = async (req: Request, res: Response) => {
  try {
    const exam = await Exam.create({
      ...req.body,
      teacher: (req as any).user._id, // From Auth Middleware
    });
    const userId = (req as any).user._id;
    await logActivity({ userId, action: "User created a new exam" });
    res.status(201).json(exam);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Exams (Student sees available, Teacher sees created)
// @route   GET /api/exams
export const getExams = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = {};

    if (user.role === "student") {
      // Students see exams for their class only
      query = { class: user.studentClass, isActive: true };
    } else if (user.role === "teacher") {
      // Teachers see exams they created
      query = { teacher: user._id };
    }

    const exams = await Exam.find(query)
      .populate("subject", "name")
      .populate("class", "name section")
      .select("-questions.correctAnswer"); // Hide answers!

    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get exam by id
// @route   POST /api/exams/:id
export const getExamById = async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const user = (req as any).user; // Assumes authMiddleware attaches user

    // 1. Initialize the query
    let query = Exam.findById(examId)
      .populate("subject", "name code")
      .populate("class", "name section")
      .populate("teacher", "name email");

    // 2. Conditional Logic: Reveal answers for Teachers/Admins
    // The '+' syntax forces selection of fields marked as { select: false } in Schema
    if (user.role === "teacher" || user.role === "admin") {
      // @ts-ignore
      query = query.select("+questions.correctAnswer");
    }

    // 3. Execute Query
    const exam = await query;

    // 4. Handle Not Found
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // 5. Security Check (Optional but recommended)
    // Ensure student belongs to the class this exam is assigned to
    if (user.role === "student") {
      // Assuming user.studentClass is a string or ObjectId
      // We compare it with the exam.class._id (which might be populated or an ID)
      const examClassId = exam.class._id
        ? exam.class._id.toString()
        : exam.class.toString();
      const userClassId = user.studentClass ? user.studentClass.toString() : "";

      if (examClassId !== userClassId) {
        return res
          .status(403)
          .json({ message: "You are not authorized to view this exam." });
      }
    }

    res.json(exam);
  } catch (error: any) {
    console.error(error);

    // Handle Invalid ID format (CastError)
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid exam ID" });
    }

    // Handle other errors
    return res.status(500).json({ message: "Internal server error" });
  }
};

// @desc    Toggle Exam Status (Active/Inactive)
// @route   PATCH /api/exams/:id/status
// @access  Private (Teacher/Admin)
export const toggleExamStatus = async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const user = (req as any).user;

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Security Check: Ensure the user owns the exam (if not Admin)
    if (
      user.role !== "admin" &&
      exam.teacher.toString() !== user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this exam" });
    }

    // Toggle the status
    exam.isActive = !exam.isActive;
    await exam.save();
    
    // Send email notification to students if the exam was just activated
    if (exam.isActive) {
      const students = await User.find({ role: "student", studentClass: exam.class as any });
      for (const student of students) {
        if (student.email) {
          sendEmail({
            to: student.email,
            subject: `New Exam Available: ${exam.title}`,
            html: `
              <div style="font-family: sans-serif; max-w-lg margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                <h2 style="color: #4F46E5;">New Exam Assigned!</h2>
                <p>Hello ${student.name},</p>
                <p>A new exam "<strong>${exam.title}</strong>" has been activated for your class by your teacher.</p>
                <p>Please log into the Edunexus portal to view and complete the exam before the due date.</p>
                <a href="${process.env.CLIENT_URL}/exams" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Go to Exams</a>
                <p style="color: #6b7280; font-size: 0.9em; margin-top: 30px;">- Edunexus Academic Dept</p>
              </div>
            `,
          });
        }
      }
    }

    const userId = (req as any).user._id;
    await logActivity({ userId, action: "User toggled exam status" });
    res.json({
      message: `Exam is now ${exam.isActive ? "Active" : "Inactive"}`,
      _id: exam._id,
      isActive: exam.isActive,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit & Auto-Grade Exam let these happen inside inngest
// @route   POST /api/exams/:id/submit
export const submitExam = async (req: Request, res: Response) => {
  try {
    const { answers } = req.body;
    const studentId = (req as any).user._id;
    const examId = req.params.id;

    try {
      // Trigger Inngest function to handle submission
      await inngest.send({
        name: "exam/submit",
        data: {
          examId,
          studentId,
          answers,
        },
      });

      const userId = (req as any).user._id;
      await logActivity({ userId, action: "User submitted an exam" });

      res.status(201).json({
        message: "Exam submission received and is being processed.",
      });
    } catch (inngestError) {
      console.warn("⚠️ Inngest dev server not reachable. Running synchronous exam grading fallback...");

      // Synchronous Auto-Grading Fallback
      const existingSubmission = await Submission.findOne({
        exam: examId,
        student: studentId,
      });
      if (existingSubmission) {
        return res.status(400).json({ message: "Exam already submitted" });
      }

      const exam = await Exam.findById(examId).select("+questions.correctAnswer");
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      let score = 0;
      exam.questions.forEach((question) => {
        const studentAns = answers.find(
          (a: any) => a.questionId === question._id.toString()
        );
        if (studentAns && studentAns.answer === question.correctAnswer) {
          score += question.points;
        }
      });

      const submission = await Submission.create({
        exam: examId as any,
        student: studentId,
        answers,
        score,
      });

      const userId = (req as any).user._id;
      await logActivity({ userId, action: `User submitted and graded exam synchronously: ${score} pts` });

      res.status(201).json({
        message: "Exam submitted and graded successfully synchronously.",
        score,
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Exam Results (For Student)
// @route   GET /api/exams/:id/result
export const getExamResult = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user._id;
    const examId = req.params.id;

    const submission = await Submission.findOne({
      exam: examId,
      student: studentId,
    }).populate({
      path: "exam",
      select: "title questions._id questions.correctAnswer", // <--- FORCE SELECT correct answers
    });
    if (!submission) {
      return res.status(404).json({ message: "No submission found" });
    }

    res.json(submission);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an Exam
// @route   DELETE /api/exams/:id
// @access  Private (Teacher/Admin)
export const deleteExam = async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const user = (req as any).user;

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Security Check: Ensure the user owns the exam (if not Admin)
    if (
      user.role !== "admin" &&
      exam.teacher.toString() !== user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this exam" });
    }

    await Exam.findByIdAndDelete(examId);

    // Also delete any submissions for this exam
    await Submission.deleteMany({ exam: examId });

    await logActivity({
      userId: user._id,
      action: `Deleted exam: ${exam.title}`,
    });

    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update questions of an Exam
// @route   PUT /api/exams/:id/questions
// @access  Private (Teacher/Admin)
export const updateExamQuestions = async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const { questions } = req.body;
    const user = (req as any).user;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "Questions list must be an array." });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Security Check: Ensure user owns the exam (if not Admin)
    if (
      user.role !== "admin" &&
      exam.teacher.toString() !== user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this exam" });
    }

    exam.questions = questions;
    await exam.save();

    await logActivity({
      userId: user._id,
      action: `Updated questions for exam: ${exam.title}`,
    });

    res.status(200).json({ message: "Questions updated successfully", exam });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAM STATISTICS APIS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get detailed statistics for a single exam
// @route   GET /api/exams/:id/stats
// @access  Private (Teacher/Admin)
export const getExamStats = async (req: Request, res: Response) => {
  try {
    const { id: examId } = req.params;
    const user = (req as any).user;

    const exam = await Exam.findById(examId)
      .select("+questions.correctAnswer")
      .populate("subject", "name")
      .populate("class", "name")
      .lean();

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Authorization: teacher can only see stats for their own exams
    if (user.role === "teacher" && exam.teacher.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this exam's stats" });
    }

    // Fetch all submissions for this exam
    const submissions = await Submission.find({ exam: examId })
      .populate("student", "name email")
      .lean();

    const totalStudents = await User.countDocuments({ role: "student", studentClass: exam.class as any });
    const totalSubmissions = submissions.length;
    const submissionRate = totalStudents > 0 ? Math.round((totalSubmissions / totalStudents) * 100) : 0;

    // Calculate total possible points for this exam
    const maxScore = exam.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    const passingScore = Math.ceil(maxScore * 0.5); // 50% = pass

    // Score statistics
    const scores = submissions.map((s) => s.score);
    const avgScore = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter((s) => s >= passingScore).length;
    const failCount = scores.length - passCount;
    const passRate = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;

    // Score distribution buckets (0-20%, 21-40%, 41-60%, 61-80%, 81-100%)
    const distribution = ["0-20", "21-40", "41-60", "61-80", "81-100"].map((range) => {
      const parts = range.split("-");
      const low = Number(parts[0] ?? 0);
      const high = Number(parts[1] ?? 100);
      const count = maxScore > 0
        ? scores.filter((s) => {
            const pct = (s / maxScore) * 100;
            return pct >= low && pct <= high;
          }).length
        : 0;
      return { range: `${range}%`, count };
    });

    // Top 5 scorers
    const topScorers = [...submissions]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => ({
        student: (s.student as any)?.name || "Unknown",
        email: (s.student as any)?.email || "",
        score: s.score,
        percentage: maxScore > 0 ? Math.round((s.score / maxScore) * 100) : 0,
      }));

    // Per-question accuracy (how many students got each question right)
    const questionAccuracy = exam.questions.map((q: any) => {
      const qId = q._id.toString();
      let correct = 0;
      for (const sub of submissions) {
        const ans = sub.answers.find((a: any) => a.questionId === qId);
        if (ans && ans.answer === q.correctAnswer) correct++;
      }
      const accuracy = totalSubmissions > 0 ? Math.round((correct / totalSubmissions) * 100) : 0;
      return {
        questionId: qId,
        questionText: q.questionText.substring(0, 80) + (q.questionText.length > 80 ? "..." : ""),
        correctCount: correct,
        accuracy,
      };
    });

    res.status(200).json({
      examId,
      title: exam.title,
      subject: (exam.subject as any)?.name,
      class: (exam.class as any)?.name,
      maxScore,
      passingScore,
      totalStudentsInClass: totalStudents,
      totalSubmissions,
      submissionRate,
      scores: {
        average: avgScore,
        highest: highestScore,
        lowest: lowestScore,
        averagePercentage: maxScore > 0 ? Math.round((avgScore / maxScore) * 100) : 0,
      },
      grading: {
        passCount,
        failCount,
        passRate,
        pendingGrading: submissions.filter((s) => s.score === 0).length,
      },
      distribution,
      topScorers,
      questionAccuracy,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a teacher's overall exam portfolio statistics
// @route   GET /api/exams/stats/teacher
// @access  Private (Teacher/Admin)
export const getTeacherExamStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const teacherId = req.query.teacherId || user._id;

    // Admin can view any teacher; teachers are restricted to themselves
    if (user.role === "teacher" && teacherId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const exams = await Exam.find({ teacher: teacherId })
      .populate("subject", "name")
      .populate("class", "name")
      .lean();

    const examIds = exams.map((e) => e._id);
    const allSubmissions = await Submission.find({ exam: { $in: examIds } }).lean();

    const totalExams = exams.length;
    const activeExams = exams.filter((e) => e.isActive).length;
    const totalSubmissions = allSubmissions.length;
    const gradedSubmissions = allSubmissions.filter((s) => s.score > 0);
    const pendingGrading = allSubmissions.filter((s) => s.score === 0).length;

    const avgScore =
      gradedSubmissions.length > 0
        ? parseFloat((gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length).toFixed(2))
        : 0;

    // Per-exam summary (last 10 exams)
    const recentExams = await Promise.all(
      exams.slice(0, 10).map(async (exam) => {
        const subs = allSubmissions.filter((s) => s.exam.toString() === exam._id.toString());
        const examAvg = subs.length > 0 ? subs.reduce((sum, s) => sum + s.score, 0) / subs.length : 0;
        return {
          examId: exam._id,
          title: exam.title,
          subject: (exam.subject as any)?.name,
          class: (exam.class as any)?.name,
          isActive: exam.isActive,
          dueDate: exam.dueDate,
          totalSubmissions: subs.length,
          averageScore: parseFloat(examAvg.toFixed(2)),
          pendingGrading: subs.filter((s) => s.score === 0).length,
        };
      })
    );

    res.status(200).json({
      teacherId,
      overview: {
        totalExams,
        activeExams,
        inactiveExams: totalExams - activeExams,
        totalSubmissions,
        gradedSubmissions: gradedSubmissions.length,
        pendingGrading,
        averageScore: avgScore,
      },
      recentExams,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get exam statistics for an entire class
// @route   GET /api/exams/stats/class/:classId
// @access  Private (Teacher/Admin)
export const getClassExamStats = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    const exams = await Exam.find({ class: classId })
      .populate("subject", "name")
      .populate("teacher", "name")
      .lean();

    if (exams.length === 0) {
      return res.status(200).json({ classId, totalExams: 0, exams: [] });
    }

    const examIds = exams.map((e) => e._id);
    const allSubmissions = await Submission.find({ exam: { $in: examIds } }).lean();
    const totalStudents = await User.countDocuments({ role: "student", studentClass: classId });

    const examSummaries = exams.map((exam) => {
      const subs = allSubmissions.filter((s) => s.exam.toString() === exam._id.toString());
      const totalSubs = subs.length;
      const gradedSubs = subs.filter((s) => s.score > 0);
      const avgScore = gradedSubs.length > 0
        ? parseFloat((gradedSubs.reduce((sum, s) => sum + s.score, 0) / gradedSubs.length).toFixed(2))
        : 0;
      const maxScore = exam.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
      const submissionRate = totalStudents > 0 ? Math.round((totalSubs / totalStudents) * 100) : 0;
      const passingScore = Math.ceil(maxScore * 0.5);
      const passCount = subs.filter((s) => s.score >= passingScore).length;

      return {
        examId: exam._id,
        title: exam.title,
        subject: (exam.subject as any)?.name,
        teacher: (exam.teacher as any)?.name,
        isActive: exam.isActive,
        dueDate: exam.dueDate,
        maxScore,
        totalSubmissions: totalSubs,
        submissionRate,
        averageScore: avgScore,
        averagePercentage: maxScore > 0 ? Math.round((avgScore / maxScore) * 100) : 0,
        passCount,
        passRate: totalSubs > 0 ? Math.round((passCount / totalSubs) * 100) : 0,
        pendingGrading: subs.filter((s) => s.score === 0).length,
      };
    });

    // Class aggregate
    const classAvgScore =
      examSummaries.length > 0
        ? parseFloat((examSummaries.reduce((sum, e) => sum + e.averageScore, 0) / examSummaries.length).toFixed(2))
        : 0;

    res.status(200).json({
      classId,
      totalStudentsInClass: totalStudents,
      totalExams: exams.length,
      activeExams: exams.filter((e) => e.isActive).length,
      classAverageScore: classAvgScore,
      totalSubmissions: allSubmissions.length,
      exams: examSummaries,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get platform-wide exam overview (Admin only)
// @route   GET /api/exams/stats/overview
// @access  Private (Admin)
export const getExamOverview = async (req: Request, res: Response) => {
  try {
    // Platform-level counts
    const [totalExams, activeExams, totalSubmissions] = await Promise.all([
      Exam.countDocuments(),
      Exam.countDocuments({ isActive: true }),
      Submission.countDocuments(),
    ]);

    // Global average score across all graded submissions
    const gradedSubmissions = await Submission.find({ score: { $gt: 0 } }).select("score").lean();
    const globalAvgScore =
      gradedSubmissions.length > 0
        ? parseFloat((gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length).toFixed(2))
        : 0;
    const pendingGrading = await Submission.countDocuments({ score: 0 });

    // Exams due in the next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingExams = await Exam.find({
      isActive: true,
      dueDate: { $gte: new Date(), $lte: nextWeek },
    })
      .populate("subject", "name")
      .populate("class", "name")
      .populate("teacher", "name")
      .select("title dueDate subject class teacher")
      .sort({ dueDate: 1 })
      .lean();

    // Submission trend: daily counts for the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const recentSubmissions = await Submission.find({
      submittedAt: { $gte: fourteenDaysAgo },
    })
      .select("submittedAt score")
      .lean();

    const trendMap: Record<string, { count: number; totalScore: number }> = {};
    for (const sub of recentSubmissions) {
      const day = new Date(sub.submittedAt).toISOString().split("T")[0] ?? "unknown";
      if (!trendMap[day]) trendMap[day] = { count: 0, totalScore: 0 };
      trendMap[day]!.count++;
      trendMap[day]!.totalScore += sub.score;
    }
    const submissionTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { count, totalScore }]) => ({
        date,
        submissions: count,
        averageScore: count > 0 ? parseFloat((totalScore / count).toFixed(2)) : 0,
      }));

    // Top 5 exams by submission count
    const topExamsBySubmission = await Submission.aggregate([
      { $group: { _id: "$exam", count: { $sum: 1 }, avgScore: { $avg: "$score" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "exams",
          localField: "_id",
          foreignField: "_id",
          as: "exam",
        },
      },
      { $unwind: "$exam" },
      {
        $project: {
          examId: "$_id",
          title: "$exam.title",
          submissions: "$count",
          averageScore: { $round: ["$avgScore", 2] },
        },
      },
    ]);

    res.status(200).json({
      platform: {
        totalExams,
        activeExams,
        inactiveExams: totalExams - activeExams,
        totalSubmissions,
        gradedSubmissions: gradedSubmissions.length,
        pendingGrading,
        globalAverageScore: globalAvgScore,
      },
      upcomingExams: upcomingExams.map((e) => ({
        examId: e._id,
        title: e.title,
        subject: (e.subject as any)?.name,
        class: (e.class as any)?.name,
        teacher: (e.teacher as any)?.name,
        dueDate: e.dueDate,
      })),
      submissionTrend,
      topExamsBySubmission,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
