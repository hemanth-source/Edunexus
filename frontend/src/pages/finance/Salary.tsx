import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Plus } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const Salary = () => {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchSalariesAndTeachers();
  }, []);

  const fetchSalariesAndTeachers = async () => {
    try {
      setLoading(true);
      const salRes = await api.get("/finance/salaries");
      const userRes = await api.get("/users?role=teacher");

      setSalaries(salRes.data);
      if (userRes.data && userRes.data.users) {
        setTeachers(userRes.data.users);
      }
    } catch (error) {
      toast.error("Failed to load payroll details.");
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSalary = async () => {
    try {
      if (!teacherId || !amount) {
        toast.warning("Please provide all required parameters.");
        return;
      }

      await api.post("/finance/salaries/issue", {
        teacherId,
        amount: Number(amount),
      });

      toast.success("Payroll processed successfully.");
      setIsOpen(false);
      setTeacherId("");
      setAmount("");
      fetchSalariesAndTeachers();
    } catch (error) {
      toast.error("Failed to process teacher payroll.");
    }
  };

  const payrollBilled = salaries.reduce((sum, sal) => sum + sal.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Payroll</h1>
          <p className="text-muted-foreground">
            Track teacher salary contracts, verify payment histories, and process active payroll sheets.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Process Payroll
        </Button>
      </div>

      {/* Metric widget */}
      <Card className="bg-card/50 backdrop-blur-md border border-primary/20 relative overflow-hidden max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">Total Salaries Disbursed</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-foreground">
            ${payrollBilled.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground pt-1">Audited salary expenditures</p>
        </CardContent>
      </Card>

      {/* Salary Table */}
      <Card className="bg-card/50 backdrop-blur-md border-border">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-[30vh] items-center justify-center">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : salaries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No staff payroll vouchers emitted.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">Payroll Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.map((sal) => (
                  <TableRow key={sal._id}>
                    <TableCell className="font-semibold">{sal.teacher?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{sal.teacher?.email}</TableCell>
                    <TableCell className="font-bold">${sal.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sal.paymentDate ? new Date(sal.paymentDate).toLocaleDateString() : "Pending"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          sal.status === "paid"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }
                      >
                        {sal.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payroll Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Process Payroll Salary</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Select Teacher</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Select Teacher</option>
                {teachers.map((teach) => (
                  <option key={teach._id} value={teach._id}>
                    {teach.name} ({teach.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Amount ($)</label>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="3200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssueSalary}>Release Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Salary;
