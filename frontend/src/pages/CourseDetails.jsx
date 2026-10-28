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
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});
  const [submissionPanels, setSubmissionPanels] = useState({});
  const [loadingSubmissions, setLoadingSubmissions] = useState({});
  const [savingGrades, setSavingGrades] = useState({});
  const [gradeForms, setGradeForms] = useState({});
  const [assignmentFiles, setAssignmentFiles] = useState({});
  const [savingSubmission, setSavingSubmission] = useState({});
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    maxPoints: 100,
  });

  const canManageAssignments =
    user?.role === "Admin" || user?.role === "Instructor";

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

  async function loadAssignments() {
    try {
      const response = await api.get(`/assignments/courses/${courseId}`);

      setAssignments(response.data.assignments || []);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text:
          err.response?.data?.message || "Nuk u arrit të ngarkohen detyrat.",
      });
    }
  }

  async function loadMySubmissions() {
    if (user?.role !== "Student") return;

    try {
      const response = await api.get("/assignments/my-submissions");

      setMySubmissions(response.data.submissions || []);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text:
          err.response?.data?.message || "Nuk u arrit të ngarkohen dorëzimet.",
      });
    }
  }

  async function loadAssignmentSubmissions(assignmentId) {
    setLoadingSubmissions((previous) => ({
      ...previous,
      [assignmentId]: true,
    }));

    try {
      const response = await api.get(
        `/assignments/${assignmentId}/submissions`,
      );
      const submissions = response.data.submissions || [];

      setSubmissionsByAssignment((previous) => ({
        ...previous,
        [assignmentId]: submissions,
      }));
      setGradeForms((previous) => {
        const next = { ...previous };

        submissions.forEach((submission) => {
          if (!next[submission.SubmissionID]) {
            next[submission.SubmissionID] = {
              grade: submission.Grade ?? "",
              feedback: submission.Feedback ?? "",
            };
          }
        });

        return next;
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text:
          err.response?.data?.message ||
          "Nuk u arrit të ngarkohen dorëzimet e studentëve.",
      });
    } finally {
      setLoadingSubmissions((previous) => ({
        ...previous,
        [assignmentId]: false,
      }));
    }
  }

  async function toggleAssignmentSubmissions(assignmentId) {
    const isOpen = Boolean(submissionPanels[assignmentId]);

    setSubmissionPanels((previous) => ({
      ...previous,
      [assignmentId]: !isOpen,
    }));

    if (!isOpen && !Object.hasOwn(submissionsByAssignment, assignmentId)) {
      await loadAssignmentSubmissions(assignmentId);
    }
  }

  async function gradeAssignmentSubmission(assignmentId, submissionId) {
    const form = gradeForms[submissionId] || {};
    const grade = Number(form.grade);
    const assignment = assignments.find(
      (item) => Number(item.AssignmentID) === Number(assignmentId),
    );

    if (
      !Number.isInteger(grade) ||
      grade < 0 ||
      grade > 100 ||
      grade > Number(assignment?.MaxPoints)
    ) {
      Swal.fire({
        icon: "warning",
        title: "Nota e pavlefshme",
        text: `Nota duhet të jetë një numër i plotë nga 0 deri në ${assignment?.MaxPoints ?? 100}.`,
      });
      return;
    }

    setSavingGrades((previous) => ({
      ...previous,
      [submissionId]: true,
    }));

    try {
      const response = await api.patch(
        `/assignments/submissions/${submissionId}/grade`,
        {
          grade,
          feedback: form.feedback?.trim() || null,
        },
      );

      setGradeForms((previous) => ({
        ...previous,
        [submissionId]: {
          grade: response.data.submission.Grade,
          feedback: response.data.submission.Feedback || "",
        },
      }));
      setSubmissionsByAssignment((previous) => ({
        ...previous,
        [assignmentId]: (previous[assignmentId] || []).map((submission) =>
          Number(submission.SubmissionID) === Number(submissionId)
            ? {
                ...submission,
                Grade: response.data.submission.Grade,
                Feedback: response.data.submission.Feedback,
              }
            : submission,
        ),
      }));

      Swal.fire({
        icon: "success",
        title: "Vlerësimi u ruajt",
        text: "Nota dhe komenti u ruajtën me sukses.",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text: err.response?.data?.message || "Nuk u arrit të ruhet vlerësimi.",
      });
    } finally {
      setSavingGrades((previous) => ({
        ...previous,
        [submissionId]: false,
      }));
    }
  }

  async function downloadSubmissionFile(submission) {
    try {
      const response = await api.get(
        `/assignments/submissions/${submission.SubmissionID}/file`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download =
        submission.FileURL?.split("/").pop() ||
        `submission-${submission.SubmissionID}`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text:
          err.response?.data?.message ||
          "Nuk u arrit të shkarkohet puna e dorëzuar.",
      });
    }
  }

  useEffect(() => {
    if (!courseId || !user?.role) return;

    loadAssignments();

    if (user.role === "Student") {
      loadMySubmissions();
    }
  }, [courseId, user?.role]);

  async function createAssignment(e) {
    e.preventDefault();

    const maxPoints = Number(assignmentForm.maxPoints);

    if (
      !assignmentForm.title.trim() ||
      !Number.isInteger(maxPoints) ||
      maxPoints <= 0 ||
      maxPoints > 100
    ) {
      Swal.fire({
        icon: "warning",
        title: "Të dhëna të pavlefshme",
        text: "Shkruaj titullin dhe një numër të pikëve nga 1 deri në 100.",
      });
      return;
    }

    setSavingAssignment(true);

    try {
      await api.post(`/assignments/courses/${courseId}`, {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        dueDate: assignmentForm.dueDate
          ? new Date(assignmentForm.dueDate).toISOString()
          : null,
        maxPoints,
      });

      setAssignmentForm({
        title: "",
        description: "",
        dueDate: "",
        maxPoints: 100,
      });

      await loadAssignments();

      Swal.fire({
        icon: "success",
        title: "Detyra u krijua",
        text: "Detyra u ruajt me sukses.",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gabim",
        text: err.response?.data?.message || "Nuk u arrit të krijohet detyra.",
      });
    } finally {
      setSavingAssignment(false);
    }
  }

  async function submitAssignmentWork(assignmentId) {
    const file = assignmentFiles[assignmentId];

    if (!file) {
      Swal.fire({
        icon: "warning",
        title: "Zgjidh një skedar",
        text: "Duhet të zgjedhësh skedarin që dëshiron ta dorëzosh.",
      });
      return;
    }

    const allowedExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      Swal.fire({
        icon: "warning",
        title: "Format i pambështetur",
        text: "Lejohen skedarët PDF, DOC, DOCX, PPT dhe PPTX.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Skedar shumë i madh",
        text: "Madhësia maksimale e skedarit është 10 MB.",
      });
      return;
    }

    setSavingSubmission((previous) => ({
      ...previous,
      [assignmentId]: true,
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      await api.post(`/assignments/${assignmentId}/submit`, formData);

      setAssignmentFiles((previous) => ({
        ...previous,
        [assignmentId]: null,
      }));

      await Promise.all([loadAssignments(), loadMySubmissions()]);

      Swal.fire({
        icon: "success",
        title: "Detyra u dorëzua",
        text: "Skedari u dorëzua me sukses.",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Dorëzimi dështoi",
        text: err.response?.data?.message || "Nuk u arrit të dorëzohet detyra.",
      });
    } finally {
      setSavingSubmission((previous) => ({
        ...previous,
        [assignmentId]: false,
      }));
    }
  }

  function formatAssignmentDate(value) {
    if (!value) return "Pa afat";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Datë e pavlefshme";

    return date.toLocaleString("sq-AL");
  }

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <Link to="/courses" className="btn btn-link px-0 mb-3">
          &larr; Kthehu te kurset
        </Link>

        <h1 className="fw-bold">Permbajtja e kursit</h1>

        <p className="text-secondary">Mesimet dhe materialet mesimore.</p>

        {/* Detyrat e kursit */}
        <section className="mt-5 mb-5">
          <h2 className="fw-bold mb-3">Detyrat e kursit</h2>

          {/* Krijimi i detyrave nga instruktori ose administratori */}
          {canManageAssignments && (
            <form
              className="card card-body shadow-sm mb-4"
              onSubmit={createAssignment}
            >
              <h5 className="fw-bold">Krijo detyrë të re</h5>

              <div className="mb-3">
                <label className="form-label">Titulli *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  maxLength={200}
                  value={assignmentForm.title}
                  onChange={(e) =>
                    setAssignmentForm((previous) => ({
                      ...previous,
                      title: e.target.value,
                    }))
                  }
                  placeholder="p.sh. Detyra e parë në HTML"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Përshkrimi</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={assignmentForm.description}
                  onChange={(e) =>
                    setAssignmentForm((previous) => ({
                      ...previous,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Përshkruaj kërkesat e detyrës"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Afati i dorëzimit</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={assignmentForm.dueDate}
                  onChange={(e) =>
                    setAssignmentForm((previous) => ({
                      ...previous,
                      dueDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Pikët maksimale *</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="100"
                  step="1"
                  required
                  value={assignmentForm.maxPoints}
                  onChange={(e) =>
                    setAssignmentForm((previous) => ({
                      ...previous,
                      maxPoints: e.target.value,
                    }))
                  }
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary align-self-start"
                disabled={savingAssignment}
              >
                {savingAssignment ? "Duke ruajtur..." : "Krijo detyrën"}
              </button>
            </form>
          )}

          {/* Lista e detyrave */}
          {assignments.length === 0 ? (
            <div className="alert alert-info">Nuk ka detyra për këtë kurs.</div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {assignments.map((assignment) => {
                const assignmentId = assignment.AssignmentID;
                const existingSubmission = mySubmissions.find(
                  (submission) =>
                    Number(submission.AssignmentID) === Number(assignmentId),
                );

                const deadlinePassed =
                  assignment.DueDate &&
                  new Date() > new Date(assignment.DueDate);

                return (
                  <article
                    className="card border-0 shadow-sm"
                    key={assignmentId}
                  >
                    <div className="card-body p-4">
                      <h5 className="fw-bold">{assignment.Title}</h5>

                      {assignment.Description && (
                        <p className="text-secondary">
                          {assignment.Description}
                        </p>
                      )}

                      <p className="mb-1">
                        <strong>Afati:</strong>{" "}
                        {formatAssignmentDate(assignment.DueDate)}
                      </p>

                      <p className="mb-3">
                        <strong>Pikët maksimale:</strong> {assignment.MaxPoints}
                      </p>

                      {user?.role === "Student" && (
                        <>
                          {existingSubmission ? (
                            <div className="alert alert-success mb-0">
                              <p className="fw-bold mb-1">
                                Detyra është dorëzuar
                              </p>

                              <p className="mb-1">
                                Data:{" "}
                                {formatAssignmentDate(
                                  existingSubmission.SubmittedAt,
                                )}
                              </p>

                              <p className="mb-1">
                                Nota:{" "}
                                {existingSubmission.Grade == null
                                  ? "Në pritje të vlerësimit"
                                  : `${existingSubmission.Grade} / ${assignment.MaxPoints}`}
                              </p>

                              {existingSubmission.Feedback && (
                                <p className="mb-0">
                                  <strong>Komenti:</strong>{" "}
                                  {existingSubmission.Feedback}
                                </p>
                              )}

                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm mt-2"
                                onClick={() =>
                                  downloadSubmissionFile(existingSubmission)
                                }
                              >
                                Shiko punën e dorëzuar
                              </button>
                            </div>
                          ) : deadlinePassed ? (
                            <div className="alert alert-warning mb-0">
                              Afati i dorëzimit ka kaluar.
                            </div>
                          ) : (
                            <div className="border rounded p-3">
                              <label className="form-label">
                                Zgjidh skedarin e detyrës
                              </label>

                              <input
                                type="file"
                                className="form-control mb-3"
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                onChange={(e) =>
                                  setAssignmentFiles((previous) => ({
                                    ...previous,
                                    [assignmentId]: e.target.files?.[0] || null,
                                  }))
                                }
                              />

                              <button
                                type="button"
                                className="btn btn-success"
                                disabled={Boolean(
                                  savingSubmission[assignmentId],
                                )}
                                onClick={() =>
                                  submitAssignmentWork(assignmentId)
                                }
                              >
                                {savingSubmission[assignmentId]
                                  ? "Duke dorëzuar..."
                                  : "Dorëzo detyrën"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {canManageAssignments && (
                        <div className="border rounded p-3 mt-3 bg-light">
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h6 className="fw-bold mb-0">
                              Dorëzimet e studentëve
                            </h6>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() =>
                                toggleAssignmentSubmissions(assignmentId)
                              }
                            >
                              {submissionPanels[assignmentId]
                                ? "Mbyll dorëzimet"
                                : "Shiko dorëzimet"}
                            </button>
                          </div>

                          {submissionPanels[assignmentId] && (
                            <div className="mt-3">
                              {loadingSubmissions[assignmentId] ? (
                                <p className="text-secondary mb-0">
                                  Duke ngarkuar dorëzimet...
                                </p>
                              ) : submissionsByAssignment[assignmentId]
                                  ?.length ? (
                                <div className="d-flex flex-column gap-3">
                                  {submissionsByAssignment[assignmentId].map(
                                    (submission) => {
                                      const gradeForm =
                                        gradeForms[submission.SubmissionID] ||
                                        {};

                                      return (
                                        <div
                                          className="card"
                                          key={submission.SubmissionID}
                                        >
                                          <div className="card-body">
                                            <h6 className="fw-bold">
                                              {submission.FirstName}{" "}
                                              {submission.LastName}
                                            </h6>
                                            <p className="small text-secondary mb-2">
                                              {submission.Email} ·{" "}
                                              {formatAssignmentDate(
                                                submission.SubmittedAt,
                                              )}
                                            </p>
                                            <button
                                              type="button"
                                              className="btn btn-link p-0 mb-3"
                                              onClick={() =>
                                                downloadSubmissionFile(
                                                  submission,
                                                )
                                              }
                                            >
                                              Shkarko punën e studentit
                                            </button>

                                            <div className="row g-2">
                                              <div className="col-md-3">
                                                <label
                                                  className="form-label"
                                                  htmlFor={`grade-${submission.SubmissionID}`}
                                                >
                                                  Nota (0–
                                                  {assignment.MaxPoints})
                                                </label>
                                                <input
                                                  id={`grade-${submission.SubmissionID}`}
                                                  type="number"
                                                  className="form-control"
                                                  min="0"
                                                  max={assignment.MaxPoints}
                                                  step="1"
                                                  required
                                                  value={gradeForm.grade}
                                                  onChange={(event) =>
                                                    setGradeForms(
                                                      (previous) => ({
                                                        ...previous,
                                                        [submission.SubmissionID]:
                                                          {
                                                            ...gradeForm,
                                                            grade:
                                                              event.target
                                                                .value,
                                                          },
                                                      }),
                                                    )
                                                  }
                                                />
                                              </div>
                                              <div className="col-md-9">
                                                <label
                                                  className="form-label"
                                                  htmlFor={`feedback-${submission.SubmissionID}`}
                                                >
                                                  Komenti për studentin
                                                </label>
                                                <textarea
                                                  id={`feedback-${submission.SubmissionID}`}
                                                  className="form-control"
                                                  rows={2}
                                                  value={
                                                    gradeForm.feedback || ""
                                                  }
                                                  onChange={(event) =>
                                                    setGradeForms(
                                                      (previous) => ({
                                                        ...previous,
                                                        [submission.SubmissionID]:
                                                          {
                                                            ...gradeForm,
                                                            feedback:
                                                              event.target
                                                                .value,
                                                          },
                                                      }),
                                                    )
                                                  }
                                                />
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              className="btn btn-primary btn-sm mt-3"
                                              disabled={
                                                Boolean(
                                                  savingGrades[
                                                    submission.SubmissionID
                                                  ],
                                                ) ||
                                                gradeForm.grade === ""
                                              }
                                              onClick={() =>
                                                gradeAssignmentSubmission(
                                                  assignmentId,
                                                  submission.SubmissionID,
                                                )
                                              }
                                            >
                                              {savingGrades[
                                                submission.SubmissionID
                                              ]
                                                ? "Duke ruajtur..."
                                                : "Ruaj vlerësimin"}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              ) : (
                                <p className="text-secondary mb-0">
                                  Ende nuk ka dorëzime për këtë detyrë.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

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
