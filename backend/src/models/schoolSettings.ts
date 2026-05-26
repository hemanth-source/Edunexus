import mongoose, { Document, Schema } from "mongoose";

export interface ISchoolSettings extends Document {
  schoolName: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
}

const schoolSettingsSchema: Schema<ISchoolSettings> = new Schema(
  {
    schoolName: { type: String, required: true, default: "Edunexus Academy" },
    address: { type: String, required: true, default: "123 Innovation Boulevard, Tech City" },
    contactEmail: { type: String, required: true, default: "info@edunexus.edu" },
    contactPhone: { type: String, required: true, default: "+1 (555) 019-2834" },
    logoUrl: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const SchoolSettings = mongoose.model<ISchoolSettings>("SchoolSettings", schoolSettingsSchema);
export default SchoolSettings;
