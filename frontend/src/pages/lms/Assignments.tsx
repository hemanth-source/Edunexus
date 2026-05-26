import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Clock, Calendar, AlertCircle, Send, Pencil, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const Assignments = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classId, setClassId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => {
    fetchClassAndSubjects();
  }, []);

  const fetchClassAndSubjects = async () => {
    try {
      const classRes = await api.get("/classes");
      const subRes = await api.get("/subjects");

      if (classRes.data.classes && classRes.data.classes.length > 0) {
        setClasses(classRes.data.classes);
        const studentClassId = (user?.studentClass && typeof user.studentClass === "object" ? user.studentClass._id : user?.studentClass) as string | undefined;
        if (user?.role === "student" && studentClassId) {
          setSelectedClass(studentClassId);
        } else {
          setSelectedClass(classRes.data.classes[0]._id);
        }
      }
      if (subRes.data) {
        if (subRes.data.subjects && Array.isArray(subRes.data.subjects)) {
          setSubjects(subRes.data.subjects);
        } else if (Array.isArray(subRes.data)) {
          setSubjects(subRes.data);
        }
      }
    } catch (error) {
      toast.error("Failed to load initial class details.");
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchAssignments();
    }
  }, [selectedClass]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/assignments/class/${selectedClass}`);
      setAssignments(data);
    } catch (error) {
      toast.error("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    try {
      if (!title || !subject || !dueDate || !classId) {
        toast.warning("Please fill out all required parameters.");
        return;
      }

      setLoading(true);
      if (editMode && editingAssignmentId) {
        await api.put(`/assignments/update/${editingAssignmentId}`, {
          title,
          description,
          subject,
          classId,
          dueDate,
        });
        toast.success("Assignment updated successfully.");
      } else {
        await api.post("/assignments/create", {
          title,
          description,
          subject,
          classId,
          dueDate,
        });
        toast.success("Assignment added successfully.");
      }

      setIsOpen(false);
      // Reset state
      setTitle("");
      setDescription("");
      setSubject("");
      setDueDate("");
      setClassId("");
      setEditMode(false);
      setEditingAssignmentId(null);
      
      fetchAssignments();
    } catch (error) {
      toast.error(editMode ? "Failed to update assignment." : "Failed to create assignment.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (assignment: any) => {
    setTitle(assignment.title);
    setDescription(assignment.description || "");
    setSubject(assignment.subject?._id || assignment.subject || "");
    setClassId(assignment.classId?._id || assignment.classId || "");
    
    // Format date string for datetime-local input (YYYY-MM-DDTHH:MM)
    if (assignment.dueDate) {
      const d = new Date(assignment.dueDate);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      setDueDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setDueDate("");
    }

    setEditingAssignmentId(assignment._id);
    setEditMode(true);
    setIsOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      setLoading(true);
      await api.delete(`/assignments/delete/${id}`);
      toast.success("Assignment deleted successfully.");
      fetchAssignments();
    } catch (error) {
      toast.error("Failed to delete assignment.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (due: string) => {
    const total = Date.parse(due) - Date.parse(new Date().toString());
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    if (days < 0) return "Overdue";
    if (days === 0) return "Due Today";
    return `${days} Days Left`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            Manage course tasks, track due dates, and review submissions.
          </p>
        </div>
        <div className="flex gap-2">
          {isTeacherOrAdmin && (
            <Button onClick={() => {
              setTitle("");
              setDescription("");
              setSubject("");
              setDueDate("");
              setClassId(selectedClass);
              setEditMode(false);
              setEditingAssignmentId(null);
              setIsOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" /> Add Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Select class filter */}
      {isTeacherOrAdmin && (
        <Card className="bg-card/50 backdrop-blur-md border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold">Class Filter</label>
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments list */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card/20 border border-dashed border-border rounded-3xl">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-1">No active assignments</h3>
          <p className="text-sm">There are no assignments published for this class yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {assignments.map((assignment) => (
            <Card key={assignment._id} className="bg-card/50 backdrop-blur-md border-border flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
              <CardHeader className="space-y-1">
                <div className="flex justify-between items-start">
                  <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                    {assignment.subject?.name}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        getTimeRemaining(assignment.dueDate) === "Overdue"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }
                    >
                      {getTimeRemaining(assignment.dueDate)}
                    </Badge>
                    {isTeacherOrAdmin && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => handleEditClick(assignment)}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit Assignment"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(assignment._id)}
                          className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
                          title="Delete Assignment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <CardTitle className="text-xl font-bold pt-2">{assignment.title}</CardTitle>
                <CardDescription className="text-muted-foreground text-sm line-clamp-3">
                  {assignment.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-t border-border pt-4 flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Published: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {!isTeacherOrAdmin && (
                  <Button className="w-full gap-2">
                    <Send className="h-4 w-4" /> Submit Homework
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setTitle("");
          setDescription("");
          setSubject("");
          setDueDate("");
          setClassId("");
          setEditMode(false);
          setEditingAssignmentId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Assignment" : "Publish New Assignment"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Title</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Homework Chapter 2..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Provide task notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Subject</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Class Target</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Due Date</label>
              <input
                type="datetime-local"
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
            <Button onClick={handleCreateAssignment}>{editMode ? "Save Changes" : "Publish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assignments;
