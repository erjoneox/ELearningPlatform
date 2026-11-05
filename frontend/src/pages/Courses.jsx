import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import ManagementFormPanel from "../components/ManagementFormPanel";

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
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [courseSort, setCourseSort] = useState("recent");

  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnail: "",
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

  const isAdmin = user?.role === "Admin";
  const isInstructor = user?.role === "Instructor";
  const canCreateCourses = isAdmin || isInstructor;
  const canManageCourse = (course) =>
    isAdmin ||
    (isInstructor && Number(course.InstructorID) === Number(user.userId));
  const activeInstructors = instructors.filter(
    (instructor) => instructor.Status === "Active",
  );
  const activeCategory = categories.find(
    (category) =>
      Number(category.CategoryID ?? category.categoryId) ===
      Number(activeCategoryId),
  );
  const categoryCourses = courses
    .filter(
      (course) =>
        Number(course.CategoryID ?? course.categoryId) ===
        Number(activeCategoryId),
    )
    .filter((course) => {
      const search = courseSearch.trim().toLowerCase();
      const searchableText = [
        course.Title ?? course.title,
        course.Description ?? course.description,
        course.InstructorName ?? course.instructorName,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || searchableText.includes(search)) &&
        (!instructorFilter ||
          (course.InstructorName ?? course.instructorName) === instructorFilter)
      );
    })
    .sort((first, second) => {
      if (courseSort === "title") {
        return (first.Title ?? first.title ?? "").localeCompare(
          second.Title ?? second.title ?? "",
        );
      }

      return (
        new Date(second.CreatedAt ?? second.createdAt ?? 0) -
        new Date(first.CreatedAt ?? first.createdAt ?? 0)
      );
    });
  const categoryInstructors = [
    ...new Set(
      courses
        .filter(
          (course) =>
            Number(course.CategoryID ?? course.categoryId) ===
            Number(activeCategoryId),
        )
        .map((course) => course.InstructorName ?? course.instructorName)
        .filter(Boolean),
    ),
  ].sort();

  const loadCourses = useCallback(async () => {
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
  }, [user]);

  const loadCategories = useCallback(async () => {
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
  }, []);

  async function handleCreateCategory(event) {
    event.preventDefault();
    setCreatingCategory(true);

    try {
      await api.post("/categories", {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
      });
      setNewCategory({ name: "", description: "" });
      await loadCategories();
      await Swal.fire({
        icon: "success",
        title: "Kategoria u krijua",
        text: "Tani mund ta përdorësh për kurset e reja.",
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Gabim",
        text: err.response?.data?.message || "Kategoria nuk mund të krijohej.",
      });
    } finally {
      setCreatingCategory(false);
    }
  }

  function openCategory(categoryId) {
    setActiveCategoryId(categoryId);
    setCourseSearch("");
    setInstructorFilter("");
    setCourseSort("recent");
  }

  function closeCategory() {
    setActiveCategoryId(null);
  }

  const loadInstructors = useCallback(async () => {
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
  }, []);

  const loadMyCourses = useCallback(async () => {
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
  }, [user?.role]);

  useEffect(() => {
    loadCourses();
    loadCategories();
  }, [loadCourses, loadCategories]);

  useEffect(() => {
    if (user?.role === "Student") {
      loadMyCourses();
    }
    if (user?.role === "Admin") {
      loadInstructors();
    }
  }, [loadInstructors, loadMyCourses, user?.role]);

  useEffect(() => {
    if (!activeCategoryId) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") setActiveCategoryId(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeCategoryId]);

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
      const courseData = {
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnail: form.thumbnail.trim() || null,
        categoryId: Number(form.categoryId),
      };
      if (isAdmin) courseData.instructorId = Number(form.instructorId);
      await api.post("/courses", courseData);

      await Swal.fire({
        icon: "success",
        title: "Kursi u krijua",
        text: "Kursi u ruajt me sukses.",
      });

      setForm({
        title: "",
        description: "",
        thumbnail: "",
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
      (isAdmin && !Number(editForm.instructorId))
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
      const courseData = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        categoryId: Number(editForm.categoryId),
        thumbnail: editForm.thumbnail.trim() || null,
      };
      if (isAdmin) courseData.instructorId = Number(editForm.instructorId);
      await api.put(`/courses/${editingCourseId}`, courseData);

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
      setEnrolledCourseIds((current) =>
        current.includes(Number(courseId))
          ? current
          : [...current, Number(courseId)],
      );

      await Swal.fire({
        icon: "success",
        title: "Regjistrimi u realizua",
        text: "Tani mund të hysh në kurs.",
      });
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
      setEnrolledCourseIds((current) =>
        current.filter((id) => id !== Number(courseId)),
      );

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
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-5 bg-white">
            <div className="row g-0">
              {/* Paneli anësor me ngjyrë / visual accent */}
              <div
                className="col-lg-3 p-4 text-white d-flex flex-column justify-content-between"
                style={{ backgroundColor: "#5640EE" }}
              >
                <div>
                  <span className="badge bg-white bg-opacity-20 text-black rounded-pill px-3 py-2 mb-3">
                    {isAdmin ? "Admin" : "Instruktori"}
                  </span>
                  <h3 className="fw-bold fs-4 mb-2">Krijo kurs të ri</h3>
                  <p className="text-white-50 small mb-0">
                    Plotësoni të dhënat e kursit për ta bërë atë publik për të
                    gjithë studentët.
                  </p>
                </div>
                <div className="d-none d-lg-block">
                  <small className="text-white-50 fs-7">
                    * Sigurohuni që kategoria dhe të dhënat e kursit janë të sakta.
                  </small>
                </div>
              </div>

              {/* Fusha e Formës */}
              <div className="col-lg-9 p-4 p-md-5">
                <form onSubmit={handleCreateCourse}>
                  <div className="row g-3">
                    {/* Titulli */}
                    <div className="col-md-8">
                      <label className="form-label fs-7 fw-bold text-uppercase text-secondary">
                        Titulli i kursit
                      </label>
                      <input
                        className="form-control bg-light border-0 py-2.5 rounded-3"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        maxLength={200}
                        required
                        placeholder="p.sh. Advanced UI/UX Design"
                      />
                    </div>

                    {/* Kategoria */}
                    <div className="col-md-4">
                      <label className="form-label fs-7 fw-bold text-uppercase text-secondary">
                        Kategoria
                      </label>
                      <select
                        className="form-select bg-light border-0 py-2.5 rounded-3"
                        name="categoryId"
                        value={form.categoryId}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Zgjedh...</option>
                        {categories.map((category) => (
                          <option
                            key={category.CategoryID ?? category.categoryId}
                            value={category.CategoryID ?? category.categoryId}
                          >
                            {category.Name ?? category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mësimdhënësi */}
                    {isAdmin && <div className="col-md-6">
                      <label
                        className="form-label fs-7 fw-bold text-uppercase text-secondary"
                        htmlFor="course-instructor"
                      >
                        Mësimdhënësi përgjegjës
                      </label>
                      <select
                        id="course-instructor"
                        className="form-select bg-light border-0 py-2.5 rounded-3"
                        name="instructorId"
                        value={form.instructorId}
                        onChange={handleChange}
                        required
                        disabled={
                          loadingInstructors || activeInstructors.length === 0
                        }
                      >
                        <option value="">Zgjedh mësimdhënësin...</option>
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
                    </div>}

                    {/* URL e Imazhit */}
                    <div className="col-md-6">
                      <label
                        className="form-label fs-7 fw-bold text-uppercase text-secondary"
                        htmlFor="course-thumbnail-create"
                      >
                        URL e imazhit (Opsionale)
                      </label>
                      <input
                        id="course-thumbnail-create"
                        className="form-control bg-light border-0 py-2.5 rounded-3"
                        type="url"
                        name="thumbnail"
                        value={form.thumbnail}
                        onChange={handleChange}
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>

                    {/* Përshkrimi */}
                    <div className="col-12">
                      <label className="form-label fs-7 fw-bold text-uppercase text-secondary">
                        Përshkrimi i kursit
                      </label>
                      <textarea
                        className="form-control bg-light border-0 py-2 rounded-3"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Shkruaj një përmbledhje të shkurtër se çfarë do të mësohet..."
                      />
                    </div>
                  </div>

                  {/* Veprimi / Butoni */}
                  <div className="d-flex justify-content-end align-items-center gap-3 mt-4 pt-3 border-top">
                    <button
                      type="submit"
                      className="btn text-white fw-semibold px-4 py-2.5 rounded-3 shadow-sm"
                      style={{ backgroundColor: "#5640EE" }}
                      disabled={
                        creating ||
                        categories.length === 0 ||
                        (isAdmin &&
                          (loadingInstructors || activeInstructors.length === 0))
                      }
                    >
                      {creating ? "Duke krijuar..." : "Publiko Kursin"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <ManagementFormPanel
            as="form"
            eyebrow="ADMIN"
            title="Krijo kategori të re"
            description="Organizo kurset duke i grupuar në kategori."
            onSubmit={handleCreateCategory}
            className="mb-5"
          >
            <div className="mb-3">
              <label
                className="form-label small fw-semibold text-secondary"
                htmlFor="category-name-create"
              >
                Emri i kategorisë
              </label>
              <input
                id="category-name-create"
                className="form-control"
                maxLength={100}
                required
                value={newCategory.name}
                onChange={(event) =>
                  setNewCategory((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="p.sh. Dizajn grafik"
              />
            </div>

            <div className="mb-3">
              <label
                className="form-label small fw-semibold text-secondary"
                htmlFor="category-description-create"
              >
                Përshkrimi (opsional)
              </label>
              <textarea
                id="category-description-create"
                className="form-control"
                rows={3}
                value={newCategory.description}
                onChange={(event) =>
                  setNewCategory((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="Përshkruaj shkurtimisht këtë kategori..."
              />
            </div>

            <button
              type="submit"
              className="btn text-white fw-semibold px-4 py-2 rounded-3 shadow-sm"
              style={{ backgroundColor: "#5640EE" }}
              disabled={creatingCategory}
            >
              {creatingCategory ? "Duke krijuar..." : "Krijo kategorinë"}
            </button>
          </ManagementFormPanel>
        )}

        {loading && <p className="text-muted">Duke ngarkuar kurset...</p>}

        {error && (
          <div className="alert alert-danger border-0 shadow-sm">{error}</div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="alert alert-info border-0 shadow-sm">
            {user?.role === "Instructor"
              ? "Nuk ke ende kurse. Krijo kursin tënd nga formulari më sipër."
              : "Nuk ka kurse aktive për momentin."}
          </div>
        )}

        {user?.role === "Student" ? (
          <section aria-labelledby="course-categories-heading">
            <div className="mb-3">
              <h2
                id="course-categories-heading"
                className="fw-bold fs-4 text-dark mb-1"
              >
                Zgjedh një kategori
              </h2>
              <p className="text-muted small mb-0">
                Hap kategorinë për të kërkuar kurse dhe për t'u regjistruar.
              </p>
            </div>
            {categories.length === 0 ? (
              <div className="alert alert-info border-0 shadow-sm">
                Nuk ka kategori të disponueshme ende.
              </div>
            ) : (
              <div className="row g-4">
                {categories.map((category) => {
                  const categoryId = category.CategoryID ?? category.categoryId;
                  const categoryName = category.Name ?? category.name;
                  const count = courses.filter(
                    (course) =>
                      Number(course.CategoryID ?? course.categoryId) ===
                      Number(categoryId),
                  ).length;

                  return (
                    <div className="col-sm-6 col-lg-4" key={categoryId}>
                      <button
                        type="button"
                        className="card h-100 w-100 text-start border shadow-sm rounded-4 p-4 bg-white"
                        onClick={() => openCategory(categoryId)}
                        aria-haspopup="dialog"
                        aria-label={`Shiko kurset në kategorinë ${categoryName}`}
                      >
                        <span className="badge bg-primary bg-opacity-10 text-primary align-self-start mb-3">
                          {count} {count === 1 ? "kurs" : "kurse"}
                        </span>
                        <h3 className="fw-bold fs-5 text-dark mb-2">
                          {categoryName}
                        </h3>
                        <p className="text-secondary small mb-0">
                          {category.Description ??
                            category.description ??
                            "Shfleto dhe zgjidh kursin që të intereson."}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <div className="row g-4">
            {courses.map((course) => {
              const courseId = course.CourseID ?? course.courseId;
              const thumbnail = course.Thumbnail ?? course.thumbnail;

              return (
                <div className="col-md-6 col-lg-4" key={courseId}>
                  <div
                    className="card h-100 border shadow-sm rounded-4 bg-white d-flex flex-column overflow-hidden position-relative"
                    style={{ isolation: "isolate" }}
                  >
                    {thumbnail && (
                      <img
                        src={thumbnail}
                        alt=""
                        aria-hidden="true"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                        className="position-absolute top-0 start-0 w-100 h-100"
                        style={{
                          objectFit: "cover",
                          opacity: 0.14,
                          zIndex: -1,
                        }}
                      />
                    )}
                    <div className="card-body p-4 d-flex flex-column justify-content-between position-relative">
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

                          {canManageCourse(course) && (
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
                      <ManagementFormPanel
                        as="form"
                        eyebrow="EDIT"
                        title="Përditëso kursin"
                        description="Ndrysho të dhënat dhe ruaj përditësimet e kursit."
                        onSubmit={saveCourseEdit}
                        className="rounded-0 rounded-bottom-4"
                      >
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

                        {isAdmin && (
                        <>
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
                        </>
                        )}

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
                            type="submit"
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
                      </ManagementFormPanel>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeCategory && (
          <>
            <div
              className="modal-backdrop show"
              aria-hidden="true"
              onClick={closeCategory}
            />
            <div
              className="modal show d-block"
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-courses-title"
              onClick={(event) => {
                if (event.target === event.currentTarget) closeCategory();
              }}
            >
              <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                  <div className="modal-header bg-light px-4 py-3 border-bottom">
                    <div>
                      <span
                        className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2 py-1 mb-1"
                        style={{ fontSize: "0.7rem" }}
                      >
                        KATEGORIA E KURSIT
                      </span>
                      <h2
                        id="category-courses-title"
                        className="modal-title fs-5 fw-bold text-dark mb-0"
                      >
                        {activeCategory.Name ?? activeCategory.name}
                      </h2>
                      <p className="text-muted small mb-0">
                        {categoryCourses.length}{" "}
                        {categoryCourses.length === 1
                          ? "kurs i gjetur"
                          : "kurse të gjetura"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Mbyll"
                      onClick={closeCategory}
                    />
                  </div>

                  <div className="modal-body p-4 bg-white">
                    <div className="row g-3 mb-4 bg-light p-3 rounded-4 border">
                      <div className="col-lg-6">
                        <label
                          htmlFor="category-course-search"
                          className="form-label small fw-semibold text-secondary"
                        >
                          Kërko kurse
                        </label>
                        <input
                          id="category-course-search"
                          className="form-control"
                          type="search"
                          placeholder="Kërko sipas emrit, përshkrimit ose mësimdhënësit"
                          value={courseSearch}
                          onChange={(event) =>
                            setCourseSearch(event.target.value)
                          }
                        />
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <label
                          htmlFor="category-instructor-filter"
                          className="form-label small fw-semibold text-secondary"
                        >
                          Mësimdhënësi
                        </label>
                        <select
                          id="category-instructor-filter"
                          className="form-select"
                          value={instructorFilter}
                          onChange={(event) =>
                            setInstructorFilter(event.target.value)
                          }
                        >
                          <option value="">Të gjithë mësimdhënësit</option>
                          {categoryInstructors.map((instructor) => (
                            <option key={instructor} value={instructor}>
                              {instructor}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <label
                          htmlFor="category-course-sort"
                          className="form-label small fw-semibold text-secondary"
                        >
                          Renditja
                        </label>
                        <select
                          id="category-course-sort"
                          className="form-select"
                          value={courseSort}
                          onChange={(event) =>
                            setCourseSort(event.target.value)
                          }
                        >
                          <option value="recent">Më të rejat</option>
                          <option value="title">Sipas emrit</option>
                        </select>
                      </div>
                    </div>

                    {categoryCourses.length === 0 ? (
                      <div className="alert alert-light border rounded-4 text-center py-5 text-muted">
                        Nuk u gjet asnjë kurs me këto kritere.
                      </div>
                    ) : (
                      <div className="row g-4">
                        {categoryCourses.map((course) => {
                          const courseId = course.CourseID ?? course.courseId;
                          const isEnrolled = enrolledCourseIds.includes(
                            Number(courseId),
                          );

                          return (
                            <div className="col-md-6" key={courseId}>
                              <article className="card h-100 border shadow-sm rounded-4 bg-white p-3 d-flex flex-column justify-content-between">
                                <div className="card-body p-2">
                                  <h3 className="fs-5 fw-bold text-dark mb-2">
                                    {course.Title ?? course.title}
                                  </h3>
                                  <p className="small text-secondary mb-3">
                                    {course.Description ??
                                      course.description ??
                                      "Nuk ka përshkrim."}
                                  </p>
                                  <p className="small text-muted mb-0 border-top pt-3">
                                    Mësimdhënësi:{" "}
                                    <strong className="text-dark">
                                      {course.InstructorName ??
                                        course.instructorName ??
                                        "Nuk është specifikuar"}
                                    </strong>
                                  </p>
                                </div>

                                <div className="card-footer bg-transparent border-top pt-3 mt-2 d-flex flex-wrap gap-2">
                                  {isEnrolled ? (
                                    <>
                                      <Link
                                        to={`/courses/${courseId}`}
                                        className="btn btn-outline-primary btn-sm fw-semibold px-3"
                                        style={{
                                          borderColor: "#5640EE",
                                          color: "#5640EE",
                                        }}
                                      >
                                        Hyr në kurs
                                      </Link>
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleUnenroll(courseId)}
                                      >
                                        Çregjistrohu
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-sm text-white fw-semibold px-3 py-2"
                                      style={{ backgroundColor: "#5640EE" }}
                                      onClick={() => handleEnroll(courseId)}
                                    >
                                      Regjistrohu
                                    </button>
                                  )}
                                </div>
                              </article>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default Courses;
