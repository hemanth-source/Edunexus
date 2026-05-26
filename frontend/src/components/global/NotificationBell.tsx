import { useEffect, useState, useRef } from "react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Volume2, 
  BookOpen, 
  DollarSign, 
  Megaphone, 
  AlertCircle, 
  Plus 
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "broadcast">("inbox");
  const panelRef = useRef<HTMLDivElement>(null);

  // Form states for sending broadcast (Admin/Teacher only)
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"circulation" | "system">("circulation");
  const [broadcastRole, setBroadcastRole] = useState("all");
  const [sending, setSending] = useState(false);

  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => {
    fetchNotifications();
    
    // Poll for notifications every 30 seconds for live feel
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to update notifications");
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast.warning("Please fill out both title and message.");
      return;
    }

    try {
      setSending(true);
      await api.post("/notifications/send", {
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType,
        recipientRole: broadcastRole,
      });

      toast.success("School circulation broadcasted successfully!");
      setBroadcastTitle("");
      setBroadcastMessage("");
      setActiveTab("inbox");
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to send circulation.");
    } finally {
      setSending(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "fee":
        return {
          bg: "bg-amber-500/10 border-amber-500/30",
          text: "text-amber-400",
          icon: DollarSign,
        };
      case "assignment":
        return {
          bg: "bg-blue-500/10 border-blue-500/30",
          text: "text-blue-400",
          icon: BookOpen,
        };
      case "circulation":
        return {
          bg: "bg-purple-500/10 border-purple-500/30",
          text: "text-purple-400",
          icon: Megaphone,
        };
      default:
        return {
          bg: "bg-zinc-500/10 border-zinc-500/30",
          text: "text-zinc-400",
          icon: Volume2,
        };
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/30 hover:bg-card/70 transition-all text-foreground focus:outline-none"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-swing" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-background animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 rounded-3xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl p-4 z-50 overflow-hidden max-h-[500px] flex flex-col hover:scale-[1.01] transition-transform duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications
            </h3>
            {unreadCount > 0 && activeTab === "inbox" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary/80"
                onClick={markAllAsRead}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Read All
              </Button>
            )}
          </div>

          {/* Navigation Tabs (Admin/Teacher only) */}
          {isTeacherOrAdmin && (
            <div className="flex gap-2 p-1 bg-muted/40 border border-border rounded-xl mt-3">
              <button
                onClick={() => setActiveTab("inbox")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                  activeTab === "inbox"
                    ? "bg-card text-foreground border border-border/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Inbox ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab("broadcast")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                  activeTab === "broadcast"
                    ? "bg-card text-foreground border border-border/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Emit Circulation
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-[200px] max-h-[350px]">
            {activeTab === "inbox" ? (
              notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground h-full">
                  <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Your notifications inbox is completely clean.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const style = getTypeStyle(notif.type);
                  const Icon = style.icon;
                  return (
                    <div
                      key={notif._id}
                      className={`flex gap-3 p-3 rounded-2xl border transition-all duration-200 ${
                        notif.isRead
                          ? "bg-transparent border-transparent opacity-60"
                          : "bg-card/50 border-border hover:bg-card"
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-foreground line-clamp-1">{notif.title}</h4>
                          {!notif.isRead && (
                            <button
                              onClick={() => markAsRead(notif._id)}
                              className="h-5 w-5 rounded-md hover:bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                          {notif.sender && (
                            <span className="text-[10px] font-semibold text-primary/70">
                              By {notif.sender.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Administrative Broadcast Form */
              <div className="space-y-3 p-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Circulation Title</label>
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Annual Sports Day 2026..."
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Target Audience</label>
                  <select
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none"
                    value={broadcastRole}
                    onChange={(e) => setBroadcastRole(e.target.value)}
                  >
                    <option value="all">Everyone (Students & Teachers)</option>
                    <option value="student">Students Only</option>
                    <option value="teacher">Teachers Only</option>
                    <option value="parent">Parents Only</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Notice Type</label>
                  <select
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none"
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                  >
                    <option value="circulation">Announcement (Purple Megaphone)</option>
                    <option value="system">Critical Notice (Zinc Bell)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Detailed Message</label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Detail instructions for sports day houses..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSendBroadcast}
                  disabled={sending}
                  className="w-full text-xs font-semibold h-9 rounded-xl mt-2 flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> {sending ? "Broadcasting..." : "Emit Circulation Notice"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
