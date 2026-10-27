const express = require("express");

const {
  listCourses,
  addCourse,
  editCourse,
} = require("../controllers/courseController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", listCourses);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  addCourse,
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  editCourse,
);

module.exports = router;
