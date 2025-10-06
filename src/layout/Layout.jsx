import { Link, Outlet } from "react-router-dom";
import "../style/global.css";

export default function Layout() {
  return (
    <div className="layout">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <Link to="/">🏠 Household Budget</Link>
          </h1>
          <nav className="nav-links">
            <Link to="/">Users</Link>
            <Link to="/settings">Settings</Link>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
