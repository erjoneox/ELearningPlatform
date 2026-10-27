import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

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
    <div className="auth-page">
      <div className="card auth-card shadow-sm border-0">
        <div className="card-body p-4 p-md-5">
          <h2 className="fw-bold mb-2">Krijo llogari</h2>

          <p className="text-secondary mb-4">
            Regjistrohu si student për të filluar mësimin online.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Emri</label>

                <input
                  className="form-control"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Mbiemri</label>

                <input
                  className="form-control"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Email adresa</label>

              <input
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Fjalëkalimi</label>

              <input
                type="password"
                className="form-control"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Konfirmo fjalëkalimin</label>

              <input
                type="password"
                className="form-control"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2"
              disabled={loading}
            >
              {loading ? "Duke u regjistruar..." : "Regjistrohu"}
            </button>
          </form>

          <p className="text-center mt-4 mb-0">
            Ke llogari? <Link to="/login">Kyçu këtu</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
