// src/layout/Layout.tsx
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect, JSX } from "react";
import { supabase } from "../lib/supabaseClient";
import "../style/layout.css";
import { ChevronDown, ChevronUp } from "lucide-react";

interface UserProfile {
  firstName: string | null;
  lastName: string | null;
}

export default function Layout(): JSX.Element {
  const { user, signOut, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ✅ Fetch user's first name once user + session exist
  useEffect(() => {
    if (!user?.id) return; // wait until user is fully ready

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const { data, error } = await supabase
          .from("users")
          .select("firstName, lastName")
          .eq("auth_id", String(user.id)) // ensure type-safe UUID string
          .maybeSingle();

        if (error) {
          console.error("[Layout] Failed to load user profile:", error.message);
        } else if (data) {
          setProfile(data);
        } else {
          console.warn("[Layout] No profile found for user:", user.id);
        }
      } catch (err) {
        console.error("[Layout] Unexpected error:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    // ⏱️ small delay ensures it runs after session hydration
    const timeout = setTimeout(loadProfile, 150);
    return () => clearTimeout(timeout);
  }, [user?.id, session]); // depend on session too

  // ✅ Logout handler
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("[Layout] Logout error:", err);
    }
  };

  // ✅ Display logic
  const displayName = loadingProfile
    ? "Loading..."
    : profile?.firstName?.trim()
    ? profile.firstName
    : "User";

  return (
    <div className="layout">
      {/* Navbar */}
      <header className="app-header">
        <div className="header-inner">
          <div className="app-title">
            <Link to="/" className="brand-link">
              <img
                src="/assets/logo.png"
                alt="BudgetMe Logo"
                className="brand-logo"
              />
              <span className="brand-text">BudgetMe</span>
            </Link>
          </div>

          <div className="user-menu" ref={menuRef}>
            <button className="user-menu-toggle" onClick={() => setOpen(!open)}>
              <span className="user-name">{displayName}</span>
              {open ? (
                <ChevronUp
                  size={18}
                  strokeWidth={2.2}
                  className="chevron-icon"
                />
              ) : (
                <ChevronDown
                  size={18}
                  strokeWidth={2.2}
                  className="chevron-icon"
                />
              )}
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

      {/* Page content */}
      <main key={location.pathname} className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
