import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import MainMenu from "./pages/MainMenu";
import UserMainMenu from "./pages/UserMainMenu";
import Settings from "./pages/Settings";
import "./style/global.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MainMenu />} />
          <Route path="/user/:id" element={<UserMainMenu />} />
+         <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
