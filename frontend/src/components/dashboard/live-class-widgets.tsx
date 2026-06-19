import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Users, AlertCircle, CalendarCheck2, RefreshCw, WifiOff } from "lucide-react";

/** Shared inline error card shown when an API call fails */
function WidgetError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <WifiOff className="h-8 w-8 text-destructive/60" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Could not load data from server.</p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-1.5" /> Retry
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivePeriod {
  subject: { name: string; code: string };
  teacher: { name: string; email: string };
  startTime: string;
  endTime: string;
  minutesRemaining?: number;
  minutesUntilStart?: number;
}

interface TodayPeriod {
  subject: string;
  teacher: string;
  startTime: string;
  endTime: string;
  status: "in-progress" | "completed" | "upcoming";
}

interface StudentActiveData {
  day: string;
  currentTime: string;
  className?: string;
  activePeriod: ActivePeriod | null;
  nextPeriod: ActivePeriod | null;
  todayPeriods: TodayPeriod[];
  message?: string;
}

interface ActiveClassEntry {
  classId: string;
  className: string;
  subject: { name: string; code: string };
  teacher: { name: string; email: string };
  startTime: string;
  endTime: string;
  minutesRemaining: number | null;
}

interface AdminActiveData {
  day: string;
  currentTime: string;
  totalActive: number;
  activeClasses: ActiveClassEntry[];
  nextUpcoming: ActiveClassEntry[];
}

interface TodaySnapshotData {
  date: string;
  totalStudentsInSchool: number;
  totalClassesInSchool: number;
  classesMarkedToday: number;
  classesNotMarkedToday: number;
  totals: {
    marked: number;
    present: number;
    absent: number;
    late: number;
    attendancePercentage: number;
  };
}

// ─── Status Badge Helper ──────────────────────────────────────────────────────
const statusColors: Record<TodayPeriod["status"], string> = {
  "in-progress": "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400",
  completed: "bg-slate-500/15 text-slate-500 border-slate-400/30",
  upcoming: "bg-blue-500/15 text-blue-700 border-blue-400/30 dark:text-blue-400",
};

// ─── Student: Active Class Widget ─────────────────────────────────────────────
export function StudentActiveClassWidget() {
  const [data, setData] = useState<StudentActiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: res } = await api.get("/timetables/active-now/student");
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 2 minutes so the card auto-updates as periods change
    const interval = setInterval(fetchData, 120_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (error) return <WidgetError title="Today's Schedule" onRetry={fetchData} />;
  if (!data || (!data.activePeriod && !data.nextPeriod && !data.todayPeriods?.length)) {
    return null; // Don't show card if no timetable exists
  }

  return (
    <Card className="border-primary/20 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          Today's Schedule
          {data.className && (
            <Badge variant="outline" className="ml-auto font-normal text-xs">
              {data.className}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {data.day} · {data.currentTime}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current period */}
        {data.activePeriod && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400 text-sm">
                  🟢 In Progress: {data.activePeriod.subject.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.activePeriod.teacher.name} · {data.activePeriod.startTime}–{data.activePeriod.endTime}
                </p>
              </div>
              {data.activePeriod.minutesRemaining !== undefined && (
                <Badge className="bg-green-600 text-white shrink-0">
                  {data.activePeriod.minutesRemaining} min left
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Next period */}
        {!data.activePeriod && data.nextPeriod && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <p className="font-semibold text-blue-700 dark:text-blue-400 text-sm">
              🔵 Next: {data.nextPeriod.subject.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.nextPeriod.teacher.name} · starts {data.nextPeriod.startTime}
              {data.nextPeriod.minutesUntilStart !== undefined && (
                <span className="ml-1 font-medium">({data.nextPeriod.minutesUntilStart} min away)</span>
              )}
            </p>
          </div>
        )}

        {/* Today's full schedule (compact list) */}
        {data.todayPeriods && data.todayPeriods.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All Periods</p>
            {data.todayPeriods.map((p, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-md px-3 py-1.5 text-xs border ${statusColors[p.status]}`}
              >
                <span className="font-medium">{p.subject}</span>
                <span className="text-muted-foreground tabular-nums">
                  {p.startTime}–{p.endTime}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Admin/Teacher: Live Classes Now Widget ───────────────────────────────────
export function ActiveClassesNowWidget() {
  const [data, setData] = useState<AdminActiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: res } = await api.get("/timetables/active-now");
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (error) return <WidgetError title="Live Classes Now" onRetry={fetchData} />;
  if (!data) return null;

  return (
    <Card className="border-primary/20 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
            Live Classes Now
          </CardTitle>
          <Badge
            className={`${
              data.totalActive > 0
                ? "bg-emerald-600 text-white"
                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            }`}
          >
            {data.totalActive} Active
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {data.day} · {data.currentTime}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.totalActive === 0 && data.nextUpcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No classes currently in session.</p>
        )}

        {/* Active periods */}
        {data.activeClasses.map((cls, i) => (
          <div key={i} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                {cls.className}
              </p>
              {cls.minutesRemaining !== null && (
                <Badge className="bg-emerald-600 text-white text-xs">{cls.minutesRemaining} min left</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {cls.subject.name} · {cls.teacher.name} · {cls.startTime}–{cls.endTime}
            </p>
          </div>
        ))}

        {/* Upcoming (next 3) */}
        {data.nextUpcoming.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coming Up</p>
            {data.nextUpcoming.slice(0, 3).map((cls, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs">
                <span className="font-medium text-blue-700 dark:text-blue-400">
                  {cls.className} – {cls.subject.name}
                </span>
                <span className="text-muted-foreground tabular-nums">{cls.startTime}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Admin: Today's Attendance Snapshot Widget ────────────────────────────────
export function TodayAttendanceSnapshotWidget() {
  const [data, setData] = useState<TodaySnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: res } = await api.get("/attendance/summary/today");
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (error) return <WidgetError title="Today's Attendance" onRetry={fetchData} />;
  if (!data) return null;

  const pct = data.totals.attendancePercentage;
  const pctColor = pct >= 85 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-500";

  return (
    <Card className="border-primary/20 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-amber-600" />
          Today's Attendance
        </CardTitle>
        <CardDescription>{data.date}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main percentage */}
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold tabular-nums ${pctColor}`}>{pct}%</span>
          <span className="text-sm text-muted-foreground">overall attendance</span>
        </div>

        {/* P / A / L counts */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Present", value: data.totals.present, color: "text-green-600" },
            { label: "Absent", value: data.totals.absent, color: "text-red-500" },
            { label: "Late", value: data.totals.late, color: "text-amber-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-secondary/40 p-2 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Classes marked status */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Classes marked</span>
          <span className="font-semibold">
            {data.classesMarkedToday}/{data.totalClassesInSchool}
          </span>
        </div>

        {data.classesNotMarkedToday > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {data.classesNotMarkedToday} class{data.classesNotMarkedToday > 1 ? "es" : ""} yet to mark attendance
          </div>
        )}
      </CardContent>
    </Card>
  );
}
