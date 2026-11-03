const {
  getQuizzesByCourse,
  createQuizWithQuestions,
  getQuizById,
  getQuizForManagement,
  getQuestionsForStudent,
  getQuestionsForGrading,
  getOrCreateQuizAttempt,
  completeQuizAttempt,
  updateQuizWithQuestions,
  deleteQuiz,
  getStudentAttempts,
  getQuizResults,
} = require("../models/quizModel");

const { getCourseById } = require("../models/courseModel");
const { getLessonById } = require("../models/lessonModel");
const { connectDB } = require("../config/db");
const sql = require("mssql");

const QUIZ_DURATIONS_MINUTES = [5, 10, 15, 20];

function parseQuizInput(body) {
  body = body && typeof body === "object" ? body : {};
  const { title, description, lessonId, questions, durationMinutes } = body;
  const parsedDurationMinutes =
    durationMinutes == null || durationMinutes === ""
      ? null
      : Number(durationMinutes);

  if (
    (parsedDurationMinutes != null &&
      !QUIZ_DURATIONS_MINUTES.includes(parsedDurationMinutes)) ||
    (body.scheduledStartAt != null &&
      typeof body.scheduledStartAt !== "string")
  ) {
    return { error: "Select a valid quiz duration and start date/time." };
  }

  let scheduledStartAt = null;
  if (body.scheduledStartAt) {
    scheduledStartAt = new Date(body.scheduledStartAt);

    if (
      Number.isNaN(scheduledStartAt.getTime()) ||
      scheduledStartAt.getTime() <= Date.now() ||
      parsedDurationMinutes == null
    ) {
      return {
        error:
          "A scheduled quiz needs a future start date/time and a preset duration.",
      };
    }
  }

  const questionError = validateQuizQuestions(questions);

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 200 ||
    questionError
  ) {
    return {
      error:
        questionError ||
        "A valid quiz title (up to 200 characters) and questions are required.",
    };
  }

  return {
    value: {
      title: title.trim(),
      description:
        typeof description === "string" ? description.trim() : null,
      lessonId,
      durationMinutes: parsedDurationMinutes,
      scheduledStartAt,
      questions: questions.map((question) => ({
        questionText: question.questionText.trim(),
        options: question.options.map((option) => ({
          optionText: option.optionText.trim(),
          isCorrect: option.isCorrect,
        })),
      })),
    },
  };
}

async function validateLessonForCourse(lessonId, courseId) {
  if (lessonId == null || lessonId === "") return { lessonId: null };

  const parsedLessonId = Number(lessonId);
  if (!Number.isInteger(parsedLessonId) || parsedLessonId <= 0) {
    return { error: "Invalid lesson ID." };
  }

  const lesson = await getLessonById(parsedLessonId);
  if (!lesson || Number(lesson.CourseID) !== courseId) {
    return { error: "The lesson must belong to this course." };
  }

  return { lessonId: parsedLessonId };
}

async function hasEnrollment(studentId, courseId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("studentId", sql.Int, studentId)
    .input("courseId", sql.Int, courseId).query(`
            SELECT EnrollmentID
            FROM Enrollments
            WHERE StudentID = @studentId
              AND CourseID = @courseId
              AND Status = 'Active'
        `);

  return result.recordset.length > 0;
}

async function canManageCourse(course, user) {
  return (
    user.role === "Instructor" &&
    Number(course.InstructorID) === Number(user.userId)
  );
}

function validateQuizQuestions(questions) {
  if (
    !Array.isArray(questions) ||
    questions.length < 1 ||
    questions.length > 50
  ) {
    return "A quiz must contain between 1 and 50 questions.";
  }

  for (const [index, question] of questions.entries()) {
    if (
      !question ||
      typeof question.questionText !== "string" ||
      !question.questionText.trim() ||
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.some(
        (option) =>
          !option ||
          typeof option.optionText !== "string" ||
          !option.optionText.trim() ||
          option.optionText.trim().length > 500 ||
          typeof option.isCorrect !== "boolean",
      ) ||
      question.options.filter((option) => option.isCorrect).length !== 1
    ) {
      return `Question ${index + 1} needs text, at least two options, and exactly one correct answer.`;
    }
  }

  return null;
}

async function listQuizzes(req, res) {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    const course = await getCourseById(courseId);

    if (!course || course.Status !== "Active") {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (req.user.role === "Student") {
      if (!(await hasEnrollment(req.user.userId, courseId))) {
        return res.status(403).json({
          message: "You must be enrolled in this course.",
        });
      }
    } else if (
      req.user.role !== "Admin" &&
      !(await canManageCourse(course, req.user))
    ) {
      return res.status(403).json({
        message: "You cannot access these quizzes.",
      });
    }

    const quizzes = await getQuizzesByCourse(courseId);
    return res.status(200).json({ quizzes });
  } catch (error) {
    console.error("List quizzes error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve quizzes.",
    });
  }
}

async function addQuiz(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const parsed = parseQuizInput(req.body);

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      parsed.error
    ) {
      return res.status(400).json({
        message: parsed.error || "Invalid course ID.",
      });
    }

    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You cannot create quizzes for this course.",
      });
    }

    const lesson = await validateLessonForCourse(parsed.value.lessonId, courseId);
    if (lesson.error) {
      return res.status(400).json({ message: lesson.error });
    }

    const quiz = await createQuizWithQuestions(courseId, {
      ...parsed.value,
      lessonId: lesson.lessonId,
    });

    return res.status(201).json({
      message: "Quiz created successfully.",
      quiz,
    });
  } catch (error) {
    console.error("Create quiz error:", error.message);
    return res.status(500).json({
      message: "Failed to create quiz.",
    });
  }
}

async function getQuizForInstructor(req, res) {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({ message: "Invalid quiz ID." });
    }

    const quiz = await getQuizForManagement(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const course = await getCourseById(quiz.CourseID);
    if (!course || !(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You cannot manage this quiz.",
      });
    }

    return res.status(200).json({ quiz });
  } catch (error) {
    console.error("Get quiz for management error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve quiz." });
  }
}

async function editQuiz(req, res) {
  try {
    const quizId = Number(req.params.quizId);
    const parsed = parseQuizInput(req.body);
    if (!Number.isInteger(quizId) || quizId <= 0 || parsed.error) {
      return res.status(400).json({
        message: parsed.error || "Invalid quiz ID.",
      });
    }

    const quiz = await getQuizById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const course = await getCourseById(quiz.CourseID);
    if (!course || !(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You cannot manage this quiz.",
      });
    }

    const lesson = await validateLessonForCourse(
      parsed.value.lessonId,
      quiz.CourseID,
    );
    if (lesson.error) {
      return res.status(400).json({ message: lesson.error });
    }

    const result = await updateQuizWithQuestions(quizId, {
      ...parsed.value,
      lessonId: lesson.lessonId,
    });

    if (result.notFound) {
      return res.status(404).json({ message: "Quiz not found." });
    }
    if (result.hasAttempts) {
      return res.status(409).json({
        message:
          "This quiz cannot be edited after a student has started an attempt.",
      });
    }

    return res.status(200).json({ message: "Quiz updated successfully." });
  } catch (error) {
    console.error("Update quiz error:", error.message);
    return res.status(500).json({ message: "Failed to update quiz." });
  }
}

async function removeQuiz(req, res) {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({ message: "Invalid quiz ID." });
    }

    const quiz = await getQuizById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const course = await getCourseById(quiz.CourseID);
    if (!course || !(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You cannot manage this quiz.",
      });
    }

    if (!(await deleteQuiz(quizId))) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    return res.status(200).json({ message: "Quiz deleted successfully." });
  } catch (error) {
    console.error("Delete quiz error:", error.message);
    return res.status(500).json({ message: "Failed to delete quiz." });
  }
}

async function quizResults(req, res) {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({ message: "Invalid quiz ID." });
    }

    const quiz = await getQuizById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const course = await getCourseById(quiz.CourseID);
    if (!course || !(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You cannot view results for this quiz.",
      });
    }

    const students = await getQuizResults(quizId);
    return res.status(200).json({
      quiz: {
        quizId: quiz.QuizID,
        title: quiz.Title,
        courseId: quiz.CourseID,
      },
      students,
    });
  } catch (error) {
    console.error("Quiz results error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve quiz results.",
    });
  }
}

async function takeQuiz(req, res) {
  try {
    const quizId = Number(req.params.quizId);
    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found.",
      });
    }

    const course = await getCourseById(quiz.CourseID);

    if (
      !course ||
      course.Status !== "Active" ||
      !(await hasEnrollment(req.user.userId, quiz.CourseID))
    ) {
      return res.status(403).json({
        message: "You must be enrolled in the active course.",
      });
    }

    const questions = await getQuestionsForStudent(quizId);

    if (questions.length === 0 || questions.length > 50) {
      return res.status(400).json({
        message: "This quiz does not have a valid number of questions.",
      });
    }

    const durationMinutes =
      quiz.DurationMinutes == null ? null : Number(quiz.DurationMinutes);
    const scheduledStartAt = quiz.ScheduledStartAt
      ? new Date(quiz.ScheduledStartAt)
      : null;

    if (
      durationMinutes != null &&
      !QUIZ_DURATIONS_MINUTES.includes(durationMinutes)
    ) {
      return res.status(500).json({
        message: "This quiz has an invalid time limit.",
      });
    }

    if (scheduledStartAt && durationMinutes == null) {
      return res.status(500).json({
        message: "This scheduled quiz does not have a valid duration.",
      });
    }

    const attempt = await getOrCreateQuizAttempt(
      quizId,
      req.user.userId,
      durationMinutes,
      scheduledStartAt,
    );

    if (attempt.NotStarted) {
      return res.status(425).json({
        message: "This quiz is not open yet.",
      });
    }
    if (attempt.WindowEnded) {
      return res.status(410).json({
        message: "The scheduled quiz window has ended.",
      });
    }
    if (attempt.AlreadyAttempted) {
      return res.status(409).json({
        message:
          "You have already used your attempt for this quiz. You cannot try again.",
      });
    }

    return res.status(200).json({
      quiz: {
        quizId: quiz.QuizID,
        title: quiz.Title,
        description: quiz.Description,
        questionCount: questions.length,
        totalPoints: 100,
        durationMinutes,
        scheduledStartAt: scheduledStartAt?.toISOString() ?? null,
        attemptId: attempt.AttemptID,
        serverNowMs: Number(attempt.ServerNowMs),
        expiresAtMs:
          attempt.ExpiresAtMs == null ? null : Number(attempt.ExpiresAtMs),
      },
      questions,
    });
  } catch (error) {
    console.error("Take quiz error:", error.message);
    return res.status(500).json({
      message: "Failed to load quiz.",
    });
  }
}

async function submitQuiz(req, res) {
  try {
    const quizId = Number(req.params.quizId);
    const { answers, attemptId } = req.body;

    if (!Number.isInteger(quizId) || quizId <= 0 || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "A valid quiz ID and answers array are required.",
      });
    }

    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found.",
      });
    }

    const course = await getCourseById(quiz.CourseID);

    if (
      !course ||
      course.Status !== "Active" ||
      !(await hasEnrollment(req.user.userId, quiz.CourseID))
    ) {
      return res.status(403).json({
        message: "You must be enrolled in the active course.",
      });
    }

    const questions = await getQuestionsForGrading(quizId);

    if (questions.length === 0) {
      return res.status(400).json({
        message: "This quiz has no questions.",
      });
    }

    if (questions.length > 50) {
      return res.status(400).json({
        message: "This quiz exceeds the maximum of 50 questions.",
      });
    }

    const durationMinutes =
      quiz.DurationMinutes == null ? null : Number(quiz.DurationMinutes);
    const scheduledStartAt = quiz.ScheduledStartAt
      ? new Date(quiz.ScheduledStartAt)
      : null;

    if (
      durationMinutes != null &&
      !QUIZ_DURATIONS_MINUTES.includes(durationMinutes)
    ) {
      return res.status(400).json({
        message: "This quiz has an invalid time limit.",
      });
    }

    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({
        message: "A valid quiz attempt is required.",
      });
    }

    const grouped = new Map();

    for (const row of questions) {
      if (!grouped.has(row.QuestionID)) {
        grouped.set(row.QuestionID, {
          points: row.Points,
          correctOptionId: null,
          options: new Set(),
        });
      }

      const q = grouped.get(row.QuestionID);
      q.options.add(row.OptionID);

      if (row.IsCorrect) {
        if (q.correctOptionId != null) {
          return res.status(400).json({
            message:
              "Every quiz question must have exactly one correct answer.",
          });
        }
        q.correctOptionId = row.OptionID;
      }
    }

    if (
      [...grouped.values()].some((question) => question.correctOptionId == null)
    ) {
      return res.status(400).json({
        message: "Every quiz question must have exactly one correct answer.",
      });
    }

    const answerMap = new Map();

    for (const answer of answers) {
      if (
        !answer ||
        !Number.isInteger(answer.questionId) ||
        !Number.isInteger(answer.optionId) ||
        answerMap.has(answer.questionId)
      ) {
        return res.status(400).json({
          message:
            "Each answer must contain one valid questionId and optionId.",
        });
      }

      answerMap.set(answer.questionId, answer.optionId);
    }

    if (answerMap.size !== grouped.size) {
      return res.status(400).json({
        message: "Answer every question before submitting the quiz.",
      });
    }

    // Refuzo pyetje që nuk i përkasin kuizit dhe alternativa të pavlefshme.
    for (const [questionId, optionId] of answerMap) {
      const question = grouped.get(questionId);

      if (!question || !question.options.has(optionId)) {
        return res.status(400).json({
          message: "An answer contains an invalid question or option.",
        });
      }
    }

    let correctCount = 0;

    for (const [questionId, question] of grouped) {
      if (answerMap.get(questionId) === question.correctOptionId) {
        correctCount += 1;
      }
    }

    const score = Number(((correctCount / grouped.size) * 100).toFixed(4));
    let attempt;

    attempt = await completeQuizAttempt(
      attemptId,
      quizId,
      req.user.userId,
      durationMinutes,
      scheduledStartAt,
      score,
    );

    if (!attempt.WasCompleted) {
      return res.status(attempt.WasExpired ? 410 : 409).json({
        message: attempt.WasExpired
          ? "The quiz time has expired. This attempt cannot be submitted."
          : "This quiz attempt is no longer active and cannot be submitted again.",
      });
    }

    return res.status(201).json({
      message: "Quiz submitted successfully.",
      result: {
        attemptId: attempt.AttemptID,
        score: attempt.Score,
        totalPoints: 100,
        correctAnswers: correctCount,
        questionCount: grouped.size,
        completedAt: attempt.CompletedAt,
      },
    });
  } catch (error) {
    console.error("Submit quiz error:", error.message);
    return res.status(500).json({
      message: "Failed to submit quiz.",
    });
  }
}

async function myQuizResults(req, res) {
  try {
    const attempts = await getStudentAttempts(req.user.userId);
    return res.status(200).json({ attempts });
  } catch (error) {
    console.error("Quiz results error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve quiz results.",
    });
  }
}

module.exports = {
  listQuizzes,
  addQuiz,
  getQuizForInstructor,
  editQuiz,
  removeQuiz,
  quizResults,
  takeQuiz,
  submitQuiz,
  myQuizResults,
};
