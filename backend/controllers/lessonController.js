const path = require("path");
const fs = require("fs");

const {
  getLessonsByCourse,
  createLesson,
  getLessonById,
} = require("../models/lessonModel");

const {
  getMaterialsByLesson,
  createMaterial,
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
  try {
    const lessonId = Number(req.params.lessonId);
    const { title, materialType } = req.body;

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({
        message: "Invalid lesson ID.",
      });
    }

    if (typeof title !== "string" || !title.trim()) {
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
      return res.status(400).json({
        message: "Material type is required.",
      });
    }

    const lesson = await getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    const course = await getCourseById(lesson.CourseID);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!(await canManageCourse(course, req.user))) {
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
    console.error("Upload material error:", error);

    return res.status(500).json({
      message: "Failed to upload material.",
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
  listMaterials,
  addMaterial,
  downloadMaterial,
};
