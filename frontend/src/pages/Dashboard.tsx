import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router";

// UI Imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, CheckCircle2, RefreshCw, WifiOff } from "lucide-react";

// Custom Components
import { AiInsightWidget } from "@/components/dashboard/ai-insight-widget";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { LeaderboardWidget } from "@/components/dashboard/Leaderboard";
import {
  StudentActiveClassWidget,
  ActiveClassesNowWidget,
  TodayAttendanceSnapshotWidget,
} from "@/components/dashboard/live-class-widgets";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<any>({});

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/dashboard/stats");
      setStatsData(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.request ? "Network error — check your connection." : "Unexpected error loading dashboard.");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Full-page skeleton on initial load ───────────────────────────────────────
  if (loading && !statsData?.totalStudents && !error) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-64" />
          <Skeleton className="col-span-3 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}! Here is your daily academic overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {user?.role === "admin" && (
            <Button onClick={() => navigate("/users/students")}>
              Manage Students
            </Button>
          )}
          {user?.role === "teacher" && (
            <Button onClick={() => navigate("/lms/quizzes")}>
              Create Quiz
            </Button>
          )}
        </div>
      </div>

      {/* --- STATS ERROR BANNER --- */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      )}

      {/* --- TOP ROW: STATS CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats
          role={user?.role || "student"}
          data={statsData}
          loading={loading}
          error={error}
        />
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* LEFT COLUMN */}
        <div className="col-span-4 space-y-4">
          {/* AI Advisor */}
          <AiInsightWidget />

          {/* Student: live class schedule widget */}
          {user?.role === "student" && <StudentActiveClassWidget />}

          {/* Admin/Teacher: school-wide live class view */}
          {(user?.role === "admin" || user?.role === "teacher") && (
            <ActiveClassesNowWidget />
          )}

          {/* Gamification Leaderboard */}
          <LeaderboardWidget />

          {/* Admin: Recent Activity */}
          {user?.role === "admin" && statsData.recentActivity?.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates from the school system.
                  </CardDescription>
                </div>
                <Link to="/"></Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statsData.recentActivity?.map(
                    (activity: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start pb-4 last:mb-0 last:pb-0 border-b last:border-0"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500 mt-1" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {activity}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-3 space-y-4">
          {/* Admin: Today's attendance snapshot */}
          {user?.role === "admin" && <TodayAttendanceSnapshotWidget />}

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate("/timetable")}
              >
                <Calendar className="mr-2 h-4 w-4" /> View Timetable
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => navigate("/lms/materials")}
              >
                <FileText className="mr-2 h-4 w-4" /> Live Class & Resources
              </Button>
              {user?.role === "admin" && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => navigate("/settings/academic-years")}
                >
                  <Calendar className="mr-2 h-4 w-4" /> Academic Settings
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
