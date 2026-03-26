import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Guard: desregistrar service workers no preview/iframe do Lovable
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

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
} else {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(<App />);
