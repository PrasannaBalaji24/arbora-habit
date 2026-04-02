export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  goalMinutes?: number; // daily goal in minutes
}

export interface HabitDayDetail {
  completed: boolean;
  description: string;
  timeSpent: number; // minutes
}

export interface TimeBlock {
  id: string;
  startTime: string; // "06:00"
  endTime: string;   // "07:00"
  description: string;
}

export interface WastedTimeEntry {
  category: string;
  minutes: number;
}

export interface DayEntry {
  notes: string;
  habits: { [habitId: string]: HabitDayDetail };
  timeBlocks: TimeBlock[];
  wastedTime: WastedTimeEntry[];
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

export const WASTED_CATEGORIES = [
  "Social Media",
  "Lying down / Lazy",
  "Random browsing",
  "Gaming",
  "Overthinking",
  "Other",
];

export const DEFAULT_TIME_BLOCKS: Omit<TimeBlock, "id">[] = [
  { startTime: "06:00", endTime: "07:00", description: "" },
  { startTime: "07:00", endTime: "08:00", description: "" },
  { startTime: "08:00", endTime: "09:00", description: "" },
  { startTime: "09:00", endTime: "10:00", description: "" },
  { startTime: "10:00", endTime: "11:00", description: "" },
  { startTime: "11:00", endTime: "12:00", description: "" },
  { startTime: "12:00", endTime: "13:00", description: "" },
  { startTime: "13:00", endTime: "14:00", description: "" },
  { startTime: "14:00", endTime: "15:00", description: "" },
  { startTime: "15:00", endTime: "16:00", description: "" },
  { startTime: "16:00", endTime: "17:00", description: "" },
  { startTime: "17:00", endTime: "18:00", description: "" },
  { startTime: "18:00", endTime: "19:00", description: "" },
  { startTime: "19:00", endTime: "20:00", description: "" },
  { startTime: "20:00", endTime: "21:00", description: "" },
  { startTime: "21:00", endTime: "22:00", description: "" },
];

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

export function formatMinutes(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function getEmptyDayEntry(): DayEntry {
  return {
    notes: "",
    habits: {},
    timeBlocks: DEFAULT_TIME_BLOCKS.map((tb) => ({ ...tb, id: crypto.randomUUID() })),
    wastedTime: [],
  };
}

export function getDayEntry(dayLogs: DayLogs, dateStr: string): DayEntry {
  const empty = getEmptyDayEntry();
  const existing = dayLogs[dateStr];
  if (!existing) return empty;
  return {
    ...empty,
    ...existing,
    timeBlocks: existing.timeBlocks || empty.timeBlocks,
    wastedTime: existing.wastedTime || [],
  };
}

// Aggregation helpers
export function getWeekDates(referenceDate: string): string[] {
  const d = new Date(referenceDate + "T12:00:00");
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

export function getMonthDates(referenceDate: string): string[] {
  const d = new Date(referenceDate + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const dates: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(`${year}-${(month + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`);
  }
  return dates;
}

export function getDayTotalHabitTime(dayEntry: DayEntry): number {
  return Object.values(dayEntry.habits).reduce((sum, h) => sum + (h.timeSpent || 0), 0);
}

export function getDayTotalWastedTime(dayEntry: DayEntry): number {
  return (dayEntry.wastedTime || []).reduce((sum, w) => sum + w.minutes, 0);
}

export function getDayCompletionRate(dayEntry: DayEntry, totalHabits: number): number {
  if (totalHabits === 0) return 0;
  const completed = Object.values(dayEntry.habits).filter((h) => h.completed).length;
  return Math.round((completed / totalHabits) * 100);
}
