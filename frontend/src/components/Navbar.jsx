import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
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
    <header className="bg-white border-bottom sticky-top py-3 px-4 shadow-sm">
      <div className="container-fluid d-flex align-items-center justify-content-between">
        <Link
          className="d-flex align-items-center gap-2 text-decoration-none me-4"
          to={user ? "/dashboard" : "/"}
          onClick={closeMenu}
        >
          <div
            className="rounded-3 p-2 text-white d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: "#5640EE",
              width: "36px",
              height: "36px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <span className="fs-4 fw-bold" style={{ color: "#1e1e2f" }}>
            EduFlow
          </span>
        </Link>

        <button
          type="button"
          className="navbar-toggler d-lg-none border-0 bg-transparent"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Hap menynë"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div
          className={`collapse navbar-collapse d-lg-flex justify-content-between align-items-center ${menuOpen ? "show" : ""}`}
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
              className="position-relative d-none d-md-block"
              style={{ width: "240px" }}
            >
              <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                className="form-control form-control-sm bg-light border-0 rounded-pill ps-5 py-2 text-dark"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.85rem" }}
              />
            </div>

            {user ? (
              <>
                <div
                  className="position-relative cursor-pointer p-2 text-muted"
                  title="Njoftimet"
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span
                    className="position-absolute top-2 end-2 p-1 bg-danger border border-light rounded-circle"
                    style={{
                      width: "7px",
                      height: "7px",
                      top: "8px",
                      right: "8px",
                    }}
                  />
                </div>

                <div className="vr h-25 text-muted opacity-25 mx-1" />

                <div className="d-flex align-items-center gap-2">
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
                </div>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm rounded-pill px-3 ms-2"
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
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm px-3 rounded-pill text-white"
                  style={{ backgroundColor: "#5640EE", border: "none" }}
                >
                  Regjistrohu
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
