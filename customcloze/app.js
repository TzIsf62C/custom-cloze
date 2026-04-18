// app.js — Entry point. Starts the app and handles screen switching.

import { initActivity } from "./activity.js";
import { initManage }   from "./manage.js";

// ---------------------------------------------------------------------------
// Screen switching
// ---------------------------------------------------------------------------

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

// Nav buttons
document.getElementById("nav-practice").addEventListener("click", () => showScreen("screen-activity"));
document.getElementById("nav-manage").addEventListener("click",   () => showScreen("screen-manage"));

// Allow other modules to trigger a screen switch via custom event
window.addEventListener("show-screen", (e) => showScreen(e.detail));

// ---------------------------------------------------------------------------
// Initialise modules
// ---------------------------------------------------------------------------

await initActivity();
await initManage();
