import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import MyCourses from "./pages/MyCourses";
import Navbar from "./components/Navbar";

function Home() {
  const { user } = useAuth();

  if (user && localStorage.getItem("token")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand fw-bold">E-Learning</span>

          <div className="d-flex gap-2">
            <a href="/login" className="btn btn-outline-light">
              Kyçu
            </a>

            <a href="/register" className="btn btn-light text-primary">
              Regjistrohu
            </a>
          </div>
        </div>
      </nav>

      <main className="container py-5">
        <div className="row align-items-center min-vh-50">
          <div className="col-lg-8">
            <h1 className="display-4 fw-bold">Mëso online, në kohën tënde.</h1>

            <p className="lead text-secondary mt-3">
              Qasje në kurse, mësime, detyra dhe kuize përmes një platforme të
              vetme.
            </p>

            <a href="/register" className="btn btn-primary btn-lg mt-3">
              Fillo tani
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/courses" element={<Courses />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses/:courseId" element={<CourseDetails />} />
        <Route path="/my-courses" element={<MyCourses />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
