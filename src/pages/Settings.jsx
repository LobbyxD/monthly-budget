import { useState } from "react";
import "../style/global.css";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <h2>Settings</h2>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h3>Dark Mode</h3>
            <p>Toggle dark mode theme (currently does nothing)</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
