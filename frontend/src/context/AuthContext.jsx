import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  async function login(email, password) {
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;

      const token = data.token || data.accessToken;
      const loggedInUser = data.user || data;

      if (!token) {
        throw new Error(
          "Backend-i nuk ktheu token. Kontrollo përgjigjen e login-it.",
        );
      }

      const userId =
        loggedInUser.userId ?? loggedInUser.UserID ?? loggedInUser.id;

      const role = loggedInUser.role ?? loggedInUser.Role;

      const firstName = loggedInUser.firstName ?? loggedInUser.FirstName ?? "";

      const lastName = loggedInUser.lastName ?? loggedInUser.LastName ?? "";

      const normalizedUser = {
        userId,
        firstName,
        lastName,
        email: loggedInUser.email || loggedInUser.Email || email,
        role,
      };

      if (!role) {
        throw new Error(
          "Përgjigjja e login-it nuk përmban rolin e përdoruesit.",
        );
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));

      setUser(normalizedUser);

      return normalizedUser;
    } finally {
      setLoading(false);
    }
  }

  async function register(formData) {
    setLoading(true);

    try {
      const response = await api.post("/auth/register", formData);
      return response.data;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth duhet të përdoret brenda AuthProvider.");
  }

  return context;
}
