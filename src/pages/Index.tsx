import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Flame, Trash2, Bell } from "lucide-react";
import ExportPDFButton from "@/components/ExportPDFButton";
import {
  Habit,
  HabitLog,
  DayLogs,
  HabitDayDetail,
  HabitCategory,
  CATEGORY_STYLES,
  getHabits,
  saveHabits,
  getLogs,
  saveLogs,
  getDayLogs,
  saveDayLogs,
  getDayEntry,
  todayStr,
  formatDate,
  addDays,
  getStreak,
  formatMinutes,
  getBlocksInRange,
  backfillPastDays,
} from "@/lib/habits";
import AddHabitDialog from "@/components/AddHabitDialog";
import TimeSpentModal from "@/components/TimeSpentModal";
import TimeBlockSection from "@/components/TimeBlockSection";
import DailyWastedTimeCard from "@/components/DailyWastedTimeCard";
import { useHabitReminders } from "@/hooks/use-habit-reminders";
import { useAuth } from "@/hooks/use-auth";
import {
  performInitialSync,
  ensureProfileTimezone,
  pushHabitsToCloud,
  pushDayEntryToCloud,
  getUserId,
} from "@/lib/cloud-sync";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export default function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog>({});
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [timeModal, setTimeModal] = useState<{ habitId: string; habitName: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHabits(getHabits());
    setLogs(getLogs());
    const raw = getDayLogs();
    const { dayLogs: filled, changed } = backfillPastDays(raw);
    if (changed) saveDayLogs(filled);
    setDayLogs(filled);
  }, []);

  useHabitReminders(habits);

  const dayEntry = getDayEntry(dayLogs, selectedDate);

  useEffect(() => {
    setNotes(dayEntry.notes || "");
  }, [selectedDate, dayLogs]);

  const updateHabits = useCallback((h: Habit[]) => {
    setHabits(h);
    saveHabits(h);
    // Best-effort sync of reminder-bearing habits to the cloud (no-op if signed out)
    import("@/lib/push").then((m) => m.syncRemindersToCloud(h)).catch(() => {});
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
    return dayEntry.habits?.[habitId] || { completed: false, description: "", timeSpent: 0 };
  };

  const toggleHabit = (habitId: string) => {
    const current = getDayDetail(habitId);
    const newCompleted = !current.completed;

    if (newCompleted) {
      // Show time modal
      const habit = habits.find((h) => h.id === habitId);
      setTimeModal({ habitId, habitName: habit?.name || "" });
    }

    // Update dayLogs
    const updated = {
      ...dayEntry,
      habits: {
        ...dayEntry.habits,
        [habitId]: { ...current, completed: newCompleted },
      },
    };
    updateDayLogs({ ...dayLogs, [selectedDate]: updated });

    // Update logs for streak calc
    const dates = logs[habitId] || [];
    const updatedDates = newCompleted
      ? [...dates, selectedDate]
      : dates.filter((d) => d !== selectedDate);
    updateLogs({ ...logs, [habitId]: updatedDates });
  };

  const fillBlocksByRange = (entry: typeof dayEntry, habitName: string, emoji: string, from: string, to: string) => {
    const blocks = [...(entry.timeBlocks || [])];
    const indices = getBlocksInRange(blocks, from, to);
    indices.forEach((i) => {
      blocks[i] = { ...blocks[i], description: `${emoji} ${habitName}` };
    });
    return blocks;
  };

  const handleTimeSubmit = (minutes: number, fromTime?: string, toTime?: string) => {
    if (timeModal) {
      const current = getDayDetail(timeModal.habitId);
      const habit = habits.find((h) => h.id === timeModal.habitId);
      const updatedBlocks = minutes > 0 && habit && fromTime && toTime
        ? fillBlocksByRange(dayEntry, habit.name, habit.emoji, fromTime, toTime)
        : dayEntry.timeBlocks;
      const updated = {
        ...dayEntry,
        habits: {
          ...dayEntry.habits,
          [timeModal.habitId]: { ...current, timeSpent: minutes },
        },
        timeBlocks: updatedBlocks,
      };
      updateDayLogs({ ...dayLogs, [selectedDate]: updated });
    }
    setTimeModal(null);
  };

  const openTimePrompt = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      setTimeModal({ habitId, habitName: habit.name });
    }
  };

  const updateDescription = (habitId: string, description: string) => {
    const current = getDayDetail(habitId);
    const updated = {
      ...dayEntry,
      habits: {
        ...dayEntry.habits,
        [habitId]: { ...current, description },
      },
    };
    updateDayLogs({ ...dayLogs, [selectedDate]: updated });
  };

  const addHabit = (name: string, emoji: string, category: HabitCategory, reminderTime?: string) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      emoji,
      createdAt: todayStr(),
      category,
      reminderTime,
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
    updateDayLogs({ ...dayLogs, [selectedDate]: { ...dayEntry, notes } });
  };

  const updateTimeBlocks = (blocks: typeof dayEntry.timeBlocks) => {
    updateDayLogs({ ...dayLogs, [selectedDate]: { ...dayEntry, timeBlocks: blocks } });
  };

  const updateWastedTime = (wastedTime: typeof dayEntry.wastedTime) => {
    updateDayLogs({ ...dayLogs, [selectedDate]: { ...dayEntry, wastedTime } });
  };

  const goToPrevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(todayStr());

  const dateInfo = formatDate(selectedDate);
  const isToday = selectedDate === todayStr();
  const completedToday = habits.filter((h) => getDayDetail(h.id).completed).length;
  const total = habits.length;

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div ref={printRef} className="bg-background">
      {/* Header */}
      <div className="gradient-header text-primary-foreground py-5 px-6 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <button onClick={goToPrevDay} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-wide">{dateInfo.weekday}</h1>
            <p className="text-sm opacity-80">{dateInfo.month} {dateInfo.day}, {dateInfo.year}</p>
          </div>
          <button onClick={goToNextDay} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {!isToday && (
          <div className="text-center mt-2">
            <button onClick={goToToday} className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity underline">
              <CalendarDays className="w-3 h-3" /> Back to today
            </button>
          </div>
        )}

        {total > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-foreground rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(completedToday / total) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold">{completedToday}/{total}</span>
            {completedToday === total && total > 0 && <span className="text-sm animate-bounce">🎉</span>}
          </div>
        )}
      </div>

      {/* Habits Card */}
      <Card className="border-border bg-card mb-4">
        <CardContent className="p-6">
          {habits.length > 0 ? (
            <div className="space-y-3">
              {habits.map((habit) => {
                const detail = getDayDetail(habit.id);
                const streak = getStreak(habit.id, logs);
                const progressPct = habit.goalMinutes ? Math.min(100, (detail.timeSpent / habit.goalMinutes) * 100) : (detail.timeSpent > 0 ? 100 : 0);

                return (
                  <div
                    key={habit.id}
                    className={`rounded-lg p-3 transition-colors ${detail.completed ? "bg-primary/5" : "bg-secondary/20"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={detail.completed}
                        onCheckedChange={() => toggleHabit(habit.id)}
                        className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-lg">{habit.emoji}</span>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${detail.completed ? "text-primary line-through opacity-80" : "text-foreground"}`}>
                          {habit.name}
                        </span>
                        {habit.category && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[habit.category]}`}>
                            {habit.category}
                          </span>
                        )}
                        {habit.reminderTime && (
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5" title={`Reminder at ${habit.reminderTime}`}>
                            <Bell className="w-2.5 h-2.5" />
                            {habit.reminderTime}
                          </span>
                        )}
                      </div>
                      {detail.timeSpent > 0 ? (
                        <button
                          onClick={() => openTimePrompt(habit.id)}
                          className="text-xs font-bold streak-glow flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                          title="Click to update time spent"
                        >
                          {formatMinutes(detail.timeSpent)} 🔥
                        </button>
                      ) : detail.completed ? (
                        <button
                          onClick={() => openTimePrompt(habit.id)}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Click to log time spent"
                        >
                          + Log time
                        </button>
                      ) : null}
                      {streak > 0 && (
                        <div className="flex items-center gap-1 streak-glow">
                          <Flame className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{streak}</span>
                        </div>
                      )}
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Progress bar */}
                    {detail.timeSpent > 0 && (
                      <div className="mt-2 ml-10">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out progress-bar-glow"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="mt-2 ml-10">
                      <Input
                        placeholder="Add details..."
                        value={detail.description}
                        onChange={(e) => updateDescription(habit.id, e.target.value)}
                        className="h-7 text-xs bg-secondary/30 border-border/30 focus:border-primary/50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🌳</div>
              <h2 className="text-lg font-medium text-foreground mb-1">No habits yet</h2>
              <p className="text-muted-foreground text-sm">Add your first habit to start tracking</p>
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <AddHabitDialog onAdd={addHabit} />
          </div>
        </CardContent>
      </Card>

      {/* Time Blocks */}
      <Card className="border-border bg-card mb-4">
        <CardContent className="p-6">
          <TimeBlockSection timeBlocks={dayEntry.timeBlocks} onUpdate={updateTimeBlocks} />
        </CardContent>
      </Card>

      {/* Wasted Time */}
      <Card className="border-border bg-card mb-4">
        <CardContent className="p-6">
          <DailyWastedTimeCard
            entries={dayEntry.wastedTime || []}
            onChange={updateWastedTime}
          />
        </CardContent>
      </Card>

      {/* Day Notes */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">📝 Day Notes</h3>
          <Textarea
            placeholder="How was your day? Reflections, wins, struggles..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] resize-none bg-secondary/30 border-border/50 focus:border-primary/50"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={saveNotes} size="sm" className="btn-glossy border-0">Save Notes</Button>
          </div>
        </CardContent>
      </Card>
      </div>

      <div className="flex justify-end mt-4">
        <ExportPDFButton
          targetRef={printRef}
          filename={`arbora-daily-${selectedDate}.pdf`}
          label="Export Daily PDF"
        />
      </div>

      {/* Time Spent Modal */}
      {timeModal && (
        <TimeSpentModal
          open={!!timeModal}
          onClose={() => setTimeModal(null)}
          onSubmit={handleTimeSubmit}
          habitName={timeModal.habitName}
        />
      )}
    </div>
  );
}
