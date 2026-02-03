import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

// Helper function to get cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  // Load user from cookie on mount
  useEffect(() => {
    loadUserFromCookie();
  }, []);

  const loadUserFromCookie = () => {
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        setUser(JSON.parse(decodeURIComponent(userCookie)));
      } catch (error) {
        console.error("Error parsing user cookie:", error);
      }
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, loadUserFromCookie }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
