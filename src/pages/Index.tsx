import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  Habit,
  HabitLog,
  DayLogs,
  getHabits,
  saveHabits,
  getLogs,
  saveLogs,
  getDayLogs,
  saveDayLogs,
  todayStr,
  formatDate,
  addDays,
} from "@/lib/habits";
import HabitCard from "@/components/HabitCard";
import AddHabitDialog from "@/components/AddHabitDialog";
import DayNotes from "@/components/DayNotes";
import { Button } from "@/components/ui/button";

export default function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [selectedDate, setSelectedDate] = useState(todayStr());

  useEffect(() => {
    setHabits(getHabits());
    setLogs(getLogs());
    setDayLogs(getDayLogs());
  }, []);

  // Auto-advance: if all habits are done for today, show tomorrow
  useEffect(() => {
    if (habits.length === 0) return;
    const today = todayStr();
    const allDoneToday = habits.every((h) => (logs[h.id] || []).includes(today));
    if (allDoneToday && selectedDate === today) {
      // Don't auto-advance, but show a hint
    }
  }, [habits, logs, selectedDate]);

  const updateHabits = useCallback((h: Habit[]) => {
    setHabits(h);
    saveHabits(h);
  }, []);

  const updateLogs = useCallback((l: HabitLog) => {
    setLogs(l);
    saveLogs(l);
  }, []);

  const updateDayLogs = useCallback((dl: DayLogs) => {
    setDayLogs(dl);
    saveDayLogs(dl);
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
    const current = logs[habitId] || [];
    const updated = current.includes(selectedDate)
      ? current.filter((d) => d !== selectedDate)
      : [...current, selectedDate];
    updateLogs({ ...logs, [habitId]: updated });
  };

  const deleteHabit = (habitId: string) => {
    updateHabits(habits.filter((h) => h.id !== habitId));
    const newLogs = { ...logs };
    delete newLogs[habitId];
    updateLogs(newLogs);
  };

  const saveNotes = (notes: string) => {
    const entry = dayLogs[selectedDate] || { notes: "", completedHabits: [] };
    updateDayLogs({ ...dayLogs, [selectedDate]: { ...entry, notes } });
  };

  const goToPrevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(todayStr());

  const dateInfo = formatDate(selectedDate);
  const isToday = selectedDate === todayStr();
  const completedToday = habits.filter((h) => (logs[h.id] || []).includes(selectedDate)).length;
  const total = habits.length;
  const currentNotes = dayLogs[selectedDate]?.notes || "";

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <div className="gradient-header text-primary-foreground py-6 pb-10 rounded-b-3xl shadow-lg">
        <div className="max-w-lg mx-auto px-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPrevDay}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold">{dateInfo.weekday}</h1>
              <p className="text-sm opacity-80">
                {dateInfo.month} {dateInfo.day}, {dateInfo.year}
              </p>
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {!isToday && (
            <div className="text-center">
              <button
                onClick={goToToday}
                className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity underline"
              >
                <CalendarDays className="w-3 h-3" /> Back to today
              </button>
            </div>
          )}

          {/* Progress */}
          {total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-3xl font-bold">{completedToday}</span>
                <span className="opacity-70">/ {total}</span>
              </div>
              <div className="w-48 mx-auto h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-foreground rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(completedToday / total) * 100}%` }}
                />
              </div>
              {completedToday === total && total > 0 && (
                <p className="text-sm mt-2 font-medium animate-bounce text-center">
                  🎉 All done{isToday ? " for today" : ""}!
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-24">
        {/* Habits list */}
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              logs={logs}
              selectedDate={selectedDate}
              onToggle={toggleHabit}
              onDelete={deleteHabit}
            />
          ))}
        </div>

        {/* Day Notes */}
        {habits.length > 0 && (
          <DayNotes notes={currentNotes} onSave={saveNotes} />
        )}

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
