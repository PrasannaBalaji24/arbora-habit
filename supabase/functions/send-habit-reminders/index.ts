// Sends due habit reminders. Triggered by pg_cron every minute.
// Looks at every habit with a reminder_time, computes the user's local time,
// and pushes a notification when the current local minute matches.

import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import webpush from "npm:web-push@3.6.7";

// This function is intended to be called by pg_cron only.
// It is NOT browser-facing, so we do not advertise permissive CORS.
const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const rawSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:reminders@arbora.app";
// VAPID subject MUST be an https: or mailto: URL
const VAPID_SUBJECT = /^(https:|mailto:)/.test(rawSubject)
  ? rawSubject
  : "mailto:reminders@arbora.app";
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  SERVICE_ROLE_KEY,
);

let cachedVaultCronSecret: string | null = null;
let cachedVaultCronSecretAt = 0;

async function getVaultCronSecret(): Promise<string | null> {
  // Cache for 60s to avoid hitting vault every minute
  if (cachedVaultCronSecret && Date.now() - cachedVaultCronSecretAt < 60_000) {
    return cachedVaultCronSecret;
  }
  try {
    const { data, error } = await supabase.rpc("get_cron_secret");
    if (error) {
      console.error("vault rpc error", error);
      return null;
    }
    cachedVaultCronSecret = (data as string) ?? null;
    cachedVaultCronSecretAt = Date.now();
    return cachedVaultCronSecret;
  } catch (e) {
    console.error("vault rpc throw", e);
    return null;
  }
}

async function isAuthorized(req: Request): Promise<boolean> {
  const headerSecret = req.headers.get("x-cron-secret");
  const vaultSecret = await getVaultCronSecret();

  if (headerSecret) {
    if (CRON_SECRET && headerSecret === CRON_SECRET) return true;
    if (vaultSecret && headerSecret === vaultSecret) return true;
  }

  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (CRON_SECRET && token === CRON_SECRET) return true;
    if (vaultSecret && token === vaultSecret) return true;
  }
  return false;
}

function localHHMM(timezone: string, now = new Date()): { hhmm: string; date: string } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    hhmm: `${parts.hour}:${parts.minute}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Pull all habits that have a reminder_time set
    const { data: habits, error: hErr } = await supabase
      .from("habits")
      .select("id, user_id, name, emoji, reminder_time")
      .not("reminder_time", "is", null);
    if (hErr) throw hErr;
    if (!habits?.length) {
      return new Response(JSON.stringify({ checked: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache profile timezones
    const userIds = [...new Set(habits.map((h) => h.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, timezone")
      .in("user_id", userIds);
    const tzMap = new Map(profiles?.map((p) => [p.user_id, p.timezone || "UTC"]));

    let sent = 0;
    const now = new Date();

    for (const habit of habits) {
      const tz = tzMap.get(habit.user_id) || "UTC";
      const { hhmm, date } = localHHMM(tz, now);
      if (hhmm !== habit.reminder_time) continue;

      // Already sent today?
      const { data: already } = await supabase
        .from("reminder_sends")
        .select("id")
        .eq("habit_id", habit.id)
        .eq("send_date", date)
        .maybeSingle();
      if (already) continue;

      // Get this user's subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth_key")
        .eq("user_id", habit.user_id);
      if (!subs?.length) continue;

      const payload = JSON.stringify({
        title: `${habit.emoji || "🌱"} Time for: ${habit.name}`,
        body: "Don't forget to log your habit today.",
        url: "/",
        tag: `habit-${habit.id}`,
      });

      let ok = 0;
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            payload,
          );
          ok++;
        } catch (err: any) {
          // 410/404: subscription expired; clean it up
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          } else {
            console.error("push fail", err?.statusCode, err?.body);
          }
        }
      }

      if (ok > 0) {
        await supabase.from("reminder_sends").insert({
          user_id: habit.user_id,
          habit_id: habit.id,
          send_date: date,
        });
        sent++;
      }
    }

    return new Response(JSON.stringify({ checked: habits.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-habit-reminders error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
