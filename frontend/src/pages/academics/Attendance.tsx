import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Clock, CalendarRange, UserCheck, Users } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface StudentRecord {
  studentId: string;
  name: string;
  email: string;
  status: "present" | "absent" | "late";
}

const Attendance = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any>(null);
  const [availablePeriods, setAvailablePeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("general");

  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";
  const isParent = user?.role === "parent";

  const parentChildren = user?.parentOf || [];
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Initialize selectedChildId to first child when parent logs in
  useEffect(() => {
    if (isParent && parentChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(parentChildren[0]._id);
    }
  }, [isParent, parentChildren.length]);

  // Fetch data based on role
  useEffect(() => {
    if (isTeacherOrAdmin) {
      fetchClasses();
    } else if (isParent) {
      const targetId = selectedChildId || (parentChildren.length > 0 ? parentChildren[0]._id : "");
      if (targetId) {
        fetchStudentStats(targetId);
      }
    } else if (user?._id && user.role === "student") {
      fetchStudentStats(user._id);
    }
  }, [user?.role, selectedChildId]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get("/classes");
      if (data.classes && data.classes.length > 0) {
        setClasses(data.classes);
        setSelectedClass(data.classes[0]._id);
      }
    } catch (error) {
      toast.error("Failed to load classes");
    }
  };

  const fetchTimetable = async (classId: string) => {
    try {
      const { data } = await api.get(`/timetables/${classId}`);
      setTimetable(data);
    } catch (error) {
      setTimetable(null);
    }
  };

  useEffect(() => {
    if (selectedClass && isTeacherOrAdmin) {
      fetchTimetable(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!date) {
      setAvailablePeriods([]);
      setSelectedPeriodId("general");
      return;
    }

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const parsedDate = new Date(date);
    const dayName = daysOfWeek[parsedDate.getUTCDay()];

    if (timetable && timetable.schedule) {
      const daySchedule = timetable.schedule.find(
        (s: any) => s.day.toLowerCase() === dayName.toLowerCase()
      );
      if (daySchedule && daySchedule.periods) {
        setAvailablePeriods(daySchedule.periods);
        setSelectedPeriodId("general");
      } else {
        setAvailablePeriods([]);
        setSelectedPeriodId("general");
      }
    } else {
      setAvailablePeriods([]);
      setSelectedPeriodId("general");
    }
  }, [date, timetable]);

  let selectedSubject: string | undefined = undefined;
  let selectedTimeSlot: string | undefined = undefined;

  if (selectedPeriodId && selectedPeriodId !== "general") {
    const parts = selectedPeriodId.split("|");
    if (parts.length === 3) {
      selectedSubject = parts[0];
      selectedTimeSlot = `${parts[1]} - ${parts[2]}`;
    }
  }

  useEffect(() => {
    if (selectedClass && isTeacherOrAdmin) {
      fetchClassAttendance();
    }
  }, [selectedClass, date, selectedPeriodId]);

  const fetchClassAttendance = async () => {
    try {
      setLoading(true);
      // 1. Fetch class details to get enrolled students
      const classRes = await api.get(`/classes`);
      const targetClass = classRes.data.classes.find((c: any) => c._id === selectedClass);
      
      if (!targetClass) return;

      // 2. Fetch existing marked attendance for this date
      let url = `/attendance/class/${selectedClass}?date=${date}`;
      if (selectedSubject && selectedTimeSlot) {
        url += `&subject=${selectedSubject}&timeSlot=${encodeURIComponent(selectedTimeSlot)}`;
      }
      
      const attendanceRes = await api.get(url);
      const markedRecords = attendanceRes.data;

      const formattedRecords = targetClass.students.map((stud: any) => {
        const marked = markedRecords.find((r: any) => r.student?._id === stud._id);
        return {
          studentId: stud._id,
          name: stud.name,
          email: stud.email,
          status: marked ? marked.status : "present",
        };
      });

      setStudents(formattedRecords);
    } catch (error) {
      toast.error("Failed to fetch class attendance");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentStats = async (studentId: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/attendance/student/${studentId}`);
      setStudentStats(data.stats);
      setStudentRecords(data.records);
    } catch (error) {
      toast.error("Failed to fetch student attendance stats");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late") => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleSubmitSheet = async () => {
    try {
      setLoading(true);
      await api.post("/attendance/mark", {
        classId: selectedClass,
        date,
        subject: selectedSubject || undefined,
        timeSlot: selectedTimeSlot || undefined,
        records: students.map((s) => ({ studentId: s.studentId, status: s.status })),
      });
      toast.success("Attendance sheet submitted successfully");
      fetchClassAttendance();
    } catch (error: any) {
      console.error("❌ handleSubmitSheet error:", error);
      const msg = error.response?.data?.message || "Failed to submit attendance sheet";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !students.length && !studentStats) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">
          {isTeacherOrAdmin
            ? "Track and mark daily attendance sheets for academic courses."
            : "Review your personal attendance metrics and track consistency."}
        </p>
      </div>

      {isTeacherOrAdmin ? (
        <div className="grid gap-6">
          {/* Controls Card */}
          <Card className="bg-card/50 backdrop-blur-md border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                Sheet Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold">Select Class</label>
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

              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold">Sheet Date</label>
                <input
                  type="date"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold">Select Period / Time Slot</label>
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                >
                  <option value="general">General Attendance (No Slot)</option>
                  {availablePeriods.map((period, idx) => {
                    const key = `${period.subject?._id || period.subject}|${period.startTime}|${period.endTime}`;
                    const label = `${period.subject?.name || "Subject"} (${period.startTime} - ${period.endTime})`;
                    return (
                      <option key={idx} value={key}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <Button onClick={handleSubmitSheet} disabled={loading} className="w-full sm:w-auto">
                Submit Sheets
              </Button>
            </CardContent>
          </Card>

          {/* Student List Table */}
          <Card className="bg-card/50 backdrop-blur-md border-border">
            <CardContent className="pt-6">
              {students.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No students currently enrolled in this class.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Status Toggle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-semibold">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleStatusChange(student.studentId, "present")}
                              className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 text-xs font-bold ${
                                student.status === "present"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-muted/30 text-muted border border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <Check className="h-4 w-4" />
                              Present
                            </button>

                            <button
                              onClick={() => handleStatusChange(student.studentId, "absent")}
                              className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 text-xs font-bold ${
                                student.status === "absent"
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-muted/30 text-muted border border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <X className="h-4 w-4" />
                              Absent
                            </button>

                            <button
                              onClick={() => handleStatusChange(student.studentId, "late")}
                              className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 text-xs font-bold ${
                                student.status === "late"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-muted/30 text-muted border border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <Clock className="h-4 w-4" />
                              Late
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
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

          <div className="grid md:grid-cols-3 gap-6">
          {/* Radial Metrics */}
          <Card className="bg-card/50 backdrop-blur-md border-border md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Monthly Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative w-36 h-36 flex items-center justify-center bg-primary/5 rounded-full border border-primary/10 mb-4">
                  <span className="text-4xl font-extrabold text-foreground">
                    {studentStats?.percentage || 0}%
                  </span>
                </div>
                <h3 className="font-bold text-lg">Overall Consistency Rate</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Present Days</span>
                    <span className="text-emerald-400 font-bold">{studentStats?.present || 0}</span>
                  </div>
                  <Progress value={(studentStats?.present / (studentStats?.total || 1)) * 100} className="h-1.5" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Late Days</span>
                    <span className="text-amber-400 font-bold">{studentStats?.late || 0}</span>
                  </div>
                  <Progress value={(studentStats?.late / (studentStats?.total || 1)) * 100} className="h-1.5" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Absent Days</span>
                    <span className="text-rose-400 font-bold">{studentStats?.absent || 0}</span>
                  </div>
                  <Progress value={(studentStats?.absent / (studentStats?.total || 1)) * 100} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Ledger */}
          <Card className="bg-card/50 backdrop-blur-md border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Attendance Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentRecords.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No attendance history logged yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Subject / Slot</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentRecords.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-semibold">{record.classId?.name}</TableCell>
                        <TableCell className="font-medium text-emerald-400">
                          {record.subject ? `${record.subject.name} (${record.timeSlot})` : "General"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(record.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={
                              record.status === "present"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : record.status === "late"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }
                          >
                            {record.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
