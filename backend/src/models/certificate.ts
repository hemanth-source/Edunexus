import mongoose, { Schema, Document } from "mongoose";

export interface ICertificate extends Document {
  student: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;
  issueDate: Date;
  grade: string;
  comments?: string;
  courseName: string;
}

const certificateSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issueDate: { type: Date, default: Date.now },
    grade: { type: String, required: true },
    comments: { type: String },
    courseName: { type: String, required: true, default: "Full Academy Curriculum Completion" }
  },
  { timestamps: true }
);

export default mongoose.model<ICertificate>("Certificate", certificateSchema);
