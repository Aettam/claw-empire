import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";
import "./index.css";

// ── Service Worker registration ───────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // When the browser comes back online, ask the SW to replay any
        // mutations that were queued while offline.
        window.addEventListener("online", () => {
          if ("sync" in registration) {
            // Background Sync API (Chrome/Edge)
            (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
              .sync.register("replay-mutations")
              .catch(() => {});
          } else if (navigator.serviceWorker.controller) {
            // Fallback: message the SW directly
            navigator.serviceWorker.controller.postMessage({ type: "REPLAY_MUTATIONS" });
          }
        });
      })
      .catch(() => {
        // SW registration is best-effort; the app works fine without it
      });
  });
}
// ── Pause CSS animations when the tab is backgrounded (saves GPU) ────────────
document.addEventListener("visibilitychange", () => {
  document.documentElement.classList.toggle("tab-hidden", document.hidden);
});
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
