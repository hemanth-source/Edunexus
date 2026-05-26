import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Lightbulb, BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function AiInsightWidget() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/dashboard/insight");
      setInsight(data.text);
    } catch (e) {
      toast.error("Could not generate insight");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInsight();
  }, []);

  return (
    <Card className="bg-linear-to-br from-green-50 to-white border dark:from-green-800 shadow-sm overflow-hidden relative">
      {/* Decorative Background Icon */}
      <BrainCircuit className="absolute -right-6 -bottom-6 h-32 w-32 text-violet-100/50" />

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI Academic Advisor
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-violet-600 hover:text-violet-800 hover:bg-violet-100"
          onClick={generateInsight}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        ) : insight ? (
          <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {insight}
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm mb-3">
              Tap to analyze attendance, grades, and schedules.
            </p>
            <Button size="sm" onClick={generateInsight}>
              Generate Insight
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// just an example of how to use the AiInsightWidget in a dashboard page
