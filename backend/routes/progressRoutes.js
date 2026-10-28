const express = require("express");
const router = express.Router();

const {
  completeLesson,
  uncompleteLesson,
  getMyCourseProgress,
  getMyCourses,
  getStudentsProgress,
} = require("../controllers/progressController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

router.patch(
  "/lessons/:lessonId/complete",
  authenticateToken,
  authorizeRoles("Student"),
  completeLesson,
);
router.patch(
  "/lessons/:lessonId/uncomplete",
  authenticateToken,
  authorizeRoles("Student"),
  uncompleteLesson,
);

router.get(
  "/my-courses",
  authenticateToken,
  authorizeRoles("Student"),
  getMyCourses,
);

router.get(
  "/courses/:courseId",
  authenticateToken,
  authorizeRoles("Student"),
  getMyCourseProgress,
);

router.get(
  "/courses/:courseId/students",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  getStudentsProgress,
);

module.exports = router;
