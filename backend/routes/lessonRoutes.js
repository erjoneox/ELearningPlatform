const express = require("express");

const {
  listLessons,
  addLesson,
  editLesson,
  removeLesson,
  listMaterials,
  addMaterial,
  editMaterial,
  removeMaterial,
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
  authorizeRoles("Instructor"),
  addLesson,
);

router.patch(
  "/:lessonId",
  authenticateToken,
  authorizeRoles("Instructor"),
  editLesson,
);

router.delete(
  "/:lessonId",
  authenticateToken,
  authorizeRoles("Instructor"),
  removeLesson,
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
  authorizeRoles("Instructor"),
  upload.single("file"),
  addMaterial,
);

router.patch(
  "/:lessonId/materials/:materialId",
  authenticateToken,
  authorizeRoles("Instructor"),
  upload.single("file"),
  editMaterial,
);

router.delete(
  "/:lessonId/materials/:materialId",
  authenticateToken,
  authorizeRoles("Instructor"),
  removeMaterial,
);

router.get(
  "/:lessonId/materials/:materialId/download",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  downloadMaterial,
);

module.exports = router;
