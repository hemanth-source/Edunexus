import mongoose, { Document, Schema } from "mongoose";

export interface ISalary extends Document {
  teacher: mongoose.Types.ObjectId;
  amount: number;
  status: "paid" | "pending";
  paymentDate?: Date;
}

const salarySchema: Schema<ISalary> = new Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["paid", "pending"], default: "pending" },
    paymentDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

const Salary = mongoose.model<ISalary>("Salary", salarySchema);
export default Salary;
