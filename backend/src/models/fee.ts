import mongoose, { Document, Schema } from "mongoose";

export interface IFee extends Document {
  student: mongoose.Types.ObjectId;
  amount: number;
  status: "paid" | "pending";
  dueDate: Date;
  paidAt?: Date;
}

const feeSchema: Schema<IFee> = new Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["paid", "pending"], default: "pending" },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const Fee = mongoose.model<IFee>("Fee", feeSchema);
export default Fee;
