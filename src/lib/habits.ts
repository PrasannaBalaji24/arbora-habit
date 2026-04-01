export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

export interface HabitLog {
  [habitId: string]: string[]; // array of date strings "YYYY-MM-DD"
}

const HABITS_KEY = "habits-tracker-habits";
const LOGS_KEY = "habits-tracker-logs";

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

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function getWeekDates(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function getStreak(habitId: string, logs: HabitLog): number {
  const completedDates = logs[habitId] || [];
  if (completedDates.length === 0) return 0;

  const sorted = [...completedDates].sort().reverse();
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Streak must include today or yesterday
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

export function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en", { weekday: "short" }).charAt(0);
}
