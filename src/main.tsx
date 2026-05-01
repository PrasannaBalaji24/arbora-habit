import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installAutoFlush } from "@/lib/sync-outbox";

// Register service worker (for push + background sync) outside any iframe/preview.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW register failed", e));
  });
}

installAutoFlush();

createRoot(document.getElementById("root")!).render(<App />);
