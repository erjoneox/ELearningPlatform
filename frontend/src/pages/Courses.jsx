import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function Courses() {
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [error, setError] = useState("");
  const [instructorError, setInstructorError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    instructorId: "",
  });

  const [creating, setCreating] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    thumbnail: "",
  });
  const [savingCourseUpdate, setSavingCourseUpdate] = useState(false);

  const canCreateCourses = user?.role === "Admin";
  const activeInstructors = instructors.filter(
    (instructor) => instructor.Status === "Active",
  );

  async function loadCourses() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/courses");
      const loadedCourses = response.data.courses || [];
      setCourses(
        user?.role === "Instructor"
          ? loadedCourses.filter(
              (course) => Number(course.InstructorID) === Number(user.userId),
            )
          : loadedCourses,
      );
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

  async function loadInstructors() {
    setLoadingInstructors(true);
    setInstructorError("");

    try {
      const response = await api.get("/users");
      setInstructors(
        (response.data.users || []).filter(
          (candidate) => candidate.Role === "Instructor",
        ),
      );
    } catch (err) {
      setInstructorError(
        err.response?.data?.message ||
          "Nuk u arrit të ngarkohen mësimdhënësit.",
      );
    } finally {
      setLoadingInstructors(false);
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
    if (user?.role === "Admin") {
      loadInstructors();
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
        instructorId: Number(form.instructorId),
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
        instructorId: "",
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

  function startCourseEdit(course) {
    setEditingCourseId(course.CourseID ?? course.courseId);
    setEditForm({
      title: course.Title ?? course.title ?? "",
      description: course.Description ?? course.description ?? "",
      categoryId: course.CategoryID ?? course.categoryId ?? "",
      thumbnail: course.Thumbnail ?? course.thumbnail ?? "",
      instructorId: course.InstructorID ?? course.instructorId ?? "",
    });
  }

  async function saveCourseEdit(event) {
    event.preventDefault();

    if (
      !editForm.title.trim() ||
      !Number(editForm.categoryId) ||
      !Number(editForm.instructorId)
    ) {
      Swal.fire({
        icon: "warning",
        title: "Të dhëna të pavlefshme",
        text: "Titulli, kategoria dhe mësimdhënësi përgjegjës janë të detyrueshëm.",
      });
      return;
    }

    setSavingCourseUpdate(true);

    try {
      await api.put(`/courses/${editingCourseId}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        categoryId: Number(editForm.categoryId),
        instructorId: Number(editForm.instructorId),
        thumbnail: editForm.thumbnail.trim() || null,
      });

      setEditingCourseId(null);
      await loadCourses();
      Swal.fire({
        icon: "success",
        title: "Kursi u përditësua",
        text: "Ndryshimet u ruajtën me sukses.",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text: err.response?.data?.message || "Kursi nuk mund të përditësohej.",
      });
    } finally {
      setSavingCourseUpdate(false);
    }
  }

  async function handleDeleteCourse(course) {
    const courseId = course.CourseID ?? course.courseId;
    const result = await Swal.fire({
      title: "Fshi kursin përgjithmonë?",
      text: "Kjo do të fshijë edhe mësimet, materialet, detyrat, dorëzimet, kuizet, rezultatet dhe regjistrimet e kursit.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Fshi kursin dhe të dhënat",
      cancelButtonText: "Anulo",
      confirmButtonColor: "#dc3545",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await api.delete(`/courses/${courseId}`);
      await loadCourses();
      await Swal.fire({
        icon: response.data.warning ? "warning" : "success",
        title: "Kursi u fshi",
        text: response.data.warning || "Kursi dhe të dhënat e tij u fshinë.",
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Fshirja dështoi",
        text: err.response?.data?.message || "Kursi nuk mund të fshihej.",
      });
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
      <main className="container py-5">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="fw-bold text-dark fs-3 mb-1">Kurset</h1>
            <p className="text-muted small mb-0">
              Eksploro kurset dhe vazhdo mësimin online.
            </p>
          </div>

          <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-3 py-2 fs-6 rounded-pill">
            {courses.length} kurse
          </span>
        </div>

        {canCreateCourses && (
          <div className="card border-0 shadow-sm mb-5 rounded-4 p-2">
            <div className="card-body p-4">
              <h4 className="fw-bold fs-5 mb-3 text-dark">Krijo kurs të ri</h4>

              <form onSubmit={handleCreateCourse}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">
                    Titulli i kursit
                  </label>
                  <input
                    className="form-control"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={200}
                    required
                    placeholder="p.sh. Advanced UI/UX Design"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">
                    Përshkrimi
                  </label>
                  <textarea
                    className="form-control"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Përshkruaj përmbajtjen e kursit..."
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">
                      Kategoria
                    </label>
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
                      <small className="text-secondary d-block mt-1">
                        Nuk u gjetën kategori. Kontrollo endpoint-in e
                        kategorive.
                      </small>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label
                      className="form-label small fw-semibold text-secondary"
                      htmlFor="course-instructor"
                    >
                      Mësimdhënësi përgjegjës
                    </label>
                    <select
                      id="course-instructor"
                      className="form-select"
                      name="instructorId"
                      value={form.instructorId}
                      onChange={handleChange}
                      required
                      disabled={
                        loadingInstructors || activeInstructors.length === 0
                      }
                    >
                      <option value="">Zgjedh mësimdhënësin</option>
                      {activeInstructors.map((instructor) => (
                        <option
                          key={instructor.UserID}
                          value={instructor.UserID}
                        >
                          {instructor.FirstName} {instructor.LastName}
                        </option>
                      ))}
                    </select>
                    {loadingInstructors && (
                      <small className="text-secondary d-block mt-1">
                        Duke ngarkuar mësimdhënësit...
                      </small>
                    )}
                    {instructorError && (
                      <div className="text-danger small mt-1" role="alert">
                        {instructorError}
                      </div>
                    )}
                    {!loadingInstructors &&
                      !instructorError &&
                      activeInstructors.length === 0 && (
                        <div className="text-secondary small mt-1">
                          Nuk ka mësimdhënës aktivë.{" "}
                          <Link
                            to="/register"
                            className="text-primary fw-semibold"
                          >
                            Krijo një llogari mësimdhënësi.
                          </Link>
                        </div>
                      )}
                  </div>
                </div>

                <button
                  className="btn text-white fw-semibold px-4 py-2 rounded-3 shadow-sm"
                  style={{ backgroundColor: "#5640EE" }}
                  disabled={
                    creating ||
                    categories.length === 0 ||
                    loadingInstructors ||
                    activeInstructors.length === 0
                  }
                >
                  {creating ? "Duke krijo..." : "+ Krijo kursin"}
                </button>
              </form>
            </div>
          </div>
        )}

        {loading && <p className="text-muted">Duke ngarkuar kurset...</p>}

        {error && (
          <div className="alert alert-danger border-0 shadow-sm">{error}</div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="alert alert-info border-0 shadow-sm">
            {user?.role === "Instructor"
              ? "Nuk ke kurse të caktuara. Kërko nga administratori të caktojë kursin te llogaria jote."
              : "Nuk ka kurse aktive për momentin."}
          </div>
        )}

        <div className="row g-4">
          {courses.map((course) => {
            const courseId = course.CourseID ?? course.courseId;

            return (
              <div className="col-md-6 col-lg-4" key={courseId}>
                <div className="card h-100 border shadow-sm rounded-4 bg-white d-flex flex-column">
                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      <span
                        className="badge bg-primary bg-opacity-10 text-primary fw-semibold mb-3 px-2 py-1"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {course.CategoryName ||
                          course.categoryName ||
                          "Kurs online"}
                      </span>

                      <h5 className="fw-bold text-dark fs-5 mb-2">
                        {course.Title ?? course.title}
                      </h5>

                      <p className="text-secondary small mb-3">
                        {course.Description ??
                          course.description ??
                          "Nuk ka përshkrim."}
                      </p>
                    </div>

                    <div>
                      <p className="small text-muted mb-3 border-top pt-3">
                        Mësimdhënësi:{" "}
                        <strong className="text-dark">
                          {course.InstructorName ??
                            course.instructorName ??
                            "Nuk është specifikuar"}
                        </strong>
                      </p>

                      <div className="d-flex gap-2 flex-wrap">
                        <Link
                          to={`/courses/${courseId}`}
                          className="btn btn-outline-primary btn-sm fw-semibold px-3"
                          style={{ borderColor: "#5640EE", color: "#5640EE" }}
                        >
                          Shiko kursin
                        </Link>

                        {user?.role === "Admin" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => startCourseEdit(course)}
                            >
                              Ndrysho
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteCourse(course)}
                            >
                              Fshi
                            </button>
                          </>
                        )}

                        {user?.role === "Student" &&
                          (enrolledCourseIds.includes(Number(courseId)) ? (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleUnenroll(courseId)}
                            >
                              Çregjistrohu
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm text-white fw-semibold px-3"
                              style={{ backgroundColor: "#5640EE" }}
                              onClick={() => handleEnroll(courseId)}
                            >
                              Regjistrohu
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {editingCourseId === courseId && (
                    <form
                      className="card-footer bg-light p-4 border-top rounded-bottom-4"
                      onSubmit={saveCourseEdit}
                    >
                      <h6 className="fw-bold mb-3 fs-6">Përditëso kursin</h6>
                      <label
                        className="form-label small fw-semibold text-secondary"
                        htmlFor={`course-title-${courseId}`}
                      >
                        Titulli
                      </label>
                      <input
                        id={`course-title-${courseId}`}
                        className="form-control form-control-sm mb-2"
                        maxLength={200}
                        required
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            title: event.target.value,
                          }))
                        }
                      />

                      <label
                        className="form-label small fw-semibold text-secondary"
                        htmlFor={`course-description-${courseId}`}
                      >
                        Përshkrimi
                      </label>
                      <textarea
                        id={`course-description-${courseId}`}
                        className="form-control form-control-sm mb-2"
                        rows={3}
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                      />

                      <label
                        className="form-label small fw-semibold text-secondary"
                        htmlFor={`course-category-${courseId}`}
                      >
                        Kategoria
                      </label>
                      <select
                        id={`course-category-${courseId}`}
                        className="form-select form-select-sm mb-2"
                        required
                        value={editForm.categoryId}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            categoryId: event.target.value,
                          }))
                        }
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

                      <label
                        className="form-label small fw-semibold text-secondary"
                        htmlFor={`course-instructor-${courseId}`}
                      >
                        Mësimdhënësi përgjegjës
                      </label>
                      <select
                        id={`course-instructor-${courseId}`}
                        className="form-select form-select-sm mb-2"
                        required
                        value={editForm.instructorId}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            instructorId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Zgjedh mësimdhënësin</option>
                        {instructors
                          .filter(
                            (instructor) => instructor.Status === "Active",
                          )
                          .map((instructor) => (
                            <option
                              key={instructor.UserID}
                              value={instructor.UserID}
                            >
                              {instructor.FirstName} {instructor.LastName}
                            </option>
                          ))}
                      </select>

                      <label
                        className="form-label small fw-semibold text-secondary"
                        htmlFor={`course-thumbnail-${courseId}`}
                      >
                        URL-ja e imazhit (opsionale)
                      </label>
                      <input
                        id={`course-thumbnail-${courseId}`}
                        type="url"
                        className="form-control form-control-sm mb-3"
                        value={editForm.thumbnail}
                        onChange={(event) =>
                          setEditForm((previous) => ({
                            ...previous,
                            thumbnail: event.target.value,
                          }))
                        }
                      />

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-primary btn-sm fw-semibold"
                          disabled={savingCourseUpdate}
                        >
                          {savingCourseUpdate ? "Duke ruajtur..." : "Ruaj"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          disabled={savingCourseUpdate}
                          onClick={() => setEditingCourseId(null)}
                        >
                          Anulo
                        </button>
                      </div>
                    </form>
                  )}
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
