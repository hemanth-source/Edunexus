import { useState, useEffect } from "react";
import { Menu, X, GraduationCap, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Navbar = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Modal & Form States
  const [isApplying, setIsApplying] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("Software Engineering");
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please fill out all fields.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setApplySuccess(true);
      toast.success("Application Submitted Successfully!");
    }, 1500);
  };

  const handleAutoLogin = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/users/login", {
        email: "student@edunexus.com",
        password: "student123",
      });
      setUser(data);
      toast.success("Welcome back to your dashboard!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to establish demo session. Please try logging in manually.");
    } finally {
      setSubmitting(false);
      setIsApplying(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed w-full z-50 transition-all duration-300 bg-background/80 backdrop-blur-md ${scrolled ? "py-3 shadow-lg" : "py-5"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 text-2xl font-black text-gray-900 dark:text-white">
                <div className="bg-[#3ecf8e] text-black p-1.5 rounded-lg flex items-center justify-center shadow-lg shadow-[#3ecf8e]/10">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span>EDUNEXUS</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="/#home"
                className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
              >
                Overview
              </a>
              <a
                href="/#programs"
                className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
              >
                Programs
              </a>
              <a
                href="/#assistant"
                className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
              >
                AI Guide
              </a>
              <Link
                to="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
              >
                Login
              </Link>
              <button
                onClick={() => {
                  setApplySuccess(false);
                  setIsApplying(true);
                }}
                className="bg-[#3ecf8e] text-black px-5 py-2 rounded-md font-bold hover:bg-[#34b27b] transition-all transform hover:scale-105 shadow-lg shadow-[#3ecf8e]/10"
              >
                Apply Now
              </button>
            </div>

            {/* Mobile button */}
            <div className="md:hidden flex items-center space-x-4">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-600 dark:text-gray-300"
              >
                {isOpen ? (
                  <X className="w-8 h-8" />
                ) : (
                  <Menu className="w-8 h-8" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-gray-800 px-4 pt-2 pb-6 space-y-4 shadow-xl">
            <a
              href="/#home"
              onClick={() => setIsOpen(false)}
              className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
            >
              Overview
            </a>
            <a
              href="/#programs"
              onClick={() => setIsOpen(false)}
              className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
            >
              Programs
            </a>
            <a
              href="/#assistant"
              onClick={() => setIsOpen(false)}
              className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
            >
              AI Guide
            </a>
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium"
            >
              Login
            </Link>
            <button
              onClick={() => {
                setApplySuccess(false);
                setIsApplying(true);
                setIsOpen(false);
              }}
              className="w-full bg-[#3ecf8e] text-black px-5 py-3 rounded-md font-bold text-center block shadow-lg shadow-[#3ecf8e]/10"
            >
              Apply Now
            </button>
          </div>
        )}
      </nav>

      {/* ================= MODAL: START APPLICATION ================= */}
      {isApplying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setIsApplying(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#121212] rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl z-10 transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Admissions Form
                </h3>
                <p className="text-xs text-gray-500 mt-1">Fall 2025 Admissions Session</p>
              </div>
              <button
                onClick={() => setIsApplying(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              {!applySuccess ? (
                <form onSubmit={handleApplySubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3ecf8e] text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3ecf8e] text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Program of Choice
                    </label>
                    <select
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      className="w-full bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3ecf8e] text-gray-900 dark:text-white transition-colors"
                    >
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Artificial Intelligence">Artificial Intelligence & Data Science</option>
                      <option value="Digital Arts">Digital Arts & Game Design</option>
                      <option value="Robotics">Robotics & Automation</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#3ecf8e] hover:bg-[#34b27b] text-black py-4 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors shadow-lg shadow-[#3ecf8e]/10"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing Application...</span>
                        </>
                      ) : (
                        <span>Submit Application</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e] mb-2">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-gray-900 dark:text-white">
                      Congratulations!
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
                      Your admissions application for <strong>{program}</strong> has been successfully reviewed and provisionally approved!
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl text-left">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Provisional Trial Login
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      We have auto-linked your application profile to a sandbox student profile to let you explore our course delivery portal immediately.
                    </p>
                  </div>

                  <button
                    onClick={handleAutoLogin}
                    disabled={submitting}
                    className="w-full bg-[#3ecf8e] hover:bg-[#34b27b] text-black py-4 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors shadow-lg shadow-[#3ecf8e]/15"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Auto-Login to Student Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
