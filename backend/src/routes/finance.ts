import express from "express";
import {
  getFees,
  createFee,
  payFee,
  getExpenses,
  createExpense,
  getSalaries,
  issueSalary,
} from "../controllers/finance.ts";
import { protect, authorize } from "../middleware/auth.ts";

const financeRouter = express.Router();

financeRouter.get("/fees", protect, authorize(["admin", "parent"]), getFees);
financeRouter.post("/fees/create", protect, authorize(["admin"]), createFee);
financeRouter.patch("/fees/:id/pay", protect, authorize(["admin", "parent"]), payFee);

financeRouter.get("/expenses", protect, authorize(["admin"]), getExpenses);
financeRouter.post("/expenses/create", protect, authorize(["admin"]), createExpense);

financeRouter.get("/salaries", protect, authorize(["admin"]), getSalaries);
financeRouter.post("/salaries/issue", protect, authorize(["admin"]), issueSalary);

export default financeRouter;
