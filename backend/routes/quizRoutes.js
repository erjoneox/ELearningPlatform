const express = require("express");

const {
  listQuizzes,
  addQuiz,
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

router.get(
  "/my-results",
  authenticateToken,
  authorizeRoles("Student"),
  myQuizResults,
);

module.exports = router;
