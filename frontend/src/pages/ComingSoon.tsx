import { useLocation, Link } from "react-router";
import { LayoutDashboard, Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ComingSoon = () => {
  const location = useLocation();
  
  // Format pathname to display as a beautiful module title
  // e.g. "/settings/general" -> "Settings > General"
  const formatPath = (path: string) => {
    return path
      .split("/")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).replace("-", " "))
      .join(" > ");
  };

  const moduleName = formatPath(location.pathname) || "Feature";

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphic card */}
      <div className="relative z-10 max-w-md w-full bg-card/50 backdrop-blur-md border border-border rounded-[2rem] p-8 md:p-12 shadow-xl">
        <div className="mx-auto w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
          <Construction className="w-8 h-8 text-primary" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
          Under Construction
        </span>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-3">
          {moduleName}
        </h1>

        <p className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed">
          We are currently crafting this feature to be immersive and seamless. Stay tuned—it will be available in the next release!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link to="/dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to={-1 as any}>
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
