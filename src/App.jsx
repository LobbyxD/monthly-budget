import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import MainMenu from "./pages/MainMenu";
import UserDashboard from "./pages/UserDashboard";
import Settings from "./pages/Settings";
import Login from "./pages/Login"; // ✅ Add this line
import "./style/global.css";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/home"
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
  );
}
