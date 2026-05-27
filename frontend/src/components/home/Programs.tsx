import { useState } from "react";
import { Cpu, Brain, Database, Palette, ShieldCheck, Clock, DollarSign, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const programs = [
  {
    title: "Computer Science",
    icon: Cpu,
    desc: "Master the foundations of software engineering and scalable systems.",
    tags: ["AI", "Systems", "Mobile"],
    duration: "4 Years (8 Semesters)",
    fee: "$12,500 / year",
    contents: [
      "Data Structures & Algorithms",
      "Operating Systems & Networking",
      "Full-Stack Web Development",
      "Machine Learning Fundamentals",
      "Cloud Computing & DevOps",
      "Capstone Industry Project",
    ],
  },
  {
    title: "Neural Engineering",
    icon: Brain,
    desc: "The intersection of neuroscience and computational modeling.",
    tags: ["Biotech", "BCI", "Research"],
    duration: "4 Years (8 Semesters)",
    fee: "$14,800 / year",
    contents: [
      "Computational Neuroscience",
      "Brain-Computer Interfaces",
      "Signal Processing & EEG Analysis",
      "Biomedical Instrumentation",
      "Deep Learning for Neuro-Imaging",
      "Research Thesis & Lab Work",
    ],
  },
  {
    title: "Data Architecture",
    icon: Database,
    desc: "Design complex data systems for global enterprises.",
    tags: ["Big Data", "Cloud", "SQL"],
    duration: "3 Years (6 Semesters)",
    fee: "$11,200 / year",
    contents: [
      "Database Design & SQL Mastery",
      "Distributed Systems & Hadoop",
      "Data Warehousing & ETL Pipelines",
      "Cloud Platforms (AWS, GCP, Azure)",
      "Real-Time Streaming with Kafka",
      "Enterprise Data Governance",
    ],
  },
  {
    title: "Digital Arts",
    icon: Palette,
    desc: "Bridge the gap between technology and creative expression.",
    tags: ["UI/UX", "3D", "VFX"],
    duration: "3 Years (6 Semesters)",
    fee: "$10,500 / year",
    contents: [
      "UI/UX Design & Prototyping",
      "3D Modeling & Animation (Blender)",
      "Motion Graphics & VFX",
      "Game Design & Development",
      "Design Thinking & Branding",
      "Portfolio & Client Project",
    ],
  },
  {
    title: "Cyber Security",
    icon: ShieldCheck,
    desc: "Protect the digital frontier with advanced offensive/defensive tactics.",
    tags: ["Ethical Hacking", "Crypto"],
    duration: "4 Years (8 Semesters)",
    fee: "$13,000 / year",
    contents: [
      "Network Security & Firewalls",
      "Ethical Hacking & Pen Testing",
      "Cryptography & Blockchain",
      "Incident Response & Forensics",
      "Secure Software Development",
      "CISSP / CEH Certification Prep",
    ],
  },
];

const Programs = () => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  return (
    <section id="programs" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-4">
            <h2 className="text-[#3ecf8e] font-bold tracking-widest uppercase text-sm">
              Courses
            </h2>
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
              Explore Our Courses
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Our curriculum is designed in partnership with industry giants to
            ensure our graduates are day-one ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program, idx) => {
            const isExpanded = expandedIdx === idx;
            return (
              <div
                key={idx}
                className={`group relative bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-[#3ecf8e]/50 transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden ${
                  isExpanded ? "border-[#3ecf8e]/40" : ""
                }`}
              >
                {/* Top section */}
                <div className="p-8 pb-4">
                  <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5 transition-opacity group-hover:opacity-20 dark:group-hover:opacity-10">
                    <program.icon
                      size={80}
                      className="text-gray-300 dark:text-white"
                    />
                  </div>

                  <div className="bg-white dark:bg-[#1c1c1c] w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm border border-gray-100 dark:border-gray-700">
                    <program.icon className="text-[#3ecf8e] w-7 h-7" />
                  </div>

                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {program.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {program.desc}
                  </p>

                  {/* Duration & Fee quick info */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg text-xs font-semibold text-[#3ecf8e]">
                      <Clock className="w-3 h-3" />
                      {program.duration}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-semibold text-amber-500 dark:text-amber-400">
                      <DollarSign className="w-3 h-3" />
                      {program.fee}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {program.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-3 py-1 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expandable course contents */}
                <div
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-8 pb-6">
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Course Curriculum
                      </h5>
                      <ul className="space-y-2">
                        {program.contents.map((item, cIdx) => (
                          <li
                            key={cIdx}
                            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#3ecf8e] shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* View Details button */}
                <div className="px-8 pb-6">
                  <button
                    onClick={() => toggleExpand(idx)}
                    className="flex items-center gap-2 text-[#3ecf8e] font-bold text-sm hover:gap-3 transition-all duration-200"
                  >
                    {isExpanded ? (
                      <>
                        Hide Details <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        View Course Details <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Programs;
