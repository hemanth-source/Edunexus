import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "./models/attendance.ts";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URL as string);
  console.log("Connected to MongoDB");

  const records = await Attendance.find({}).populate("student", "name email");
  console.log("Total attendance records:", records.length);
  for (const r of records) {
    console.log({
      id: r._id,
      studentName: (r.student as any)?.name,
      studentEmail: (r.student as any)?.email,
      status: r.status,
      date: r.date.toISOString(),
      subject: r.subject,
      timeSlot: r.timeSlot,
    });
  }

  await mongoose.disconnect();
}

run();
