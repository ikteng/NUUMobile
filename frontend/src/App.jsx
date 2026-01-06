import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import FileUpload from "./pages/FileUpload";
import Dashboard from "./pages/Dashboard";
import Predictions from "./pages/Predictions";
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<FileUpload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predictions" element={<Predictions />} />
        {/* Add other routes here as needed */}
      </Routes>
    </Router>
  );
}

export default App;
