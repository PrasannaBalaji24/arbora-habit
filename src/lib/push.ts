import { supabase } from "@/integrations/supabase/client";
import type { Habit } from "@/lib/habits";

const VAPID_PUBLIC_KEY = "BJELnPaT2mJ3LPCx1CJoBdNPByi2lmj27g0qbOQcAtWcYbglbe4M4oL0XNLl8BdRqvVvkbV0-N4jxxWpjBx-3SQ";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.error("SW register failed", e);
    return null;
  }
}

export async function enablePushReminders(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Push notifications aren't supported on this device/browser." };

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { ok: false, reason: "You need to sign in first." };

  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "Could not register the service worker." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Notification permission denied." };

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json: any = subscription.toJSON();
  const userId = sessionData.session.user.id;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh || arrayBufferToBase64(subscription.getKey("p256dh")),
      auth_key: json.keys?.auth || arrayBufferToBase64(subscription.getKey("auth")),
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, reason: error.message };

  // Capture user's timezone in profile
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) await supabase.from("profiles").update({ timezone: tz }).eq("user_id", userId);
  } catch (_) {}

  return { ok: true };
}

export async function disablePushReminders(): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

/**
 * Sync local habits with reminder times to the cloud so the cron edge function
 * can deliver reminders even when the app is closed.
 * We only push habits with a reminder_time set.
 */
export async function syncRemindersToCloud(habits: Habit[]): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  const withReminders = habits.filter((h) => h.reminderTime);

  // Replace this user's stored habits with the current local set (simple sync).
  // Delete cloud habits not present locally:
  const { data: existing } = await supabase.from("habits").select("id").eq("user_id", userId);
  const localIds = new Set(withReminders.map((h) => h.id));
  const toDelete = (existing || []).filter((row: any) => !localIds.has(row.id)).map((row: any) => row.id);
  if (toDelete.length) await supabase.from("habits").delete().in("id", toDelete);

  if (!withReminders.length) return;

  await supabase.from("habits").upsert(
    withReminders.map((h) => ({
      id: h.id,
      user_id: userId,
      name: h.name,
      emoji: h.emoji || "🌱",
      category: h.category || null,
      reminder_time: h.reminderTime,
      goal_minutes: h.goalMinutes ?? null,
    })),
    { onConflict: "id" },
  );
}
