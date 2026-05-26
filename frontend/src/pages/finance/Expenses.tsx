import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DollarSign, Plus, Tag } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const Expenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/finance/expenses");
      setExpenses(data);
    } catch (error) {
      toast.error("Failed to load school expenses.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordExpense = async () => {
    try {
      if (!title || !amount || !category) {
        toast.warning("Please fill out all required parameters.");
        return;
      }

      await api.post("/finance/expenses/create", {
        title,
        amount: Number(amount),
        category,
        date: date || new Date(),
        description,
      });

      toast.success("Expense recorded successfully.");
      setIsOpen(false);
      setTitle("");
      setAmount("");
      setCategory("");
      setDate("");
      setDescription("");
      
      fetchExpenses();
    } catch (error) {
      toast.error("Failed to log expense.");
    }
  };

  const totalOutflow = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses Ledger</h1>
          <p className="text-muted-foreground">
            Track, report, and audit educational outlays, facilities operations, and utility expenses.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Record Expense
        </Button>
      </div>

      {/* Outflow Metric */}
      <Card className="bg-card/50 backdrop-blur-md border border-rose-500/20 relative overflow-hidden max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">Total School Expenditures</CardTitle>
          <DollarSign className="h-4 w-4 text-rose-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-rose-400">
            ${totalOutflow.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground pt-1">Logged facility disbursements</p>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card className="bg-card/50 backdrop-blur-md border-border">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-[30vh] items-center justify-center">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No school expenses recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expenditure Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Disbursed Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp._id}>
                    <TableCell className="font-semibold">{exp.title}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted/40 text-foreground border border-border">
                        <Tag className="h-3 w-3" />
                        {exp.category}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-rose-400">
                      -${exp.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(exp.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {exp.description || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recording Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record School Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Expense Title</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Water & Power Bill..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Amount ($)</label>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="850"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Category</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Academic Tools">Academic Tools</option>
                <option value="Staff Salaries">Staff Salaries</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Date</label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add brief details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordExpense}>Record Outlay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
