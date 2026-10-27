import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          E-Learning
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Hap navigimin"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <div className="navbar-nav me-auto">
            <NavLink className="nav-link" to="/courses">
              Kurset
            </NavLink>

            {user?.role === "Student" && (
              <NavLink className="nav-link" to="/my-courses">
                Kurset e mia
              </NavLink>
            )}

            {user && (
              <NavLink className="nav-link" to="/dashboard">
                Dashboard
              </NavLink>
            )}
          </div>

          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">
            {user ? (
              <>
                <span className="text-white">
                  {user.firstName || user.email}
                </span>

                <button
                  className="btn btn-outline-light"
                  onClick={handleLogout}
                >
                  Dil
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-outline-light" to="/login">
                  Kyçu
                </Link>

                <Link className="btn btn-light text-primary" to="/register">
                  Regjistrohu
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
