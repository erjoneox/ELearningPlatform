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

  async function handleSubmit(event) {
    event.preventDefault();

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
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Kyçja dështoi",
        text:
          error.response?.data?.message ||
          error.message ||
          "Nuk u realizua kyçja. Provo përsëri.",
      });
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card shadow-sm border-0">
        <div className="card-body p-4 p-md-5">
          <h2 className="fw-bold mb-2">Mirë se u ktheve!</h2>

          <p className="text-secondary mb-4">
            Kyçu në llogarinë tënde për të vazhduar mësimin.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email adresa</label>

              <input
                type="email"
                className="form-control"
                placeholder="emri@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Fjalëkalimi</label>

              <input
                type="password"
                className="form-control"
                placeholder="Shkruaj fjalëkalimin"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2"
              disabled={loading}
            >
              {loading ? "Duke u kyçur..." : "Kyçu"}
            </button>
          </form>

          <p className="text-center mt-4 mb-0">
            Nuk ke llogari? <Link to="/register">Regjistrohu këtu</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
