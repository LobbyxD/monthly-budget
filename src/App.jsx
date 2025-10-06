import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainMenu from "./pages/MainMenu";
import UserMainMenu from "./pages/UserMainMenu";

function App() {
  return (
    <div className="min-h-screen bg-background text-text">
      <Router>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/user/:id" element={<UserMainMenu />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
