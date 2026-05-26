import mongoose, { Document, Schema } from "mongoose";

export interface IAssignment extends Document {
  title: string;
  description?: string;
  dueDate: Date;
  subject: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
}

const assignmentSchema: Schema<IAssignment> = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

const Assignment = mongoose.model<IAssignment>("Assignment", assignmentSchema);
export default Assignment;
