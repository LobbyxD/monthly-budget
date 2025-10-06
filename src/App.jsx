import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainMenu from "./pages/MainMenu";
import UserPage from "./pages/UserPage";

function App() {
  return (
    <div className="min-h-screen bg-background text-text">
      <Router>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/user/:id" element={<UserPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
