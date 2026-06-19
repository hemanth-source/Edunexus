// @ts-nocheck
import User from "../models/user.ts";
import AcademicYear from "../models/academicYear.ts";
import Subject from "../models/subject.ts";
import Class from "../models/class.ts";
import SchoolSettings from "../models/schoolSettings.ts";
import Fee from "../models/fee.ts";
import Expense from "../models/expense.ts";
import Salary from "../models/salary.ts";
import Attendance from "../models/attendance.ts";
import Assignment from "../models/assignment.ts";
import Material from "../models/material.ts";
import Notification from "../models/notification.ts";

export const seedDatabase = async () => {
  try {
    // 1. Check if database already has users
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log("ℹ️ Database already has data. Skipping auto-seeding.");
      return;
    }

    console.log("🌱 Database is empty. Starting auto-seeding default demo data...");

    // 2. Create Academic Year
    const academicYear = await AcademicYear.create({
      name: "2025-2026",
      fromYear: new Date("2025-09-01"),
      toYear: new Date("2026-06-30"),
      isCurrent: true,
    });
    console.log(`✅ Seeded Academic Year: ${academicYear.name}`);

    // 3. Create Subjects
    const math = await Subject.create({ name: "Mathematics", code: "MATH101" });
    const science = await Subject.create({ name: "Science", code: "SCI101" });
    const english = await Subject.create({ name: "English", code: "ENG101" });
    const history = await Subject.create({ name: "History", code: "HIS101" });
    console.log("✅ Seeded Subjects (Math, Science, English, History)");

    // 4. Create Users (Admin, Teacher, Students, Parent)
    const admin = await User.create({
      name: "System Admin",
      email: "admin@edunexus.com",
      password: "admin123",
      role: "admin",
      isActive: true,
    });

    const teacher = await User.create({
      name: "Aura Teacher",
      email: "teacher@edunexus.com",
      password: "teacher123",
      role: "teacher",
      isActive: true,
      teacherSubject: [math._id, science._id, english._id, history._id],
    });

    const student = await User.create({
      name: "Jane Doe",
      email: "student@edunexus.com",
      password: "student123",
      role: "student",
      isActive: true,
    });

    // Demo student Janvi — will be linked to parent Kumar
    const janvi = await User.create({
      name: "Janvi",
      email: "janvi@edunexus.com",
      password: "janvi123",
      role: "student",
      isActive: true,
    });

    // Demo parent Kumar — linked to Janvi
    const kumar = await User.create({
      name: "kumar",
      email: "kumar@gmail.com",
      password: "kumar123",
      role: "parent",
      isActive: true,
      parentOf: [janvi._id],
    });

    // Bidirectional: set Janvi's parent field to Kumar
    await User.findByIdAndUpdate(janvi._id, { parent: kumar._id });

    console.log("✅ Seeded Users: Admin, Teacher, Jane Doe, Janvi, Kumar");
    console.log("   👨‍👧 kumar@gmail.com (password: kumar123) → parent of Janvi");

    // 5. Link Teacher to Subjects
    math.teacher = [teacher._id as any];
    science.teacher = [teacher._id as any];
    english.teacher = [teacher._id as any];
    history.teacher = [teacher._id as any];
    await Promise.all([math.save(), science.save(), english.save(), history.save()]);

    // 6. Create Class — both Jane Doe and Janvi are enrolled
    const class10 = await Class.create({
      name: "Grade 10",
      academicYear: academicYear._id,
      classTeacher: teacher._id,
      subjects: [math._id, science._id, english._id, history._id],
      students: [student._id, janvi._id],
      capacity: 30,
    });
    console.log(`✅ Seeded Class: ${class10.name}`);

    // 7. Link both students to the class
    await User.findByIdAndUpdate(student._id, { studentClass: class10._id });
    await User.findByIdAndUpdate(janvi._id, { studentClass: class10._id });

    // 8. Seed School Settings
    await SchoolSettings.create({
      schoolName: "Springfield Academy",
      address: "742 Evergreen Terrace, Springfield",
      contactEmail: "info@springfield.edu",
      contactPhone: "+1 (555) 382-9104",
      logoUrl: "",
    });
    console.log("✅ Seeded School Settings");

    // 9. Seed Fees for Jane Doe
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    await Fee.create({ student: student._id, amount: 1500, status: "pending", dueDate });
    await Fee.create({
      student: student._id,
      amount: 1200,
      status: "paid",
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
    });

    // 10. Seed Fees for Janvi (visible to Kumar in parent portal)
    const janviDue = new Date();
    janviDue.setDate(janviDue.getDate() + 10);
    await Fee.create({ student: janvi._id, amount: 2000, status: "pending", dueDate: janviDue });
    await Fee.create({
      student: janvi._id,
      amount: 1800,
      status: "paid",
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
    });
    console.log("✅ Seeded Fees (Jane Doe + Janvi)");

    // 11. Seed Expenses
    await Expense.create({ title: "Science Lab Upgrade", amount: 4500, category: "Academic Tools", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), description: "Purchased new microscopes and beaker kits." });
    await Expense.create({ title: "Main Classroom Electricity", amount: 850, category: "Utilities", date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) });
    console.log("✅ Seeded Expenses");

    // 12. Seed Teacher Salary payroll
    await Salary.create({ teacher: teacher._id, amount: 3200, status: "paid", paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) });
    await Salary.create({ teacher: teacher._id, amount: 3200, status: "pending" });
    console.log("✅ Seeded Salaries");

    // 13. Seed Attendance for Jane Doe
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const d1 = new Date(today); d1.setDate(d1.getDate() - 1);
    const d2 = new Date(today); d2.setDate(d2.getDate() - 2);
    const d3 = new Date(today); d3.setDate(d3.getDate() - 3);
    const d4 = new Date(today); d4.setDate(d4.getDate() - 4);

    await Attendance.create({ student: student._id, classId: class10._id, date: d2, status: "present" });
    await Attendance.create({ student: student._id, classId: class10._id, date: d1, status: "late" });
    await Attendance.create({ student: student._id, classId: class10._id, date: today, status: "present" });

    // 14. Seed Attendance for Janvi (visible to Kumar in parent portal)
    await Attendance.create({ student: janvi._id, classId: class10._id, date: d4, status: "present" });
    await Attendance.create({ student: janvi._id, classId: class10._id, date: d3, status: "present" });
    await Attendance.create({ student: janvi._id, classId: class10._id, date: d2, status: "absent" });
    await Attendance.create({ student: janvi._id, classId: class10._id, date: d1, status: "present" });
    await Attendance.create({ student: janvi._id, classId: class10._id, date: today, status: "late" });
    console.log("✅ Seeded Attendance Records (Jane Doe + Janvi)");

    // 15. Seed LMS Assignment
    const assignDue = new Date();
    assignDue.setDate(assignDue.getDate() + 7);
    await Assignment.create({ title: "Algebraic Transformations Homework", description: "Complete all practice questions in Chapter 4, section 4.2.", dueDate: assignDue, subject: math._id, classId: class10._id, teacher: teacher._id });
    console.log("✅ Seeded Assignment");

    // 16. Seed LMS Material
    await Material.create({ title: "Chemical Equations Quick Reference Guide", description: "A PDF outline of balancing chemical equations.", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", subject: science._id, classId: class10._id, uploadedBy: teacher._id });
    console.log("✅ Seeded Material");

    // 17. Seed Notifications
    await Notification.create({ recipient: (student as any)._id, sender: (admin as any)._id, title: "Outstanding Term Fee Invoice", message: "Please ensure your Term 1 Tuition fee invoice of $2,500 is settled.", type: "fee", isRead: false });
    await Notification.create({ recipient: (student as any)._id, sender: (teacher as any)._id, title: "New Assignment: Algebraic Transformations", message: "A new assignment homework has been published for Grade 10 Math. Due in 7 days.", type: "assignment", isRead: false });
    await Notification.create({ recipient: (student as any)._id, sender: (admin as any)._id, title: "Sports Day Notice", message: "Sports day events will begin this Friday. All students must wear house uniforms.", type: "circulation", isRead: false });
    await Notification.create({ recipient: (teacher as any)._id, sender: (admin as any)._id, title: "Staff Meeting Notice", message: "Urgent syllabus review staff meeting is scheduled for tomorrow at 3:00 PM in the conference hall.", type: "circulation", isRead: false });

    // Parent Kumar notifications about Janvi
    await Notification.create({ recipient: (kumar as any)._id, sender: (admin as any)._id, title: "Janvi's Fee Invoice Due", message: "Janvi has a pending fee invoice of $2,000 due in 10 days. Please arrange payment before the due date.", type: "fee", isRead: false });
    await Notification.create({ recipient: (kumar as any)._id, sender: (teacher as any)._id, title: "Attendance Alert: Janvi Absent", message: "Janvi was marked ABSENT on a school day. Please contact the school if this was unplanned.", type: "system", isRead: false });
    console.log("✅ Seeded Notifications (including Kumar's parent alerts for Janvi)");

    console.log("\n🌱 Auto-seeding completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 Demo Login Accounts:");
    console.log("   Admin   → admin@edunexus.com    / admin123");
    console.log("   Teacher → teacher@edunexus.com  / teacher123");
    console.log("   Student → student@edunexus.com  / student123");
    console.log("   Student → janvi@edunexus.com    / janvi123");
    console.log("   Parent  → kumar@gmail.com       / kumar123  👨‍👧 Janvi's parent");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Auto-seeding failed:", error);
  }
};
