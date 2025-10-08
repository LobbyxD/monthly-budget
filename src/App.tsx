import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

          {/* Layout persists across all protected routes */}
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
              path="/user/:id"
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
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
