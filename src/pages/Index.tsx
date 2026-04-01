import { useState, useEffect, useCallback } from "react";
import { Leaf } from "lucide-react";
import { Habit, HabitLog, getHabits, saveHabits, getLogs, saveLogs, todayStr } from "@/lib/habits";
import HabitCard from "@/components/HabitCard";
import AddHabitDialog from "@/components/AddHabitDialog";

export default function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});

  useEffect(() => {
    setHabits(getHabits());
    setLogs(getLogs());
  }, []);

  const updateHabits = useCallback((h: Habit[]) => {
    setHabits(h);
    saveHabits(h);
  }, []);

  const updateLogs = useCallback((l: HabitLog) => {
    setLogs(l);
    saveLogs(l);
  }, []);

  const addHabit = (name: string, emoji: string) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      emoji,
      createdAt: todayStr(),
    };
    updateHabits([...habits, newHabit]);
  };

  const toggleHabit = (habitId: string) => {
    const today = todayStr();
    const current = logs[habitId] || [];
    const updated = current.includes(today)
      ? current.filter((d) => d !== today)
      : [...current, today];
    updateLogs({ ...logs, [habitId]: updated });
  };

  const deleteHabit = (habitId: string) => {
    updateHabits(habits.filter((h) => h.id !== habitId));
    const newLogs = { ...logs };
    delete newLogs[habitId];
    updateLogs(newLogs);
  };

  const completedToday = habits.filter((h) => (logs[h.id] || []).includes(todayStr())).length;
  const total = habits.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Leaf className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Daily Habits</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>

          {/* Progress */}
          {total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-3xl font-bold text-primary">{completedToday}</span>
                <span className="text-muted-foreground">/ {total}</span>
              </div>
              <div className="w-48 mx-auto h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(completedToday / total) * 100}%` }}
                />
              </div>
              {completedToday === total && total > 0 && (
                <p className="text-sm text-primary mt-2 font-medium animate-bounce">
                  🎉 All done for today!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Habits list */}
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              logs={logs}
              onToggle={toggleHabit}
              onDelete={deleteHabit}
            />
          ))}
        </div>

        {/* Empty state */}
        {habits.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🌱</div>
            <h2 className="text-lg font-medium text-foreground mb-1">Start your journey</h2>
            <p className="text-muted-foreground text-sm">Add your first habit to begin tracking</p>
          </div>
        )}

        {/* FAB */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <AddHabitDialog onAdd={addHabit} />
        </div>
      </div>
    </div>
  );
}
