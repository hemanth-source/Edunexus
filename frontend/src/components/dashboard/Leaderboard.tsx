import { useEffect, useState } from "react";
import { api } from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, Star, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface StudentScore {
  studentId: string;
  name: string;
  score: number;
  breakdown: { exams: number; attendance: number };
}

interface LeaderboardData {
  classId: string;
  className: string;
  topStudents: StudentScore[];
}

export function LeaderboardWidget() {
  const [data, setData] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard/leaderboard");
      setData(res.data);
      if (res.data.length > 0) {
        setSelectedClassId(res.data[0].classId);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboards", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  if (loading) {
    return <Skeleton className="w-full h-[400px] rounded-xl" />;
  }

  if (data.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" /> Class Leaderboards
          </CardTitle>
          <CardDescription>No gamification data available yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedClass = data.find((cls) => cls.classId === selectedClassId) || data[0];

  return (
    <Card className="border-primary/20 shadow-lg overflow-hidden relative">
      {/* Background gamification effects */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
      
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-orange-400">
              <Trophy className="h-6 w-6 text-yellow-500" /> 
              Top Performers
            </CardTitle>
            <CardDescription>
              Based strictly on exams and attendance!
            </CardDescription>
          </div>
          
          <div className="w-[180px]">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {data.map((cls) => (
                  <SelectItem key={cls.classId} value={cls.classId}>
                    {cls.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {selectedClass && (
          <div className="space-y-4 mt-2">
            {selectedClass.topStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active students in this class yet.</p>
            ) : (
              <div className="space-y-3">
                {selectedClass.topStudents.map((student, idx) => {
                  // Gamification Styles based on Rank
                  let rankIcon = <span className="font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>;
                  let rowStyle = "bg-secondary/30";
                  
                  if (idx === 0) {
                    rankIcon = <Trophy className="h-6 w-6 text-yellow-500 drop-shadow-md" />;
                    rowStyle = "bg-gradient-to-r from-yellow-500/20 to-transparent border-l-4 border-yellow-500";
                  } else if (idx === 1) {
                    rankIcon = <Medal className="h-6 w-6 text-gray-300 drop-shadow-md" />;
                    rowStyle = "bg-gradient-to-r from-gray-400/20 to-transparent border-l-4 border-gray-400";
                  } else if (idx === 2) {
                    rankIcon = <Medal className="h-6 w-6 text-amber-600 drop-shadow-md" />;
                    rowStyle = "bg-gradient-to-r from-amber-600/20 to-transparent border-l-4 border-amber-600";
                  }

                  return (
                    <div 
                      key={student.studentId}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all hover:scale-[1.01] ${rowStyle}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50">
                          {rankIcon}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span title="Exams"><Star className="h-3 w-3 inline mr-1 text-primary"/>{student.breakdown.exams}</span>
                            <span title="Attendance"><Award className="h-3 w-3 inline mr-1 text-green-500"/>{student.breakdown.attendance}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-lg font-bold px-3 py-1 bg-background/80 shadow-inner text-primary">
                          {student.score} pts
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
