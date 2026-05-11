// Cloud sync for Arbora.
// When the user is signed in we mirror all habits, day entries, and per-habit
// completion logs to the database so data survives cache clears and syncs across devices.
import { supabase } from "@/integrations/supabase/client";
import {
  Habit,
  HabitLog,
  DayLogs,
  DayEntry,
  HabitCategory,
  getHabits,
  saveHabits,
  getLogs,
  saveLogs,
  getDayLogs,
  saveDayLogs,
  getEmptyDayEntry,
} from "@/lib/habits";
import { Goal, getGoals, saveGoals } from "@/lib/goals";
import { enqueue, setLastSyncedAt } from "@/lib/sync-outbox";

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------- PULL ----------

export async function pullFromCloud(userId: string): Promise<{
  habits: Habit[];
  logs: HabitLog;
  dayLogs: DayLogs;
}> {
  const [habitsRes, logsRes, daysRes] = await Promise.all([
    supabase.from("habits").select("*").eq("user_id", userId),
    supabase.from("habit_logs").select("*").eq("user_id", userId),
    supabase.from("day_entries").select("*").eq("user_id", userId),
  ]);

  const habits: Habit[] = (habitsRes.data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji || "🌱",
    createdAt: (row.created_at as string)?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    category: row.category as HabitCategory | undefined,
    reminderTime: row.reminder_time || undefined,
    goalMinutes: row.goal_minutes ?? undefined,
  }));

  const logs: HabitLog = {};
  const dayLogs: DayLogs = {};

  for (const row of (daysRes.data || []) as any[]) {
    dayLogs[row.entry_date] = {
      ...getEmptyDayEntry(),
      notes: row.notes || "",
      timeBlocks: Array.isArray(row.time_blocks) && row.time_blocks.length
        ? row.time_blocks
        : getEmptyDayEntry().timeBlocks,
      wastedTime: Array.isArray(row.wasted_time) ? row.wasted_time : [],
      habits: {},
      ...(row.backfilled ? { __backfilled: true } : {}),
    } as DayEntry;
  }

  for (const row of (logsRes.data || []) as any[]) {
    const date = row.log_date as string;
    if (!dayLogs[date]) dayLogs[date] = getEmptyDayEntry();
    dayLogs[date].habits[row.habit_id] = {
      completed: !!row.completed,
      description: row.notes || "",
      timeSpent: row.time_spent_minutes || 0,
    };
    if (row.completed) {
      logs[row.habit_id] = logs[row.habit_id] || [];
      if (!logs[row.habit_id].includes(date)) logs[row.habit_id].push(date);
    }
  }

  return { habits, logs, dayLogs };
}

// ---------- MERGE ----------
// Conservative merge: cloud + local union. For overlapping items, prefer the
// one that has more information (longer text, higher timeSpent, completed=true).

function mergeDayDetail(a: any, b: any) {
  if (!a) return b;
  if (!b) return a;
  return {
    completed: a.completed || b.completed,
    description: (a.description?.length || 0) >= (b.description?.length || 0) ? a.description : b.description,
    timeSpent: Math.max(a.timeSpent || 0, b.timeSpent || 0),
  };
}

function mergeDayEntries(a: DayEntry | undefined, b: DayEntry | undefined): DayEntry {
  if (!a) return b!;
  if (!b) return a;
  const habitIds = new Set([...Object.keys(a.habits || {}), ...Object.keys(b.habits || {})]);
  const habits: any = {};
  habitIds.forEach((id) => {
    habits[id] = mergeDayDetail(a.habits?.[id], b.habits?.[id]);
  });
  // Pick whichever has more filled blocks
  const aFilled = (a.timeBlocks || []).filter((t) => t.description.trim()).length;
  const bFilled = (b.timeBlocks || []).filter((t) => t.description.trim()).length;
  const timeBlocks = aFilled >= bFilled ? a.timeBlocks : b.timeBlocks;
  // Wasted time: prefer non-empty
  const wastedTime = (a.wastedTime?.length || 0) >= (b.wastedTime?.length || 0) ? a.wastedTime : b.wastedTime;
  const notes = (a.notes?.length || 0) >= (b.notes?.length || 0) ? a.notes : b.notes;
  return {
    notes: notes || "",
    habits,
    timeBlocks: timeBlocks || [],
    wastedTime: wastedTime || [],
    ...((a as any).__backfilled || (b as any).__backfilled ? { __backfilled: true } : {}),
  } as DayEntry;
}

export function mergeData(
  local: { habits: Habit[]; logs: HabitLog; dayLogs: DayLogs },
  cloud: { habits: Habit[]; logs: HabitLog; dayLogs: DayLogs },
) {
  // Habits: union by id, prefer cloud (more recent metadata) but keep local-only
  const habitMap = new Map<string, Habit>();
  for (const h of local.habits) habitMap.set(h.id, h);
  for (const h of cloud.habits) habitMap.set(h.id, { ...habitMap.get(h.id), ...h });
  const habits = Array.from(habitMap.values());

  // Day logs
  const dates = new Set([...Object.keys(local.dayLogs), ...Object.keys(cloud.dayLogs)]);
  const dayLogs: DayLogs = {};
  dates.forEach((d) => {
    dayLogs[d] = mergeDayEntries(local.dayLogs[d], cloud.dayLogs[d]);
  });

  // logs (streak helper) — recompute from dayLogs
  const logs: HabitLog = {};
  Object.entries(dayLogs).forEach(([date, entry]) => {
    Object.entries(entry.habits || {}).forEach(([habitId, detail]: any) => {
      if (detail?.completed) {
        logs[habitId] = logs[habitId] || [];
        if (!logs[habitId].includes(date)) logs[habitId].push(date);
      }
    });
  });

  return { habits, logs, dayLogs };
}

// ---------- PUSH ----------

export async function pushHabitsToCloud(userId: string, habits: Habit[]) {
  try {
    const { data: existing } = await supabase.from("habits").select("id").eq("user_id", userId);
    const localIds = new Set(habits.map((h) => h.id));
    const toDelete = (existing || []).filter((r: any) => !localIds.has(r.id)).map((r: any) => r.id);
    if (toDelete.length) {
      const { error } = await supabase.from("habits").delete().in("id", toDelete);
      if (error) throw error;
    }

    if (habits.length) {
      const body = habits.map((h) => ({
        id: h.id,
        user_id: userId,
        name: h.name,
        emoji: h.emoji || "🌱",
        category: h.category || null,
        reminder_time: h.reminderTime || null,
        goal_minutes: h.goalMinutes ?? null,
      }));
      const { error } = await supabase.from("habits").upsert(body, { onConflict: "id" });
      if (error) throw error;
    }
    await setLastSyncedAt(Date.now());
  } catch (err) {
    console.warn("pushHabitsToCloud failed, queuing", err);
    if (habits.length) {
      await enqueue({
        table: "habits",
        method: "POST",
        onConflict: "id",
        body: habits.map((h) => ({
          id: h.id,
          user_id: userId,
          name: h.name,
          emoji: h.emoji || "🌱",
          category: h.category || null,
          reminder_time: h.reminderTime || null,
          goal_minutes: h.goalMinutes ?? null,
        })),
      });
    }
  }
}

export async function pushDayEntryToCloud(userId: string, date: string, entry: DayEntry) {
  const dayBody = {
    user_id: userId,
    entry_date: date,
    notes: entry.notes || "",
    time_blocks: (entry.timeBlocks as any) || [],
    wasted_time: (entry.wastedTime as any) || [],
    backfilled: !!(entry as any).__backfilled,
  };
  const habitDetails = entry.habits || {};
  const ids = Object.keys(habitDetails);
  const logsBody = ids.map((habitId) => ({
    user_id: userId,
    habit_id: habitId,
    log_date: date,
    completed: !!habitDetails[habitId].completed,
    time_spent_minutes: habitDetails[habitId].timeSpent || 0,
    notes: habitDetails[habitId].description || null,
  }));

  try {
    const { error: dayErr } = await supabase
      .from("day_entries")
      .upsert(dayBody, { onConflict: "user_id,entry_date" });
    if (dayErr) throw dayErr;

    if (logsBody.length) {
      const { error: logErr } = await supabase
        .from("habit_logs")
        .upsert(logsBody, { onConflict: "user_id,habit_id,log_date" });
      if (logErr) throw logErr;
    }
    await setLastSyncedAt(Date.now());
  } catch (err) {
    console.warn("pushDayEntryToCloud failed, queuing", err);
    await enqueue({
      table: "day_entries",
      method: "POST",
      onConflict: "user_id,entry_date",
      body: dayBody,
    });
    if (logsBody.length) {
      await enqueue({
        table: "habit_logs",
        method: "POST",
        onConflict: "user_id,habit_id,log_date",
        body: logsBody,
      });
    }
  }
}

export async function pushAllDayLogsToCloud(userId: string, dayLogs: DayLogs) {
  const dates = Object.keys(dayLogs);
  for (const d of dates) {
    try {
      await pushDayEntryToCloud(userId, d, dayLogs[d]);
    } catch (e) {
      console.error("pushDayEntry failed for", d, e);
    }
  }
}

// ---------- GOALS ----------

export async function pullGoalsFromCloud(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", userId);
  if (error) {
    console.warn("pullGoalsFromCloud failed", error);
    return [];
  }
  return (data || []).map((row: any) => ({ ...(row.data as Goal), id: row.id }));
}

export function mergeGoals(local: Goal[], cloud: Goal[]): Goal[] {
  const map = new Map<string, Goal>();
  for (const g of local) map.set(g.id, g);
  for (const g of cloud) {
    const existing = map.get(g.id);
    if (!existing) {
      map.set(g.id, g);
      continue;
    }
    // Merge: prefer the one with more checkIns / milestones / progress
    const merged: Goal = {
      ...existing,
      ...g,
      progress: Math.max(existing.progress || 0, g.progress || 0),
      milestones: g.milestones?.length >= existing.milestones?.length ? g.milestones : existing.milestones,
      checkIns: (() => {
        const byDate = new Map<string, any>();
        [...(existing.checkIns || []), ...(g.checkIns || [])].forEach((c) => byDate.set(c.date, c));
        return Array.from(byDate.values());
      })(),
      linkedHabitIds: Array.from(new Set([...(existing.linkedHabitIds || []), ...(g.linkedHabitIds || [])])),
    };
    map.set(g.id, merged);
  }
  return Array.from(map.values());
}

export async function pushGoalsToCloud(userId: string, goals: Goal[]) {
  try {
    const { data: existing } = await supabase.from("goals").select("id").eq("user_id", userId);
    const localIds = new Set(goals.map((g) => g.id));
    const toDelete = (existing || []).filter((r: any) => !localIds.has(r.id)).map((r: any) => r.id);
    if (toDelete.length) {
      const { error } = await supabase.from("goals").delete().in("id", toDelete);
      if (error) throw error;
    }
    if (goals.length) {
      const body = goals.map((g) => ({ id: g.id, user_id: userId, data: g as any }));
      const { error } = await supabase.from("goals").upsert(body, { onConflict: "id" });
      if (error) throw error;
    }
    await setLastSyncedAt(Date.now());
  } catch (err) {
    console.warn("pushGoalsToCloud failed, queuing", err);
    if (goals.length) {
      await enqueue({
        table: "goals",
        method: "POST",
        onConflict: "id",
        body: goals.map((g) => ({ id: g.id, user_id: userId, data: g as any })),
      });
    }
  }
}

// ---------- INITIAL SYNC ----------
// Called once after sign-in. Pulls cloud, merges with local, persists locally,
// and pushes the merged data back so both devices converge.
export async function performInitialSync(): Promise<{
  habits: Habit[];
  logs: HabitLog;
  dayLogs: DayLogs;
  goals: Goal[];
} | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const local = {
    habits: getHabits(),
    logs: getLogs(),
    dayLogs: getDayLogs(),
  };
  const localGoals = getGoals();
  const [cloud, cloudGoals] = await Promise.all([
    pullFromCloud(userId),
    pullGoalsFromCloud(userId),
  ]);
  const merged = mergeData(local, cloud);
  const mergedGoals = mergeGoals(localGoals, cloudGoals);

  // Save locally
  saveHabits(merged.habits);
  saveLogs(merged.logs);
  saveDayLogs(merged.dayLogs);
  saveGoals(mergedGoals);

  // Push merged back
  await pushHabitsToCloud(userId, merged.habits);
  await pushAllDayLogsToCloud(userId, merged.dayLogs);
  await pushGoalsToCloud(userId, mergedGoals);

  return { ...merged, goals: mergedGoals };
}

// Capture timezone in profile (idempotent)
export async function ensureProfileTimezone() {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) await supabase.from("profiles").update({ timezone: tz }).eq("user_id", userId);
  } catch (_) {}
}

// ---------- DEBOUNCED PUSHERS ----------
// Coalesce rapid consecutive edits into a single Supabase round-trip.
const DEBOUNCE_MS = 1500;
const habitsTimer: { id: ReturnType<typeof setTimeout> | null; pending: Habit[] | null; userId: string | null } = {
  id: null, pending: null, userId: null,
};
export function pushHabitsToCloudDebounced(userId: string, habits: Habit[]) {
  habitsTimer.pending = habits;
  habitsTimer.userId = userId;
  if (habitsTimer.id) clearTimeout(habitsTimer.id);
  habitsTimer.id = setTimeout(() => {
    const h = habitsTimer.pending;
    const u = habitsTimer.userId;
    habitsTimer.id = null; habitsTimer.pending = null;
    if (h && u) pushHabitsToCloud(u, h).catch((e) => console.error("habit push failed", e));
  }, DEBOUNCE_MS);
}

const dayTimers = new Map<string, ReturnType<typeof setTimeout>>();
const dayPending = new Map<string, { userId: string; entry: DayEntry }>();
export function pushDayEntryToCloudDebounced(userId: string, date: string, entry: DayEntry) {
  dayPending.set(date, { userId, entry });
  const existing = dayTimers.get(date);
  if (existing) clearTimeout(existing);
  dayTimers.set(date, setTimeout(() => {
    const item = dayPending.get(date);
    dayTimers.delete(date); dayPending.delete(date);
    if (item) pushDayEntryToCloud(item.userId, date, item.entry).catch((e) => console.error("day push failed", e));
  }, DEBOUNCE_MS));
}

const goalsTimer: { id: ReturnType<typeof setTimeout> | null; pending: Goal[] | null; userId: string | null } = {
  id: null, pending: null, userId: null,
};
export function pushGoalsToCloudDebounced(userId: string, goals: Goal[]) {
  goalsTimer.pending = goals;
  goalsTimer.userId = userId;
  if (goalsTimer.id) clearTimeout(goalsTimer.id);
  goalsTimer.id = setTimeout(() => {
    const g = goalsTimer.pending;
    const u = goalsTimer.userId;
    goalsTimer.id = null; goalsTimer.pending = null;
    if (g && u) pushGoalsToCloud(u, g).catch((e) => console.error("goals push failed", e));
  }, DEBOUNCE_MS);
}

