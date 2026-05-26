import type _class from "../models/class.ts";
import { inngest } from "./index.ts";
import Class from "../models/class.ts";
import User from "../models/user.ts";
import Timetable from "../models/timetable.ts";
import Exam from "../models/exam.ts";
import Submission from "../models/submission.ts";

import { NonRetriableError } from "inngest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
}

// Your new function:
export const generateTimeTable = inngest.createFunction(
  { id: "Generate-Timetable" },
  { event: "generate/timetable" }, //name
  async ({ event, step }) => {
    const { classId, academicYearId, settings } = event.data as {
      classId: string;
      academicYearId: string;
      settings: GenSettings;
    };

    const contextData = await step.run("fetch-class-context", async () => {
      // fetch class
      const classData = await Class.findById(classId).populate("subjects");
      if (!classData) throw new NonRetriableError("Class not found");

      // fetch teachers
      const allTeacher = await User.find({ role: "teacher" });

      // filter qualified teachers for class subjects
      const classSubjectsIds = classData.subjects.map((sub) =>
        sub._id.toString()
      );

      const qualifiedTeachers = allTeacher
        .filter((teacher) => {
          if (!teacher.teacherSubject) return false;
          return teacher.teacherSubject.some((subId) =>
            classSubjectsIds.includes(subId.toString())
          );
        })
        .map((tea) => ({
          id: tea._id,
          name: tea.name,
          subjects: tea.teacherSubject,
        }));

      const subjectsPayload = classData.subjects.map((sub: any) => ({
        id: sub._id,
        name: sub.name,
        code: sub.code,
      }));

      // here we should check if we have teachers and subjects
      if (subjectsPayload.length === 0 || qualifiedTeachers.length === 0)
        throw new NonRetriableError(
          "No Subjects or Teachers assigned to these class"
        );

      return {
        className: classData.name,
        subjects: subjectsPayload,
        teachers: qualifiedTeachers,
      };
    });

    // generate timetable logic would go here
    const aiSchedule = await step.run("generate-timetable-logic", async () => {
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
              endTime
            });
          }
          return { day, periods };
        });
        return { schedule };
      }

      const allTimetables = await Timetable.find({
        academicYear: academicYearId,
      });

      const prompt = `
        You are a school scheduler. Generate a weekly timetable (Monday to Friday).

        CONTEXT:
        - Class: ${contextData.className}
        - Hours: ${settings.startTime} to ${settings.endTime} (${
        settings.periods
      } periods/day).

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

      const google = createGoogleGenerativeAI({
        apiKey,
      });

      // I will show you how to get one if these does not work for you
      const activeModel = google("gemini-3-flash-preview");

      const { text } = await generateText({
        prompt,
        model: activeModel,
      });

      const cleanJSON = text.replace(/```json/g, "").replace(/```/g, "");
      return JSON.parse(cleanJSON);
    });
    // now let save
    await step.run("save-timetable", async () => {
      // Delete existing to avoid duplicates
      // we should also delete any timetable assigned or generate for these class
      await Timetable.findOneAndDelete({
        class: classId,
        academicYear: academicYearId,
      });
      await Timetable.create({
        class: classId,
        academicYear: academicYearId,
        schedule: aiSchedule.schedule,
      });

      return { success: true, classId };
    });
    return { message: "Timetable generated successfully" };
  }
);

// Your new function:
export const generateExam = inngest.createFunction(
  { id: "Generate-Exam" },
  { event: "exam/generate" }, //name
  async ({ event, step }) => {
    const { examId, topic, subjectName, difficulty, count } = event.data;

    // generate timetable logic would go here
    const aiExam = await step.run("generate-exam-logic", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        // Dynamic Mock Exam Generator
        const mockQuestions = [];
        for (let i = 1; i <= (count || 5); i++) {
          mockQuestions.push({
            questionText: `Question ${i}: Which of the following is a key component of ${topic || "general concepts"} in ${subjectName || "Subject"}?`,
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
        return mockQuestions;
      }

      const prompt = `
        You are a strict teacher. Create a JSON array of ${count} multiple-choice questions for a high school exam.

        CONTEXT:
        - Subject: ${subjectName}
        - Topic: ${topic}
        - Difficulty: ${difficulty}

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

      const google = createGoogleGenerativeAI({
        apiKey,
      });

      // I will show you how to get one if these does not work for you
      const activeModel = google("gemini-3-flash-preview");

      const { text } = await generateText({
        prompt,
        model: activeModel,
      });

      // Sanitize JSON
      const cleanJson = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleanJson);
    });
    // now let save
    await step.run("save-exam", async () => {
      const exam = await Exam.findById(examId);

      if (!exam) {
        throw new NonRetriableError(`Exam ${examId} not found`);
      }

      // Update the exam with the new questions
      exam.questions = aiExam;
      exam.isActive = false; // Keep it inactive until teacher reviews it

      await exam.save();

      return { success: true, count: aiExam.length };
    });
    return { message: "Exam generated successfully" };
  }
);

// handle submission inside inngest
// Important because we don't want the student's submission to be have issues
// with server timeouts or other problems
export const handleExamSubmission = inngest.createFunction(
  { id: "Handle-Exam-Submission" },
  { event: "exam/submit" }, //name
  async ({ event, step }) => {
    const { examId, studentId, answers } = event.data;

    await step.run("process-exam-submission", async () => {
      // 1. Check if already submitted
      const existingSubmission = await Submission.findOne({
        exam: examId,
        student: studentId,
      });
      if (existingSubmission) {
        throw new NonRetriableError("Exam already submitted");
      }

      // 2. Fetch full exam (with answers)
      const exam = await Exam.findById(examId).select(
        "+questions.correctAnswer"
      );
      if (!exam) {
        throw new NonRetriableError(`Exam ${examId} not found`);
      }

      // 3. Calculate Score
      let score = 0;
      let totalPoints = 0;

      exam.questions.forEach((question) => {
        totalPoints += question.points;
        const studentAns = answers.find(
          (a: any) => a.questionId === question._id.toString()
        );
        if (studentAns && studentAns.answer === question.correctAnswer) {
          score += question.points;
        }
      });

      // 4. Save Submission
      await Submission.create({
        exam: examId,
        student: studentId,
        answers,
        score,
      });
    });
    return { message: "Exam submitted successfully" };
  }
);
