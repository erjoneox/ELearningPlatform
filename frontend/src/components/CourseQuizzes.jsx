import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import api from "../api/axios";

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

function CourseQuizzes({ courseId, lessons, userRole }) {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [takingQuizId, setTakingQuizId] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    lessonId: "",
    questions: [createQuestion()],
  });

  const canManage = userRole === "Admin" || userRole === "Instructor";

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/quizzes/courses/${courseId}`);
      setQuizzes(response.data.quizzes || []);
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

    if (!form.title.trim() || invalidQuestion >= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Kontrollo kuizin",
        text:
          invalidQuestion >= 0
            ? `Pyetja ${invalidQuestion + 1} duhet të ketë tekst dhe të paktën dy alternativa.`
            : "Titulli i kuizit është i detyrueshëm.",
      });
      return;
    }

    setSavingQuiz(true);

    try {
      await api.post(`/quizzes/courses/${courseId}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        lessonId: form.lessonId ? Number(form.lessonId) : null,
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
      });

      setForm({
        title: "",
        description: "",
        lessonId: "",
        questions: [createQuestion()],
      });
      setShowCreateForm(false);
      await loadQuizzes();
      await Swal.fire({
        icon: "success",
        title: "Kuizi u krijua",
        text: "Kuizi dhe pyetjet u ruajtën në kurs.",
      });
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "Nuk u krijua kuizi",
        text:
          requestError.response?.data?.message ||
          "Kontrollo lidhjen me serverin dhe provo përsëri.",
      });
    } finally {
      setSavingQuiz(false);
    }
  }

  async function beginQuiz(quizId) {
    setTakingQuizId(quizId);
    setQuizResult(null);
    setAnswers({});

    try {
      const response = await api.get(`/quizzes/${quizId}/take`);
      setActiveQuiz({ ...response.data.quiz, questions: response.data.questions });
    } catch (requestError) {
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

    if (!activeQuiz) return;

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
        answers: activeQuiz.questions.map((question) => ({
          questionId: question.questionId,
          optionId: Number(answers[question.questionId]),
        })),
      });

      setQuizResult(response.data.result);
      await loadAttempts();
    } catch (requestError) {
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
  }

  const selectedQuizAttempts = attempts.filter(
    (attempt) => Number(attempt.QuizID) === Number(activeQuiz?.quizId),
  );

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
            onClick={() => setShowCreateForm(true)}
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
        <form className="card card-body shadow-sm mb-4" onSubmit={createQuiz}>
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h3 className="h5 fw-bold mb-0">Krijo kuiz të ri</h3>
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
              {savingQuiz ? "Duke ruajtur..." : "Ruaj kuizin"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={savingQuiz}
              onClick={() => setShowCreateForm(false)}
            >
              Anulo
            </button>
          </div>
        </form>
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
                    disabled={submittingQuiz}
                  >
                    {submittingQuiz ? "Duke dorëzuar..." : "Dorëzo kuizin"}
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
              const latestAttempt = quizAttempts[0];
              const questionCount = Number(quiz.QuestionCount);

              return (
                <div className="col-md-6" key={quizId}>
                  <article className="card border-0 shadow-sm h-100">
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
                      {userRole === "Student" && latestAttempt && (
                        <div className="alert alert-light border py-2">
                          Përpjekje: {quizAttempts.length} · Rezultati i fundit:{" "}
                          <strong>
                            {Number(latestAttempt.Score).toFixed(2)} / 100
                          </strong>
                        </div>
                      )}
                      {userRole === "Student" && (
                        <button
                          type="button"
                          className="btn btn-primary mt-auto align-self-start"
                          disabled={
                            questionCount < 1 ||
                            takingQuizId === Number(quizId)
                          }
                          onClick={() => beginQuiz(quizId)}
                        >
                          {takingQuizId === Number(quizId)
                            ? "Duke hapur..."
                            : latestAttempt
                              ? "Provo përsëri"
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

      {activeQuiz && selectedQuizAttempts.length > 0 && !quizResult && (
        <p className="small text-secondary mt-2">
          Përpjekjet e mëparshme për këtë kuiz: {selectedQuizAttempts.length}
        </p>
      )}
    </section>
  );
}

export default CourseQuizzes;
