import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Flame, Trash2 } from "lucide-react";
import {
  Habit,
  HabitLog,
  DayLogs,
  HabitDayDetail,
  getHabits,
  saveHabits,
  getLogs,
  saveLogs,
  getDayLogs,
  saveDayLogs,
  todayStr,
  formatDate,
  addDays,
  getStreak,
} from "@/lib/habits";
import AddHabitDialog from "@/components/AddHabitDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setHabits(getHabits());
    setLogs(getLogs());
    setDayLogs(getDayLogs());
  }, []);

  // Sync notes when date changes
  useEffect(() => {
    setNotes(dayLogs[selectedDate]?.notes || "");
  }, [selectedDate, dayLogs]);

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

  const getDayDetail = (habitId: string): HabitDayDetail => {
    return dayLogs[selectedDate]?.habits?.[habitId] || { completed: false, description: "" };
  };

  const toggleHabit = (habitId: string) => {
    const current = getDayDetail(habitId);
    const newCompleted = !current.completed;

    // Update dayLogs
    const entry = dayLogs[selectedDate] || { notes: "", habits: {} };
    const updatedEntry = {
      ...entry,
      habits: {
        ...entry.habits,
        [habitId]: { ...current, completed: newCompleted },
      },
    };
    updateDayLogs({ ...dayLogs, [selectedDate]: updatedEntry });

    // Update logs for streak calc
    const dates = logs[habitId] || [];
    const updatedDates = newCompleted
      ? [...dates, selectedDate]
      : dates.filter((d) => d !== selectedDate);
    updateLogs({ ...logs, [habitId]: updatedDates });
  };

  const updateDescription = (habitId: string, description: string) => {
    const current = getDayDetail(habitId);
    const entry = dayLogs[selectedDate] || { notes: "", habits: {} };
    const updatedEntry = {
      ...entry,
      habits: {
        ...entry.habits,
        [habitId]: { ...current, description },
      },
    };
    updateDayLogs({ ...dayLogs, [selectedDate]: updatedEntry });
  };

  const addHabit = (name: string, emoji: string) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      emoji,
      createdAt: todayStr(),
    };
    updateHabits([...habits, newHabit]);
  };

  const deleteHabit = (habitId: string) => {
    updateHabits(habits.filter((h) => h.id !== habitId));
    const newLogs = { ...logs };
    delete newLogs[habitId];
    updateLogs(newLogs);
  };

  const saveNotes = () => {
    const entry = dayLogs[selectedDate] || { notes: "", habits: {} };
    updateDayLogs({ ...dayLogs, [selectedDate]: { ...entry, notes } });
  };

  const goToPrevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(todayStr());

  const dateInfo = formatDate(selectedDate);
  const isToday = selectedDate === todayStr();
  const completedToday = habits.filter((h) => getDayDetail(h.id).completed).length;
  const total = habits.length;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-2xl hero-container hero-container-glow rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="gradient-header text-primary-foreground py-5 px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevDay}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-wide">{dateInfo.weekday}</h1>
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
            <div className="text-center mt-2">
              <button
                onClick={goToToday}
                className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity underline"
              >
                <CalendarDays className="w-3 h-3" /> Back to today
              </button>
            </div>
          )}

          {/* Progress bar */}
          {total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-foreground rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(completedToday / total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold">
                {completedToday}/{total}
              </span>
              {completedToday === total && total > 0 && (
                <span className="text-sm animate-bounce">🎉</span>
              )}
            </div>
          )}
        </div>

        {/* Habits Table */}
        <div className="p-6">
          {habits.length > 0 ? (
            <table className="w-full table-hero">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3 w-10">
                    ✓
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3">
                    Habit
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3">
                    Description
                  </th>
                  <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3 w-16">
                    🔥
                  </th>
                  <th className="pb-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => {
                  const detail = getDayDetail(habit.id);
                  const streak = getStreak(habit.id, logs);
                  return (
                    <tr
                      key={habit.id}
                      className={`transition-colors ${detail.completed ? "bg-primary/5" : ""}`}
                    >
                      <td className="py-3 pr-2">
                        <Checkbox
                          checked={detail.completed}
                          onCheckedChange={() => toggleHabit(habit.id)}
                          className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{habit.emoji}</span>
                          <span
                            className={`font-medium text-sm ${
                              detail.completed ? "text-primary line-through opacity-80" : "text-foreground"
                            }`}
                          >
                            {habit.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <Input
                          placeholder="Add details..."
                          value={detail.description}
                          onChange={(e) => updateDescription(habit.id, e.target.value)}
                          className="h-8 text-xs bg-secondary/50 border-border/50 focus:border-primary/50"
                        />
                      </td>
                      <td className="py-3 text-center">
                        {streak > 0 && (
                          <div className="flex items-center justify-center gap-1 streak-glow">
                            <Flame className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{streak}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🦇</div>
              <h2 className="text-lg font-medium text-foreground mb-1">No habits yet</h2>
              <p className="text-muted-foreground text-sm">Add your first habit to start tracking</p>
            </div>
          )}

          {/* Add habit button */}
          <div className="mt-4 flex justify-center">
            <AddHabitDialog onAdd={addHabit} />
          </div>

          {/* Day Notes */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              📝 Day Notes
            </h3>
            <Textarea
              placeholder="How was your day? Reflections, wins, struggles..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none bg-secondary/30 border-border/50 focus:border-primary/50"
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={saveNotes} size="sm" className="btn-glossy border-0">
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
