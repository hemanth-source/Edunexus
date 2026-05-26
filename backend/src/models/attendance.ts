import mongoose, { Document, Schema } from "mongoose";

export interface IAttendance extends Document {
  student: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  date: Date;
  status: "present" | "absent" | "late";
  subject?: mongoose.Types.ObjectId;
  timeSlot?: string;
}

const attendanceSchema: Schema<IAttendance> = new Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      required: true,
      default: "present",
    },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    timeSlot: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index to avoid duplicate attendance records for a student on the same day per subject period
attendanceSchema.index({ student: 1, classId: 1, date: 1, subject: 1, timeSlot: 1 }, { unique: true });

const Attendance = mongoose.model<IAttendance>("Attendance", attendanceSchema);
export default Attendance;
