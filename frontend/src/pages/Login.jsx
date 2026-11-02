import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const user = await login(email.trim(), password);

      await Swal.fire({
        icon: "success",
        title: "Kyçja u realizua",
        text: `Mirë se erdhe${user.firstName ? `, ${user.firstName}` : ""}!`,
        timer: 1500,
        showConfirmButton: false,
      });

      navigate(location.state?.from?.pathname || "/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Nuk u realizua kyçja. Provo përsëri.",
      );
    }
  }

  return (
    <div className="auth-page d-flex align-items-center justify-content-center min-vh-100 bg-light p-3">
      <div
        className="card auth-card shadow-lg border-0 rounded-4 overflow-hidden w-100"
        style={{ maxWidth: "900px" }}
      >
        <div className="row g-0">
          {/* Left Hero Side (Purple Background) */}
          <div
            className="col-lg-5 text-white p-4 p-md-5 d-flex flex-column justify-content-between position-relative"
            style={{ backgroundColor: "#5640EE" }}
          >
            <div>
              {/* Brand Header */}
              <div className="d-flex align-items-center gap-2 mb-4">
                <svg
                  width="28"
                  height="28"
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
                <span className="fs-4 fw-bold">EduFlow</span>
              </div>

              {/* Main Headline */}
              <h2
                className="fw-bold mb-3 display-6"
                style={{ fontSize: "1.75rem" }}
              >
                Mirë se u ktheve në udhëtimin tënd!
              </h2>
              <p className="opacity-75 small">
                Qasuni në kurset, materialet, videot dhe kuizet tuaja në një
                vend të vetëm.
              </p>
            </div>

            {/* Bottom Quote Box */}
            <div
              className="quote-box p-3 rounded-3 mt-4"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(5px)",
              }}
            >
              <p
                className="fst-italic mb-2 fs-7"
                style={{ fontSize: "0.85rem" }}
              >
                "Arsimi është arma më e fuqishme që mund të përdorni për të
                ndryshuar botën."
              </p>
              <small className="fw-bold d-block">— Nelson Mandela</small>
            </div>
          </div>

          {/* Right Form Side */}
          <div className="col-lg-7 bg-white p-4 p-md-5 d-flex flex-column justify-content-center">
            <h3 className="fw-bold mb-1 text-dark">Kyçja</h3>
            <p className="text-muted small mb-4">
              Shkruani kredencialet tuaja për të hyrë në llogari
            </p>

            {error && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 small"
                role="alert"
              >
                <strong>Kyçja dështoi.</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate={false}>
              {/* Email Input */}
              <div className="mb-3">
                <label
                  htmlFor="login-email"
                  className="form-label small fw-semibold text-secondary"
                >
                  Email Adresa
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    className={`form-control border-start-0 bg-light py-2 ${error ? "is-invalid" : ""}`}
                    placeholder="emri@university.edu"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="email"
                    disabled={loading}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label
                    htmlFor="login-password"
                    className="form-label small fw-semibold text-secondary mb-0"
                  >
                    Fjalëkalimi
                  </label>
                  <Link
                    to="/forgot-password"
                    className="small text-decoration-none fw-semibold"
                    style={{ color: "#5640EE" }}
                  >
                    Harruat fjalëkalimin?
                  </Link>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className={`form-control border-start-0 border-end-0 bg-light py-2 ${error ? "is-invalid" : ""}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-light border border-start-0 text-muted px-3"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Fshih" : "Shfaq"}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="form-check mb-4">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  className="form-check-label small text-secondary"
                  htmlFor="rememberMe"
                >
                  Më mbaj mend
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn text-white w-100 py-2 fw-semibold rounded-3"
                style={{ backgroundColor: "#5640EE" }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    />
                    Duke u kyçur...
                  </>
                ) : (
                  "Kyçu"
                )}
              </button>
            </form>

            {/* Quick Role Select / Footer Info */}
            <div className="border-top mt-4 pt-3">
              <span
                className="text-uppercase text-muted fw-bold d-block mb-2"
                style={{ fontSize: "0.7rem", letterSpacing: "0.05rem" }}
              >
                Qasja për
              </span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border flex-fill d-flex align-items-center justify-content-center gap-1 text-secondary"
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Nxënës / Studentë
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-light border flex-fill d-flex align-items-center justify-content-center gap-1 text-secondary"
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Mësimdhënës
                </button>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-center text-muted small mt-4 mb-0">
              Nuk ke llogari?{" "}
              <Link
                to="/register"
                className="fw-semibold text-decoration-none"
                style={{ color: "#5640EE" }}
              >
                Regjistrohu këtu
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
