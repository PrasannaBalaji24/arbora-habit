import { useEffect, useRef } from "react";
import { Habit, getDayLogs, getDayEntry, todayStr } from "@/lib/habits";
import { syncHabitsToServiceWorker } from "@/lib/local-reminders";

const FIRED_KEY = "habits-tracker-reminders-fired";

function getFiredToday(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
  } catch {
    return {};
  }
}

function setFired(habitId: string) {
  const fired = getFiredToday();
  fired[habitId] = todayStr();
  localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
}

/**
 * In-tab fallback that fires daily reminders while the app is open. The
 * service worker handles reminders when the tab is closed (where supported).
 */
export function useHabitReminders(habits: Habit[]) {
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    // Always push the latest habits to the SW so it can schedule background ones.
    syncHabitsToServiceWorker(habits).catch(() => {});

    // Clear previous in-tab timers
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    if (typeof window === "undefined" || !("Notification" in window)) return;

    const now = new Date();
    const today = todayStr();
    const fired = getFiredToday();

    habits.forEach((habit) => {
      if (!habit.reminderTime) return;
      const [h, m] = habit.reminderTime.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return;

      const target = new Date();
      target.setHours(h, m, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) return; // already passed today
      if (fired[habit.id] === today) return;

      const timerId = window.setTimeout(() => {
        // Skip if already completed today
        const dayLogs = getDayLogs();
        const entry = getDayEntry(dayLogs, todayStr());
        if (entry.habits?.[habit.id]?.completed) return;

        if (Notification.permission === "granted") {
          new Notification(`${habit.emoji} Time for: ${habit.name}`, {
            body: "Don't forget to log your habit today!",
            tag: `habit-${habit.id}`,
          });
          setFired(habit.id);
        }
      }, diff);

      timersRef.current.push(timerId);
    });

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, [habits]);
}
