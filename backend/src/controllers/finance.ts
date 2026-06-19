import { type Request, type Response } from "express";
import Fee from "../models/fee.ts";
import Expense from "../models/expense.ts";
import Salary from "../models/salary.ts";
import Notification from "../models/notification.ts";
import User from "../models/user.ts";
import { logActivity } from "../utils/activitieslog.ts";
import { sendEmail } from "../utils/sendEmail.ts";

// ==================== FEE COLLECTION ====================

// @desc    Get All Fees
// @route   GET /api/finance/fees
// @access  Private/Admin
export const getFees = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = {};
    if (user.role === "parent") {
      const studentIds = user.parentOf || [];
      query = { student: { $in: studentIds } };
    }
    const fees = await Fee.find(query)
      .populate("student", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json(fees);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Create Student Fee Invoice
// @route   POST /api/finance/fees/create
// @access  Private/Admin
export const createFee = async (req: Request, res: Response) => {
  try {
    const { studentId, amount, dueDate } = req.body;
    if (!studentId || !amount || !dueDate) {
      return res.status(400).json({ message: "Please provide all required parameters." });
    }

    const fee = await Fee.create({
      student: studentId,
      amount,
      dueDate,
      status: "pending",
    });

    // Auto-Notify Student
    await Notification.create({
      recipient: studentId,
      sender: (req as any).user._id,
      title: "New Fee Invoice Released",
      message: `An administrative fee invoice of $${amount} has been released. Please complete the payment before ${new Date(dueDate).toLocaleDateString()}.`,
      type: "fee",
    });

    // Auto-Notify Parent (if linked)
    const student = await User.findById(studentId);
    if (student?.parent) {
      await Notification.create({
        recipient: student.parent,
        sender: (req as any).user._id,
        title: "Fee Invoice for Your Child",
        message: `A fee invoice of $${amount} has been issued for ${student.name}. Payment is due by ${new Date(dueDate).toLocaleDateString()}.`,
        type: "fee",
      });
    }

    await logActivity({
      userId: (req as any).user._id,
      action: `Invoiced fee of $${amount} to student: ${studentId}`,
    });

    res.status(201).json(fee);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Record Student Fee Payment
// @route   PATCH /api/finance/fees/:id/pay
// @access  Private/Admin
export const payFee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const fee = await Fee.findByIdAndUpdate(
      id,
      { status: "paid", paidAt: new Date() },
      { new: true }
    ).populate("student", "name parent");

    if (!fee) {
      return res.status(404).json({ message: "Fee record not found." });
    }

// Notify the parent that payment was successful
    const student = await User.findById(fee.student._id);
    if (student?.parent) {
      await Notification.create({
        recipient: student.parent,
        sender: (req as any).user._id,
        title: "Fee Payment Confirmed",
        message: `Payment of $${fee.amount} for ${student.name} has been successfully recorded.`,
        type: "fee",
      });

      const parentUser = await User.findById(student.parent);
      if (parentUser && parentUser.email) {
        sendEmail({
          to: parentUser.email,
          subject: `Payment Receipt: $${fee.amount} for ${student.name}`,
          html: `
            <div style="font-family: sans-serif; max-w-lg margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
              <h2 style="color: #10B981;">Payment Confirmed</h2>
              <p>Dear ${parentUser.name},</p>
              <p>Thank you for your payment. We have successfully recorded your payment of <strong>$${fee.amount}</strong> for student <strong>${student.name}</strong>.</p>
              <p style="color: #6b7280; font-size: 0.9em; margin-top: 30px;">- Edunexus Finance Dept</p>
            </div>
          `,
        });
      }
    }

    await logActivity({
      userId: (req as any).user._id,
      action: `Recorded fee payment of $${fee.amount} for student: ${(fee.student as any).name}`,
    });

    res.status(200).json(fee);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// ==================== EXPENSE LEDGER ====================

// @desc    Get All Expenses
// @route   GET /api/finance/expenses
// @access  Private/Admin
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Record a new Expense
// @route   POST /api/finance/expenses/create
// @access  Private/Admin
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { title, amount, category, date, description } = req.body;
    if (!title || !amount || !category) {
      return res.status(400).json({ message: "Please fill out all required parameters." });
    }

    const expense = await Expense.create({
      title,
      amount,
      category,
      date: date || new Date(),
      description,
    });

    await logActivity({
      userId: (req as any).user._id,
      action: `Recorded school expense: ${title} of $${amount}`,
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// ==================== TEACHER SALARIES ====================

// @desc    Get All Salaries
// @route   GET /api/finance/salaries
// @access  Private/Admin
export const getSalaries = async (req: Request, res: Response) => {
  try {
    const salaries = await Salary.find()
      .populate("teacher", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json(salaries);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Issue/Process Teacher Salary Payment
// @route   POST /api/finance/salaries/issue
// @access  Private/Admin
export const issueSalary = async (req: Request, res: Response) => {
  try {
    const { teacherId, amount } = req.body;
    if (!teacherId || !amount) {
      return res.status(400).json({ message: "Please fill out all required parameters." });
    }

    const salary = await Salary.create({
      teacher: teacherId,
      amount,
      status: "paid",
      paymentDate: new Date(),
    });

    // Auto-Notify Teacher
    await Notification.create({
      recipient: teacherId,
      sender: (req as any).user._id,
      title: "Salary Voucher Released",
      message: `Your monthly staff payroll salary of $${amount} has been successfully processed and disbursed.`,
      type: "system",
    });

    await logActivity({
      userId: (req as any).user._id,
      action: `Processed payroll salary of $${amount} to teacher: ${teacherId}`,
    });

    res.status(201).json(salary);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
