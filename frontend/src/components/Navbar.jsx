import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/", { replace: true });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Llogaria";

  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="navbar-responsive bg-white border-bottom sticky-top py-3 px-4 shadow-sm">
      <div className="container-fluid d-flex align-items-center justify-content-between">
        <Link
          className="d-flex align-items-center gap-2 text-decoration-none me-4"
          to="/"
          onClick={closeMenu}
          aria-label="EduFlow - Faqja kryesore"
        >
          <span className="d-inline-flex align-items-center justify-content-center rounded-3 px-2">
            <img
              src="/full-logo.png"
              alt="EduFlow"
              style={{
                display: "block",
                width: "96px",
                height: "42px",
                filter: `
        drop-shadow(1px 0px 0px #000000) 
        drop-shadow(-1px 0px 0px #000000) 
        drop-shadow(0px 1px 0px #000000) 
        drop-shadow(0px -1px 0px #000000)
        drop-shadow(1px 1px 0px #000000) 
        drop-shadow(-1px -1px 0px #000000)
        drop-shadow(1px -1px 0px #000000) 
        drop-shadow(-1px 1px 0px #000000)
      `,
              }}
            />
          </span>
        </Link>

        <button
          type="button"
          className="navbar-toggler navbar-responsive-toggle d-lg-none border-0 bg-transparent"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Hap menynë"
          aria-expanded={menuOpen}
          aria-controls="navbarContent"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div
          className={`collapse navbar-collapse navbar-responsive-menu d-lg-flex justify-content-between align-items-center ${menuOpen ? "show" : ""}`}
          id="navbarContent"
        >
          <nav className="d-flex flex-column flex-lg-row align-items-lg-center gap-4 my-2 my-lg-0 ms-lg-3">
            <NavLink
              to="/dashboard"
              onClick={closeMenu}
              className={({ isActive }) =>
                `text-decoration-none fw-semibold pb-1 position-relative ${
                  isActive ? "text-primary" : "text-muted"
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? "#5640EE !important" : "#6c757d",
                borderBottom: isActive
                  ? "2px solid #5640EE"
                  : "2px solid transparent",
              })}
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/courses"
              onClick={closeMenu}
              className={({ isActive }) =>
                `text-decoration-none fw-semibold pb-1 position-relative ${
                  isActive ? "text-primary" : "text-muted"
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? "#5640EE !important" : "#6c757d",
                borderBottom: isActive
                  ? "2px solid #5640EE"
                  : "2px solid transparent",
              })}
            >
              Kurset
            </NavLink>

            {user?.role === "Admin" && (
              <>
                <NavLink
                  to="/admin/users"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `text-decoration-none fw-semibold pb-1 position-relative ${
                      isActive ? "text-primary" : "text-muted"
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? "#5640EE !important" : "#6c757d",
                    borderBottom: isActive
                      ? "2px solid #5640EE"
                      : "2px solid transparent",
                  })}
                >
                  Përdoruesit
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `text-decoration-none fw-semibold pb-1 position-relative ${
                      isActive ? "text-primary" : "text-muted"
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? "#5640EE !important" : "#6c757d",
                    borderBottom: isActive
                      ? "2px solid #5640EE"
                      : "2px solid transparent",
                  })}
                >
                  Krijo përdorues
                </NavLink>
              </>
            )}

            {user?.role === "Student" && (
              <>
                <NavLink
                  to="/my-courses"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `text-decoration-none fw-semibold pb-1 position-relative ${
                      isActive ? "text-primary" : "text-muted"
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? "#5640EE !important" : "#6c757d",
                    borderBottom: isActive
                      ? "2px solid #5640EE"
                      : "2px solid transparent",
                  })}
                >
                  My Courses
                </NavLink>
              </>
            )}
          </nav>

          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">
            <div
              className="navbar-responsive-search position-relative"
              style={{ width: "240px" }}
            ></div>

            {user ? (
              <>
                <div className="navbar-responsive-user d-flex align-items-center gap-2">
                  <div className="text-end d-none d-sm-block">
                    <span
                      className="d-block fw-bold text-dark"
                      style={{ fontSize: "0.85rem", lineHeight: "1.2" }}
                    >
                      {displayName}
                    </span>
                    <span
                      className="d-block text-muted"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {user.role || "Student"}
                    </span>
                  </div>

                  {/* Avatari */}
                  <div
                    className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold overflow-hidden shadow-sm"
                    style={{
                      backgroundColor: "#5640EE",
                      width: "38px",
                      height: "38px",
                      fontSize: "0.85rem",
                    }}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={displayName}
                        className="w-100 h-100 object-fit-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div
                    className="navbar-responsive-divider vr text-muted opacity-25"
                    style={{ height: "38px", width: "1px" }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm rounded-pill px-3"
                  onClick={handleLogout}
                  style={{ fontSize: "0.8rem" }}
                >
                  Dil
                </button>
              </>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link
                  to="/login"
                  className="btn btn-outline-primary btn-sm px-3 rounded-pill"
                  style={{ borderColor: "#5640EE", color: "#5640EE" }}
                >
                  Kyçu
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
