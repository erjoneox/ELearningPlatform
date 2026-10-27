import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function Courses() {
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
  });

  const [creating, setCreating] = useState(false);

  const canManageCourses = ["Admin", "Instructor"].includes(user?.role);

  async function loadCourses() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/courses");
      setCourses(response.data.courses || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Nuk u arrit të ngarkohen kurset.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await api.get("/categories");

      setCategories(
        Array.isArray(response.data)
          ? response.data
          : response.data.categories || [],
      );
    } catch (err) {
      console.error("Categories error:", err);
    }
  }

  async function loadMyCourses() {
    if (user?.role !== "Student") return;

    try {
      const response = await api.get("/enrollments/my-courses");

      const enrollments = response.data.enrollments || [];

      setEnrolledCourseIds(
        enrollments.map((course) => Number(course.CourseID ?? course.courseId)),
      );
    } catch (err) {
      console.error(
        "Gabim gjatë ngarkimit të regjistrimeve:",
        err.response?.data || err,
      );
    }
  }

  useEffect(() => {
    loadCourses();
    loadCategories();
  }, []);

  useEffect(() => {
    if (user?.role === "Student") {
      loadMyCourses();
    }
  }, [user?.role]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleCreateCourse(event) {
    event.preventDefault();
    setCreating(true);

    try {
      await api.post("/courses", {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: Number(form.categoryId),
      });

      await Swal.fire({
        icon: "success",
        title: "Kursi u krijua",
        text: "Kursi u ruajt me sukses.",
      });

      setForm({
        title: "",
        description: "",
        categoryId: "",
      });

      await loadCourses();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text: err.response?.data?.message || "Kursi nuk mund të krijohej.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleEnroll(courseId) {
    try {
      await api.post(`/enrollments/${courseId}`);

      await Swal.fire({
        icon: "success",
        title: "Regjistrimi u realizua",
        text: "Tani mund të hysh në kurs.",
      });

      await loadCourses();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Regjistrimi dështoi",
        text:
          err.response?.data?.message || "Nuk u realizua regjistrimi në kurs.",
      });
    }
  }

  async function handleUnenroll(courseId) {
    const result = await Swal.fire({
      title: "Çregjistrimi nga kursi",
      text: "Progresi, dorëzimet dhe rezultatet e këtij kursi do të fshihen. Ky veprim nuk mund të zhbëhet.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Po, çregjistrohu",
      cancelButtonText: "Anulo",
      confirmButtonColor: "#dc3545",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/enrollments/${courseId}`);

      await Swal.fire({
        icon: "success",
        title: "Çregjistrimi u krye",
        text: "Jeni çregjistruar nga kursi me sukses.",
      });

      await loadCourses();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text: err.response?.data?.message || "Çregjistrimi nuk u realizua.",
      });
    }
  }

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="fw-bold">Kurset</h1>
            <p className="text-secondary mb-0">
              Eksploro kurset dhe vazhdo mësimin online.
            </p>
          </div>

          <span className="badge text-bg-primary fs-6">
            {courses.length} kurse
          </span>
        </div>

        {canManageCourses && (
          <div className="card border-0 shadow-sm mb-5">
            <div className="card-body p-4">
              <h4 className="mb-3">Krijo kurs të ri</h4>

              <form onSubmit={handleCreateCourse}>
                <div className="mb-3">
                  <label className="form-label">Titulli i kursit</label>

                  <input
                    className="form-control"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={200}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Përshkrimi</label>

                  <textarea
                    className="form-control"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Kategoria</label>

                  <select
                    className="form-select"
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Zgjedh kategorinë</option>

                    {categories.map((category) => (
                      <option
                        key={category.CategoryID ?? category.categoryId}
                        value={category.CategoryID ?? category.categoryId}
                      >
                        {category.Name ?? category.name}
                      </option>
                    ))}
                  </select>

                  {categories.length === 0 && (
                    <small className="text-secondary">
                      Nuk u gjetën kategori. Kontrollo endpoint-in e kategorive.
                    </small>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  disabled={creating || categories.length === 0}
                >
                  {creating ? "Duke krijuar..." : "Krijo kursin"}
                </button>
              </form>
            </div>
          </div>
        )}

        {loading && <p>Duke ngarkuar kurset...</p>}

        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && courses.length === 0 && (
          <div className="alert alert-info">
            Nuk ka kurse aktive për momentin.
          </div>
        )}

        <div className="row g-4">
          {courses.map((course) => {
            const courseId = course.CourseID ?? course.courseId;

            return (
              <div className="col-md-6 col-lg-4" key={courseId}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4">
                    <span className="badge text-bg-light mb-3">
                      {course.CategoryName ||
                        course.categoryName ||
                        "Kurs online"}
                    </span>

                    <h5 className="fw-bold">{course.Title ?? course.title}</h5>

                    <p className="text-secondary">
                      {course.Description ??
                        course.description ??
                        "Nuk ka përshkrim."}
                    </p>

                    <p className="small text-secondary">
                      Mësimdhënësi:{" "}
                      {course.InstructorName ??
                        course.instructorName ??
                        "Nuk është specifikuar"}
                    </p>

                    <div className="d-flex gap-2 flex-wrap mt-3">
                      <Link
                        to={`/courses/${courseId}`}
                        className="btn btn-outline-primary"
                      >
                        Shiko kursin
                      </Link>

                      {user?.role === "Student" &&
                        (enrolledCourseIds.includes(Number(courseId)) ? (
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleUnenroll(courseId)}
                          >
                            Çregjistrohu
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleEnroll(courseId)}
                          >
                            Regjistrohu
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

export default Courses;
