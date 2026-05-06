// Browser-only habit reminders via the Notifications API + service worker.
// No backend, no Supabase push subscription. Keeps a slim copy of the habits
// in the SW's IndexedDB and fires notifications when each habit's daily
// reminder time comes due (works while SW is alive; longer-range wake-ups
// come from Periodic Background Sync where supported).

import type { Habit } from "@/lib/habits";

const ENABLED_KEY = "arbora-local-reminders-enabled";

export function remindersSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "Notification" in window;
}

export function isInPreviewOrIframe(): boolean {
  try {
    const inIframe = window.self !== window.top;
    const previewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");
    return inIframe || previewHost;
  } catch {
    return true;
  }
}

export async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!remindersSupported()) return null;
  try {
    const ready = await navigator.serviceWorker.ready;
    return ready ?? (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    try {
      return (await navigator.serviceWorker.getRegistration()) ?? null;
    } catch {
      return null;
    }
  }
}

export function isRemindersEnabled(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      localStorage.getItem(ENABLED_KEY) === "1" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    );
  } catch {
    return false;
  }
}

export async function enableReminders(): Promise<{ ok: boolean; reason?: string }> {
  if (!remindersSupported()) {
    return { ok: false, reason: "Notifications aren't supported on this device/browser." };
  }
  if (isInPreviewOrIframe()) {
    return {
      ok: false,
      reason: "Open the published app on your device (or install it) to enable reminders.",
    };
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "Notification permission denied." };
    }
    const reg = await getActiveRegistration();
    if (!reg) {
      return { ok: false, reason: "Service worker isn't ready yet. Try again in a moment." };
    }

    // Best-effort: ask for periodic background sync (Chromium PWAs only).
    try {
      const anyNav = navigator as any;
      if (anyNav?.permissions?.query) {
        const status = await anyNav.permissions
          .query({ name: "periodic-background-sync" })
          .catch(() => null);
        const anyReg = reg as any;
        if (status?.state === "granted" && anyReg?.periodicSync?.register) {
          await anyReg.periodicSync.register("arbora-reminders-periodic", {
            minInterval: 15 * 60 * 1000,
          });
        }
      }
    } catch {
      // ignore — periodic sync is optional
    }

    localStorage.setItem(ENABLED_KEY, "1");
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error)?.message || "Could not enable reminders." };
  }
}

export async function disableReminders(): Promise<void> {
  try {
    localStorage.removeItem(ENABLED_KEY);
    const reg = await getActiveRegistration();
    const anyReg = reg as any;
    if (anyReg?.periodicSync?.unregister) {
      try { await anyReg.periodicSync.unregister("arbora-reminders-periodic"); } catch {}
    }
    // Clear the SW's stored habit list so it stops scheduling.
    reg?.active?.postMessage({ type: "set-habits", habits: [] });
  } catch {
    // ignore
  }
}

export async function syncHabitsToServiceWorker(habits: Habit[]): Promise<void> {
  if (!remindersSupported()) return;
  try {
    const reg = await getActiveRegistration();
    const target = reg?.active || reg?.waiting || reg?.installing;
    if (!target) return;
    target.postMessage({
      type: "set-habits",
      habits: habits.map((h) => ({
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        reminderTime: h.reminderTime || null,
      })),
    });
  } catch {
    // ignore
  }
}

export async function notifyHabitCompleted(habitId: string): Promise<void> {
  if (!remindersSupported()) return;
  try {
    const reg = await getActiveRegistration();
    reg?.active?.postMessage({ type: "mark-completed", habitId });
  } catch {
    // ignore
  }
}

export async function sendTestNotification(): Promise<void> {
  const reg = await getActiveRegistration();
  reg?.active?.postMessage({ type: "test-notification" });
}
