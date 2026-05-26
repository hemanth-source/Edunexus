import Navbar from "@/components/home/Navbar";
import UniversalUserForm from "@/components/auth/UniversalUserForm";
import { useAuth } from "@/hooks/AuthProvider";
import { Navigate } from "react-router";

const Login = () => {
  const { user, loading } = useAuth();

  if (user && !loading) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      {/* Dynamic Header Navbar */}
      <Navbar />

      {/* Main Login Split Page Content */}
      <div className="grid flex-1 min-h-screen lg:grid-cols-2 pt-20">
        <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
          <div className="flex flex-1 items-center justify-center pt-8">
            <div className="w-full max-w-sm bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-900 rounded-3xl p-8 shadow-xl dark:shadow-none">
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                  Welcome back
                </h2>
                <p className="text-sm text-gray-500 mt-1.5">
                  Sign in to access your student, teacher, or admin account.
                </p>
              </div>
              <UniversalUserForm type="login" />
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1610962381137-50ef93055125?auto=format&fit=crop&q=80&w=1200"
            alt="Edunexus Modern Campus Center"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale transition-transform duration-10000 hover:scale-105"
          />
          {/* Decorative glass overlay on the campus visual */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
