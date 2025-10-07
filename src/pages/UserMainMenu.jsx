import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../style/global.css";
import "../style/usermainmenu.css";

export default function UserMainMenu() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const username = location.state?.username || "User";

  const buttons = [
    { label: "Current Month", path: `/user/${id}/dashboard` },
    { label: "Last Month", path: `/user/${id}/last-month` },
    { label: "Archive", path: `/user/${id}/archive` },
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
