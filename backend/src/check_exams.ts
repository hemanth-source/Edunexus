import mongoose from "mongoose";
import dotenv from "dotenv";
import Exam from "./models/exam.ts";
import classModel from "./models/class.ts";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URL as string);
  console.log("Connected to MongoDB");

  const exams = await Exam.find({});
  console.log("Exams count:", exams.length);
  for (const e of exams) {
    console.log(`Exam Title: ${e.title}, Class ID: ${e.class}, Active: ${e.isActive}`);
  }

  const classes = await classModel.find({});
  for (const c of classes) {
    console.log(`Class: ${c.name}, ID: ${c._id}`);
  }

  await mongoose.disconnect();
}

run();
