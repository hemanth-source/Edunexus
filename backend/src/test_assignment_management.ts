import mongoose from "mongoose";
import dotenv from "dotenv";
import Assignment from "./models/assignment.ts";
import Subject from "./models/subject.ts";
import classModel from "./models/class.ts";
import User from "./models/user.ts";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URL as string);
  console.log("Connected to MongoDB");

  const teacher = await User.findOne({ role: "teacher" });
  const subjectDoc = await Subject.findOne({});
  const classDoc = await classModel.findOne({});

  if (!teacher || !subjectDoc || !classDoc) {
    console.error("Missing teacher, subject, or class to test!");
    await mongoose.disconnect();
    return;
  }

  console.log(`Using Teacher: ${teacher.name} (${teacher._id})`);
  console.log(`Using Subject: ${subjectDoc.name} (${subjectDoc._id})`);
  console.log(`Using Class: ${classDoc.name} (${classDoc._id})`);

  // Test Create
  console.log("\n--- Testing Create Assignment ---");
  try {
    const newAss = await Assignment.create({
      title: "Integration Test Assignment",
      description: "Testing create flow",
      dueDate: new Date(Date.now() + 86400000),
      subject: subjectDoc._id,
      classId: classDoc._id,
      teacher: teacher._id,
    });
    console.log(`Created Assignment successfully: ${newAss._id}`);

    // Test Update
    console.log("\n--- Testing Update Assignment ---");
    const updated = await Assignment.findByIdAndUpdate(
      newAss._id,
      {
        title: "Integration Test Assignment - Updated",
        description: "Testing update flow",
        dueDate: new Date(Date.now() + 172800000),
        subject: subjectDoc._id,
        classId: classDoc._id,
      },
      { new: true, runValidators: true }
    );
    console.log(`Updated Assignment successfully: ${updated?.title}`);

    // Test Delete
    console.log("\n--- Testing Delete Assignment ---");
    await Assignment.findByIdAndDelete(newAss._id);
    console.log("Deleted Assignment successfully");

  } catch (err: any) {
    console.error("ERROR during operations:", err.message || err);
  }

  await mongoose.disconnect();
}

run();
