import { Flame, Trash2 } from "lucide-react";
import { Habit, HabitLog, getWeekDates, getDayLabel, getStreak } from "@/lib/habits";

interface HabitCardProps {
  habit: Habit;
  logs: HabitLog;
  selectedDate: string;
  onToggle: (habitId: string) => void;
  onDelete: (habitId: string) => void;
}

export default function HabitCard({ habit, logs, selectedDate, onToggle, onDelete }: HabitCardProps) {
  const weekDates = getWeekDates();
  const completedDates = logs[habit.id] || [];
  const isCompleted = completedDates.includes(selectedDate);
  const streak = getStreak(habit.id, logs);

  return (
    <div
      className={`group relative rounded-2xl border p-4 transition-all duration-300 ${
        isCompleted
          ? "bg-primary/5 border-primary/20 shadow-sm"
          : "bg-card border-border hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Toggle button */}
        <button
          onClick={() => onToggle(habit.id)}
          className={`flex-shrink-0 w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all duration-300 ${
            isCompleted
              ? "bg-primary/15 scale-105"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          {habit.emoji}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium truncate transition-all ${
              isCompleted ? "text-primary" : "text-foreground"
            }`}
          >
            {habit.name}
          </h3>

          {/* Week dots */}
          <div className="flex gap-1.5 mt-1.5">
            {weekDates.map((date) => {
              const done = completedDates.includes(date);
              const isSel = date === selectedDate;
              return (
                <div key={date} className="flex flex-col items-center gap-0.5">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      done ? "habit-dot-complete" : "habit-dot-incomplete"
                    } ${isSel ? "ring-1 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
                  />
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {getDayLabel(date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streak + delete */}
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 streak-glow">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-bold">{streak}</span>
            </div>
          )}
          <button
            onClick={() => onDelete(habit.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Completion indicator */}
      {isCompleted && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  );
}
