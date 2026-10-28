import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function CourseDetails() {
  const { courseId } = useParams();
  const { user } = useAuth();

  const [lessons, setLessons] = useState([]);
  const [materials, setMaterials] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Formulari per krijimin e mesimit
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    videoURL: "",
    orderNumber: 1,
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");

  // Formulari per materialet
  const [materialForms, setMaterialForms] = useState({});
  const [savingMaterial, setSavingMaterial] = useState({});
  const [completedLessons, setCompletedLessons] = useState({});

  const canManageLessons =
    user?.role === "Instructor" || user?.role === "Admin";

  const canManageMaterials =
    user?.role === "Instructor" || user?.role === "Admin";

  // Ngarkimi i mesimeve te kursit
  async function loadLessons() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/lessons/courses/${courseId}`);

      const data = response.data;

      const lessonList = Array.isArray(data)
        ? data
        : Array.isArray(data.lessons)
          ? data.lessons
          : [];

      setLessons(lessonList);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Nuk u arrit te ngarkohen mesimet. Kontrollo autorizimin dhe lidhjen me serverin.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLessons();
  }, [courseId]);

  async function loadStudentProgress() {
    if (user?.role !== "Student") return;

    try {
      const response = await api.get(`/progress/courses/${courseId}`);

      const progressLessons = response.data.lessons || {};
      const completedMap = {};

      progressLessons.forEach((lesson) => {
        const id = lesson.LessonID ?? lesson.lessonId;

        completedMap[id] =
          lesson.Completed === true || Number(lesson.Completed) === 1;
      });

      console.log("Progresi i përpunuar:", completedMap);

      setCompletedLessons(completedMap);
    } catch (err) {
      console.error(
        "Gabim gjatë ngarkimit të progresit:",
        err.response?.data || err,
      );
    }
  }

  useEffect(() => {
    if (user?.role === "Student") {
      loadStudentProgress();
    }
  }, [courseId, user?.role]);

  // Ngarkimi i materialeve te nje mesimi
  async function loadMaterials(lessonId) {
    try {
      const response = await api.get(`/lessons/${lessonId}/materials`);

      const data = response.data;

      const materialList = Array.isArray(data)
        ? data
        : Array.isArray(data.materials)
          ? data.materials
          : [];

      setMaterials((previous) => ({
        ...previous,
        [lessonId]: materialList,
      }));
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text:
          err.response?.data?.message || "Nuk u arrit te ngarkohen materialet.",
      });
    }
  }

  // Krijimi i nje mesimi te ri
  async function createLesson(e) {
    e.preventDefault();

    if (!lessonForm.title.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Kujdes",
        text: "Titulli i mesimit eshte i detyrueshem.",
      });
      return;
    }

    const orderNumber = Number(lessonForm.orderNumber);

    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      Swal.fire({
        icon: "warning",
        title: "Kujdes",
        text: "Numri rendor duhet te jete numer i plote pozitiv.",
      });
      return;
    }

    setSavingLesson(true);

    try {
      await api.post(`/lessons/courses/${courseId}`, {
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim(),
        videoURL: lessonForm.videoURL.trim() || null,
        orderNumber,
      });

      setLessonForm({
        title: "",
        description: "",
        videoURL: "",
        orderNumber: lessons.length + 2,
      });

      setShowLessonForm(false);

      await loadLessons();

      await Swal.fire({
        icon: "success",
        title: "Mesimi u krijua",
        text: "Mesimi u ruajt me sukses.",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text:
          err.response?.data?.message ||
          "Nuk u arrit te krijohet mesimi. Kontrollo endpoint-in dhe autorizimin.",
      });
    } finally {
      setSavingLesson(false);
    }
  }

  // Perditesimi i fushave te materialit
  function updateMaterialForm(lessonId, field, value) {
    setMaterialForms((previous) => ({
      ...previous,
      [lessonId]: {
        ...(previous[lessonId] || {}),
        [field]: value,
      },
    }));
  }

  function getFileExtension(fileURL) {
    const filename = fileURL?.split("/").pop() || "";
    const dotIndex = filename.lastIndexOf(".");

    return dotIndex >= 0 ? filename.substring(dotIndex) : "";
  }

  // Shtimi i materialit ne nje mesim
  async function addMaterial(lessonId) {
    const form = materialForms[lessonId] || {};

    if (!form.title?.trim() || !form.file) {
      Swal.fire({
        icon: "warning",
        title: "Fushat e detyrueshme",
        text: "Shkruaj titullin dhe zgjidh nje skedar.",
      });
      return;
    }

    console.log("Material form:", form);
    console.log("File:", form.file);

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("file", form.file);
    formData.append("materialType", form.materialType || "Document");

    setSavingMaterial((previous) => ({
      ...previous,
      [lessonId]: true,
    }));

    try {
      await api.post(`/lessons/${lessonId}/materials`, formData);

      await loadMaterials(lessonId);

      setMaterialForms((previous) => ({
        ...previous,
        [lessonId]: {
          title: "",
          file: null,
          materialType: "Document",
        },
      }));

      Swal.fire({
        icon: "success",
        title: "Materiali u ngarkua",
        text: "Skedari u ruajt me sukses.",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text: err.response?.data?.message || "Ngarkimi i skedarit deshtoi.",
      });
      console.error("Upload error:", err.response?.data || err);
    } finally {
      setSavingMaterial((previous) => ({
        ...previous,
        [lessonId]: false,
      }));
    }
  }

  async function toggleLessonProgress(lessonId) {
    const isCompleted = Boolean(completedLessons[lessonId]);

    try {
      const action = isCompleted ? "uncomplete" : "complete";

      const response = await api.patch(
        `/progress/lessons/${lessonId}/${action}`,
      );

      setCompletedLessons((previous) => ({
        ...previous,
        [lessonId]: !isCompleted,
      }));

      await Swal.fire({
        icon: "success",
        title: isCompleted ? "Përfundimi u anulua" : "Mësimi u përfundua",
        text: response.data.message || "Progresi u përditësua me sukses.",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text:
          err.response?.data?.message ||
          "Nuk u arrit të përditësohet progresi.",
      });
    }
  }

  const downloadMaterial = async (lessonId, material) => {
    try {
      const materialId = material.MaterialID || material.materialId;

      const response = await api.get(
        `/lessons/${lessonId}/materials/${materialId}/download`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      const originalFilename = material.FileURL || material.fileURL || "";

      const extension = originalFilename.includes(".")
        ? originalFilename.split("/").pop().split(".").pop()
        : "";

      const title = material.Title || material.title || "material";
      link.download = extension ? `${title}.${extension}` : title;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);

      Swal.fire({
        icon: "error",
        title: "Gabim",
        text: "Shkarkimi i materialit dështoi.",
      });
    }
  };

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <Link to="/courses" className="btn btn-link px-0 mb-3">
          &larr; Kthehu te kurset
        </Link>

        <h1 className="fw-bold">Permbajtja e kursit</h1>

        <p className="text-secondary">Mesimet dhe materialet mesimore.</p>

        {/* Krijimi i mesimit - vetem Instructor dhe Admin */}
        {canManageLessons && (
          <div className="mb-4">
            {!showLessonForm ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowLessonForm(true)}
              >
                + Shto mesim te ri
              </button>
            ) : (
              <form
                className="card card-body shadow-sm"
                onSubmit={createLesson}
              >
                <h5 className="fw-bold mb-3">Krijo mesim te ri</h5>

                <div className="mb-3">
                  <label className="form-label">Titulli i mesimit *</label>

                  <input
                    type="text"
                    className="form-control"
                    required
                    value={lessonForm.title}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="p.sh. Variablat ne JavaScript"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Pershkrimi</label>

                  <textarea
                    className="form-control"
                    rows="3"
                    value={lessonForm.description}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Pershkruaj permbajtjen e mesimit"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    URL-ja e videos (opsionale)
                  </label>

                  <input
                    type="url"
                    className="form-control"
                    value={lessonForm.videoURL}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        videoURL: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Numri rendor</label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    required
                    value={lessonForm.orderNumber}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        orderNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={savingLesson}
                  >
                    {savingLesson ? "Duke ruajtur..." : "Ruaj mesimin"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowLessonForm(false)}
                    disabled={savingLesson}
                  >
                    Anulo
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {loading && <p>Duke ngarkuar mesimet...</p>}

        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && lessons.length === 0 && (
          <div className="alert alert-info">
            Ky kurs nuk ka mesime te publikuara.
            {canManageLessons &&
              " Perdore butonin 'Shto mesim te ri' per te krijuar mesimin e pare."}
          </div>
        )}

        <div className="d-flex flex-column gap-3">
          {lessons.map((lesson, index) => {
            const lessonId = lesson.LessonID ?? lesson.lessonId;

            return (
              <div className="card border-0 shadow-sm" key={lessonId}>
                <div className="card-body p-4">
                  <h5 className="fw-bold">
                    {index + 1}. {lesson.Title ?? lesson.title}
                  </h5>

                  <p className="text-secondary">
                    {lesson.Description ?? lesson.description ?? ""}
                  </p>

                  {(lesson.VideoURL || lesson.videoURL) && (
                    <p>
                      <a
                        href={lesson.VideoURL ?? lesson.videoURL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Hap videon e mesimit
                      </a>
                    </p>
                  )}

                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => loadMaterials(lessonId)}
                    >
                      Shfaq materialet
                    </button>

                    {user?.role === "Student" && (
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          completedLessons[lessonId]
                            ? "btn-outline-secondary"
                            : "btn-success"
                        }`}
                        onClick={() => toggleLessonProgress(lessonId)}
                      >
                        {completedLessons[lessonId]
                          ? "Anulo përfundimin"
                          : "Shëno si të përfunduar"}
                      </button>
                    )}
                  </div>

                  {/* Shtimi i materialeve */}
                  {canManageMaterials && (
                    <div className="border rounded p-3 mt-3 bg-light">
                      <h6 className="fw-bold mb-3">Shto material mesimor</h6>

                      <div className="mb-3">
                        <label className="form-label">
                          Titulli i materialit *
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          placeholder="p.sh. Prezantimi i mesimit"
                          value={materialForms[lessonId]?.title || ""}
                          onChange={(e) =>
                            updateMaterialForm(
                              lessonId,
                              "title",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Zgjidh skedarin *</label>

                        <input
                          type="file"
                          className="form-control"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];

                            updateMaterialForm(lessonId, "file", file || null);
                          }}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Lloji i materialit</label>

                        <select
                          className="form-select"
                          value={
                            materialForms[lessonId]?.materialType || "Link"
                          }
                          onChange={(e) =>
                            updateMaterialForm(
                              lessonId,
                              "materialType",
                              e.target.value,
                            )
                          }
                        >
                          <option value="Link">Link</option>
                          <option value="PDF">PDF</option>
                          <option value="Video">Video</option>
                          <option value="Document">Dokument</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={Boolean(savingMaterial[lessonId])}
                        onClick={() => addMaterial(lessonId)}
                      >
                        {savingMaterial[lessonId]
                          ? "Duke ruajtur..."
                          : "Shto materialin"}
                      </button>
                    </div>
                  )}

                  {/* Lista e materialeve */}
                  {materials[lessonId] && (
                    <div className="mt-3">
                      <h6 className="fw-bold">Materialet</h6>

                      {materials[lessonId].length === 0 ? (
                        <p className="text-secondary">
                          Nuk ka materiale per kete mesim.
                        </p>
                      ) : (
                        <ul className="mb-0">
                          {materials[lessonId].map((material) => (
                            <li
                              key={material.MaterialID ?? material.materialId}
                            >
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none"
                                onClick={() =>
                                  downloadMaterial(
                                    lesson.LessonID ||
                                      lesson.lessonId ||
                                      lessonId,
                                    material,
                                  )
                                }
                              >
                                {material.Title || material.title}
                              </button>

                              {material.MaterialType && (
                                <span className="text-secondary ms-2">
                                  ({material.MaterialType})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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

export default CourseDetails;
