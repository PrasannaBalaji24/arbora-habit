// Arbora service worker — local habit reminders via the Notifications API.
// No backend / push server required. The page sends the current habit list to
// the SW; the SW persists it in IndexedDB and surfaces a notification when a
// habit's daily reminder time arrives, using:
//   - in-memory timeouts while the SW is alive
//   - a "due check" on every relevant event (message, sync, periodicsync,
//     notificationclick) so wake-ups fire any reminders that came due
//     while the SW was suspended
//   - Periodic Background Sync (Chromium installed PWAs) for ~15 min wake-ups

const DB_NAME = 'arbora-reminders';
const DB_VERSION = 1;
const STORE_HABITS = 'habits';
const STORE_FIRED = 'fired'; // habitId -> 'YYYY-MM-DD'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_HABITS)) db.createObjectStore(STORE_HABITS);
      if (!db.objectStoreNames.contains(STORE_FIRED)) db.createObjectStore(STORE_FIRED);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(store, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store, value, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

function todayStr() {
  // Local-day string YYYY-MM-DD
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const aliveTimers = new Map(); // habitId -> setTimeout id (only while SW is alive)

function clearAliveTimers() {
  for (const id of aliveTimers.values()) clearTimeout(id);
  aliveTimers.clear();
}

async function showHabitNotification(habit) {
  await self.registration.showNotification(
    `${habit.emoji || '🌱'} Time for: ${habit.name || 'your habit'}`,
    {
      body: "Don't forget to log your habit today!",
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `habit-${habit.id}`,
      data: { url: '/', habitId: habit.id },
      vibrate: [120, 60, 120],
      requireInteraction: false,
    },
  );
  await idbPut(STORE_FIRED, todayStr(), habit.id);
}

async function processDueAndSchedule() {
  if (!('Notification' in self) || self.Notification.permission !== 'granted') return;

  clearAliveTimers();

  const habits = (await idbGet(STORE_HABITS, 'list')) || [];
  if (!habits.length) return;

  const now = new Date();
  const today = todayStr();
  const FIVE_MIN_MS = 5 * 60 * 1000;

  for (const habit of habits) {
    if (!habit?.reminderTime) continue;
    const [h, m] = String(habit.reminderTime).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) continue;

    const target = new Date();
    target.setHours(h, m, 0, 0);
    const diff = target.getTime() - now.getTime();

    const firedOn = await idbGet(STORE_FIRED, habit.id);
    if (firedOn === today) continue;

    if (diff <= 0) {
      // Reminder time has already passed today. If it was very recent
      // (within ~10 min) fire now so a deferred wake-up still notifies.
      if (Math.abs(diff) <= 10 * 60 * 1000) {
        try { await showHabitNotification(habit); } catch (_) {}
      }
      continue;
    }

    // If the reminder is within ~5 minutes, schedule a precise timeout.
    if (diff <= FIVE_MIN_MS) {
      const id = setTimeout(() => {
        showHabitNotification(habit).catch(() => {});
      }, diff);
      aliveTimers.set(habit.id, id);
    }
    // Anything farther out will be handled by the next wake-up event.
  }
}

// ---------- Lifecycle ----------
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await processDueAndSchedule();
  })());
});

// ---------- Page <-> SW messaging ----------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'set-habits' && Array.isArray(data.habits)) {
    event.waitUntil((async () => {
      const slim = data.habits.map((h) => ({
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        reminderTime: h.reminderTime || null,
      }));
      await idbPut(STORE_HABITS, slim, 'list');
      await processDueAndSchedule();
    })());
  } else if (data.type === 'mark-completed' && data.habitId) {
    // The page tells us a habit was logged — record it so we don't notify again today.
    event.waitUntil(idbPut(STORE_FIRED, todayStr(), data.habitId));
  } else if (data.type === 'check-due') {
    event.waitUntil(processDueAndSchedule());
  } else if (data.type === 'test-notification') {
    event.waitUntil(self.registration.showNotification('Arbora reminders are working ✨', {
      body: 'You will see a notification at each habit\'s reminder time.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'arbora-test',
    }));
  }
});

// Background-sync style wake-ups (when supported).
self.addEventListener('sync', (event) => {
  if (event.tag === 'arbora-reminders') {
    event.waitUntil(processDueAndSchedule());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'arbora-reminders-periodic') {
    event.waitUntil(processDueAndSchedule());
  }
});

// Push events aren't used (no server) but keep the handler for future use.
self.addEventListener('push', (event) => {
  let data = { title: 'Arbora reminder', body: 'Time to check in on your habit.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_e) {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'arbora-reminder',
    data: { url: data.url || '/' },
    vibrate: [120, 60, 120],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) return w.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
