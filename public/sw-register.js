/**
 * Service Worker Registration
 * Loaded as a <script> in layout.tsx via next/script (strategy="afterInteractive").
 * Registers /sw.js and logs lifecycle events.
 */

(function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(function (registration) {
        console.log("[PWA] Service worker registered:", registration.scope);

        // Notify user when a new SW is waiting to take over
        registration.addEventListener("updatefound", function () {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", function () {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[PWA] New service worker installed. Refresh to update.");
              // Optionally dispatch a custom event for the UI to handle
              window.dispatchEvent(new CustomEvent("swUpdateAvailable"));
            }
          });
        });
      })
      .catch(function (error) {
        console.error("[PWA] Service worker registration failed:", error);
      });
  });
})();
