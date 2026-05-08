import { HABIT_CATEGORIES, HabitCategory, getDayLogs, getDayEntry } from "./habits";

export type GoalPriority = "Low" | "Medium" | "High";
export type GoalStatus = "Active" | "Completed" | "Paused" | "Missed";

export interface GoalMilestone {
  id: string;
  title: string;
  done: boolean;
}

export interface GoalCheckIn {
  date: string; // YYYY-MM-DD
  note: string;
  progressDelta?: number; // optional manual progress added that day (0-100)
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: HabitCategory;
  priority: GoalPriority;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: GoalStatus;
  progress: number;  // 0-100 manual baseline
  checkInTime?: string; // "HH:MM"
  milestones: GoalMilestone[];
  checkIns: GoalCheckIn[];
  linkedHabitIds: string[];
  createdAt: string;
}

const GOALS_KEY = "arbora-goals";

export const GOAL_CATEGORIES = HABIT_CATEGORIES;
export const GOAL_PRIORITIES: GoalPriority[] = ["Low", "Medium", "High"];
export const GOAL_STATUSES: GoalStatus[] = ["Active", "Completed", "Paused", "Missed"];

export const PRIORITY_STYLES: Record<GoalPriority, string> = {
  Low: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  Medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  High: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export const STATUS_STYLES: Record<GoalStatus, string> = {
  Active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Completed: "bg-primary/15 text-primary border-primary/30",
  Paused: "bg-muted text-muted-foreground border-border",
  Missed: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export function getGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGoals(goals: Goal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function upsertGoal(goal: Goal) {
  const all = getGoals();
  const idx = all.findIndex((g) => g.id === goal.id);
  if (idx >= 0) all[idx] = goal;
  else all.push(goal);
  saveGoals(all);
}

export function deleteGoal(id: string) {
  saveGoals(getGoals().filter((g) => g.id !== id));
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00").getTime();
  const db = new Date(b + "T12:00:00").getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Compute a derived progress percent that combines:
 * - manual `goal.progress`
 * - milestone completion ratio
 * - linked-habit consistency in [start, today]
 * Returns a value 0-100.
 */
export function computeGoalProgress(goal: Goal): number {
  const today = todayISO();
  let parts: number[] = [];
  parts.push(Math.max(0, Math.min(100, goal.progress || 0)));

  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter((m) => m.done).length;
    parts.push((done / goal.milestones.length) * 100);
  }

  if (goal.linkedHabitIds.length > 0) {
    const dayLogs = getDayLogs();
    const start = goal.startDate <= today ? goal.startDate : today;
    const total = Math.max(1, daysBetween(start, today) + 1);
    let completed = 0;
    for (let i = 0; i < total; i++) {
      const d = new Date(start + "T12:00:00");
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      const entry = getDayEntry(dayLogs, ds);
      const anyDone = goal.linkedHabitIds.some((hid) => entry.habits?.[hid]?.completed);
      if (anyDone) completed++;
    }
    parts.push((completed / total) * 100);
  }

  return Math.round(parts.reduce((s, p) => s + p, 0) / parts.length);
}

export function goalDaysRemaining(goal: Goal): number {
  return daysBetween(todayISO(), goal.endDate);
}

export function goalConsistency(goal: Goal): number {
  const today = todayISO();
  const start = goal.startDate <= today ? goal.startDate : today;
  const totalDays = Math.max(1, daysBetween(start, today) + 1);
  const checkDays = new Set(goal.checkIns.map((c) => c.date)).size;
  return Math.round((checkDays / totalDays) * 100);
}

export function goalAvgDailyProgress(goal: Goal): number {
  if (goal.checkIns.length === 0) return 0;
  const total = goal.checkIns.reduce((s, c) => s + (c.progressDelta || 0), 0);
  return Math.round((total / goal.checkIns.length) * 10) / 10;
}
