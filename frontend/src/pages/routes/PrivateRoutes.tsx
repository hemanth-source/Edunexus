import { useAuth } from "@/hooks/AuthProvider";
import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react"; // Optional: for loading spinner
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import NotificationBell from "@/components/global/NotificationBell";

const PrivateRoutes = () => {
  const { loading, user, year } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!year) {
    // Scenario A: Admin needs to create a year
    if (user.role === "admin") {
      // CRITICAL: Only redirect if they are NOT ALREADY on the settings page.
      // If we don't check this, it causes an infinite loop (Blank Page).
      if (location.pathname !== "/settings/academic-years") {
        return <Navigate to="/settings/academic-years" replace />;
      }
      // If they ARE on the settings page, we let code flow down to render the Sidebar/Outlet
    }
    // Scenario B: Non-admins cannot use the system without an active year
    else {
      return <Navigate to="/login" replace />;
    }
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Sticky Global Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/25 backdrop-blur-md px-6 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-9 w-9 border border-border bg-card/30 hover:bg-card/70 transition-all text-foreground" />
            <div className="h-4 w-px bg-border mx-1" />
            <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 bg-primary/5 border border-primary/15 rounded-full px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Academic Term: {year?.name}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PrivateRoutes;
