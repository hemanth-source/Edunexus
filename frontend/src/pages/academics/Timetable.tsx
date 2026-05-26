import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import type { schedule } from "@/types";
import GeneratorControls, {
  type GenSettings,
} from "@/components/timetable/GeneratorControls";
import TimetableGrid from "@/components/timetable/TimetableGrid";
import { Button } from "@/components/ui/button";
import { Edit2, Save, X, Plus, Calendar, UserCheck, Grid } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const Timetable = () => {
  const { user, year } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";

  const parentChildren = user?.parentOf || [];
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Initialize selectedChildId to first child when parent loads
  useEffect(() => {
    if (isParent && parentChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(parentChildren[0]._id);
    }
  }, [isParent, parentChildren.length]);

  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");

  // Tabs for Teachers: "personal" or "class"
  const [viewTab, setViewTab] = useState<"class" | "personal">(isTeacher ? "personal" : "class");

  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  // Dialog Editing Cell States
  const [editingCell, setEditingCell] = useState<{ day: string; time: string; period?: any } | null>(null);
  const [selSubject, setSelSubject] = useState("");
  const [selTeacher, setSelTeacher] = useState("");

  // Add Time Slot States
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newStart, setNewStart] = useState("14:00");
  const [newEnd, setNewEnd] = useState("15:00");

  // Fetch standard class-specific timetable
  const fetchTimetable = async (classId: string) => {
    if (!classId) return;

    try {
      setLoadingSchedule(true);
      const { data } = await api.get(`/timetables/${classId}`);
      setScheduleData(data.schedule || []);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setScheduleData([]);
        if (!isAdmin) {
          toast("No schedule found for this class", { icon: "📅" });
        }
      } else {
        toast.error("Failed to load timetable");
      }
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Fetch personal teacher-specific schedule
  const fetchTeacherPersonal = async () => {
    try {
      setLoadingSchedule(true);
      const { data } = await api.get("/timetables/teacher/personal");
      setScheduleData(data.schedule || []);
    } catch (error) {
      toast.error("Failed to compile your personal teaching schedule.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Fetch selection resources in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const loadResources = async () => {
        try {
          const [subRes, teachRes] = await Promise.all([
            api.get("/subjects"),
            api.get("/users?role=teacher"),
          ]);
          setAllSubjects(subRes.data.subjects || subRes.data || []);
          const teachersData = teachRes.data.users || teachRes.data || [];
          setAllTeachers(teachersData);
        } catch (error) {
          toast.error("Failed to load active subjects and teachers list.");
        }
      };
      loadResources();
    }
  }, [isEditMode]);

  // Resolving Dashboard Roles & Views
  useEffect(() => {
    if (isStudent && user?.studentClass) {
      // Students automatically pull their specific Class ID dynamically on mount!
      const classId = typeof user.studentClass === "object" ? (user.studentClass as any)._id : user.studentClass;
      setSelectedClass(classId);
      fetchTimetable(classId);
    } else if (isParent) {
      const targetId = selectedChildId || (parentChildren.length > 0 ? parentChildren[0]._id : "");
      if (!targetId) return;
      
      const targetChild = parentChildren.find((c: any) => c._id === targetId);
      if (targetChild?.studentClass) {
        const classId = typeof targetChild.studentClass === "object" ? (targetChild.studentClass as any)._id : targetChild.studentClass;
        setSelectedClass(classId);
        fetchTimetable(classId);
      }
    } else if (isTeacher && viewTab === "personal") {
      fetchTeacherPersonal();
    } else if (isTeacher && viewTab === "class" && selectedClass) {
      fetchTimetable(selectedClass);
    }
  }, [isStudent, isTeacher, isParent, viewTab, user?.role, selectedChildId]);

  // Fetch class timetable when selected by Admin/Teacher
  useEffect(() => {
    if (selectedClass && !isStudent && (isAdmin || (isTeacher && viewTab === "class"))) {
      fetchTimetable(selectedClass);
      setIsEditMode(false);
    }
  }, [selectedClass]);

  const handleGenerate = async (
    selectedClass: string,
    yearId: string,
    settings: GenSettings
  ) => {
    try {
      setIsGenerating(true);
      const { data } = await api.post("/timetables/generate", {
        classId: selectedClass,
        academicYearId: yearId,
        settings,
      });

      toast.success(data.message || "AI Generation Completed Synchronously!");
      fetchTimetable(selectedClass);
      setIsGenerating(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  // Toggle Edit Mode & Initialize Default Schedule if Empty
  const handleToggleEdit = () => {
    if (scheduleData.length === 0) {
      const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const initialSchedule = defaultDays.map((day) => ({
        day,
        periods: [
          { startTime: "08:00", endTime: "09:00", subject: null, teacher: null },
          { startTime: "09:00", endTime: "10:00", subject: null, teacher: null },
          { startTime: "10:00", endTime: "11:00", subject: null, teacher: null },
          { startTime: "11:00", endTime: "12:00", subject: null, teacher: null },
          { startTime: "12:00", endTime: "13:00", subject: null, teacher: null },
        ],
      }));
      setScheduleData(initialSchedule as any);
    }
    setIsEditMode(!isEditMode);
  };

  // Triggered when admin clicks a cell in Edit Mode
  const handlePeriodClick = (day: string, time: string, period?: any) => {
    setEditingCell({ day, time, period });
    setSelSubject(period?.subject?._id || period?.subject || "");
    setSelTeacher(period?.teacher?._id || period?.teacher || "");
  };

  // Update a single period cell in local state
  const handleUpdatePeriodCell = (subjectId: string | null, teacherId: string | null) => {
    if (!editingCell) return;

    setScheduleData((prev) =>
      prev.map((dayData) => {
        if (dayData.day !== editingCell.day) return dayData;

        return {
          ...dayData,
          periods: dayData.periods.map((p) => {
            if (p.startTime !== editingCell.time) return p;

            const subjectDoc = allSubjects.find((s) => s._id === subjectId);
            const teacherDoc = allTeachers.find((t) => t._id === teacherId);

            return {
              ...p,
              subject: subjectId ? { _id: subjectId, name: subjectDoc?.name || "Subject", code: subjectDoc?.code || "" } : null,
              teacher: teacherId ? { _id: teacherId, name: teacherDoc?.name || "Teacher" } : null,
            } as any;
          }),
        };
      })
    );

    setEditingCell(null);
    toast.success("Period modified locally");
  };

  // Add a new custom period row manually
  const handleAddCustomTimeSlot = () => {
    if (!newStart || !newEnd) return;
    setScheduleData((prev) =>
      prev.map((dayData) => ({
        ...dayData,
        periods: [
          ...dayData.periods,
          { startTime: newStart, endTime: newEnd, subject: null, teacher: null } as any,
        ],
      }))
    );
    setShowAddSlot(false);
    toast.success(`Manually added period slot: ${newStart} - ${newEnd}`);
  };

  // Send manually customized timetable to backend
  const handleSaveChanges = async () => {
    if (!selectedClass || !year?._id) {
      toast.error("Please select a Class and verify your active Academic Term is set.");
      return;
    }

    try {
      setSaving(true);
      const payload = scheduleData.map((d) => ({
        day: d.day,
        periods: d.periods.map((p) => ({
          subject: p.subject?._id || p.subject || null,
          teacher: p.teacher?._id || p.teacher || null,
          startTime: p.startTime,
          endTime: p.endTime,
        })),
      }));

      const { data } = await api.post("/timetables/save", {
        classId: selectedClass,
        academicYearId: year._id,
        schedule: payload,
      });

      toast.success(data.message || "Timetable updated and saved successfully!");
      setIsEditMode(false);
      fetchTimetable(selectedClass);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save timetable changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Timetable Management
          </h1>
          <p className="text-muted-foreground">
            {isStudent
              ? `Weekly class schedule for ${
                  user?.studentClass && typeof user.studentClass === "object"
                    ? (user.studentClass as any).name
                    : "Grade Assigned"
                }.`
              : isParent
              ? "View weekly class schedule for your enrolled children."
              : isTeacher
              ? "View your personal schedule or browse academic classes."
              : "View, edit, or generate weekly schedules using AI."}
          </p>
        </div>

        {/* Teacher Interactive Views Panel */}
        {isTeacher && (
          <div className="flex bg-muted/65 p-1 rounded-2xl border self-start">
            <Button
              variant={viewTab === "personal" ? "default" : "ghost"}
              onClick={() => {
                setViewTab("personal");
                setScheduleData([]);
              }}
              size="sm"
              className={`rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 ${
                viewTab === "personal" ? "shadow-md bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-4 w-4" /> Personal Schedule
            </Button>
            <Button
              variant={viewTab === "class" ? "default" : "ghost"}
              onClick={() => {
                setViewTab("class");
                setScheduleData([]);
                if (selectedClass) fetchTimetable(selectedClass);
              }}
              size="sm"
              className={`rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 ${
                viewTab === "class" ? "shadow-md bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="h-4 w-4" /> Class Schedules
            </Button>
          </div>
        )}

        {/* Manual Editing Global Buttons */}
        {isAdmin && selectedClass && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowAddSlot(true)}
                  size="sm"
                  className="text-xs h-9 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Time Slot
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsEditMode(false);
                    fetchTimetable(selectedClass);
                  }}
                  size="sm"
                  className="text-xs h-9 rounded-xl flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  size="sm"
                  className="text-xs h-9 rounded-xl flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-950/20"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Timetable"}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleToggleEdit}
                size="sm"
                className="text-xs h-9 rounded-xl flex items-center gap-1.5"
              >
                <Edit2 className="h-4 w-4" /> Manually Edit Schedule
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Control Filters - Hide completely for Students, Parents, and for Teachers when viewing personal schedule */}
      {!isStudent && !isParent && !(isTeacher && viewTab === "personal") && !isEditMode && (
        <GeneratorControls
          onGenerate={handleGenerate}
          onClassChange={fetchTimetable}
          isGenerating={isGenerating}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
        />
      )}

      {/* Parent Child Selector */}
      {isParent && parentChildren.length > 0 && (
        <div className="flex items-center gap-4 bg-card/50 backdrop-blur-md p-4 rounded-xl border border-border">
          <label className="text-sm font-semibold">Select Child:</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
          >
            {parentChildren.map((child: any) => (
              <option key={child._id} value={child._id}>
                {child.name} ({child.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Manual Creation Fallback Container */}
      {!isStudent && !isParent && !selectedClass && !(isTeacher && viewTab === "personal") && (
        <div className="h-80 w-full flex flex-col items-center justify-center border border-dashed rounded-3xl bg-card/20 backdrop-blur-md p-6 text-center">
          <Calendar className="h-12 w-12 text-primary opacity-60 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-foreground">Interactive Scheduling System</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Select a class from the list to populate its custom AI schedule or manually compose a timetable from scratch!
          </p>
        </div>
      )}

      {/* Grid view wrapper */}
      {(selectedClass || (isTeacher && viewTab === "personal")) && (
        <TimetableGrid
          schedule={scheduleData}
          isLoading={loadingSchedule}
          isEditMode={isEditMode}
          onPeriodClick={handlePeriodClick}
        />
      )}

      {/* Cell Editor Dialog */}
      {editingCell && (
        <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl border-border bg-card p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Configure Period</DialogTitle>
              <DialogDescription>
                Assign Subject and Teacher for <span className="font-semibold text-primary">{editingCell.day}</span> at <span className="font-semibold text-primary">{editingCell.time}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Select Subject</Label>
                <Select value={selSubject} onValueChange={setSelSubject}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue placeholder="Pick academic course" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {allSubjects.map((sub: any) => (
                      <SelectItem key={sub._id} value={sub._id} className="rounded-lg">
                        {sub.name} ({sub.code || "N/A"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Assign Lecturer</Label>
                <Select value={selTeacher} onValueChange={setSelTeacher}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue placeholder="Pick staff member" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {allTeachers.map((teacher: any) => (
                      <SelectItem key={teacher._id} value={teacher._id} className="rounded-lg">
                        {teacher.name} ({teacher.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex sm:justify-between gap-2 mt-4">
              <Button
                variant="destructive"
                onClick={() => handleUpdatePeriodCell(null, null)}
                className="rounded-xl text-xs"
              >
                Clear to Free Period
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingCell(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button onClick={() => handleUpdatePeriodCell(selSubject, selTeacher)} className="rounded-xl text-xs">
                  Save Period
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Custom Time Slot Dialog */}
      {showAddSlot && (
        <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
          <DialogContent className="sm:max-w-md rounded-3xl border-border bg-card p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Custom Period Row</DialogTitle>
              <DialogDescription>
                Insert a brand new time interval to expand your weekly schedule grid.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Start Time</Label>
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="rounded-xl h-10 bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">End Time</Label>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="rounded-xl h-10 bg-background/50"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => setShowAddSlot(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button onClick={handleAddCustomTimeSlot} className="rounded-xl text-xs">
                Add Slot Row
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Timetable;
