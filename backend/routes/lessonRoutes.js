const express = require("express");

const {
  listLessons,
  addLesson,
  listMaterials,
  addMaterial,
  downloadMaterial,
} = require("../controllers/lessonController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();
const upload = require("../middleware/uploadMiddleware");

router.get(
  "/courses/:courseId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  listLessons,
);

router.post(
  "/courses/:courseId",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  addLesson,
);

router.get(
  "/:lessonId/materials",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  listMaterials,
);

router.post(
  "/:lessonId/materials",
  authenticateToken,
  authorizeRoles("Admin", "Instructor"),
  upload.single("file"),
  addMaterial,
);

router.get(
  "/:lessonId/materials/:materialId/download",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  downloadMaterial,
);

module.exports = router;
