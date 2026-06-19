import {
  Users,
  BookOpen,
  Clock,
  GraduationCap,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsProps {
  role: string;
  data: any;
  loading?: boolean;
  error?: string | null;
}

/** Shared skeleton for a single stat card during loading */
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

/** Shared error state for a single stat card */
function StatCardError({ label }: { label: string }) {
  return (
    <Card className="border-destructive/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <AlertCircle className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-muted-foreground">—</div>
        <p className="text-xs text-destructive">Failed to load</p>
      </CardContent>
    </Card>
  );
}

export function DashboardStats({ role, data, loading = false, error = null }: StatsProps) {
  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (loading) {
    const count = role === "admin" ? 4 : role === "teacher" ? 3 : 3;
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────────
  if (error) {
    const labels =
      role === "admin"
        ? ["Total Students", "Total Teachers", "Avg Attendance", "Active Exams"]
        : role === "teacher"
        ? ["My Classes", "Pending Grading", "Next Class"]
        : ["Attendance", "Assignments", "Next Exam"];
    return (
      <>
        {labels.map((label) => (
          <StatCardError key={label} label={label} />
        ))}
      </>
    );
  }

  // ── ADMIN VIEW ───────────────────────────────────────────────────────────────
  if (role === "admin") {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground">Currently enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTeachers ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgAttendance ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground">Today's metrics</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeExams ?? 0}</div>
            <p className="text-xs text-muted-foreground">Currently ongoing</p>
          </CardContent>
        </Card>
      </>
    );
  }

  // ── TEACHER VIEW ─────────────────────────────────────────────────────────────
  if (role === "teacher") {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.myClassesCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Assigned sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingGrading ?? 0}</div>
            <p className="text-xs text-muted-foreground">Submissions to review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Class</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">
              {data.nextClass || "No classes"}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.nextClassTime || "Enjoy your day!"}
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // ── STUDENT / PARENT VIEW ────────────────────────────────────────────────────
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.myAttendance ?? "N/A"}</div>
          <p className="text-xs text-muted-foreground">This semester</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assignments</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pendingAssignments ?? 0}</div>
          <p className="text-xs text-muted-foreground">Due upcoming</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Exam</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold truncate">
            {data.nextExam || "None"}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.nextExamDate || "Keep studying!"}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
