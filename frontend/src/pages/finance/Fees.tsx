import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DollarSign, CheckCircle2, Plus, AlertCircle } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/AuthProvider";

const Fees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (user) {
      fetchFeesAndStudents();
    }
  }, [user]);

  const fetchFeesAndStudents = async () => {
    try {
      setLoading(true);
      const feeRes = await api.get("/finance/fees");
      setFees(feeRes.data);

      if (user?.role === "admin") {
        const userRes = await api.get("/users?role=student");
        if (userRes.data && userRes.data.users) {
          setStudents(userRes.data.users);
        }
      }
    } catch (error) {
      toast.error("Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceFee = async () => {
    try {
      if (!studentId || !amount || !dueDate) {
        toast.warning("Please provide all parameters.");
        return;
      }

      await api.post("/finance/fees/create", {
        studentId,
        amount: Number(amount),
        dueDate,
      });

      toast.success("Student invoiced successfully.");
      setIsOpen(false);
      setStudentId("");
      setAmount("");
      setDueDate("");
      fetchFeesAndStudents();
    } catch (error) {
      toast.error("Failed to invoice student fee.");
    }
  };

  const handlePayFee = async (feeId: string) => {
    try {
      await api.patch(`/finance/fees/${feeId}/pay`);
      toast.success("Payment recorded successfully.");
      fetchFeesAndStudents();
    } catch (error) {
      toast.error("Failed to record fee payment.");
    }
  };

  const totals = fees.reduce(
    (acc, f) => {
      acc.total += f.amount;
      if (f.status === "paid") {
        acc.paid += f.amount;
      } else {
        acc.pending += f.amount;
      }
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Collection</h1>
          <p className="text-muted-foreground">
            Billed student invoice ledgers, collections, and outstanding dues.
          </p>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Invoice Student
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur-md border-border relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Revenue Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">${totals.total.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border border-emerald-500/20 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Fees Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-400">
              ${totals.paid.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border border-amber-500/20 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Fees Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-400">
              ${totals.pending.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-card/50 backdrop-blur-md border-border">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-[30vh] items-center justify-center">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No student fee records logged in system.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Status</TableHead>
                  {user?.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee._id}>
                    <TableCell className="font-semibold">{fee.student?.name}</TableCell>
                    <TableCell className="font-bold">${fee.amount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(fee.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          fee.status === "paid"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                        }
                      >
                        {fee.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    {user?.role === "admin" && (
                      <TableCell className="text-right">
                        {fee.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => handlePayFee(fee._id)}>
                            Record Pay
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Creation Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invoice Student Fee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Select Student</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">Select Student</option>
                {students.map((stud) => (
                  <option key={stud._id} value={stud._id}>
                    {stud.name} ({stud.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Amount ($)</label>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Due Date</label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvoiceFee}>Issue Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fees;
