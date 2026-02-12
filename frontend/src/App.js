import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import HeaderNav from "./components/HeaderNav";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Home from "./components/Home";
import Profile from "./components/Profile";

function App() {
  return (
    <UserProvider>
      <Router>
        <HeaderNav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
