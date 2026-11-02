import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("student"); // "student" ose "teacher"
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      await Swal.fire({
        icon: "warning",
        title: "Fjalëkalimet nuk përputhen",
        text: "Kontrollo fjalëkalimin dhe konfirmimin e tij.",
      });

      return;
    }

    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: role,
      });

      await Swal.fire({
        icon: "success",
        title: "Regjistrimi u realizua",
        text: "Tani mund të kyçesh në llogarinë tënde.",
      });

      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Regjistrimi dështoi",
        text:
          error.response?.data?.message ||
          "Nuk u realizua regjistrimi. Kontrollo të dhënat.",
      });
    }
  }

  return (
    <div className="auth-page d-flex align-items-center justify-content-center min-vh-100 bg-light p-3">
      <div
        className="card auth-card shadow-lg border-0 rounded-4 overflow-hidden w-100"
        style={{ maxWidth: "920px" }}
      >
        <div className="row g-0">
          <div className="col-lg-7 bg-white p-4 p-md-5 d-flex flex-column justify-content-center">
            <h3 className="fw-bold mb-1 text-dark">Krijo Llogari</h3>
            <p className="text-muted small mb-4">
              Bashkohu me komunitetin EduFlow sot
            </p>

            <div className="row g-2 mb-4">
              <div className="col-6">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`btn w-100 py-2 d-flex flex-column align-items-center justify-content-center rounded-3 transition-all ${
                    role === "student"
                      ? "border-primary text-primary bg-primary bg-opacity-10 fw-bold"
                      : "border text-muted bg-light"
                  }`}
                  style={{
                    borderColor: role === "student" ? "#5640EE" : "#e0e0e0",
                    color: role === "student" ? "#5640EE" : "inherit",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className="mb-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 14l9-5-9-5-9 5 9 5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                    />
                  </svg>
                  <span style={{ fontSize: "0.85rem" }}>Student</span>
                </button>
              </div>
              <div className="col-6">
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`btn w-100 py-2 d-flex flex-column align-items-center justify-content-center rounded-3 transition-all ${
                    role === "teacher"
                      ? "border-primary text-primary bg-primary bg-opacity-10 fw-bold"
                      : "border text-muted bg-light"
                  }`}
                  style={{
                    borderColor: role === "teacher" ? "#5640EE" : "#e0e0e0",
                    color: role === "teacher" ? "#5640EE" : "inherit",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className="mb-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <span style={{ fontSize: "0.85rem" }}>Mësimdhënës</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Emri
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 text-muted px-2">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </span>
                    <input
                      className="form-control border-start-0 bg-light py-2"
                      placeholder="Emri"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Mbiemri
                  </label>
                  <input
                    className="form-control bg-light py-2"
                    placeholder="Mbiemri"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary mb-1">
                  Email Adresa
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted px-2">
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
                    type="email"
                    className="form-control border-start-0 bg-light py-2"
                    placeholder="emri@university.edu"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Fjalëkalimi
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 text-muted px-2">
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
                      type="password"
                      className="form-control border-start-0 bg-light py-2"
                      placeholder="Së paku 8 meqë"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Konfirmo Fjalëkalimin
                  </label>
                  <input
                    type="password"
                    className="form-control bg-light py-2"
                    placeholder="Rishkruaj fjalëkalimin"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div className="form-check mb-4">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <label
                  className="form-check-label small text-muted"
                  htmlFor="agreeTerms"
                >
                  Duke krijuar një llogari, pajtohem me{" "}
                  <Link
                    to="/terms"
                    className="text-decoration-none"
                    style={{ color: "#5640EE" }}
                  >
                    Kushtet e Shërbimit
                  </Link>{" "}
                  dhe{" "}
                  <Link
                    to="/privacy"
                    className="text-decoration-none"
                    style={{ color: "#5640EE" }}
                  >
                    Politikën e Privatësisë
                  </Link>
                  .
                </label>
              </div>

              {/* Button Submit */}
              <button
                type="submit"
                className="btn text-white w-100 py-2 fw-semibold rounded-3 shadow-sm"
                style={{ backgroundColor: "#5640EE" }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    />
                    Duke u regjistruar...
                  </>
                ) : (
                  "Fillo Tani"
                )}
              </button>
            </form>

            <p className="text-center text-muted small mt-4 mb-0">
              Keni tashmë një llogari?{" "}
              <Link
                to="/login"
                className="fw-semibold text-decoration-none"
                style={{ color: "#5640EE" }}
              >
                Kyçuni këtu
              </Link>
            </p>
          </div>

          <div
            className="col-lg-5 text-white p-4 p-md-5 d-flex flex-column justify-content-between"
            style={{ backgroundColor: "#5640EE" }}
          >
            <div>
              {/* Logo / Header */}
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

              {/* Titull Kryesor */}
              <h2
                className="fw-bold mb-3 display-6"
                style={{ fontSize: "1.75rem" }}
              >
                Fillo Udhëtimin Tënd Arsimor
              </h2>
              <p className="opacity-75 small mb-4">
                Bashkohuni me mijëra studentë dhe mësimdhënës në një mjedis
                bashkëpunues mësimi.
              </p>
            </div>

            <div className="d-flex flex-column gap-3 mt-auto">
              {/* Feature 1 */}
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 p-2 d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    width: "42px",
                    height: "42px",
                    flexShrink: 0,
                  }}
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h6 className="mb-0 fw-bold small">Mësime me Video</h6>
                  <small
                    className="opacity-75 d-block"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Materiale me cilësi të lartë nga ligjërues ekspertë.
                  </small>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 p-2 d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    width: "42px",
                    height: "42px",
                    flexShrink: 0,
                  }}
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h6 className="mb-0 fw-bold small">Materialet e Kursit</h6>
                  <small
                    className="opacity-75 d-block"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Burime të shkarkueshme dhe udhëzues interaktivë.
                  </small>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 p-2 d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    width: "42px",
                    height: "42px",
                    flexShrink: 0,
                  }}
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div>
                  <h6 className="mb-0 fw-bold small">Kuizet & Vlerësimet</h6>
                  <small
                    className="opacity-75 d-block"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Testoni njohuritë tuaja dhe përcillni progresin.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
