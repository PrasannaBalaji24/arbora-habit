import { useEffect, useState } from "react";
import {
  flushOutbox,
  getLastSyncedAt,
  installAutoFlush,
  outboxSize,
  subscribeSyncChanges,
} from "@/lib/sync-outbox";

export type SyncState = "idle" | "syncing" | "pending" | "offline" | "error";

export function useSyncStatus() {
  const [pending, setPending] = useState(0);
  const [lastSyncedAt, setLastSynced] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setPending(await outboxSize());
    setLastSynced(await getLastSyncedAt());
  }

  useEffect(() => {
    installAutoFlush();
    refresh();
    const unsub = subscribeSyncChanges(() => refresh());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Listen for SW asking us to flush
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "flush-outbox") flushNow();
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);

    // Try registering periodic sync (Chrome only, requires installed PWA)
    (async () => {
      try {
        const reg = await navigator.serviceWorker?.ready;
        // @ts-expect-error periodicSync not typed
        if (reg?.periodicSync) {
          const status = await (navigator as any).permissions?.query({ name: "periodic-background-sync" });
          if (status?.state === "granted") {
            // @ts-expect-error periodicSync not typed
            await reg.periodicSync.register("arbora-outbox-periodic", { minInterval: 15 * 60 * 1000 });
          }
        }
      } catch (_) {}
    })();

    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker?.removeEventListener("message", onMsg);
    };
  }, []);

  async function flushNow() {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await flushOutbox();
      if (res.error) setError(res.error);
    } finally {
      setSyncing(false);
      refresh();
    }
  }

  const state: SyncState = !online
    ? "offline"
    : syncing
    ? "syncing"
    : error
    ? "error"
    : pending > 0
    ? "pending"
    : "idle";

  return { state, pending, lastSyncedAt, online, syncing, error, flushNow };
}

export function formatLastSynced(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 10_000) return "Just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
