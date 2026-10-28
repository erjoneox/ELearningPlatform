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

async function canManageCourse(course, user) {
  return (
    user.role === "Admin" || Number(course.InstructorID) === Number(user.userId)
  );
}

async function canAccessCourse(courseId, user) {
  if (user.role === "Admin") return true;

  if (user.role === "Instructor") {
    const course = await getCourseById(courseId);

    return !!course && Number(course.InstructorID) === Number(user.userId);
  }

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

async function removeStoredMaterial(fileURL) {
  if (!fileURL) return true;

  const uploadDirectory = path.resolve(__dirname, "../uploads/materials");
  const filePath = path.resolve(uploadDirectory, path.basename(fileURL));

  if (!filePath.startsWith(uploadDirectory + path.sep)) {
    console.error("Refusing to remove a file outside the materials directory.");
    return false;
  }

  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to remove material file:", error.message);
      return false;
    }

    return true;
  }
}

async function listLessons(req, res) {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
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

    if (!(await canAccessCourse(courseId, req.user))) {
      return res.status(403).json({
        message: "You do not have access to this course.",
      });
    }

    const lessons = await getLessonsByCourse(courseId);

    return res.status(200).json({ lessons });
  } catch (error) {
    console.error("List lessons error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve lessons.",
    });
  }
}

async function addLesson(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const { title, description, videoURL, orderNumber } = req.body;

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isInteger(orderNumber) ||
      orderNumber <= 0
    ) {
      return res.status(400).json({
        message: "Valid course ID, title and orderNumber are required.",
      });
    }

    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You can only manage lessons in your own courses.",
      });
    }

    const lesson = await createLesson(courseId, {
      title: title.trim(),
      description,
      videoURL,
      orderNumber,
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

    console.error("Create lesson error:", error.message);

    return res.status(500).json({
      message: "Failed to create lesson.",
    });
  }
}

async function editLesson(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);
    const { title, description, videoURL, orderNumber } = req.body;

    if (
      !Number.isInteger(lessonId) ||
      lessonId <= 0 ||
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isInteger(orderNumber) ||
      orderNumber <= 0 ||
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

    if (!course || !(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You cannot manage this lesson.",
      });
    }

    const updatedLesson = await updateLesson(lessonId, {
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : null,
      videoURL: videoURL?.trim() || null,
      orderNumber,
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

    console.error("Update lesson error:", error.message);

    return res.status(500).json({
      message: "Failed to update lesson.",
    });
  }
}

async function removeLesson(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
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

    if (!course || !(await canManageCourse(course, req.user))) {
      return res.status(403).json({
        message: "You cannot delete this lesson.",
      });
    }

    const materialFiles = await deleteLesson(lessonId);
    let cleanupFailures = 0;

    for (const fileURL of materialFiles) {
      if (!(await removeStoredMaterial(fileURL))) cleanupFailures += 1;
    }

    return res.status(200).json({
      message:
        "Lesson and its materials deleted. Linked assignments and quizzes were kept.",
      warning: cleanupFailures
        ? `${cleanupFailures} material file(s) could not be removed from storage.`
        : null,
    });
  } catch (error) {
    console.error("Delete lesson error:", error.message);

    return res.status(500).json({
      message: "Failed to delete lesson.",
    });
  }
}

async function listMaterials(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
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

    if (!(await canAccessCourse(lesson.CourseID, req.user))) {
      return res.status(403).json({
        message: "You do not have access to this lesson.",
      });
    }

    const materials = await getMaterialsByLesson(lessonId);

    return res.status(200).json({ materials });
  } catch (error) {
    console.error("List materials error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve materials.",
    });
  }
}

async function addMaterial(req, res) {
  const uploadedFile = req.file;

  try {
    const lessonId = Number(req.params.lessonId);
    const { title, materialType } = req.body;

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(400).json({
        message: "Invalid lesson ID.",
      });
    }

    if (typeof title !== "string" || !title.trim()) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(400).json({
        message: "Material title is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please select a file to upload.",
      });
    }

    if (typeof materialType !== "string" || !materialType.trim()) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(400).json({
        message: "Material type is required.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!course) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!(await canManageCourse(course, req.user))) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(403).json({
        message: "You cannot manage materials for this lesson.",
      });
    }

    const fileURL = `/uploads/materials/${req.file.filename}`;

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
    await removeStoredMaterial(uploadedFile?.filename);
    console.error("Upload material error:", error);

    return res.status(500).json({
      message: "Failed to upload material.",
    });
  }
}

async function editMaterial(req, res) {
  const uploadedFile = req.file;

  try {
    const lessonId = Number(req.params.lessonId);
    const materialId = Number(req.params.materialId);
    const { title, materialType } = req.body;

    if (
      !Number.isInteger(lessonId) ||
      lessonId <= 0 ||
      !Number.isInteger(materialId) ||
      materialId <= 0 ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof materialType !== "string" ||
      !materialType.trim()
    ) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(400).json({
        message: "Valid lesson, material, title and material type are required.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const materials = await getMaterialsByLesson(lessonId);
    const existingMaterial = materials.find(
      (item) => Number(item.MaterialID) === materialId,
    );

    if (!existingMaterial) {
      await removeStoredMaterial(uploadedFile?.filename);
      return res.status(404).json({
        message: "Material not found in this lesson.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!course || !(await canManageCourse(course, req.user))) {
      await removeStoredMaterial(uploadedFile?.filename);
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
        await removeStoredMaterial(uploadedFile?.filename);
        return res.status(404).json({
          message: "Material not found.",
        });
    }

    const oldFileRemoved =
      !uploadedFile ||
      !updatedMaterial?.PreviousFileURL ||
      (await removeStoredMaterial(updatedMaterial.PreviousFileURL));

    return res.status(200).json({
      message: "Material updated successfully.",
      material: updatedMaterial,
      warning: oldFileRemoved
        ? null
        : "The previous material file could not be removed from storage.",
    });
  } catch (error) {
    await removeStoredMaterial(uploadedFile?.filename);
    console.error("Update material error:", error.message);

    return res.status(500).json({
      message: "Failed to update material.",
    });
  }
}

async function removeMaterial(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);
    const materialId = Number(req.params.materialId);

    if (
      !Number.isInteger(lessonId) ||
      lessonId <= 0 ||
      !Number.isInteger(materialId) ||
      materialId <= 0
    ) {
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

    if (!course || !(await canManageCourse(course, req.user))) {
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
    console.error("Delete material error:", error.message);

    return res.status(500).json({
      message: "Failed to delete material.",
    });
  }
}

// Shkarkimi i materialit me emrin e tij, jo me emrin e gjeneruar nga serveri
async function downloadMaterial(req, res) {
  try {
    const lessonId = Number(req.params.lessonId);
    const materialId = Number(req.params.materialId);

    if (
      !Number.isInteger(lessonId) ||
      lessonId <= 0 ||
      !Number.isInteger(materialId) ||
      materialId <= 0
    ) {
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

    if (!(await canAccessCourse(lesson.CourseID, req.user))) {
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
    const filePath = path.resolve(__dirname, "../uploads/materials", filename);

    // Sigurohemi që skedari gjendet brenda folderit të materialeve.
    const uploadDirectory = path.resolve(__dirname, "../uploads/materials");

    if (
      !filePath.startsWith(uploadDirectory + path.sep) ||
      !fs.existsSync(filePath)
    ) {
      return res.status(404).json({
        message: "Material file not found.",
      });
    }

    // Ruajmë prapashtesën origjinale, p.sh. .pdf, .docx ose .pptx.
    const extension = path.extname(filename);

    // Përdorim titullin e materialit si emër të shkarkimit.
    const safeTitle = material.Title.replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      "_",
    ).trim();

    const downloadName = `${safeTitle || "material"}${extension}`;

    return res.download(filePath, downloadName, (error) => {
      if (error && !res.headersSent) {
        console.error("Download material error:", error.message);

        return res.status(500).json({
          message: "Failed to download material.",
        });
      }
    });
  } catch (error) {
    console.error("Download material error:", error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to download material.",
      });
    }
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
