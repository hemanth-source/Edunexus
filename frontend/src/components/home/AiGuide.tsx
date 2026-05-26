import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, RotateCcw, GraduationCap } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "What courses and programs do you offer?",
  "How do I apply for the Fall 2025 semester?",
  "Tell me about the Research Labs & Tech Hubs.",
  "Give me the default demo login credentials!",
];

export default function AiGuide() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "bot",
      text: "Hello! I am Aura, your AI Academic Guide. I can help answer questions about Edunexus programs, research labs, admissions timelines, or provide our default demo credentials so you can explore the platform. What would you like to know today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/users/public-ai-guide", { message: textToSend });
      
      const botMsg: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: data.text || "I apologize, I could not formulate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error(error);
      toast.error("Aura is experiencing heavy load. Please try again shortly.");
      
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: "I apologize, but I am having trouble connecting right now. Try logging in with: email: admin@edunexus.com, password: admin123 to see my core dashboard features directly!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "init",
        sender: "bot",
        text: "Hello! I am Aura, your AI Academic Guide. I can help answer questions about Edunexus programs, research labs, admissions timelines, or provide our default demo credentials so you can explore the platform. What would you like to know today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <section id="assistant" className="py-24 relative overflow-hidden bg-background">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3ecf8e]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3ecf8e]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 px-4 py-1.5 rounded-full text-[#3ecf8e] text-sm font-semibold mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ecf8e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ecf8e]"></span>
            </span>
            <span>Aura AI Guide • Live & Ready</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Meet <span className="text-[#3ecf8e]">AURA</span>: Your AI Guide
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get instant assistance regarding courses, admissions, student resources, or live demo credentials directly from our custom Academic LLM.
          </p>
        </div>

        {/* Main Interface Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left panel: Quick Actions / Prompt Suggestions */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="bg-white/50 dark:bg-[#121212]/50 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-3xl p-6 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#3ecf8e]" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Quick Suggestions</h3>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Click any of the curated prompts below to instantly ask Aura for key information:
                </p>

                <div className="space-y-3">
                  {SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sug)}
                      disabled={loading}
                      className="w-full text-left text-xs font-semibold p-3 bg-gray-100 hover:bg-[#3ecf8e]/10 dark:bg-gray-800/40 dark:hover:bg-[#3ecf8e]/10 text-gray-700 dark:text-gray-300 rounded-xl transition-all border border-transparent hover:border-[#3ecf8e]/20"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#3ecf8e]" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Edunexus Engine</span>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#3ecf8e] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Chat
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Active Chat Box */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden flex flex-col h-[520px] shadow-2xl">
              
              {/* Chat Window Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-[#3ecf8e]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-900 dark:text-white text-sm">Aura Assistant</h4>
                    <p className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full inline-block animate-pulse"></span>
                      Powered by Gemini 1.5 Flash
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Log Window */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] ${
                        msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                        msg.sender === "user" 
                          ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                          : "bg-[#3ecf8e]/15 border-[#3ecf8e]/20 text-[#3ecf8e]"
                      }`}>
                        {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      {/* Bubble message */}
                      <div className={`p-4 rounded-[1.25rem] text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tr-none"
                          : "bg-gray-50 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-tl-none border border-gray-100 dark:border-gray-800"
                      }`}>
                        {msg.text}
                        <span className="block text-[9px] text-gray-400 mt-1.5 text-right font-medium">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Loader */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#3ecf8e]/15 border border-[#3ecf8e]/20 text-[#3ecf8e] shrink-0 animate-pulse">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="p-4 rounded-[1.25rem] bg-gray-50 dark:bg-[#1a1a1a] rounded-tl-none border border-gray-100 dark:border-gray-800 flex items-center space-x-1">
                        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  placeholder="Ask Aura anything about Edunexus..."
                  className="flex-1 bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#3ecf8e] text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-[#3ecf8e] hover:bg-[#34b27b] text-black w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-50 disabled:hover:bg-[#3ecf8e] transition-colors shadow-lg shadow-[#3ecf8e]/10"
                >
                  <Send className="w-4 h-4 transform rotate-45 mr-0.5 mt-[-2px]" />
                </button>
              </form>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
