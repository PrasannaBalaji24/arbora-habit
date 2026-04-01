export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

export interface HabitDayDetail {
  completed: boolean;
  description: string;
}

export interface DayEntry {
  notes: string;
  habits: { [habitId: string]: HabitDayDetail };
}

export interface HabitLog {
  [habitId: string]: string[]; // dates completed - kept for streak calc
}

export interface DayLogs {
  [dateStr: string]: DayEntry;
}

const HABITS_KEY = "habits-tracker-habits";
const LOGS_KEY = "habits-tracker-logs";
const DAY_LOGS_KEY = "habits-tracker-day-logs";

export function getHabits(): Habit[] {
  const raw = localStorage.getItem(HABITS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveHabits(habits: Habit[]) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function getLogs(): HabitLog {
  const raw = localStorage.getItem(LOGS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveLogs(logs: HabitLog) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function getDayLogs(): DayLogs {
  const raw = localStorage.getItem(DAY_LOGS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveDayLogs(dayLogs: DayLogs) {
  localStorage.setItem(DAY_LOGS_KEY, JSON.stringify(dayLogs));
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr: string): { weekday: string; month: string; day: number; year: number } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en", { weekday: "long" }),
    month: d.toLocaleDateString("en", { month: "long" }),
    day: d.getDate(),
    year: d.getFullYear(),
  };
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export function getStreak(habitId: string, logs: HabitLog): number {
  const completedDates = logs[habitId] || [];
  if (completedDates.length === 0) return 0;

  const sorted = [...completedDates].sort().reverse();
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (sorted[0] !== today && sorted[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
