const path = require("path");
const fs = require("fs");

const {
  getLessonsByCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonById,
} = require("../models/lessonModel");

const {
  getMaterialsByLesson,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} = require("../models/materialModel");

const { getCourseById } = require("../models/courseModel");
const { connectDB } = require("../config/db");
const sql = require("mssql");

const UPLOAD_DIRECTORY = path.resolve(__dirname, "../uploads/materials");

function isValidId(id) {
  return Number.isInteger(id) && id > 0;
}

function getUser(req) {
  return req.user || null;
}

async function canManageCourse(course, user) {
  if (!course || !user) return false;

  return (
    user.role === "Instructor" &&
    Number(course.InstructorID) === Number(user.userId)
  );
}

async function canAccessCourse(courseId, user) {
  if (!user) return false;

  if (user.role === "Admin") {
    return true;
  }

  if (user.role === "Instructor") {
    const course = await getCourseById(courseId);

    return !!course && Number(course.InstructorID) === Number(user.userId);
  }

  if (user.role === "Student") {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("studentId", sql.Int, user.userId)
      .input("courseId", sql.Int, courseId).query(`
        SELECT TOP 1 EnrollmentID
        FROM Enrollments
        WHERE StudentID = @studentId
          AND CourseID = @courseId
          AND Status = 'Active'
      `);

    return result.recordset.length > 0;
  }

  return false;
}

async function removeStoredMaterial(fileReference) {
  if (!fileReference) return true;

  const filename = path.basename(fileReference);
  const filePath = path.resolve(UPLOAD_DIRECTORY, filename);

  if (!filePath.startsWith(UPLOAD_DIRECTORY + path.sep)) {
    console.error("Invalid material file path.");
    return false;
  }

  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }

    console.error("Failed to remove material file:", error.message);
    return false;
  }
}

function safeDownloadName(title, extension) {
  const safeTitle = String(title || "material")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim()
    .replace(/[. ]+$/g, "");

  return `${safeTitle || "material"}${extension}`;
}

function sendServerError(res, message, error) {
  console.error(message, error);

  if (!res.headersSent) {
    return res.status(500).json({
      message,
    });
  }
}

async function listLessons(req, res) {
  try {
    const courseId = Number(req.params.courseId);

    if (!isValidId(courseId)) {
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

    if (!(await canAccessCourse(courseId, getUser(req)))) {
      return res.status(403).json({
        message: "You do not have access to this course.",
      });
    }

    const lessons = await getLessonsByCourse(courseId);

    return res.status(200).json({ lessons });
  } catch (error) {
    return sendServerError(res, "Failed to retrieve lessons.", error);
  }
}

async function addLesson(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const { title, description, videoURL, orderNumber } = req.body;

    if (
      !isValidId(courseId) ||
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isInteger(Number(orderNumber)) ||
      Number(orderNumber) <= 0 ||
      (videoURL &&
        (typeof videoURL !== "string" ||
          !/^https?:\/\//i.test(videoURL.trim())))
    ) {
      return res.status(400).json({
        message: "Valid course ID, title and order number are required.",
      });
    }

    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!(await canManageCourse(course, getUser(req)))) {
      return res.status(403).json({
        message: "You can only manage lessons in your own courses.",
      });
    }

    const lesson = await createLesson(courseId, {
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : null,
      videoURL: videoURL?.trim() || null,
      orderNumber: Number(orderNumber),
    });

    return res.status(201).json({
      message: "Lesson created successfully.",
      lesson,
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        message: "This order number is already used in the course.",
      });
    }

    return sendServerError(res, "Failed to create lesson.", error);
  }
}

async function editLesson(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);
    const { title, description, videoURL, orderNumber } = req.body;

    if (
      !isValidId(lessonId) ||
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isInteger(Number(orderNumber)) ||
      Number(orderNumber) <= 0 ||
      (videoURL != null &&
        (typeof videoURL !== "string" ||
          (videoURL.trim() && !/^https?:\/\//i.test(videoURL.trim()))))
    ) {
      return res.status(400).json({
        message: "Valid lesson ID, title and order number are required.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!(await canManageCourse(course, getUser(req)))) {
      return res.status(403).json({
        message: "You cannot manage this lesson.",
      });
    }

    const updatedLesson = await updateLesson(lessonId, {
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : null,
      videoURL: videoURL?.trim() || null,
      orderNumber: Number(orderNumber),
    });

    return res.status(200).json({
      message: "Lesson updated successfully.",
      lesson: updatedLesson,
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        message: "This order number is already used in the course.",
      });
    }

    return sendServerError(res, "Failed to update lesson.", error);
  }
}

async function removeLesson(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);

    if (!isValidId(lessonId)) {
      return res.status(400).json({
        message: "Invalid lesson ID.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!(await canManageCourse(course, getUser(req)))) {
      return res.status(403).json({
        message: "You cannot delete this lesson.",
      });
    }

    const materialFiles = await deleteLesson(lessonId);
    let cleanupFailures = 0;

    for (const fileURL of materialFiles || []) {
      const removed = await removeStoredMaterial(fileURL);

      if (!removed) {
        cleanupFailures++;
      }
    }

    return res.status(200).json({
      message:
        "Lesson and its materials deleted. Linked assignments and quizzes were kept.",
      warning: cleanupFailures
        ? `${cleanupFailures} material file(s) could not be removed from storage.`
        : null,
    });
  } catch (error) {
    return sendServerError(res, "Failed to delete lesson.", error);
  }
}

async function listMaterials(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);

    if (!isValidId(lessonId)) {
      return res.status(400).json({
        message: "Invalid lesson ID.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    if (!(await canAccessCourse(lesson.CourseID, getUser(req)))) {
      return res.status(403).json({
        message: "You do not have access to this lesson.",
      });
    }

    const materials = await getMaterialsByLesson(lessonId);

    return res.status(200).json({ materials });
  } catch (error) {
    return sendServerError(res, "Failed to retrieve materials.", error);
  }
}

async function addMaterial(req, res) {
  const uploadedFile = req.file;

  try {
    const lessonId = Number(req.params.lessonId);
    const { title, materialType } = req.body;

    if (!isValidId(lessonId)) {
      await removeStoredMaterial(uploadedFile?.filename);

      return res.status(400).json({
        message: "Invalid lesson ID.",
      });
    }

    if (!uploadedFile) {
      return res.status(400).json({
        message: "Please select a file to upload.",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof materialType !== "string" ||
      !materialType.trim()
    ) {
      await removeStoredMaterial(uploadedFile.filename);

      return res.status(400).json({
        message: "Material title and type are required.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      await removeStoredMaterial(uploadedFile.filename);

      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!course) {
      await removeStoredMaterial(uploadedFile.filename);

      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!(await canManageCourse(course, getUser(req)))) {
      await removeStoredMaterial(uploadedFile.filename);

      return res.status(403).json({
        message: "You cannot manage materials for this lesson.",
      });
    }

    const fileURL = `/uploads/materials/${uploadedFile.filename}`;

    const material = await createMaterial(lessonId, {
      title: title.trim(),
      fileURL,
      materialType: materialType.trim(),
    });

    return res.status(201).json({
      message: "Material uploaded successfully.",
      material,
    });
  } catch (error) {
    if (uploadedFile) {
      await removeStoredMaterial(uploadedFile.filename);
    }

    return sendServerError(res, "Failed to upload material.", error);
  }
}

async function editMaterial(req, res) {
  const uploadedFile = req.file;

  try {
    const lessonId = Number(req.params.lessonId);
    const materialId = Number(req.params.materialId);
    const { title, materialType } = req.body;

    if (
      !isValidId(lessonId) ||
      !isValidId(materialId) ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof materialType !== "string" ||
      !materialType.trim()
    ) {
      if (uploadedFile) {
        await removeStoredMaterial(uploadedFile.filename);
      }

      return res.status(400).json({
        message:
          "Valid lesson, material, title and material type are required.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      if (uploadedFile) {
        await removeStoredMaterial(uploadedFile.filename);
      }

      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const materials = await getMaterialsByLesson(lessonId);

    const existingMaterial = materials.find(
      (item) => Number(item.MaterialID) === materialId,
    );

    if (!existingMaterial) {
      if (uploadedFile) {
        await removeStoredMaterial(uploadedFile.filename);
      }

      return res.status(404).json({
        message: "Material not found in this lesson.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!(await canManageCourse(course, getUser(req)))) {
      if (uploadedFile) {
        await removeStoredMaterial(uploadedFile.filename);
      }

      return res.status(403).json({
        message: "You cannot manage this material.",
      });
    }

    const updatedMaterial = await updateMaterial(materialId, {
      title: title.trim(),
      materialType: materialType.trim(),
      fileURL: uploadedFile
        ? `/uploads/materials/${uploadedFile.filename}`
        : null,
    });

    if (!updatedMaterial) {
      if (uploadedFile) {
        await removeStoredMaterial(uploadedFile.filename);
      }

      return res.status(404).json({
        message: "Material not found.",
      });
    }

    let oldFileRemoved = true;

    if (uploadedFile && updatedMaterial.PreviousFileURL) {
      oldFileRemoved = await removeStoredMaterial(
        updatedMaterial.PreviousFileURL,
      );
    }

    return res.status(200).json({
      message: "Material updated successfully.",
      material: updatedMaterial,
      warning: oldFileRemoved
        ? null
        : "The previous material file could not be removed from storage.",
    });
  } catch (error) {
    if (uploadedFile) {
      await removeStoredMaterial(uploadedFile.filename);
    }

    return sendServerError(res, "Failed to update material.", error);
  }
}

async function removeMaterial(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);
    const materialId = Number(req.params.materialId);

    if (!isValidId(lessonId) || !isValidId(materialId)) {
      return res.status(400).json({
        message: "Invalid lesson or material ID.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const materials = await getMaterialsByLesson(lessonId);

    const material = materials.find(
      (item) => Number(item.MaterialID) === materialId,
    );

    if (!material) {
      return res.status(404).json({
        message: "Material not found in this lesson.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!(await canManageCourse(course, getUser(req)))) {
      return res.status(403).json({
        message: "You cannot delete this material.",
      });
    }

    const fileURL = await deleteMaterial(materialId);
    const fileRemoved = await removeStoredMaterial(fileURL);

    return res.status(200).json({
      message: "Material deleted successfully.",
      warning: fileRemoved
        ? null
        : "The material record was deleted, but its file could not be removed from storage.",
    });
  } catch (error) {
    return sendServerError(res, "Failed to delete material.", error);
  }
}

async function downloadMaterial(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);
    const materialId = Number(req.params.materialId);

    if (!isValidId(lessonId) || !isValidId(materialId)) {
      return res.status(400).json({
        message: "Invalid lesson or material ID.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    if (!(await canAccessCourse(lesson.CourseID, getUser(req)))) {
      return res.status(403).json({
        message: "You do not have access to this lesson.",
      });
    }

    const materials = await getMaterialsByLesson(lessonId);

    const material = materials.find(
      (item) => Number(item.MaterialID) === materialId,
    );

    if (!material) {
      return res.status(404).json({
        message: "Material not found.",
      });
    }

    if (!material.FileURL || !material.Title) {
      return res.status(404).json({
        message: "Material file information is missing.",
      });
    }

    const filename = path.basename(material.FileURL);
    const filePath = path.resolve(UPLOAD_DIRECTORY, filename);

    if (!filePath.startsWith(UPLOAD_DIRECTORY + path.sep)) {
      return res.status(400).json({
        message: "Invalid material file path.",
      });
    }

    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({
        message: "Material file not found.",
      });
    }

    const extension = path.extname(filename);
    const downloadName = safeDownloadName(material.Title, extension);

    return res.download(filePath, downloadName, (error) => {
      if (error && !res.headersSent) {
        console.error("Download material error:", error.message);

        return res.status(500).json({
          message: "Failed to download material.",
        });
      }
    });
  } catch (error) {
    return sendServerError(res, "Failed to download material.", error);
  }
}

module.exports = {
  listLessons,
  addLesson,
  editLesson,
  removeLesson,
  listMaterials,
  addMaterial,
  editMaterial,
  removeMaterial,
  downloadMaterial,
};
