// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./layout/Layout";
import UserDashboard from "./pages/UserDashboard";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import "./style/global.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { JSX } from "react";
import HouseholdUsers from "./pages/HouseholdUsers";
import HouseholdAdmin from "./pages/HouseholdAdmin";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabaseClient";

function RedirectToDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function go() {
      if (!user) return;

      // get current user's public_id from "users" table
      const { data, error } = await supabase
        .from("users")
        .select("public_id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("RedirectToDashboard failed:", error);
        return;
      }

      if (data?.public_id) {
        navigate(`/user/${data.public_id}`, { replace: true });
      }
    }

    go();
  }, [user]);

  return null; // render nothing
}

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Catch any “/#” style route and redirect it */}
          <Route path="/#" element={<Navigate to="/" replace />} />

          {/* Protected routes */}
          <Route element={<Layout />}>
            <Route
              index
              element={
                <ProtectedRoute>
                  <RedirectToDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Private dashboard by public_id */}
            <Route
              path="/user/:public_id"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/households/:public_id"
              element={
                <ProtectedRoute>
                  <HouseholdUsers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/households/:public_id/admin"
              element={
                <ProtectedRoute>
                  <HouseholdAdmin />
                </ProtectedRoute>
              }
            />

            {/* Fallback for undefined routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
