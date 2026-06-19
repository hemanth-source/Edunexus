/**
 * Dashboard Integration Tests
 * ────────────────────────────────────────────────────────────────────────────
 * Uses mongodb-memory-server to spin up a real in-memory MongoDB instance.
 * Tests verify that dashboard stats reflect live DB state AFTER mutations to
 * attendance or exam records — no mocking, no stubs.
 *
 * Run with:
 *   npx tsx src/tests/dashboard.test.ts
 */
// @ts-nocheck

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// ── Models ────────────────────────────────────────────────────────────────────
import User from "../models/user.ts";
import Class from "../models/class.ts";
import Exam from "../models/exam.ts";
import Submission from "../models/submission.ts";
import Attendance from "../models/attendance.ts";
import ActivityLog from "../models/activitieslog.ts";
import AcademicYear from "../models/academicYear.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────
let mongod: MongoMemoryServer;

/** Lightweight assertion helper — throws on failure */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    console.error(`  ✗ FAIL: ${message}\n    Expected: ${JSON.stringify(expected)}\n    Received: ${JSON.stringify(actual)}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${message} → ${JSON.stringify(actual)}`);
  }
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────
async function setup() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log("🗄  In-memory MongoDB started\n");
}

async function teardown() {
  await mongoose.disconnect();
  await mongod.stop();
  console.log("\n🗄  In-memory MongoDB stopped");
}

async function clearCollections() {
  await Promise.all([
    Attendance.deleteMany({}),
    Submission.deleteMany({}),
    Exam.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);
}

// ── Core dashboard stat helpers (extracted from controller logic) ─────────────
/**
 * Replicates the exact computation used in getDashboardStats for admin avgAttendance.
 */
async function getAdminAvgAttendance(): Promise<string> {
  const totalDays = await Attendance.countDocuments();
  if (totalDays === 0) return "N/A";
  const presentOrLate = await Attendance.countDocuments({
    status: { $in: ["present", "late"] },
  });
  return `${Math.round((presentOrLate / totalDays) * 100)}%`;
}

/**
 * Replicates admin activeExams count.
 */
async function getActiveExamsCount(): Promise<number> {
  return Exam.countDocuments({ isActive: true });
}

/**
 * Replicates student myAttendance.
 */
async function getStudentAttendancePct(studentId: mongoose.Types.ObjectId): Promise<string> {
  const total = await Attendance.countDocuments({ student: studentId });
  if (total === 0) return "N/A";
  const presentOrLate = await Attendance.countDocuments({
    student: studentId,
    status: { $in: ["present", "late"] },
  });
  return `${Math.round((presentOrLate / total) * 100)}%`;
}

/**
 * Replicates teacher pendingGrading count.
 */
async function getTeacherPendingGrading(teacherId: mongoose.Types.ObjectId): Promise<number> {
  const myExams = await Exam.find({ teacher: teacherId }).select("_id");
  return Submission.countDocuments({
    exam: { $in: myExams.map((e) => e._id) },
    score: 0,
  });
}

/**
 * Replicates student pendingAssignments count.
 */
async function getStudentPendingAssignments(classId: mongoose.Types.ObjectId): Promise<number> {
  return Exam.countDocuments({
    class: classId,
    isActive: true,
    dueDate: { $gte: new Date() },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1 — Admin Dashboard: avgAttendance reflects DB mutations
// ══════════════════════════════════════════════════════════════════════════════
async function testAdminAttendanceStats() {
  console.log("━━━  Suite 1: Admin avgAttendance reflects attendance mutations  ━━━");
  await clearCollections();

  // Seed: create a class and two students
  const academicYear = await AcademicYear.create({
    name: "2024-2025",
    fromYear: new Date("2024-09-01"),
    toYear: new Date("2025-06-30"),
    isCurrent: true,
  });
  const cls = await Class.create({ name: "Grade 10A", academicYear: academicYear._id });
  const admin = await User.create({
    name: "Admin User", email: "admin@test.com", password: "hashed", role: "admin",
  });
  const s1 = await User.create({
    name: "Student Alpha", email: "alpha@test.com", password: "hashed",
    role: "student", studentClass: cls._id,
  });
  const s2 = await User.create({
    name: "Student Beta", email: "beta@test.com", password: "hashed",
    role: "student", studentClass: cls._id,
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // ── Baseline: No attendance records ────────────────────────────────────────
  const baseline = await getAdminAvgAttendance();
  assertEq(baseline, "N/A", "[T1.1] avgAttendance is N/A when no records exist");

  // ── Add 2 present + 1 absent → expected 67% ────────────────────────────────
  await Attendance.create([
    { student: s1._id, classId: cls._id, date: today, status: "present" },
    { student: s2._id, classId: cls._id, date: today, status: "present" },
    {
      student: s1._id, classId: cls._id,
      date: new Date(today.getTime() - 86400000), status: "absent"
    },
  ]);

  const after3 = await getAdminAvgAttendance();
  assertEq(after3, "67%", "[T1.2] avgAttendance = 67% (2 present / 3 total)");

  // ── Mark the absent as late → now all 3 are present/late → 100% ───────────
  await Attendance.updateMany({ status: "absent" }, { status: "late" });
  const afterLateFix = await getAdminAvgAttendance();
  assertEq(afterLateFix, "100%", "[T1.3] avgAttendance = 100% after absent→late update");

  // ── Add 2 more absent records → 3/5 = 60% ─────────────────────────────────
  await Attendance.create([
    {
      student: s1._id, classId: cls._id,
      date: new Date(today.getTime() - 2 * 86400000), status: "absent"
    },
    {
      student: s2._id, classId: cls._id,
      date: new Date(today.getTime() - 2 * 86400000), status: "absent"
    },
  ]);
  const after5 = await getAdminAvgAttendance();
  assertEq(after5, "60%", "[T1.4] avgAttendance = 60% (3 present/late out of 5)");

  // ── Delete all absent → back to 3/3 = 100% ────────────────────────────────
  await Attendance.deleteMany({ status: "absent" });
  const afterDelete = await getAdminAvgAttendance();
  assertEq(afterDelete, "100%", "[T1.5] avgAttendance = 100% after deleting all absent records");

  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2 — Admin Dashboard: activeExams reflects exam mutations
// ══════════════════════════════════════════════════════════════════════════════
async function testAdminExamStats() {
  console.log("━━━  Suite 2: Admin activeExams reflects exam mutations  ━━━");
  await clearCollections();

  const academicYear = await AcademicYear.findOne();
  const cls = await Class.findOne();
  const teacher = await User.create({
    name: "Teacher T", email: "teacher@test.com", password: "hashed", role: "teacher",
  });
  const subject = new mongoose.Types.ObjectId();

  // ── Baseline: 0 active exams ───────────────────────────────────────────────
  const baseline = await getActiveExamsCount();
  assertEq(baseline, 0, "[T2.1] activeExams = 0 when no exams exist");

  // ── Create 2 active + 1 inactive ──────────────────────────────────────────
  const e1 = await Exam.create({
    title: "Math Mid-Term", subject, class: cls!._id, teacher: teacher._id,
    duration: 60, dueDate: new Date(Date.now() + 7 * 86400000), isActive: true, questions: [],
  });
  const e2 = await Exam.create({
    title: "Science Quiz", subject, class: cls!._id, teacher: teacher._id,
    duration: 30, dueDate: new Date(Date.now() + 3 * 86400000), isActive: true, questions: [],
  });
  await Exam.create({
    title: "History Draft", subject, class: cls!._id, teacher: teacher._id,
    duration: 45, dueDate: new Date(Date.now() + 5 * 86400000), isActive: false, questions: [],
  });

  const after3 = await getActiveExamsCount();
  assertEq(after3, 2, "[T2.2] activeExams = 2 (2 active, 1 inactive draft)");

  // ── Activate the draft exam ─────────────────────────────────────────────────
  await Exam.updateMany({ isActive: false }, { isActive: true });
  const afterActivate = await getActiveExamsCount();
  assertEq(afterActivate, 3, "[T2.3] activeExams = 3 after activating the draft");

  // ── Deactivate all exams ────────────────────────────────────────────────────
  await Exam.updateMany({}, { isActive: false });
  const afterDeactivate = await getActiveExamsCount();
  assertEq(afterDeactivate, 0, "[T2.4] activeExams = 0 after deactivating all");

  // ── Delete one; re-activate remaining ─────────────────────────────────────
  await Exam.findByIdAndDelete(e1._id);
  await Exam.updateMany({}, { isActive: true });
  const afterDeleteAndActivate = await getActiveExamsCount();
  assertEq(afterDeleteAndActivate, 2, "[T2.5] activeExams = 2 after delete + re-activate remaining");

  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3 — Student Dashboard: myAttendance reflects per-student mutations
// ══════════════════════════════════════════════════════════════════════════════
async function testStudentAttendanceStats() {
  console.log("━━━  Suite 3: Student myAttendance reflects per-student mutations  ━━━");
  await clearCollections();

  const cls = await Class.findOne();
  const student = await User.create({
    name: "Student Gamma", email: "gamma@test.com", password: "hashed",
    role: "student", studentClass: cls!._id,
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // ── Baseline ────────────────────────────────────────────────────────────────
  const baseline = await getStudentAttendancePct(student._id as mongoose.Types.ObjectId);
  assertEq(baseline, "N/A", "[T3.1] myAttendance = N/A for new student with no records");

  // ── 4 present → 100% ────────────────────────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    await Attendance.create({
      student: student._id, classId: cls!._id,
      date: new Date(today.getTime() - i * 86400000), status: "present",
    });
  }
  const p100 = await getStudentAttendancePct(student._id as mongoose.Types.ObjectId);
  assertEq(p100, "100%", "[T3.2] myAttendance = 100% (4/4 present)");

  // ── Mark 1 as absent → 75% ──────────────────────────────────────────────────
  await Attendance.findOneAndUpdate(
    { student: student._id, date: new Date(today.getTime() - 3 * 86400000) },
    { status: "absent" }
  );
  const p75 = await getStudentAttendancePct(student._id as mongoose.Types.ObjectId);
  assertEq(p75, "75%", "[T3.3] myAttendance = 75% (3/4 present)");

  // ── Add a late record → 4/5 = 80% ──────────────────────────────────────────
  await Attendance.create({
    student: student._id, classId: cls!._id,
    date: new Date(today.getTime() - 4 * 86400000), status: "late",
  });
  const p80 = await getStudentAttendancePct(student._id as mongoose.Types.ObjectId);
  assertEq(p80, "80%", "[T3.4] myAttendance = 80% (late counts as present, 4/5)");

  // ── Remove all records → N/A ────────────────────────────────────────────────
  await Attendance.deleteMany({ student: student._id });
  const pNA = await getStudentAttendancePct(student._id as mongoose.Types.ObjectId);
  assertEq(pNA, "N/A", "[T3.5] myAttendance = N/A after all records deleted");

  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4 — Teacher Dashboard: pendingGrading reflects submission mutations
// ══════════════════════════════════════════════════════════════════════════════
async function testTeacherPendingGrading() {
  console.log("━━━  Suite 4: Teacher pendingGrading reflects submission mutations  ━━━");
  await clearCollections();

  const cls = await Class.findOne();
  const teacher = await User.findOne({ role: "teacher" });
  const student = await User.findOne({ role: "student" });
  const subject = new mongoose.Types.ObjectId();

  // Create 2 exams owned by this teacher
  const exam1 = await Exam.create({
    title: "Exam A", subject, class: cls!._id, teacher: teacher!._id,
    duration: 60, dueDate: new Date(Date.now() + 86400000), isActive: true, questions: [],
  });
  const exam2 = await Exam.create({
    title: "Exam B", subject, class: cls!._id, teacher: teacher!._id,
    duration: 30, dueDate: new Date(Date.now() + 86400000), isActive: true, questions: [],
  });

  // ── Baseline: 0 pending ───────────────────────────────────────────────────
  const baseline = await getTeacherPendingGrading(teacher!._id as mongoose.Types.ObjectId);
  assertEq(baseline, 0, "[T4.1] pendingGrading = 0 with no submissions");

  // ── Create 3 ungraded submissions ─────────────────────────────────────────
  const sub1 = await Submission.create({ exam: exam1._id, student: student!._id, answers: [], score: 0 });
  const sub2 = await Submission.create({
    exam: exam2._id,
    student: new mongoose.Types.ObjectId(), answers: [], score: 0,
  });
  const sub3 = await Submission.create({
    exam: exam1._id,
    student: new mongoose.Types.ObjectId(), answers: [], score: 0,
  });

  const after3 = await getTeacherPendingGrading(teacher!._id as mongoose.Types.ObjectId);
  assertEq(after3, 3, "[T4.2] pendingGrading = 3 (3 ungraded submissions)");

  // ── Grade one submission (score > 0) → 2 pending ──────────────────────────
  await Submission.findByIdAndUpdate(sub1._id, { score: 8 });
  const after1Grade = await getTeacherPendingGrading(teacher!._id as mongoose.Types.ObjectId);
  assertEq(after1Grade, 2, "[T4.3] pendingGrading = 2 after grading one submission");

  // ── Grade all → 0 pending ─────────────────────────────────────────────────
  await Submission.updateMany({ score: 0 }, { score: 7 });
  const afterAllGraded = await getTeacherPendingGrading(teacher!._id as mongoose.Types.ObjectId);
  assertEq(afterAllGraded, 0, "[T4.4] pendingGrading = 0 after all submissions graded");

  // ── Delete one exam → its graded submissions disappear; only 2 exams, all graded
  await Exam.findByIdAndDelete(exam2._id);
  const afterExamDelete = await getTeacherPendingGrading(teacher!._id as mongoose.Types.ObjectId);
  assertEq(afterExamDelete, 0, "[T4.5] pendingGrading = 0 after exam deletion (no ungraded left)");

  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 5 — Student Dashboard: pendingAssignments reflects exam mutations
// ══════════════════════════════════════════════════════════════════════════════
async function testStudentPendingAssignments() {
  console.log("━━━  Suite 5: Student pendingAssignments reflects exam mutations  ━━━");
  await clearCollections();

  const cls = await Class.findOne();
  const teacher = await User.findOne({ role: "teacher" });
  const subject = new mongoose.Types.ObjectId();
  const future = new Date(Date.now() + 7 * 86400000);
  const past = new Date(Date.now() - 86400000);

  // ── Baseline: 0 upcoming active exams ─────────────────────────────────────
  const baseline = await getStudentPendingAssignments(cls!._id as mongoose.Types.ObjectId);
  assertEq(baseline, 0, "[T5.1] pendingAssignments = 0 with no exams");

  // ── Add 2 future active + 1 past active + 1 future inactive ───────────────
  const e1 = await Exam.create({
    title: "Future Active 1", subject, class: cls!._id, teacher: teacher!._id,
    duration: 60, dueDate: future, isActive: true, questions: [],
  });
  await Exam.create({
    title: "Future Active 2", subject, class: cls!._id, teacher: teacher!._id,
    duration: 60, dueDate: new Date(Date.now() + 2 * 86400000), isActive: true, questions: [],
  });
  await Exam.create({
    title: "Past Active", subject, class: cls!._id, teacher: teacher!._id,
    duration: 60, dueDate: past, isActive: true, questions: [],
  });
  await Exam.create({
    title: "Future Inactive", subject, class: cls!._id, teacher: teacher!._id,
    duration: 60, dueDate: future, isActive: false, questions: [],
  });

  const after4 = await getStudentPendingAssignments(cls!._id as mongoose.Types.ObjectId);
  assertEq(after4, 2, "[T5.2] pendingAssignments = 2 (future+active only; past and inactive excluded)");

  // ── Deactivate one future exam ─────────────────────────────────────────────
  await Exam.findByIdAndUpdate(e1._id, { isActive: false });
  const after1Deactivated = await getStudentPendingAssignments(cls!._id as mongoose.Types.ObjectId);
  assertEq(after1Deactivated, 1, "[T5.3] pendingAssignments = 1 after deactivating one");

  // ── Activate the inactive future exam ─────────────────────────────────────
  await Exam.updateMany({ isActive: false, dueDate: { $gte: new Date() } }, { isActive: true });
  const afterReactivate = await getStudentPendingAssignments(cls!._id as mongoose.Types.ObjectId);
  assertEq(afterReactivate, 3, "[T5.4] pendingAssignments = 3 after re-activating all future exams");

  // ── Delete all exams ────────────────────────────────────────────────────────
  await Exam.deleteMany({});
  const afterDelete = await getStudentPendingAssignments(cls!._id as mongoose.Types.ObjectId);
  assertEq(afterDelete, 0, "[T5.5] pendingAssignments = 0 after all exams deleted");

  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 6 — Leaderboard: scores update when attendance/submissions mutate
// ══════════════════════════════════════════════════════════════════════════════
async function testLeaderboardScoreComputation() {
  console.log("━━━  Suite 6: Leaderboard scores update on attendance/submission mutations  ━━━");
  await clearCollections();

  const cls = await Class.findOne();
  const teacher = await User.findOne({ role: "teacher" });
  const subject = new mongoose.Types.ObjectId();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const s1 = await User.create({
    name: "Leader A", email: "leader_a@test.com", password: "hashed",
    role: "student", studentClass: cls!._id,
  });
  const s2 = await User.create({
    name: "Leader B", email: "leader_b@test.com", password: "hashed",
    role: "student", studentClass: cls!._id,
  });

  /** Replicates leaderboard score: examScore + attendancePoints */
  async function getScore(studentId: mongoose.Types.ObjectId): Promise<number> {
    const subs = await Submission.find({ student: studentId }).select("score");
    const examScore = subs.reduce((sum, s) => sum + s.score, 0);
    const attendanceDays = await Attendance.countDocuments({
      student: studentId,
      status: { $in: ["present", "late"] },
    });
    return examScore + attendanceDays;
  }

  // ── Baseline scores ────────────────────────────────────────────────────────
  const s1base = await getScore(s1._id as mongoose.Types.ObjectId);
  const s2base = await getScore(s2._id as mongoose.Types.ObjectId);
  assertEq(s1base, 0, "[T6.1] Leader A starts at 0 points");
  assertEq(s2base, 0, "[T6.2] Leader B starts at 0 points");

  // ── Add 3 attendance days for s1, 2 for s2 ────────────────────────────────
  for (let i = 0; i < 3; i++) {
    await Attendance.create({
      student: s1._id, classId: cls!._id,
      date: new Date(today.getTime() - i * 86400000), status: "present",
    });
  }
  for (let i = 0; i < 2; i++) {
    await Attendance.create({
      student: s2._id, classId: cls!._id,
      date: new Date(today.getTime() - i * 86400000), status: "present",
    });
  }

  const s1afterAtt = await getScore(s1._id as mongoose.Types.ObjectId);
  const s2afterAtt = await getScore(s2._id as mongoose.Types.ObjectId);
  assertEq(s1afterAtt, 3, "[T6.3] Leader A has 3 points (3 attendance days)");
  assertEq(s2afterAtt, 2, "[T6.4] Leader B has 2 points (2 attendance days)");
  assert(s1afterAtt > s2afterAtt, "[T6.5] Leader A is ranked above Leader B");

  // ── s2 submits an exam with score 5 → s2 overtakes s1 ─────────────────────
  const exam = await Exam.create({
    title: "Rank Test Exam", subject, class: cls!._id, teacher: teacher!._id,
    duration: 60, dueDate: new Date(Date.now() + 86400000), isActive: true, questions: [],
  });
  await Submission.create({ exam: exam._id, student: s2._id, answers: [], score: 5 });

  const s1afterExam = await getScore(s1._id as mongoose.Types.ObjectId);
  const s2afterExam = await getScore(s2._id as mongoose.Types.ObjectId);
  assertEq(s1afterExam, 3, "[T6.6] Leader A still has 3 points (no exam)");
  assertEq(s2afterExam, 7, "[T6.7] Leader B has 7 points (2 att + 5 exam)");
  assert(s2afterExam > s1afterExam, "[T6.8] Leader B now outranks Leader A after exam submission");

  // ── Delete s2's submission → s1 leads again ────────────────────────────────
  await Submission.deleteMany({ student: s2._id });
  const s2afterSubDelete = await getScore(s2._id as mongoose.Types.ObjectId);
  assertEq(s2afterSubDelete, 2, "[T6.9] Leader B drops back to 2 after submission deleted");
  assert(
    (await getScore(s1._id as mongoose.Types.ObjectId)) > s2afterSubDelete,
    "[T6.10] Leader A re-takes the lead after s2 submission removed"
  );

  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  const start = Date.now();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        Edunexus Dashboard Integration Test Suite            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  await setup();

  try {
    await testAdminAttendanceStats();
    await testAdminExamStats();
    await testStudentAttendanceStats();
    await testTeacherPendingGrading();
    await testStudentPendingAssignments();
    await testLeaderboardScoreComputation();
  } finally {
    await teardown();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n${"─".repeat(64)}`);
  if (process.exitCode === 1) {
    console.log(`❌  Some tests FAILED — see output above. (${elapsed}s)`);
  } else {
    console.log(`✅  All tests PASSED in ${elapsed}s`);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
