import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style/global.css";

import { applyIOSViewportFix } from "./utils/fixIOSViewport";
applyIOSViewportFix(); // ✅ ensure true viewport height on iOS

// ✅ Apply saved theme before the app renders
const savedTheme =
  (localStorage.getItem("theme") as "light" | "dark") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

// ✅ Ensure root element exists and is typed
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element with id 'root' not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
