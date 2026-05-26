import { type Request, type Response } from "express";
import { logActivity } from "../utils/activitieslog.ts";
import { inngest } from "../inngest/index.ts";
import Timetable from "../models/timetable.ts";

import Class from "../models/class.ts";
import User from "../models/user.ts";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// @desc    Generate a Timetable using AI
// @route   POST /api/timetables/generate
// @access  Private/Admin
export const generateTimetable = async (req: Request, res: Response) => {
  const { classId, academicYearId, settings } = req.body;
  try {
    // 1. Try Inngest first
    await inngest.send({
      name: "generate/timetable",
      data: {
        classId,
        academicYearId,
        settings,
      },
    });
    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `Requested timetable generation for class ID: ${classId}`,
    });
    res.status(200).json({ message: "Timetable generation initiated" });
  } catch (error) {
    console.warn("⚠️ Inngest dev server not reachable. Running synchronous fallback...");

    try {
      const classData = await Class.findById(classId).populate("subjects");
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      const qualifiedTeachers = await User.find({
        role: "teacher",
        teacherSubject: { $in: classData.subjects.map((s: any) => s._id) },
      });

      const subjectsPayload = classData.subjects.map((sub: any) => ({
        id: sub._id,
        name: sub.name,
        code: sub.code,
      }));

      if (subjectsPayload.length === 0) {
        return res.status(400).json({ message: "No subjects are assigned to this class." });
      }
      if (qualifiedTeachers.length === 0) {
        return res.status(400).json({ message: "No qualified teachers found for the assigned subjects." });
      }

      const contextData = {
        className: classData.name,
        subjects: subjectsPayload,
        teachers: qualifiedTeachers.map((t) => ({
          id: t._id,
          name: t.name,
          subjects: t.teacherSubject,
        })),
      };

      let finalSchedule;
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      if (!apiKey) {
        // Dynamic mock fallback generator
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const schedule = days.map((day) => {
          const periods = [];
          let currentHour = 8;
          for (let p = 0; p < (settings.periods || 5); p++) {
            const subject = contextData.subjects[p % contextData.subjects.length];
            const teacher = contextData.teachers.find((t: any) =>
              t.subjects.some((subId: any) => subId.toString() === subject.id.toString())
            ) || contextData.teachers[0];

            const startTime = `${String(currentHour).padStart(2, "0")}:00`;
            const endTime = `${String(currentHour + 1).padStart(2, "0")}:00`;
            currentHour += 1;

            periods.push({
              subject: subject.id,
              teacher: teacher ? teacher.id : contextData.teachers[0]?.id,
              startTime,
              endTime,
            });
          }
          return { day, periods };
        });
        finalSchedule = { schedule };
      } else {
        // Live Gemini Call
        const allTimetables = await Timetable.find({
          academicYear: academicYearId,
        });

        const prompt = `
          You are a school scheduler. Generate a weekly timetable (Monday to Friday).

          CONTEXT:
          - Class: ${contextData.className}
          - Hours: ${settings.startTime} to ${settings.endTime} (${settings.periods} periods/day).

          RESOURCES:
          - Subjects: ${JSON.stringify(contextData.subjects)}
          - Teachers: ${JSON.stringify(contextData.teachers)}
          - Other Timetables: ${JSON.stringify(allTimetables)}

          STRICT RULES:
          1. Assign a Teacher to every Subject period.
          2. Teacher MUST have the subject ID in their list.
          3. Break Time/Free Period after every 2 periods(10 minutes), Lunch Time after 5 periods(at 12:00)(30 minutes).
          4. Avoid clashes with other classes(teacher can't be in two classes at the same time).
          5. Output strict JSON only. Schema:
             {
               "schedule": [
                 {
                   "day": "Monday",
                   "periods": [
                     { "subject": "SUBJECT_ID", "teacher": "TEACHER_ID", "startTime": "HH:MM", "endTime": "HH:MM" }
                   ]
                 }
               ]
             }
        `;

        const google = createGoogleGenerativeAI({ apiKey });
        const activeModel = google("gemini-3-flash-preview");
        const { text } = await generateText({ prompt, model: activeModel });
        const cleanJSON = text.replace(/```json/g, "").replace(/```/g, "");
        finalSchedule = JSON.parse(cleanJSON);
      }

      // Save schedule
      await Timetable.findOneAndDelete({
        class: classId,
        academicYear: academicYearId,
      });

      await Timetable.create({
        class: classId,
        academicYear: academicYearId,
        schedule: finalSchedule.schedule,
      });

      const userId = (req as any).user._id;
      await logActivity({
        userId,
        action: `Generated timetable synchronously for class: ${classData.name}`,
      });

      res.status(200).json({ message: "Timetable generated successfully", redirect: true });
    } catch (syncError: any) {
      console.error("❌ Sync timetable generation failed:", syncError);
      res.status(500).json({ message: syncError.message || "Failed to generate timetable" });
    }
  }
};

// @desc    Get Timetable by Class
// @route   GET /api/timetables/:classId
export const getTimetable = async (req: Request, res: Response) => {
  try {
    const timetable = await Timetable.findOne({ class: req.params.classId })
      .populate("schedule.periods.subject", "name code")
      .populate("schedule.periods.teacher", "name email");

    if (!timetable)
      return res.status(404).json({ message: "Timetable not found" });

    res.json(timetable);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save/Update Timetable Manually
// @route   POST /api/timetables/save
// @access  Private/Admin
export const saveTimetable = async (req: Request, res: Response) => {
  try {
    const { classId, academicYearId, schedule } = req.body;

    if (!classId || !academicYearId || !schedule) {
      return res.status(400).json({ message: "Class ID, Academic Year ID, and Schedule are required." });
    }

    const timetable = await Timetable.findOneAndUpdate(
      { class: classId, academicYear: academicYearId },
      { schedule },
      { new: true, upsert: true, runValidators: true }
    );

    const userId = (req as any).user._id;
    await logActivity({
      userId,
      action: `Manually updated timetable for class ID: ${classId}`,
    });

    res.status(200).json({ message: "Timetable saved successfully", timetable });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to save timetable" });
  }
};

// @desc    Get Personal Timetable for Teacher
// @route   GET /api/timetables/teacher/personal
// @access  Private/Teacher
export const getTeacherPersonalTimetable = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user._id;

    // Find all timetables containing periods assigned to this teacher
    const timetables = await Timetable.find({
      "schedule.periods.teacher": teacherId,
    })
      .populate("class", "name section")
      .populate("schedule.periods.subject", "name code");

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const personalSchedule = days.map((day) => {
      const periods: any[] = [];

      timetables.forEach((tt) => {
        const daySchedule = tt.schedule.find((d) => d.day === day);
        if (daySchedule) {
          daySchedule.periods.forEach((p) => {
            if (p.teacher && p.teacher.toString() === teacherId.toString()) {
              periods.push({
                class: tt.class,
                subject: p.subject,
                startTime: p.startTime,
                endTime: p.endTime,
                teacher: { _id: teacherId, name: (req as any).user.name } // attach teacher for unified schema compatibility
              });
            }
          });
        }
      });

      // Sort periods by start time
      periods.sort((a, b) => a.startTime.localeCompare(b.startTime));

      return { day, periods };
    });

    res.json({ schedule: personalSchedule });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to compile teacher timetable" });
  }
};
