import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clock, User as UserIcon, Edit, Plus } from "lucide-react";
import type { schedule } from "@/types";

interface Props {
  schedule: schedule[];
  isLoading: boolean;
  isEditMode?: boolean;
  onPeriodClick?: (day: string, time: string, period?: any) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TimetableGrid = ({ schedule, isLoading, isEditMode = false, onPeriodClick }: Props) => {
  // loading
  if (isLoading) {
    return (
      <div className="h-125 w-full flex items-center justify-center border rounded-lg bg-card">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading schedule...</p>
        </div>
      </div>
    );
  }

  // no schedule
  if (!schedule || schedule.length === 0) {
    return (
      <div className="h-100 w-full flex flex-col items-center justify-center border rounded-lg border-dashed bg-card">
        <Clock className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-lg">No Timetable Generated</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Select a class and academic year to view or manually create the schedule.
        </p>
      </div>
    );
  }

  const timeSlots = useMemo(() => {
    if (!schedule) return [];
    const times = new Set<string>();
    schedule.forEach((day) => {
      day.periods.forEach((period) => {
        times.add(period.startTime);
      });
    });
    return Array.from(times).sort();
  }, [schedule]);

  const getRowLabel = (startTime: string) => {
    for (const day of schedule) {
      const found = day.periods.find((p) => p.startTime === startTime);
      if (found) {
        return `${found.startTime} - ${found.endTime}`;
      }
    }
    return startTime;
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <div className="flex w-max min-w-full flex-col">
        {/* header row */}
        <div className="flex border-b bg-muted/50">
          <div className="w-32 shrink-0 border-r p-4 font-medium text-muted-foreground flex items-center justify-center">
            Time
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex-1 min-w-50 border-r p-4 font-semibold text-center last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        {timeSlots?.map((time) => (
          <div className="flex border-b last:border-b-0 min-h-27.5" key={time}>
            <div className="w-32 shrink-0 border-r p-2 text-xs font-medium text-muted-foreground flex items-center justify-center text-center bg-muted/50">
              {getRowLabel(time)}
            </div>
            {DAYS.map((day) => {
              // Find the day data
              const dayData = schedule.find((d) => d.day === day);

              // Find the specific period that matches THIS ROW'S start time
              const period = dayData?.periods.find((p) => p.startTime === time);
              
              const isPeriodAssigned = period && period.subject && period.teacher;

              return (
                <div
                  key={`${day}-${time}`}
                  className="flex-1 min-w-50 border-r p-2 last:border-r-0"
                >
                  {isEditMode ? (
                    /* Edit Mode Cell View */
                    <button
                      onClick={() => onPeriodClick?.(day, time, period)}
                      className={`h-full w-full rounded-md border text-left p-3 shadow-sm hover:shadow-md hover:scale-[1.01] hover:border-primary/50 transition-all flex flex-col justify-between gap-2 border-l-4 group relative ${
                        isPeriodAssigned 
                          ? "bg-card border-l-primary" 
                          : "bg-primary/5 border-dashed border-primary/30 border-l-primary/30 hover:bg-primary/10"
                      }`}
                    >
                      {isPeriodAssigned ? (
                        <>
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                variant="outline"
                                className="font-bold text-[10px] px-1.5"
                              >
                                {period.subject.code || "SUB"}
                              </Badge>
                              <Edit className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
                            </div>
                            <h4 className="font-semibold text-sm leading-tight text-primary line-clamp-2 pr-4">
                              {period.subject.name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-dashed w-full">
                            <UserIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-35">
                              {period.teacher.name}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center py-4 text-primary/70 group-hover:text-primary gap-1">
                          <Plus className="h-5 w-5 animate-pulse" />
                          <span className="text-xs font-semibold">Assign Period</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    /* Standard Read-Only Cell View */
                    isPeriodAssigned ? (
                      <div className="h-full w-full rounded-md border bg-card p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2 border-l-4 border-l-primary">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant="outline"
                              className="font-bold text-[10px] px-1.5"
                            >
                              {period.subject.code && period.subject.code}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-sm leading-tight text-primary line-clamp-2">
                            {period.subject.name}
                          </h4>
                          {period.class && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full mt-1.5 border border-amber-200/50">
                              🏫 {period.class.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-dashed">
                          <UserIcon className="h-3 w-3 shrink-0" />
                          <span
                            className="truncate max-w-35"
                            title={period.teacher.name}
                          >
                            {period.teacher.name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full w-full rounded-md border border-dashed border-primary bg-primary/30 flex items-center justify-center">
                        <span className="text-xs text-primary font-medium">
                          Free Period
                        </span>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default TimetableGrid;
