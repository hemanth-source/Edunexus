import mongoose, { Document, Schema } from "mongoose";

export interface IMaterial extends Document {
  title: string;
  description?: string;
  fileUrl: string;
  subject: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
}

const materialSchema: Schema<IMaterial> = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

const Material = mongoose.model<IMaterial>("Material", materialSchema);
export default Material;
