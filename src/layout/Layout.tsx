// src/layout/Layout.tsx
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect, JSX } from "react";
import { supabase } from "../lib/supabaseClient";
import "../style/layout.css";

interface DBUserProfile {
  id: number;
  firstName: string;
  lastName?: string | null;
}

export default function Layout(): JSX.Element {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<DBUserProfile | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  /* -----------------------------
     Load user profile from Supabase
  ------------------------------*/
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, firstName, lastName")
        .eq("id", user.id)
        .single();

      if (error) console.error("Failed to load user profile:", error);
      else setProfile(data as DBUserProfile);
    };

    loadProfile();
  }, [user]);

  /* -----------------------------
     Close dropdown on outside click
  ------------------------------*/
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  /* -----------------------------
     Render
  ------------------------------*/
  return (
    <div className="layout">
      <header className="app-header">
        <div className="header-inner">
          <div className="app-title">
            <Link to="/">BudgetMe</Link>
          </div>

          <div className="user-menu" ref={menuRef}>
            <button
              className="user-menu-toggle"
              onClick={() => setOpen((prev) => !prev)}
            >
              {profile?.firstName || "User"}
              <span className="arrow">{open ? "▲" : "▼"}</span>
            </button>

            {open && (
              <div className="user-dropdown">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings");
                  }}
                >
                  Settings
                </button>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main key={location.pathname} className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
