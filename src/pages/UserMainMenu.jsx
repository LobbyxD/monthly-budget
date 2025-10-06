import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../style/global.css";

export default function UserMainMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // ✅ username comes from navigation state
  const username = location.state?.username || "User";

  const buttons = [
    { label: "Current Month", path: `/user/${id}/current-month` },
    { label: "Last Month", path: `/user/${id}/last-month` },
    { label: "Archive", path: `/user/${id}/archive` },
    { label: "Return", path: "/" },
  ];

  return (
    <div className="user-menu-page">
      <div className="user-menu-container">
        <h1 className="user-menu-title">
          {`${username}'s Dashboard`}
        </h1>
        <p className="user-id">User ID: {id}</p>

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
