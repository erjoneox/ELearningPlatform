const express = require("express");

const {
  listAssignments,
  addAssignment,
  editAssignment,
  removeAssignment,
  listSubmissions,
  submitWork,
  downloadSubmission,
  gradeWork,
  listMySubmissions,
} = require("../controllers/assignmentController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const submissionUpload = require("../middleware/submissionUploadMiddleware");

const router = express.Router();

router.get(
  "/courses/:courseId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  listAssignments,
);

router.post(
  "/courses/:courseId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  addAssignment,
);

router.patch(
  "/:assignmentId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  editAssignment,
);

router.delete(
  "/:assignmentId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  removeAssignment,
);

router.get(
  "/courses/:courseId/:assignmentId/submissions",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  listSubmissions,
);

router.get(
  "/:assignmentId/submissions",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  listSubmissions,
);

router.post(
  "/:assignmentId/submit",
  authenticateToken,
  authorizeRoles("Student"),
  submissionUpload.single("file"),
  submitWork,
);

router.get(
  "/submissions/:submissionId/file",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  downloadSubmission,
);

router.patch(
  "/submissions/:submissionId/grade",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  gradeWork,
);

router.get(
  "/my-submissions",
  authenticateToken,
  authorizeRoles("Student"),
  listMySubmissions,
);

module.exports = router;
