import mongoose, { Document, Schema } from "mongoose";

export interface IExpense extends Document {
  title: string;
  amount: number;
  category: string;
  date: Date;
  description?: string;
}

const expenseSchema: Schema<IExpense> = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
export default Expense;
