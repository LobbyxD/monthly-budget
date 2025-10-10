// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./layout/Layout";
import MainMenu from "./pages/MainMenu";
import UserDashboard from "./pages/UserDashboard";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import "./style/global.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { JSX } from "react";

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
                  <MainMenu />
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

            {/* Fallback for undefined routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
