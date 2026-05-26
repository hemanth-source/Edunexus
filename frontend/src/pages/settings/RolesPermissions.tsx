import { useState } from "react";
import { toast } from "sonner";
import { Shield, Check, X, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PermissionNode {
  module: string;
  admin: boolean;
  teacher: boolean;
  student: boolean;
  parent: boolean;
}

const RolesPermissions = () => {
  const [matrix, setMatrix] = useState<PermissionNode[]>([
    { module: "Dashboard Overview", admin: true, teacher: true, student: true, parent: true },
    { module: "User Registry Accounts", admin: true, teacher: false, student: false, parent: false },
    { module: "Class Timetables", admin: true, teacher: true, student: true, parent: true },
    { module: "Daily Attendance Mark", admin: true, teacher: true, student: false, parent: false },
    { module: "LMS Exam Publications", admin: true, teacher: true, student: false, parent: false },
    { module: "LMS Assignment Homework", admin: true, teacher: true, student: true, parent: false },
    { module: "Finance Fees Collection", admin: true, teacher: false, student: false, parent: false },
    { module: "Finance Expense Ledgers", admin: true, teacher: false, student: false, parent: false },
    { module: "Staff Salaries Payroll", admin: true, teacher: false, student: false, parent: false },
    { module: "System Core Settings", admin: true, teacher: false, student: false, parent: false },
  ]);

  const [saving, setSaving] = useState(false);

  const handleToggle = (index: number, role: "admin" | "teacher" | "student" | "parent") => {
    // Admin module permissions should remain locked for security/integrity
    if (role === "admin") {
      toast.info("Administrator root permissions cannot be revoked.");
      return;
    }

    setMatrix((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, [role]: !item[role] };
        }
        return item;
      })
    );
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      // Simulate backend saving
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Security permissions matrix updated successfully.");
    } catch (err) {
      toast.error("Failed to commit permission matrix changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Configure system module visibility, actions, and security access lists by roles.
          </p>
        </div>
        <Button onClick={handleSaveChanges} disabled={saving}>
          {saving ? "Saving Changes..." : "Save System ACL"}
        </Button>
      </div>

      <Card className="bg-card/50 backdrop-blur-md border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Module Access Control Matrix
          </CardTitle>
          <CardDescription>
            Grant or restrict permission check-boxes across system modules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">System Module</TableHead>
                <TableHead className="text-center">Admin</TableHead>
                <TableHead className="text-center">Teacher</TableHead>
                <TableHead className="text-center">Student</TableHead>
                <TableHead className="text-center">Parent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row, index) => (
                <TableRow key={row.module}>
                  <TableCell className="font-semibold">{row.module}</TableCell>

                  {/* Admin column */}
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggle(index, "admin")}
                      className="mx-auto w-8 h-8 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center text-primary transition-all cursor-not-allowed"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </TableCell>

                  {/* Teacher column */}
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggle(index, "teacher")}
                      className={`mx-auto w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        row.teacher
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {row.teacher ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </TableCell>

                  {/* Student column */}
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggle(index, "student")}
                      className={`mx-auto w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        row.student
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {row.student ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </TableCell>

                  {/* Parent column */}
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggle(index, "parent")}
                      className={`mx-auto w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        row.parent
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {row.parent ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-2xl p-4 text-sm text-muted-foreground">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p>
              <strong>Security Policy Note:</strong> Administrator role maintains strict root control over the systems to preserve dashboard operability. Double-click or select checking toggles to make adjustments, then save your checklist.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesPermissions;
