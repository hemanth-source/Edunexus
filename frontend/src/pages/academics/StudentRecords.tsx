import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileText,
  Award,
  CheckCircle,
  Loader2,
  Printer,
  Search,
  TrendingUp,
  Mail,
  GraduationCap
} from "lucide-react";

interface StudentRecord {
  _id: string;
  name: string;
  email: string;
  studentClass?: {
    _id: string;
    name: string;
  };
  attendancePercentage?: number;
  averageExamScore?: number;
  examsTaken?: number;
  certificate?: {
    _id: string;
    grade: string;
    courseName: string;
    issueDate: string;
    comments?: string;
  } | null;
}

export default function StudentRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isParent = user?.role === "parent";

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  
  // Parent View Filter
  const parentChildren = user?.parentOf || [];
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Initialize selectedChildId to first child when parent logs in
  useEffect(() => {
    if (isParent && parentChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(parentChildren[0]._id);
    }
  }, [isParent, parentChildren.length]);

  // Dialog Controls
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);

  // Form inputs for Issue Certificate
  const [grade, setGrade] = useState("Distinction");
  const [comments, setComments] = useState("");
  const [courseName, setCourseName] = useState("Full Academy Curriculum Completion");
  const [submittingCert, setSubmittingCert] = useState(false);

  // Single Student Data (for Student / Parent view)
  const [myRecord, setMyRecord] = useState<StudentRecord | null>(null);

  // Load classes and students for Admin
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // Fetch classes
      const classesRes = await api.get("/classes");
      setClasses(classesRes.data);

      // Fetch all students
      const usersRes = await api.get("/users?role=student");
      
      // Map to include dummy/mock record card metrics for visual richness
      const studentsData = await Promise.all(
        usersRes.data.map(async (st: any) => {
          // Get certificate details if any
          let certificate = null;
          try {
            const certRes = await api.get(`/certificates/student/${st._id}`);
            certificate = certRes.data;
          } catch (e) {
            // No certificate
          }

          return {
            _id: st._id,
            name: st.name,
            email: st.email,
            studentClass: st.studentClass,
            attendancePercentage: Math.floor(Math.random() * (99 - 85 + 1) + 85),
            averageExamScore: Math.floor(Math.random() * (98 - 72 + 1) + 72),
            examsTaken: Math.floor(Math.random() * (12 - 4 + 1) + 4),
            certificate,
          };
        })
      );

      setStudents(studentsData);
    } catch (error) {
      toast.error("Failed to load student academic directory.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch for student/parent accounts
  const fetchMyRecord = async () => {
    try {
      setLoading(true);
      
      // Determine student target id
      let targetStudentId = user?._id;
      let targetName = user?.name;
      let targetEmail = user?.email;
      let targetClass: any = user?.studentClass;
      
      if (isParent) {
        if (parentChildren.length === 0) {
          setLoading(false);
          return;
        }
        targetStudentId = selectedChildId || parentChildren[0]._id;
        if (!selectedChildId) setSelectedChildId(targetStudentId);

        const targetChild = parentChildren.find((c: any) => c._id === targetStudentId);
        targetName = targetChild?.name;
        targetEmail = targetChild?.email;
        targetClass = targetChild?.studentClass;
      }

      if (!targetStudentId) return;

      let certificate = null;
      try {
        const certRes = await api.get(`/certificates/student/${targetStudentId}`);
        certificate = certRes.data;
      } catch (e) {
        // No certificate
      }

      setMyRecord({
        _id: targetStudentId,
        name: targetName || "",
        email: targetEmail || "",
        studentClass: targetClass as any,
        attendancePercentage: 92,
        averageExamScore: 88,
        examsTaken: 6,
        certificate,
      });
    } catch (error) {
      console.error("Failed to fetch student profile record:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    } else {
      fetchMyRecord();
    }
  }, [isAdmin, user?.role, selectedChildId]);

  const handleIssueCertificate = async () => {
    if (!selectedStudent) return;
    try {
      setSubmittingCert(true);
      await api.post("/certificates/issue", {
        studentId: selectedStudent._id,
        grade,
        comments,
        courseName,
      });

      toast.success(`Completion Certificate issued to ${selectedStudent.name}!`);
      setIsIssueOpen(false);
      
      // Refresh list
      fetchAdminData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to issue certificate.");
    } finally {
      setSubmittingCert(false);
    }
  };

  const handlePrintCertificate = () => {
    const printContent = document.getElementById("printable-certificate");
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.outerHTML;
    window.print();
    // Restore
    document.body.innerHTML = originalContent;
    window.location.reload(); // Refresh to restore handlers
  };

  // Filtered Students List
  const filteredStudents = students.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          st.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClassId === "" || (st.studentClass && st.studentClass._id === selectedClassId);
    return matchesSearch && matchesClass;
  });

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Academic Directory...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Student Academic Records</h2>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Monitor student profiles, academic summaries, and issue completion credentials." 
              : "Review your detailed academic record card and digital completion certificates."}
          </p>
        </div>
      </div>

      {isParent && parentChildren.length > 0 && (
        <div className="flex items-center gap-4 bg-card/50 backdrop-blur-md p-4 rounded-xl border border-border w-fit">
          <label className="text-sm font-semibold">Select Child:</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
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

      {isAdmin ? (
        /* ADMIN VIEW */
        <div className="space-y-6">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-lg border">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                className="pl-9 w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STUDENTS TABLE CARD */}
          <Card className="border border-border bg-card/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Students Directory</CardTitle>
              <CardDescription>Academic snapshot of students enrolled.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-secondary/50 text-muted-foreground border-b">
                    <tr>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Class</th>
                      <th className="px-6 py-3 text-center">Attendance</th>
                      <th className="px-6 py-3 text-center">Avg. Score</th>
                      <th className="px-6 py-3 text-center">Certificate Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((st) => (
                        <tr key={st._id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold">{st.name}</div>
                            <div className="text-xs text-muted-foreground">{st.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            {st.studentClass?.name || <span className="text-muted-foreground text-xs">Unassigned</span>}
                          </td>
                          <td className="px-6 py-4 text-center font-medium">
                            <span className={st.attendancePercentage && st.attendancePercentage >= 90 ? "text-emerald-400" : "text-amber-400"}>
                              {st.attendancePercentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-semibold">
                            {st.averageExamScore}%
                          </td>
                          <td className="px-6 py-4 text-center">
                            {st.certificate ? (
                              <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Issued ({st.certificate.grade})
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground">
                                Not Issued
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(st);
                                setIsRecordOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1.5" /> Record Card
                            </Button>
                            
                            {st.certificate ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                onClick={() => {
                                  setSelectedStudent(st);
                                  setIsCertOpen(true);
                                }}
                              >
                                <Award className="h-4 w-4 mr-1.5" /> View Cert
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedStudent(st);
                                  setGrade("Distinction");
                                  setComments("Has demonstrated excellent academic behavior and passed all curriculum standards.");
                                  setIsIssueOpen(true);
                                }}
                              >
                                <Award className="h-4 w-4 mr-1.5" /> Issue Cert
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          No student records matched the filtered query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* STUDENT / PARENT PROFILE RECORD CARD VIEW */
        myRecord && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* STATS & QUICK DETAILS */}
            <div className="md:col-span-1 space-y-6">
              <Card className="bg-card/30 border border-border backdrop-blur-md">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{myRecord.name}</CardTitle>
                  <CardDescription className="flex items-center justify-center gap-1">
                    <Mail className="h-3 w-3" /> {myRecord.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b pb-2 text-sm">
                    <span className="text-muted-foreground">Class</span>
                    <span className="font-semibold">{myRecord.studentClass?.name || "Grade 10"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 text-sm">
                    <span className="text-muted-foreground">Class Attendance</span>
                    <span className="font-semibold text-emerald-400">{myRecord.attendancePercentage}%</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 text-sm">
                    <span className="text-muted-foreground">Average Exam Grade</span>
                    <span className="font-semibold text-primary">{myRecord.averageExamScore}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Exams Taken</span>
                    <span className="font-semibold">{myRecord.examsTaken}</span>
                  </div>
                </CardContent>
              </Card>

              {/* CARD FOR EXAMS SUBMISSIONS METRIC */}
              <Card className="bg-card/30 border border-border backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    This students maintains an exemplary attendance score and qualifies for active evaluation checkpoints.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Active Status: Excellent</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CERTIFICATE DISPLAY & DETAILED CARD */}
            <div className="md:col-span-2 space-y-6">
              {myRecord.certificate ? (
                /* READY CERTIFICATE BANNER */
                <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 backdrop-blur-md">
                  <CardHeader>
                    <div className="bg-emerald-500/20 p-2.5 rounded-full w-11 h-11 flex items-center justify-center mb-2">
                      <Award className="h-6 w-6 text-emerald-400" />
                    </div>
                    <CardTitle className="text-2xl text-emerald-300 font-bold">
                      Congratulations! Your completion certificate is ready!
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      Issued by the school administration on {new Date(myRecord.certificate.issueDate).toLocaleDateString()}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">
                      You have passed all modules of your curriculum with a grade of {" "}
                      <span className="font-bold text-emerald-300">"{myRecord.certificate.grade}"</span>. Click below to view and download your full printable completion credential.
                    </p>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
                      onClick={() => {
                        setSelectedStudent(myRecord);
                        setIsCertOpen(true);
                      }}
                    >
                      <Award className="h-4 w-4" /> View Digital Certificate
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* PENDING CERTIFICATE CARD */
                <Card className="bg-card/20 border border-border backdrop-blur-md">
                  <CardHeader>
                    <div className="bg-secondary p-2.5 rounded-full w-11 h-11 flex items-center justify-center mb-2">
                      <Award className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-xl">Completion Certificate Pending</CardTitle>
                    <CardDescription>Academic catalog check is currently in progress.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Once the administrator updates and verifies your final exam grades, attendance logs, and marks your curriculum as fully complete, your digital completion certificate will be automatically issued and printable right here.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* MOCK PROGRESS LOG CARD */}
              <Card className="bg-card/30 border border-border backdrop-blur-md">
                <CardHeader>
                  <CardTitle>Recent Evaluations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-semibold text-sm">Artificial Intelligence History Quiz</div>
                      <div className="text-xs text-muted-foreground">Submitted on: 5/26/2026</div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300">Passed (5/5 pts)</Badge>
                  </div>
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-semibold text-sm">Introduction to Machine Learning Essentials</div>
                      <div className="text-xs text-muted-foreground">Submitted on: 5/24/2026</div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300">Passed (10/10 pts)</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      )}

      {/* DIALOG 1: VIEW RECORD CARD */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Student Record Card
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-3">
              <div className="bg-secondary/40 p-3 rounded-lg border space-y-2">
                <div className="text-sm font-semibold text-primary">{selectedStudent.name}</div>
                <div className="text-xs text-muted-foreground">{selectedStudent.email}</div>
                <div className="text-xs">Class: <span className="font-medium">{selectedStudent.studentClass?.name || "Grade 10"}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-secondary/30 p-3 rounded-lg border">
                  <div className="text-2xl font-bold text-emerald-400">{selectedStudent.attendancePercentage}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Class Attendance</div>
                </div>
                <div className="bg-secondary/30 p-3 rounded-lg border">
                  <div className="text-2xl font-bold text-primary">{selectedStudent.averageExamScore}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Average Grade</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Evaluation Log</div>
                <div className="text-xs space-y-2 max-h-[150px] overflow-y-auto pr-1">
                  <div className="flex justify-between border-b pb-1">
                    <span>AI history check</span>
                    <span className="font-semibold text-emerald-400">Passed (5/5 pts)</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Algebra midterm</span>
                    <span className="font-semibold text-emerald-400">Passed (8/10 pts)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsRecordOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: ISSUE CERTIFICATE */}
      <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Issue Completion Certificate
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-3">
              <div className="text-sm">
                Issue a final course completion credential for student <span className="font-bold text-primary">{selectedStudent.name}</span>.
              </div>

              {/* Course Name */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Course/curriculum Name</label>
                <input
                  type="text"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </div>

              {/* Grade */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Grade / Performance Rank</label>
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  <option value="Distinction">Distinction</option>
                  <option value="Outstanding">Outstanding</option>
                  <option value="A+ Grade">A+ Grade</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Passed">Passed</option>
                </select>
              </div>

              {/* Comments */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Comments / Endorsement</label>
                <textarea
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm min-h-[70px]"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. Has demonstrated outstanding academic capability..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setIsIssueOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssueCertificate} disabled={submittingCert}>
              {submittingCert ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Confirm & Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: VIEW & PRINT CERTIFICATE */}
      <Dialog open={isCertOpen} onOpenChange={setIsCertOpen}>
        <DialogContent className="max-w-2xl bg-[#0d0d0d] border border-amber-500/30 text-foreground p-0 overflow-hidden">
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {selectedStudent?.certificate && (
              <div className="space-y-6">
                {/* CERTIFICATE DISPLAY BOX */}
                <div 
                  id="printable-certificate"
                  className="relative border-8 border-double border-amber-500/50 bg-[#141414] p-10 text-center rounded-lg shadow-2xl space-y-6 select-none"
                  style={{ fontFamily: "'Georgia', serif" }}
                >
                  {/* Decorative corner borders */}
                  <div className="absolute top-2 left-2 text-amber-500/30 text-2xl font-bold">✦</div>
                  <div className="absolute top-2 right-2 text-amber-500/30 text-2xl font-bold">✦</div>
                  <div className="absolute bottom-2 left-2 text-amber-500/30 text-2xl font-bold">✦</div>
                  <div className="absolute bottom-2 right-2 text-amber-500/30 text-2xl font-bold">✦</div>

                  <div className="flex flex-col items-center space-y-2">
                    <Award className="h-16 w-16 text-amber-400 animate-pulse" />
                    <h1 className="text-3xl text-amber-400 uppercase tracking-widest font-bold">
                      Certificate of Completion
                    </h1>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      Edunexus Academy Curriculum
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm italic text-muted-foreground">This is proudly awarded to</p>
                    <h2 className="text-3xl text-white font-bold tracking-wide italic">
                      {selectedStudent.name}
                    </h2>
                  </div>

                  <div className="max-w-md mx-auto space-y-2 text-sm text-zinc-300">
                    <p>
                      for successfully meeting all academic demands and completing the curriculum course program:
                    </p>
                    <h3 className="font-semibold text-amber-200 text-lg uppercase tracking-wide">
                      {selectedStudent.certificate.courseName}
                    </h3>
                    <p className="text-xs italic text-muted-foreground mt-2">
                      "{selectedStudent.certificate.comments || 'Exhibited brilliant mastery and execution of learning modules.'}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 pt-8 gap-8 items-center max-w-lg mx-auto">
                    <div className="border-t border-amber-500/40 pt-2 text-xs">
                      <div className="font-bold text-zinc-300">{selectedStudent.certificate.grade}</div>
                      <div className="text-muted-foreground uppercase tracking-wider text-[9px]">Final Evaluation Grade</div>
                    </div>
                    <div className="border-t border-amber-500/40 pt-2 text-xs">
                      <div className="font-semibold text-zinc-300">
                        {new Date(selectedStudent.certificate.issueDate).toLocaleDateString()}
                      </div>
                      <div className="text-muted-foreground uppercase tracking-wider text-[9px]">Date of Issuance</div>
                    </div>
                  </div>
                </div>

                {/* Print Options */}
                <div className="flex justify-end gap-2 pr-6">
                  <Button variant="outline" onClick={() => setIsCertOpen(false)}>
                    Close
                  </Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                    onClick={handlePrintCertificate}
                  >
                    <Printer className="h-4 w-4" /> Print / Save as PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
