import { useState, useEffect, useRef } from "react";
import "../style/global.css";
import "../style/settings.css";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [avatarColor, setAvatarColor] = useState("#3b82f6");
  const colorInputRef = useRef(null);

  /* --- Initialize from localStorage --- */
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    const savedColor = localStorage.getItem("avatarColor") || "#3b82f6";

    document.documentElement.setAttribute("data-theme", savedTheme);
    setDarkMode(savedTheme === "dark");
    setAvatarColor(savedColor);
  }, []);

  /* --- Toggle theme --- */
  const handleToggleTheme = () => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  /* --- Handle color change --- */
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setAvatarColor(newColor);
    localStorage.setItem("avatarColor", newColor);
  };

  /* --- Open color picker when avatar clicked --- */
  const openColorPicker = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  };

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-header">
          <h2>Settings</h2>
        </div>
        {/* DARK MODE TOGGLE */}
        <div className="setting-row">
          <div className="setting-info">
            <h3>Dark Mode</h3>
            <p>Toggle between dark and light themes</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={handleToggleTheme}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
