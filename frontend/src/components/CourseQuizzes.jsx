import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";
import ManagementFormPanel from "./ManagementFormPanel";

const createQuestion = () => ({
  questionText: "",
  options: ["", "", "", ""],
  correctOption: 0,
});

function formatQuizDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("sq-AL");
}

function getCurrentTimeMs() {
  return Date.now();
}

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function getQuizWindowState(quiz, nowMs) {
  if (!quiz.ScheduledStartAt) return "open";

  const startMs = new Date(quiz.ScheduledStartAt).getTime();
  if (!Number.isFinite(startMs)) return "closed";
  if (nowMs < startMs) return "upcoming";

  const durationMinutes = Number(quiz.DurationMinutes);
  if (
    Number.isFinite(durationMinutes) &&
    durationMinutes > 0 &&
    nowMs >= startMs + durationMinutes * 60_000
  ) {
    return "ended";
  }

  return "open";
}

function CourseQuizzes({ courseId, lessons, userRole }) {
  const location = useLocation();
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [expandedResultsQuizId, setExpandedResultsQuizId] = useState(null);
  const [quizResults, setQuizResults] = useState({});
  const [loadingResultsQuizId, setLoadingResultsQuizId] = useState(null);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [takingQuizId, setTakingQuizId] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [clockNow, setClockNow] = useState(0);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
  const [serverExpired, setServerExpired] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    lessonId: "",
    durationMinutes: "",
    scheduledStartAt: "",
    questions: [createQuestion()],
  });

  const canManage = userRole === "Instructor";

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/quizzes/courses/${courseId}`);
      setQuizzes(response.data.quizzes || []);
      setClockNow(getCurrentTimeMs());
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Nuk u arrit të ngarkohen kuizet.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const loadAttempts = useCallback(async () => {
    if (userRole !== "Student") return;

    try {
      const response = await api.get("/quizzes/my-results");
      setAttempts(response.data.attempts || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Nuk u arrit të ngarkohen rezultatet e kuizeve.",
      );
    }
  }, [userRole]);

  useEffect(() => {
    setQuizzes([]);
    setAttempts([]);
    setActiveQuiz(null);
    setQuizResult(null);
    loadQuizzes();
    loadAttempts();
  }, [loadAttempts, loadQuizzes]);

  useEffect(() => {
    if (loading || !location.hash.startsWith("#quiz-")) return undefined;

    const quizId = location.hash.slice("#quiz-".length);
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(`quiz-${quizId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [loading, location.hash, quizzes]);

  useEffect(() => {
    if (
      activeQuiz ||
      !quizzes.some((quiz) => quiz.ScheduledStartAt)
    ) {
      return undefined;
    }

    const intervalId = window.setInterval(
      () => setClockNow(getCurrentTimeMs()),
      1000,
    );
    return () => window.clearInterval(intervalId);
  }, [activeQuiz, quizzes]);

  useEffect(() => {
    if (activeQuiz?.expiresAtMs == null || quizResult) return undefined;

    const refreshClock = () =>
      setClockNow(getCurrentTimeMs() + serverClockOffsetMs);
    const intervalId = window.setInterval(refreshClock, 250);
    window.addEventListener("focus", refreshClock);
    document.addEventListener("visibilitychange", refreshClock);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshClock);
      document.removeEventListener("visibilitychange", refreshClock);
    };
  }, [activeQuiz?.expiresAtMs, quizResult, serverClockOffsetMs]);

  function updateQuestion(questionIndex, updater) {
    setForm((previous) => ({
      ...previous,
      questions: previous.questions.map((question, index) =>
        index === questionIndex ? updater(question) : question,
      ),
    }));
  }

  function addQuestion() {
    if (form.questions.length >= 50) return;

    setForm((previous) => ({
      ...previous,
      questions: [...previous.questions, createQuestion()],
    }));
  }

  function removeQuestion(questionIndex) {
    if (form.questions.length <= 1) return;

    setForm((previous) => ({
      ...previous,
      questions: previous.questions.filter(
        (_, index) => index !== questionIndex,
      ),
    }));
  }

  async function createQuiz(event) {
    event.preventDefault();

    const invalidQuestion = form.questions.findIndex(
      (question) =>
        !question.questionText.trim() ||
        question.options.filter((option) => option.trim()).length < 2 ||
        !question.options[question.correctOption]?.trim(),
    );

    if (
      !form.title.trim() ||
      invalidQuestion >= 0 ||
      (form.scheduledStartAt && !form.durationMinutes)
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Kontrollo kuizin",
        text:
          invalidQuestion >= 0
            ? `Pyetja ${invalidQuestion + 1} duhet të ketë tekst dhe të paktën dy alternativa.`
            : form.scheduledStartAt && !form.durationMinutes
              ? "Një kuiz i planifikuar duhet të ketë kohëzgjatje."
            : "Titulli i kuizit është i detyrueshëm.",
      });
      return;
    }

    setSavingQuiz(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        lessonId: form.lessonId ? Number(form.lessonId) : null,
        durationMinutes: form.durationMinutes
          ? Number(form.durationMinutes)
          : null,
        scheduledStartAt: form.scheduledStartAt
          ? new Date(form.scheduledStartAt).toISOString()
          : null,
        questions: form.questions.map((question) => ({
          questionText: question.questionText.trim(),
          options: question.options
            .map((option, index) => ({
              optionText: option.trim(),
              isCorrect:
                Boolean(option.trim()) && index === question.correctOption,
            }))
            .filter((option) => option.optionText),
        })),
      };

      if (editingQuizId) {
        await api.put(`/quizzes/${editingQuizId}`, payload);
      } else {
        await api.post(`/quizzes/courses/${courseId}`, payload);
      }

      setForm({
        title: "",
        description: "",
        lessonId: "",
        durationMinutes: "",
        scheduledStartAt: "",
        questions: [createQuestion()],
      });
      setEditingQuizId(null);
      setShowCreateForm(false);
      await loadQuizzes();
      await Swal.fire({
        icon: "success",
        title: editingQuizId ? "Kuizi u përditësua" : "Kuizi u krijua",
        text: "Kuizi dhe pyetjet u ruajtën në kurs.",
      });
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: editingQuizId
          ? "Kuizi nuk u përditësua"
          : "Nuk u krijua kuizi",
        text:
          requestError.response?.data?.message ||
          "Kontrollo lidhjen me serverin dhe provo përsëri.",
      });
    } finally {
      setSavingQuiz(false);
    }
  }

  async function editQuiz(quizId) {
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      const quiz = response.data.quiz;
      setForm({
        title: quiz.Title,
        description: quiz.Description || "",
        lessonId: quiz.LessonID ? String(quiz.LessonID) : "",
        durationMinutes:
          quiz.DurationMinutes == null ? "" : String(quiz.DurationMinutes),
        scheduledStartAt: toLocalDateTimeInput(quiz.ScheduledStartAt),
        questions: quiz.questions.map((question) => {
          const options = question.options.map((option) => option.optionText);
          while (options.length < 4) options.push("");
          return {
            questionText: question.questionText,
            options,
            correctOption: question.options.findIndex(
              (option) => option.isCorrect,
            ),
          };
        }),
      });
      setEditingQuizId(quizId);
      setShowCreateForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "Kuizi nuk mund të modifikohet",
        text:
          requestError.response?.data?.message ||
          "Nuk u arrit të ngarkohet kuizi.",
      });
    }
  }

  async function removeQuiz(quizId, title) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Fshi kuizin?",
      text: `Kuizi "${title}" dhe të gjitha pyetjet, alternativat dhe rezultatet e tij do të fshihen.`,
      showCancelButton: true,
      confirmButtonText: "Fshi kuizin",
      cancelButtonText: "Anulo",
      confirmButtonColor: "#dc3545",
    });

    if (!confirmation.isConfirmed) return;

    try {
      await api.delete(`/quizzes/${quizId}`);
      await loadQuizzes();
      await Swal.fire({
        icon: "success",
        title: "Kuizi u fshi",
      });
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "Kuizi nuk u fshi",
        text:
          requestError.response?.data?.message ||
          "Nuk u arrit të fshihet kuizi.",
      });
    }
  }

  async function toggleQuizResults(quizId) {
    if (expandedResultsQuizId === quizId) {
      setExpandedResultsQuizId(null);
      return;
    }

    setExpandedResultsQuizId(quizId);
    setLoadingResultsQuizId(quizId);

    try {
      const response = await api.get(`/quizzes/${quizId}/results`);
      setQuizResults((previous) => ({
        ...previous,
        [quizId]: response.data.students || [],
      }));
    } catch (requestError) {
      setExpandedResultsQuizId(null);
      await Swal.fire({
        icon: "error",
        title: "Rezultatet nuk u ngarkuan",
        text:
          requestError.response?.data?.message ||
          "Nuk u arrit të ngarkohen rezultatet e kuizit.",
      });
    } finally {
      setLoadingResultsQuizId(null);
    }
  }

  async function beginQuiz(quizId) {
    setTakingQuizId(quizId);
    setQuizResult(null);
    setAnswers({});
    setServerExpired(false);
    setClockNow(getCurrentTimeMs());

    try {
      const response = await api.get(`/quizzes/${quizId}/take`);
      const serverNowMs = Number(response.data.quiz.serverNowMs);
      if (Number.isFinite(serverNowMs)) {
        setServerClockOffsetMs(serverNowMs - getCurrentTimeMs());
        setClockNow(serverNowMs);
      } else {
        setClockNow(getCurrentTimeMs());
      }
      setActiveQuiz({
        ...response.data.quiz,
        questions: response.data.questions,
      });
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        await loadAttempts();
      }

      await Swal.fire({
        icon: "error",
        title: "Kuizi nuk u hap",
        text:
          requestError.response?.data?.message ||
          "Nuk u arrit të hapet kuizi.",
      });
    } finally {
      setTakingQuizId(null);
    }
  }

  async function submitQuiz(event) {
    event.preventDefault();

    if (!activeQuiz || timeExpired) return;

    const missingAnswer = activeQuiz.questions.find(
      (question) => answers[question.questionId] == null,
    );

    if (missingAnswer) {
      await Swal.fire({
        icon: "warning",
        title: "Kuizi nuk është i plotë",
        text: "Përgjigju çdo pyetjeje para se ta dorëzosh.",
      });
      return;
    }

    setSubmittingQuiz(true);

    try {
      const response = await api.post(`/quizzes/${activeQuiz.quizId}/submit`, {
        attemptId: activeQuiz.attemptId,
        answers: activeQuiz.questions.map((question) => ({
          questionId: question.questionId,
          optionId: Number(answers[question.questionId]),
        })),
      });

      setQuizResult(response.data.result);
      await loadAttempts();
    } catch (requestError) {
      if (requestError.response?.status === 410) {
        setServerExpired(true);
        await loadAttempts();
        await Swal.fire({
          icon: "info",
          title: "Koha përfundoi",
          text: "Kuizi nuk mund të dorëzohet pasi të ketë mbaruar koha.",
        });
        return;
      }

      await Swal.fire({
        icon: "error",
        title: "Dorëzimi dështoi",
        text:
          requestError.response?.data?.message ||
          "Nuk u arrit të dorëzohet kuizi.",
      });
    } finally {
      setSubmittingQuiz(false);
    }
  }

  function closeQuiz() {
    setActiveQuiz(null);
    setQuizResult(null);
    setAnswers({});
    setServerExpired(false);
  }

  const expiresAtMs =
    activeQuiz?.expiresAtMs == null ? null : Number(activeQuiz.expiresAtMs);
  const remainingSeconds =
    expiresAtMs == null
      ? null
      : Math.max(0, Math.ceil((expiresAtMs - clockNow) / 1000));
  const timeExpired =
    serverExpired ||
    (remainingSeconds != null && remainingSeconds === 0);

  return (
    <section className="mt-5 mb-5">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Kuizet e kursit</h2>
          <p className="text-secondary mb-0">
            Pyetjet kanë pikë të barabarta dhe gjithsej 100 pikë për kuiz.
          </p>
        </div>
        {canManage && !showCreateForm && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingQuizId(null);
              setForm({
                title: "",
                description: "",
                lessonId: "",
                durationMinutes: "",
                scheduledStartAt: "",
                questions: [createQuestion()],
              });
              setShowCreateForm(true);
            }}
          >
            + Krijo kuiz
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => {
              loadQuizzes();
              loadAttempts();
            }}
          >
            Provo përsëri
          </button>
        </div>
      )}

      {canManage && showCreateForm && (
        <ManagementFormPanel
          as="form"
          eyebrow="INSTRUCTOR"
          title={editingQuizId ? "Modifiko kuizin" : "Krijo kuiz të ri"}
          description="Plotëso detajet dhe pyetjet për kuizin e kursit."
          onSubmit={createQuiz}
          className="mb-4"
        >
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h3 className="h5 fw-bold mb-0">
              {editingQuizId ? "Modifiko kuizin" : "Krijo kuiz të ri"}
            </h3>
            <span className="badge text-bg-primary">
              {form.questions.length} / 50 pyetje
            </span>
          </div>

          <label className="form-label" htmlFor="quiz-title">
            Titulli *
          </label>
          <input
            id="quiz-title"
            className="form-control mb-3"
            maxLength={200}
            required
            value={form.title}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
          />

          <label className="form-label" htmlFor="quiz-description">
            Përshkrimi
          </label>
          <textarea
            id="quiz-description"
            className="form-control mb-3"
            rows={2}
            value={form.description}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                description: event.target.value,
              }))
            }
          />

          <label className="form-label" htmlFor="quiz-duration">
            Kohëzgjatja e kuizit
          </label>
          <select
            id="quiz-duration"
            className="form-select mb-3"
            value={form.durationMinutes}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                durationMinutes: event.target.value,
              }))
            }
          >
            <option value="">Pa kufi kohor</option>
            {[5, 10, 15, 20].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minuta
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="quiz-scheduled-start">
            Data dhe ora e hapjes (opsionale)
          </label>
          <input
            id="quiz-scheduled-start"
            type="datetime-local"
            className="form-control mb-2"
            value={form.scheduledStartAt}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                scheduledStartAt: event.target.value,
              }))
            }
          />
          <p className="small text-secondary mb-3">
            Kur caktohet, kuizi hapet vetëm në këtë datë dhe orë. Afati mbyllet
            automatikisht pas kohëzgjatjes së zgjedhur.
          </p>

          <label className="form-label" htmlFor="quiz-lesson">
            Lidhe me një mësim (opsionale)
          </label>
          <select
            id="quiz-lesson"
            className="form-select mb-4"
            value={form.lessonId}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                lessonId: event.target.value,
              }))
            }
          >
            <option value="">Pa mësim të lidhur</option>
            {lessons.map((lesson) => (
              <option
                key={lesson.LessonID ?? lesson.lessonId}
                value={lesson.LessonID ?? lesson.lessonId}
              >
                {lesson.Title ?? lesson.title}
              </option>
            ))}
          </select>

          <div className="d-flex flex-column gap-3">
            {form.questions.map((question, questionIndex) => (
              <fieldset
                className="border rounded p-3"
                key={`new-question-${questionIndex}`}
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <legend className="h6 fw-bold mb-0">
                    Pyetja {questionIndex + 1}
                    <span className="text-secondary fw-normal ms-2">
                      {Number((100 / form.questions.length).toFixed(4))} pikë
                    </span>
                  </legend>
                  {form.questions.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeQuestion(questionIndex)}
                    >
                      Hiq pyetjen
                    </button>
                  )}
                </div>

                <label
                  className="form-label"
                  htmlFor={`question-text-${questionIndex}`}
                >
                  Teksti i pyetjes *
                </label>
                <textarea
                  id={`question-text-${questionIndex}`}
                  className="form-control mb-3"
                  rows={2}
                  required
                  value={question.questionText}
                  onChange={(event) =>
                    updateQuestion(questionIndex, (current) => ({
                      ...current,
                      questionText: event.target.value,
                    }))
                  }
                />

                <p className="small text-secondary mb-2">
                  Shëno vetëm një alternativë si përgjigjen e saktë.
                </p>
                <div className="row g-2">
                  {question.options.map((option, optionIndex) => (
                    <div className="col-md-6" key={optionIndex}>
                      <div className="input-group">
                        <span className="input-group-text">
                          <input
                            type="radio"
                            className="form-check-input mt-0"
                            name={`correct-option-${questionIndex}`}
                            aria-label={`Shëno alternativën ${optionIndex + 1} si të saktë`}
                            checked={question.correctOption === optionIndex}
                            onChange={() =>
                              updateQuestion(questionIndex, (current) => ({
                                ...current,
                                correctOption: optionIndex,
                              }))
                            }
                          />
                        </span>
                        <input
                          className="form-control"
                          maxLength={500}
                          aria-label={`Alternativa ${optionIndex + 1} e pyetjes ${questionIndex + 1}`}
                          placeholder={`Alternativa ${optionIndex + 1}`}
                          value={option}
                          onChange={(event) =>
                            updateQuestion(questionIndex, (current) => ({
                              ...current,
                              options: current.options.map((value, index) =>
                                index === optionIndex
                                  ? event.target.value
                                  : value,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="d-flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={form.questions.length >= 50}
              onClick={addQuestion}
            >
              + Shto pyetje
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={savingQuiz}
            >
              {savingQuiz
                ? "Duke ruajtur..."
                : editingQuizId
                  ? "Ruaj ndryshimet"
                  : "Ruaj kuizin"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={savingQuiz}
              onClick={() => {
                setShowCreateForm(false);
                setEditingQuizId(null);
              }}
            >
              Anulo
            </button>
          </div>
        </ManagementFormPanel>
      )}

      {activeQuiz ? (
        <article className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <span className="badge text-bg-primary mb-2">
                  {activeQuiz.questions.length} pyetje · 100 pikë
                </span>
                <h3 className="h4 fw-bold">{activeQuiz.title}</h3>
                {activeQuiz.description && (
                  <p className="text-secondary">{activeQuiz.description}</p>
                )}
              </div>
              {remainingSeconds != null && (
                <span
                  className={`badge fs-6 ${timeExpired ? "text-bg-danger" : "text-bg-warning"}`}
                  role="timer"
                  aria-live="polite"
                >
                  {timeExpired
                    ? "Koha përfundoi"
                    : `Koha: ${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`}
                </span>
              )}
              <button
                type="button"
                className="btn-close"
                aria-label="Mbyll kuizin"
                onClick={closeQuiz}
              />
            </div>

            {quizResult ? (
              <div className="alert alert-success mb-0">
                <h4 className="h5 fw-bold">
                  Rezultati: {Number(quizResult.score).toFixed(2)} / 100
                </h4>
                <p className="mb-2">
                  Përgjigje të sakta: {quizResult.correctAnswers} nga{" "}
                  {quizResult.questionCount}
                </p>
                <p className="small mb-3">
                  Përfunduar: {formatQuizDate(quizResult.completedAt)}
                </p>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={closeQuiz}
                >
                  Kthehu te kuizet
                </button>
              </div>
            ) : (
              <form onSubmit={submitQuiz}>
                {timeExpired && (
                  <div className="alert alert-danger" role="alert">
                    Koha përfundoi. Përgjigjet janë bllokuar dhe kuizi nuk mund
                    të dorëzohet.
                  </div>
                )}
                {activeQuiz.questions.map((question, index) => (
                  <fieldset
                    className="border rounded p-3 mb-3"
                    key={question.questionId}
                  >
                    <legend className="h6 fw-bold">
                      {index + 1}. {question.questionText}
                      <span className="text-secondary small fw-normal ms-2">
                        {Number(question.points).toFixed(4)} pikë
                      </span>
                    </legend>
                    {question.options.map((option) => (
                      <label
                        className="d-flex align-items-center gap-2 p-2 rounded"
                        key={option.optionId}
                      >
                        <input
                          type="radio"
                          className="form-check-input mt-0"
                          disabled={timeExpired || submittingQuiz}
                          name={`answer-${question.questionId}`}
                          value={option.optionId}
                          checked={
                            Number(answers[question.questionId]) ===
                            Number(option.optionId)
                          }
                          onChange={() =>
                            setAnswers((previous) => ({
                              ...previous,
                              [question.questionId]: option.optionId,
                            }))
                          }
                        />
                        <span>{option.optionText}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={submittingQuiz || timeExpired}
                  >
                    {submittingQuiz
                      ? "Duke dorëzuar..."
                      : timeExpired
                        ? "Koha përfundoi"
                        : "Dorëzo kuizin"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={submittingQuiz}
                    onClick={closeQuiz}
                  >
                    Anulo
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>
      ) : (
        <>
          {loading && <p className="text-secondary">Duke ngarkuar kuizet...</p>}
          {!loading && quizzes.length === 0 && !error && (
            <div className="alert alert-info">
              Nuk ka kuize të publikuara për këtë kurs.
            </div>
          )}
          <div className="row g-3">
            {quizzes.map((quiz) => {
              const quizId = quiz.QuizID ?? quiz.quizId;
              const quizAttempts = attempts.filter(
                (attempt) => Number(attempt.QuizID) === Number(quizId),
              );
              const completedAttempt = quizAttempts.find(
                (attempt) => attempt.CompletedAt != null,
              );
              const activeAttempt = quizAttempts.find(
                (attempt) => attempt.CompletedAt == null,
              );
              const questionCount = Number(quiz.QuestionCount);
              const windowState = getQuizWindowState(quiz, clockNow);
              const attemptHasEnded =
                windowState === "ended" && Boolean(activeAttempt);

              return (
                <div className="col-md-6" key={quizId}>
                  <article
                    id={`quiz-${quizId}`}
                    className="card border-0 shadow-sm h-100"
                    style={{ scrollMarginTop: "6rem" }}
                  >
                    <div className="card-body p-4 d-flex flex-column">
                      <div className="d-flex justify-content-between gap-2">
                        <h3 className="h5 fw-bold">{quiz.Title}</h3>
                        <span className="badge text-bg-light align-self-start">
                          {questionCount} pyetje
                        </span>
                      </div>
                      {quiz.Description && (
                        <p className="text-secondary">{quiz.Description}</p>
                      )}
                      {quiz.LessonID && (
                        <p className="small text-secondary">
                          Mësimi:{" "}
                          {lessons.find(
                            (lesson) =>
                              Number(lesson.LessonID ?? lesson.lessonId) ===
                              Number(quiz.LessonID),
                          )?.Title || "Mësim i lidhur"}
                        </p>
                      )}
                      <p className="small text-secondary">
                        {questionCount
                          ? `${Number((100 / questionCount).toFixed(4))} pikë për pyetje · 100 pikë gjithsej`
                          : "Kuizi nuk ka pyetje."}
                      </p>
                      {quiz.DurationMinutes != null && (
                        <p className="small text-secondary">
                          Kohëzgjatja: {quiz.DurationMinutes} minuta
                        </p>
                      )}
                      {quiz.ScheduledStartAt && (
                        <p className="small text-secondary">
                          Hapet: {formatQuizDate(quiz.ScheduledStartAt)}
                        </p>
                      )}
                      {userRole === "Student" &&
                        windowState === "upcoming" && (
                          <div className="alert alert-info py-2">
                            Kuizi hapet në{" "}
                            <strong>
                              {formatQuizDate(quiz.ScheduledStartAt)}
                            </strong>
                          </div>
                        )}
                      {userRole === "Student" &&
                        (windowState === "ended" || attemptHasEnded) && (
                          <div className="alert alert-secondary py-2">
                            Afati i kuizit ka përfunduar.
                          </div>
                        )}
                      {canManage && (
                        <div className="d-flex flex-wrap gap-2 mt-auto mb-3">
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            disabled={loadingResultsQuizId === quizId}
                            onClick={() => toggleQuizResults(quizId)}
                          >
                            {loadingResultsQuizId === quizId
                              ? "Duke ngarkuar..."
                              : expandedResultsQuizId === quizId
                                ? "Fshih rezultatet"
                                : "Rezultatet"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => editQuiz(quizId)}
                          >
                            Modifiko
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeQuiz(quizId, quiz.Title)}
                          >
                            Fshi
                          </button>
                        </div>
                      )}
                      {canManage && expandedResultsQuizId === quizId && (
                        <div className="border rounded p-3 mb-3">
                          <h4 className="h6 fw-bold mb-3">
                            Rezultatet e studentëve të regjistruar
                          </h4>
                          {loadingResultsQuizId === quizId ? (
                            <p className="text-secondary mb-0">
                              Duke ngarkuar rezultatet...
                            </p>
                          ) : quizResults[quizId]?.length ? (
                            <div className="table-responsive">
                              <table className="table table-sm table-hover align-middle mb-0">
                                <thead>
                                  <tr>
                                    <th scope="col">Studenti</th>
                                    <th scope="col">Pikët</th>
                                    <th scope="col">Tentativa</th>
                                    <th scope="col">Gjendja</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quizResults[quizId].map((student) => (
                                    <tr key={student.StudentID}>
                                      <td>
                                        <div className="fw-semibold">
                                          {student.FirstName} {student.LastName}
                                        </div>
                                        <small className="text-secondary">
                                          {student.Email}
                                        </small>
                                      </td>
                                      <td>
                                        <strong>
                                          {Number(student.Score).toFixed(2)} /
                                          100
                                        </strong>
                                      </td>
                                      <td>{student.AttemptCount}</td>
                                      <td>
                                        <span
                                          className={`badge ${
                                            student.ResultStatus === "Submitted"
                                              ? "text-bg-success"
                                              : student.ResultStatus ===
                                                  "Absent"
                                                ? "text-bg-danger"
                                                : "text-bg-warning"
                                          }`}
                                        >
                                          {student.ResultStatus ===
                                          "Submitted"
                                            ? "Përfunduar"
                                            : student.ResultStatus === "Absent"
                                              ? "Mungon · 0 tentativa"
                                              : "Nuk u dorëzua"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-secondary mb-0">
                              Nuk ka studentë aktivë të regjistruar në këtë
                              kurs.
                            </p>
                          )}
                        </div>
                      )}
                      {userRole === "Student" &&
                        (completedAttempt || activeAttempt) && (
                          <div className="alert alert-light border py-2">
                            {completedAttempt ? (
                              <>
                                Përpjekja e vetme është përdorur.{" "}
                                {completedAttempt.Score == null ? (
                                  <strong>
                                    Përpjekja përfundoi pa rezultat të
                                    regjistruar.
                                  </strong>
                                ) : (
                                  <>
                                    Rezultati:{" "}
                                    <strong>
                                      {Number(completedAttempt.Score).toFixed(
                                        2,
                                      )}{" "}
                                      / 100
                                    </strong>
                                  </>
                                )}
                              </>
                            ) : (
                              <strong>
                                Përpjekja ka nisur. Mund të vazhdosh të njëjtën
                                përpjekje.
                              </strong>
                            )}
                          </div>
                        )}
                      {userRole === "Student" && (
                        <button
                          type="button"
                          className="btn btn-primary mt-auto align-self-start"
                          disabled={
                            questionCount < 1 ||
                            takingQuizId === Number(quizId) ||
                            Boolean(completedAttempt) ||
                            windowState !== "open"
                          }
                          onClick={() => beginQuiz(quizId)}
                        >
                          {takingQuizId === Number(quizId)
                            ? "Duke hapur..."
                            : completedAttempt
                              ? "Përpjekja u përdor"
                              : activeAttempt
                                ? "Vazhdo kuizin"
                                : windowState === "upcoming"
                                  ? "Ende nuk është hapur"
                                  : windowState === "ended"
                                    ? "Afati përfundoi"
                                    : "Fillo kuizin"}
                        </button>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </>
      )}

    </section>
  );
}

export default CourseQuizzes;
