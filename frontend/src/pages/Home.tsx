import { useState } from "react";
import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Programs from "@/components/home/Programs";
import AiGuide from "@/components/home/AiGuide";
import Footer from "@/components/home/Footer";
import { ArrowRight, CheckCircle, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Home = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Modal & Form States
  const [isApplying, setIsApplying] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("Software Engineering");
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

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
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />
      <main className="">
        <Hero />

        {/* Partnership / Logo Cloud */}
        <section className="py-12 border-y border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
              Our Academic Research & Technology Partners
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
              <span className="font-extrabold text-xl text-gray-400 dark:text-gray-600 tracking-wider">MIT LABS</span>
              <span className="font-extrabold text-xl text-gray-400 dark:text-gray-600 tracking-wider">STANFORD AI</span>
              <span className="font-extrabold text-xl text-gray-400 dark:text-gray-600 tracking-wider">NVIDIA ACADEMY</span>
              <span className="font-extrabold text-xl text-gray-400 dark:text-gray-600 tracking-wider">GOOGLE CLOUD</span>
            </div>
          </div>
        </section>

        <Stats />
        <Programs />
        <AiGuide />

        {/* Testimonial Highlight */}
        <section className="py-24 bg-white dark:bg-[#121212] overflow-hidden relative">
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <span className="text-[#3ecf8e] text-6xl font-serif">“</span>
            <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-white leading-relaxed mb-8">
              The multidisciplinary approach at Edunexus prepared me for a career that
              didn't even exist when I started my studies.
            </blockquote>
            <p className="font-bold text-gray-900 dark:text-white">Alex Rivera</p>
            <p className="text-sm text-gray-500">Alumnus, Software Engineering '23</p>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-linear-to-r from-gray-50 to-white dark:from-[#1c1c1c] dark:to-[#2a2a2a] rounded-[3rem] p-12 md:p-20 text-center border border-gray-200 dark:border-gray-800 relative overflow-hidden shadow-xl dark:shadow-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#3ecf8e]"></div>
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Ready to Shape the Future?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
                Applications for the Fall 2025 semester are closing soon. Take
                the first step towards a boundary-breaking career today.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => {
                    setApplySuccess(false);
                    setIsApplying(true);
                  }}
                  className="bg-[#3ecf8e] text-black px-10 py-5 rounded-xl font-bold text-lg hover:bg-[#34b27b] transition-all transform hover:scale-105 shadow-lg shadow-[#3ecf8e]/20"
                >
                  Apply Now
                </button>
                <button
                  onClick={() => {
                    window.location.href = "mailto:admissions@edunexus.edu";
                  }}
                  className="bg-transparent border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  Contact Admissions
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

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
    </div>
  );
};

export default Home;
