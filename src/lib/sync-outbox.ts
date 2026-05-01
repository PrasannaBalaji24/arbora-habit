// IndexedDB-backed outbox for offline / background sync.
// Each item is a Supabase REST request (table upsert/delete) replayable by the
// service worker (Background Sync) or the page (online/visibility).
import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "arbora-sync";
const DB_VERSION = 1;
const STORE = "outbox";
const META_STORE = "meta";

export type OutboxOp = {
  id: string;
  createdAt: number;
  table: "habits" | "habit_logs" | "day_entries";
  method: "POST" | "DELETE";
  // For POST/upsert
  body?: any;
  onConflict?: string;
  // For DELETE
  filter?: string; // e.g. "id=in.(a,b,c)" or "endpoint=eq.https://..."
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    t.oncomplete = () => resolve(req && "result" in req ? (req.result as T) : undefined);
    t.onerror = () => reject(t.error);
  });
}

export async function enqueue(op: Omit<OutboxOp, "id" | "createdAt">) {
  const full: OutboxOp = { ...op, id: crypto.randomUUID(), createdAt: Date.now() };
  await tx(STORE, "readwrite", (s) => s.put(full));
  notifyChange();
  // Try to register Background Sync (best-effort)
  try {
    const reg = await navigator.serviceWorker?.ready;
    // @ts-expect-error sync is not in lib.dom yet
    if (reg && "sync" in reg) await reg.sync.register("arbora-outbox");
  } catch (_) {}
  return full;
}

export async function listOutbox(): Promise<OutboxOp[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const s = t.objectStore(STORE);
    const req = s.getAll();
    req.onsuccess = () => resolve((req.result as OutboxOp[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromOutbox(id: string) {
  await tx(STORE, "readwrite", (s) => s.delete(id));
  notifyChange();
}

export async function outboxSize(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve) => {
    const t = db.transaction(STORE, "readonly");
    const req = t.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}

export async function setLastSyncedAt(ts: number) {
  await tx(META_STORE, "readwrite", (s) => s.put(ts, "lastSyncedAt"));
  try {
    localStorage.setItem("arbora-last-synced", String(ts));
  } catch {}
  notifyChange();
}

export async function getLastSyncedAt(): Promise<number | null> {
  const db = await openDb();
  return new Promise((resolve) => {
    const t = db.transaction(META_STORE, "readonly");
    const req = t.objectStore(META_STORE).get("lastSyncedAt");
    req.onsuccess = () => resolve((req.result as number) ?? null);
    req.onerror = () => resolve(null);
  });
}

// ---------- Flushing ----------
let flushing = false;

export async function flushOutbox(): Promise<{ flushed: number; remaining: number; error?: string }> {
  if (flushing) return { flushed: 0, remaining: await outboxSize() };
  flushing = true;
  let flushed = 0;
  try {
    const items = await listOutbox();
    if (!items.length) {
      await setLastSyncedAt(Date.now());
      return { flushed: 0, remaining: 0 };
    }

    for (const op of items) {
      try {
        let res;
        if (op.table === "habits") {
          if (op.method === "POST" && op.body) {
            res = await supabase.from("habits").upsert(op.body, { onConflict: op.onConflict || "id" });
          } else if (op.method === "DELETE" && op.filter) {
            // filter format: ids=a,b,c
            const ids = op.filter.replace("ids=", "").split(",");
            res = await supabase.from("habits").delete().in("id", ids);
          }
        } else if (op.table === "habit_logs" && op.method === "POST" && op.body) {
          res = await supabase.from("habit_logs").upsert(op.body, { onConflict: op.onConflict || "user_id,habit_id,log_date" });
        } else if (op.table === "day_entries" && op.method === "POST" && op.body) {
          res = await supabase.from("day_entries").upsert(op.body, { onConflict: op.onConflict || "user_id,entry_date" });
        }
        if (res && (res as any).error) throw (res as any).error;
        await removeFromOutbox(op.id);
        flushed++;
      } catch (err: any) {
        // Stop flushing on first persistent error to retry later
        const remaining = await outboxSize();
        return { flushed, remaining, error: err?.message || String(err) };
      }
    }
    await setLastSyncedAt(Date.now());
    return { flushed, remaining: 0 };
  } finally {
    flushing = false;
  }
}

// ---------- Change notification ----------
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeSyncChanges(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function notifyChange() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

// ---------- Auto-flush triggers ----------
let installed = false;
export function installAutoFlush() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const tryFlush = () => {
    if (!navigator.onLine) return;
    flushOutbox().catch(() => {});
  };

  window.addEventListener("online", tryFlush);
  window.addEventListener("focus", tryFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryFlush();
  });

  // Periodic retry
  setInterval(tryFlush, 30_000);

  // Listen for SW messages indicating background flush succeeded
  navigator.serviceWorker?.addEventListener("message", (e) => {
    if (e.data?.type === "outbox-flushed") {
      setLastSyncedAt(e.data.at || Date.now());
    }
  });

  // Initial attempt
  tryFlush();
}
