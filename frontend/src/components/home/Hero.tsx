import { useState } from "react";
import { ArrowRight, ChevronRight, Play, X, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/AuthProvider";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Hero = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Modal States
  const [isApplying, setIsApplying] = useState(false);
  const [isWatchingTour, setIsWatchingTour] = useState(false);
  
  // Application Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("Software Engineering");
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Handle Application Submit
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please fill out all fields.");
      return;
    }
    setSubmitting(true);
    // Simulate server delay for immersive premium feel
    setTimeout(() => {
      setSubmitting(false);
      setApplySuccess(true);
      toast.success("Application Submitted Successfully!");
    }, 1500);
  };

  // Auto Login as Demo Student
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
      <section
        id="home"
        className="relative pt-32 pb-20 overflow-hidden min-h-screen flex items-center bg-background"
      >
        {/* Background Decor */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#3ecf8e] opacity-5 dark:opacity-5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-[#3ecf8e] opacity-10 dark:opacity-10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 px-3 py-1 rounded-full text-[#3ecf8e] text-sm font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ecf8e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ecf8e]"></span>
                </span>
                <span>2025 Admissions are now open</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white leading-tight">
                Elevate Your <span className="text-[#3ecf8e]">Potential</span>,
                Connect Your Future.
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-xl">
                Edunexus is a premier technology-driven university designed for
                the next generation of innovators, engineers, and digital artists.
              </p>

              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => {
                    setApplySuccess(false);
                    setIsApplying(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#3ecf8e] text-black px-8 py-4 rounded-lg font-bold hover:bg-[#34b27b] transition-all transform hover:translate-y-[-2px] shadow-lg shadow-[#3ecf8e]/20"
                >
                  <span>Start Application</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsWatchingTour(true)}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-transparent text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-[#3ecf8e] px-8 py-4 rounded-lg font-bold transition-all"
                >
                  <Play className="w-4 h-4 text-[#3ecf8e] fill-[#3ecf8e]" />
                  <span>Watch Virtual Tour</span>
                </button>
              </div>

              <div className="flex items-center space-x-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    12k+
                  </p>
                  <p className="text-sm text-gray-500">Active Students</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-800"></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    98%
                  </p>
                  <p className="text-sm text-gray-500">Graduate Hire Rate</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-800"></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    #1
                  </p>
                  <p className="text-sm text-gray-500">Tech Innovation</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl group">
                <img
                  src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200"
                  alt="Edunexus Modern Campus"
                  className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 dark:from-[#121212] via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 dark:bg-[#1c1c1c]/90 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-[#3ecf8e] mb-1 uppercase tracking-wider">
                    Upcoming Event
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    Quantum Computing Workshop
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Join us on April 15th for an exclusive look into the future.
                  </p>
                </div>
              </div>

              {/* Floating Element */}
              <div className="absolute -top-6 -right-6 bg-white dark:bg-[#1c1c1c] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl hidden md:block animate-bounce-slow">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#3ecf8e] flex items-center justify-center">
                    <ChevronRight className="text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">New Research</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Carbon Neutral Campus
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* ================= MODAL: WATCH VIRTUAL TOUR ================= */}
      {isWatchingTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
            onClick={() => setIsWatchingTour(false)}
          />
          <div className="relative w-full max-w-5xl bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl z-10">
            {/* Close Button */}
            <button
              onClick={() => setIsWatchingTour(false)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video Frame container */}
            <div className="relative w-full aspect-video bg-neutral-950">
              <iframe
                src="https://www.youtube.com/embed/353MvIuDqIY?autoplay=1"
                title="Edunexus Virtual Drone Tour"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Hero;
