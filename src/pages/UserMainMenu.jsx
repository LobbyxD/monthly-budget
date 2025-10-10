// src/pages/UserMainMenu.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../style/global.css";
import "../style/usermainmenu.css";

export default function UserMainMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const username =
    location.state?.username || user?.user_metadata?.firstName || "User";

  const buttons = [
    { label: "Current Month", path: "/dashboard" },
    { label: "Last Month", path: "/dashboard?month=last" },
    { label: "Archive", path: "/dashboard?view=archive" },
    { label: "Settings", path: "/settings" },
    { label: "Return to Main Menu", path: "/" },
  ];

  return (
    <div className="user-menu-page">
      <div className="user-menu-container">
        <h1 className="user-menu-title">{username}'s Dashboard</h1>
        <div className="user-menu-buttons">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              className="menu-btn"
              onClick={() => navigate(btn.path, { state: { username } })}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
