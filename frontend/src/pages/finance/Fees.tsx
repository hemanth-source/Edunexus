import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DollarSign, CheckCircle2, Plus, AlertCircle, CreditCard, Lock, Sparkles, ArrowRight, X } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/AuthProvider";

type PaymentStep = "review" | "processing" | "success";

const Fees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin invoice form states
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Parent mock payment states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("review");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");

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

  // Admin direct pay
  const handlePayFee = async (feeId: string) => {
    try {
      await api.patch(`/finance/fees/${feeId}/pay`);
      toast.success("Payment recorded successfully.");
      fetchFeesAndStudents();
    } catch (error) {
      toast.error("Failed to record fee payment.");
    }
  };

  // Parent mock payment flow
  const openPaymentModal = (fee: any) => {
    setSelectedFee(fee);
    setPaymentStep("review");
    setPaymentModalOpen(true);
  };

  const handleMockPayment = async () => {
    setPaymentStep("processing");

    // Simulate processing delay for demo effect
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      await api.patch(`/finance/fees/${selectedFee._id}/pay`);
      setPaymentStep("success");

      // Auto-close after showing success
      setTimeout(() => {
        setPaymentModalOpen(false);
        setSelectedFee(null);
        setPaymentStep("review");
        fetchFeesAndStudents();
        toast.success("Fee payment processed successfully!");
      }, 2800);
    } catch (error) {
      toast.error("Payment failed. Please try again.");
      setPaymentStep("review");
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

  const isParent = user?.role === "parent";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isParent ? "Fee Payments" : "Fee Collection"}
          </h1>
          <p className="text-muted-foreground">
            {isParent
              ? "View and pay your child's fee invoices."
              : "Billed student invoice ledgers, collections, and outstanding dues."}
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
            <CardTitle className="text-sm font-semibold">
              {isParent ? "Total Invoiced" : "Total Revenue Invoiced"}
            </CardTitle>
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
            <CardTitle className="text-sm font-semibold">
              {isParent ? "Outstanding Balance" : "Total Fees Pending"}
            </CardTitle>
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
              {isParent
                ? "No fee invoices found for your children."
                : "No student fee records logged in system."}
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      {fee.status === "pending" && user?.role === "admin" && (
                        <Button size="sm" variant="outline" onClick={() => handlePayFee(fee._id)}>
                          Record Pay
                        </Button>
                      )}
                      {fee.status === "pending" && isParent && (
                        <Button
                          size="sm"
                          onClick={() => openPaymentModal(fee)}
                          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:scale-105"
                        >
                          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                          Pay Now
                        </Button>
                      )}
                      {fee.status === "paid" && isParent && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Creation Modal */}
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

      {/* ============= PARENT MOCK PAYMENT MODAL ============= */}
      <Dialog open={paymentModalOpen} onOpenChange={(open) => {
        if (!open && paymentStep !== "processing") {
          setPaymentModalOpen(false);
          setSelectedFee(null);
          setPaymentStep("review");
        }
      }}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-violet-500/20 bg-card/95 backdrop-blur-xl">
          {/* ---- STEP: REVIEW & CARD INPUT ---- */}
          {paymentStep === "review" && selectedFee && (
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Pay Fee</h3>
                    <p className="text-xs text-muted-foreground">Secure demo payment</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                  <Lock className="h-3 w-3" />
                  <span className="font-semibold">Encrypted</span>
                </div>
              </div>

              {/* Fee Summary */}
              <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Student</span>
                  <span className="text-sm font-bold text-foreground">{selectedFee.student?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className="text-sm font-semibold text-foreground">
                    {new Date(selectedFee.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-foreground">Total Amount</span>
                  <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    ${selectedFee.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card Form */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Card Details
                </label>
                <div className="space-y-2.5">
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background/50 pl-10 pr-4 text-sm font-mono tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="h-11 rounded-xl border border-border bg-background/50 px-4 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                      placeholder="MM/YY"
                    />
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="h-11 rounded-xl border border-border bg-background/50 px-4 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                      placeholder="CVV"
                    />
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <Button
                onClick={handleMockPayment}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 group"
              >
                <Lock className="mr-2 h-4 w-4" />
                Pay ${selectedFee.amount.toLocaleString()}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>

              <p className="text-[10px] text-center text-muted-foreground/60">
                🔒 This is a demo payment simulation. No real charges will be made.
              </p>
            </div>
          )}

          {/* ---- STEP: PROCESSING ---- */}
          {paymentStep === "processing" && (
            <div className="p-10 flex flex-col items-center justify-center space-y-6 min-h-[320px]">
              {/* Animated spinner */}
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CreditCard className="h-7 w-7 text-violet-400 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-foreground">Processing Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Verifying card details and processing your payment...
                </p>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* ---- STEP: SUCCESS ---- */}
          {paymentStep === "success" && selectedFee && (
            <div className="p-10 flex flex-col items-center justify-center space-y-5 min-h-[320px]">
              {/* Animated checkmark */}
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center animate-scale-check">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                </div>
                {/* Sparkle decorations */}
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-amber-400 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-3 h-4 w-4 text-violet-400 animate-pulse" style={{ animationDelay: "500ms" }} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-extrabold text-foreground">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  ${selectedFee.amount.toLocaleString()} has been paid for {selectedFee.student?.name}
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Transaction confirmed • Receipt sent
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes scale-check {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-check {
          animation: scale-check 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default Fees;
