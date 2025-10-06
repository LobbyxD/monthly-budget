import { useState, useEffect } from "react";
import "../style/global.css";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const current = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", current);
    setDarkMode(current === "dark");
  }, []);

  const handleToggle = () => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <h2>Settings</h2>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h3>Dark Mode</h3>
            <p>Toggle between dark and light themes</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={darkMode} onChange={handleToggle} />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
