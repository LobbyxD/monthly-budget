import { useNavigate } from "react-router-dom";
import "../style/global.css";

export default function UserMainMenu({ username }) {
  const navigate = useNavigate();

  const buttons = [
    { label: "Current Month", path: "/current-month" },
    { label: "Last Month", path: "/last-month" },
    { label: "Archive", path: "/archive" },
    { label: "Return", path: "/" },
  ];

  return (
    <div className="user-menu-page">
      <div className="user-menu-container">
        <h1 className="user-menu-title">
          {username ? `${username}'s Dashboard` : "User Dashboard"}
        </h1>
        <p>username:{username}</p>

        <div className="user-menu-buttons">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => navigate(btn.path)}
              className="menu-btn"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
