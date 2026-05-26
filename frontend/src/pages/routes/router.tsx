import { createBrowserRouter, Navigate } from "react-router"; // Keeping your requested import
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import PrivateRoutes from "@/pages/routes/PrivateRoutes";
import Dashboard from "@/pages/Dashboard";
import AcademicYear from "@/pages/settings/academic-year";
import UserManagementPage from "@/pages/users";
import Classes from "@/pages/academics/Classes";
import { Subjects } from "@/pages/academics/Subjects";
import Timetable from "@/pages/academics/Timetable";
import Exams from "@/pages/lms/Exams";
import Exam from "../lms/Exam";
import Attendance from "@/pages/academics/Attendance";
import Assignments from "@/pages/lms/Assignments";
import Materials from "@/pages/lms/Materials";
import Fees from "@/pages/finance/Fees";
import Expenses from "@/pages/finance/Expenses";
import Salary from "@/pages/finance/Salary";
import GeneralSettings from "@/pages/settings/GeneralSettings";
import RolesPermissions from "@/pages/settings/RolesPermissions";
import StudentRecords from "@/pages/academics/StudentRecords";
import { useAuth } from "@/hooks/AuthProvider";

// Role-based route guard
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    children: [
      // public routes
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      // protected routes would go here
      {
        element: <PrivateRoutes />, // Assuming PrivateRoutes is imported
        children: [
          { path: "dashboard", element: <Dashboard /> },
          { path: "activities-log", element: <Dashboard /> },
          { path: "settings/academic-years", element: <AcademicYear /> },
          {
            path: "users/students",
            element: (
              <UserManagementPage
                role="student"
                title="Students"
                description="Manage student directory and class assignments."
              />
            ),
          },
          {
            path: "users/teachers",
            element: (
              <UserManagementPage
                role="teacher"
                title="Teachers"
                description="Manage teaching staff."
              />
            ),
          },
          {
            path: "users/parents",
            element: (
              <UserManagementPage
                role="parent"
                title="Parents"
                description="Manage Parents."
              />
            ),
          },
          {
            path: "finance/fees",
            element: (
              <ProtectedRoute allowedRoles={["admin", "parent"]}>
                <Fees />
              </ProtectedRoute>
            ),
          },
          {
            path: "users/admins",
            element: (
              <UserManagementPage
                role="admin"
                title="Admins"
                description="Manage Admins."
              />
            ),
          },
          {
            path: "classes",
            element: <Classes />,
          },
          {
            path: "subjects",
            element: <Subjects />,
          },
          {
            path: "timetable",
            element: <Timetable />,
          },
          {
            path: "lms/exams",
            element: <Exams />,
          },
          {
            path: "lms/exams/:id",
            element: <Exam />,
          },
          {
            path: "attendance",
            element: <Attendance />,
          },
          {
            path: "student-records",
            element: <StudentRecords />,
          },
          {
            path: "lms/assignments",
            element: <Assignments />,
          },
          {
            path: "lms/materials",
            element: <Materials />,
          },

          {
            path: "finance/expenses",
            element: <Expenses />,
          },
          {
            path: "finance/salary",
            element: <Salary />,
          },
          {
            path: "settings/general",
            element: <GeneralSettings />,
          },
          {
            path: "settings/roles",
            element: <RolesPermissions />,
          },
        ],
      },
    ],
  },
]);
