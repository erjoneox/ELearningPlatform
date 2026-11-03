const express = require("express");

const {
  listCourses,
  addCourse,
  editCourse,
  removeCourse,
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
  authorizeRoles("Admin"),
  addCourse,
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  editCourse,
);

router.delete("/:id", authenticateToken, authorizeRoles("Admin"), removeCourse);

module.exports = router;
