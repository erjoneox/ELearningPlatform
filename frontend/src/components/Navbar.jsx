import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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

  function linkClass({ isActive }) {
    return `app-nav-link${isActive ? " is-active" : ""}`;
  }

  return (
    <header className="app-navbar">
      <nav className="container app-navbar-container" aria-label="Navigimi kryesor">
        <Link
          className="app-navbar-brand"
          to={user ? "/dashboard" : "/"}
          onClick={closeMenu}
        >
          <span className="app-navbar-brand-mark" aria-hidden="true">
            E
          </span>
          <span>
            <span className="app-navbar-brand-title">E-Learning</span>
            <span className="app-navbar-brand-caption">Mëso. Praktiko. Rritu.</span>
          </span>
        </Link>

        <button
          type="button"
          className={`app-navbar-toggle${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "Mbyll navigimin" : "Hap navigimin"}
          aria-expanded={menuOpen}
          aria-controls="app-navbar-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`app-navbar-menu${menuOpen ? " is-open" : ""}`}
          id="app-navbar-menu"
        >
          <div className="app-navbar-links">
            <NavLink
              className={linkClass}
              to="/courses"
              onClick={closeMenu}
            >
              Kurset
            </NavLink>
            {user?.role === "Student" && (
              <NavLink
                className={linkClass}
                to="/my-courses"
                onClick={closeMenu}
              >
                Kurset e mia
              </NavLink>
            )}
            {user && (
              <NavLink
                className={linkClass}
                to="/dashboard"
                onClick={closeMenu}
              >
                Paneli
              </NavLink>
            )}
          </div>

          <div className="app-navbar-account">
            {user ? (
              <>
                <div className="app-navbar-user" title={displayName}>
                  <span className="app-navbar-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <span className="app-navbar-user-copy">
                    <span className="app-navbar-user-name">{displayName}</span>
                    <span className="app-navbar-user-role">{user.role}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="app-navbar-logout"
                  onClick={handleLogout}
                >
                  Dil
                </button>
              </>
            ) : (
              <>
                <Link
                  className="app-navbar-login"
                  to="/login"
                  onClick={closeMenu}
                >
                  Kyçu
                </Link>
                <Link
                  className="app-navbar-register"
                  to="/register"
                  onClick={closeMenu}
                >
                  Regjistrohu
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
