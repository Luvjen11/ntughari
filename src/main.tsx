import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// After a new deploy, a tab opened earlier asks for page files that no longer exist.
// Reload once to pick up the new build; the timestamp stops a reload loop.
window.addEventListener("vite:preloadError", (event) => {
  const key = "ntughari:chunk-reload";
  try {
    const last = Number(sessionStorage.getItem(key));
    if (last && Date.now() - last < 10_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // storage blocked: reload anyway
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
