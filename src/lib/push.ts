// Web Push subscription helpers. Stores the browser's push subscription in
// `push_subscriptions` so the `send-habit-reminders` edge function can
// deliver notifications even when the app is closed.
import { supabase } from "@/integrations/supabase/client";
import { getActiveRegistration, remindersSupported } from "@/lib/local-reminders";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

let cachedKey: string | null = null;
async function getPublicKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  try {
    const { data, error } = await supabase.functions.invoke("vapid-public-key", { method: "GET" });
    if (error) throw error;
    cachedKey = (data as any)?.publicKey || null;
    return cachedKey;
  } catch (e) {
    console.warn("vapid-public-key fetch failed", e);
    return null;
  }
}

export function pushSupported(): boolean {
  return remindersSupported() && "PushManager" in window;
}

/** Create (or reuse) a browser push subscription and store it in Supabase. */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Push not supported on this device." };
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) return { ok: false, reason: "Sign in to receive reminders when the app is closed." };

  const reg = await getActiveRegistration();
  if (!reg) return { ok: false, reason: "Service worker isn't ready yet." };

  const publicKey = await getPublicKey();
  if (!publicKey) return { ok: false, reason: "Push server not configured." };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (e: any) {
      return { ok: false, reason: e?.message || "Failed to subscribe to push." };
    }
  }

  const json: any = sub.toJSON();
  const endpoint = json.endpoint || sub.endpoint;
  const p256dh = json.keys?.p256dh || bufToBase64(sub.getKey("p256dh"));
  const auth = json.keys?.auth || bufToBase64(sub.getKey("auth"));

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth_key: auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    console.warn("push_subscriptions upsert failed", error);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

/** Remove subscription locally and from Supabase. */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const reg = await getActiveRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch {}
      try {
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      } catch {}
    }
  } catch {
    // ignore
  }
}
