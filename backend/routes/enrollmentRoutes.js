const express = require("express");

const {
  enroll,
  myEnrollments,
  unenroll,
} = require("../controllers/enrollmentController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/:courseId", authenticateToken, authorizeRoles("Student"), enroll);

router.get(
  "/my-courses",
  authenticateToken,
  authorizeRoles("Student"),
  myEnrollments,
);

router.delete(
  "/:courseId",
  authenticateToken,
  authorizeRoles("Student"),
  unenroll,
);

module.exports = router;
