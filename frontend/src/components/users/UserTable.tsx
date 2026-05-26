import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  UserIcon,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { user } from "@/types";
import CustomPagination from "@/components/global/CustomPagination";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  role: string;
  loading: boolean;
  setDeleteId: (id: string) => void;
  setIsDeleteOpen: (open: boolean) => void;
  setEditingUser: (user: user | null) => void;
  setIsFormOpen: (open: boolean) => void;
  users: user[];
  pageNum: number;
  setPageNum: (page: number) => void;
  totalPages: number;
  onRefresh?: () => void;
}

const UserTable = ({
  role,
  loading,
  setDeleteId,
  setIsDeleteOpen,
  setEditingUser,
  setIsFormOpen,
  pageNum,
  setPageNum,
  users,
  totalPages,
  onRefresh,
}: Props) => {
  const [repairingId, setRepairingId] = useState<string | null>(null);

  const handleEdit = (user: user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleRepairLink = async (parentUser: user) => {
    try {
      setRepairingId(parentUser._id);

      // Check what's currently stored for this parent
      const { data } = await api.get(`/users/debug/${parentUser._id}`);
      const parentOf = data.user?.parentOf || [];

      if (parentOf.length > 0) {
        toast.success(
          `Link OK! ${parentUser.name} → ${parentOf.map((c: any) => c.name).join(", ")}`
        );
        return;
      }

      // No children linked — try to find students who listed this parent
      const studRes = await api.get("/users?role=student&limit=100");
      const allStudents = studRes.data.users || [];
      const linkedStudents = allStudents.filter((s: any) => {
        const parentField =
          typeof s.parent === "object" ? s.parent?._id : s.parent;
        return parentField === parentUser._id;
      });

      if (linkedStudents.length > 0) {
        await Promise.all(
          linkedStudents.map((s: any) =>
            api.post("/users/repair-link", {
              parentId: parentUser._id,
              studentId: s._id,
            })
          )
        );
        toast.success(
          `Repaired! Linked ${linkedStudents.length} student(s) to ${parentUser.name}.`
        );
        onRefresh?.();
      } else {
        toast.warning(
          `No children found for ${parentUser.name}. Edit the parent and assign children using the "Student Link" field.`
        );
      }
    } catch {
      toast.error("Failed to check/repair parent link.");
    } finally {
      setRepairingId(null);
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            {role === "teacher" && <TableHead>Subjects</TableHead>}
            {role === "student" && <TableHead>Class</TableHead>}
            {role === "parent" && <TableHead>Linked Children</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No {role}s found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  {user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>

                {role === "teacher" && (
                  <TableCell>
                    {user.teacherSubjects?.length ? (
                      <div className="flex gap-1">
                        {user.teacherSubjects.map((subject) => (
                          <Badge variant="outline" key={subject._id}>
                            {subject.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                )}

                {role === "student" && (
                  <TableCell>
                    {user.studentClass?._id ? (
                      <Badge variant="outline">{user.studentClass.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                )}

                {role === "parent" && (
                  <TableCell>
                    {user.parentOf && user.parentOf.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.parentOf.map((child: any) => (
                          <Badge
                            key={child._id || child}
                            variant="outline"
                            className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          >
                            {child.name || child}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-amber-400 italic text-xs font-semibold">
                        ⚠ No children linked
                      </span>
                    )}
                  </TableCell>
                )}

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {role === "parent" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRepairLink(user)}
                            disabled={repairingId === user._id}
                            className="text-blue-500"
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {repairingId === user._id
                              ? "Checking..."
                              : "Check & Repair Link"}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setDeleteId(user._id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {users.length > 10 && (
        <CustomPagination
          loading={loading}
          page={pageNum}
          setPage={setPageNum}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default UserTable;
