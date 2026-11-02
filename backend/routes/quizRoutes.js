const express = require("express");

const {
  listQuizzes,
  addQuiz,
  getQuizForInstructor,
  editQuiz,
  removeQuiz,
  quizResults,
  takeQuiz,
  submitQuiz,
  myQuizResults,
} = require("../controllers/quizController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/courses/:courseId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  listQuizzes,
);

router.post(
  "/courses/:courseId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  addQuiz,
);

router.get(
  "/my-results",
  authenticateToken,
  authorizeRoles("Student"),
  myQuizResults,
);

router.get(
  "/:quizId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  getQuizForInstructor,
);

router.put(
  "/:quizId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  editQuiz,
);

router.delete(
  "/:quizId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  removeQuiz,
);

router.get(
  "/:quizId/results",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  quizResults,
);

router.get(
  "/:quizId/take",
  authenticateToken,
  authorizeRoles("Student"),
  takeQuiz,
);

router.post(
  "/:quizId/submit",
  authenticateToken,
  authorizeRoles("Student"),
  submitQuiz,
);

module.exports = router;
