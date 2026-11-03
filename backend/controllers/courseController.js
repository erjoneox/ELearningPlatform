const {
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require("../models/courseModel");
const { getUserById } = require("../models/userModel");
const fs = require("fs/promises");
const path = require("path");

async function removeStoredFiles(fileURLs, uploadDirectory) {
  let failures = 0;
  const resolvedDirectory = path.resolve(uploadDirectory);

  for (const fileURL of fileURLs.filter(Boolean)) {
    const filePath = path.resolve(resolvedDirectory, path.basename(fileURL));

    if (!filePath.startsWith(resolvedDirectory + path.sep)) {
      console.error("Refusing to remove a file outside its upload directory.");
      failures += 1;
      continue;
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Failed to remove course file:", error.message);
        failures += 1;
      }
    }
  }

  return failures;
}

async function listCourses(req, res) {
  try {
    const courses = await getAllCourses();
    return res.status(200).json({ courses });
  } catch (error) {
    console.error("List courses error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve courses.",
    });
  }
}

async function addCourse(req, res) {
  try {
    const {
      categoryId,
      title,
      description,
      thumbnail,
      instructorId,
    } = req.body;

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      !Number.isInteger(instructorId) ||
      instructorId <= 0 ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message:
          "A valid categoryId, instructorId, and title are required.",
      });
    }

    const instructor = await getUserById(instructorId);

    if (
      !instructor ||
      instructor.Role !== "Instructor" ||
      instructor.Status !== "Active"
    ) {
      return res.status(400).json({
        message: "The selected instructor must be an active Instructor.",
      });
    }

    const course = await createCourse(instructorId, {
      categoryId,
      title: title.trim(),
      description,
      thumbnail,
    });

    return res.status(201).json({
      message: "Course created successfully.",
      course,
    });
  } catch (error) {
    console.error("Create course error:", error.message);
    return res.status(500).json({
      message:
        "Failed to create course. Check the category and database schema.",
    });
  }
}

async function editCourse(req, res) {
  try {
    const courseId = Number(req.params.id);
    const { categoryId, title, description, thumbnail, instructorId } =
      req.body;

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      !Number.isInteger(instructorId) ||
      instructorId <= 0 ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message: "A valid categoryId, instructorId, and title are required.",
      });
    }

    const instructor = await getUserById(instructorId);

    if (
      !instructor ||
      instructor.Role !== "Instructor" ||
      instructor.Status !== "Active"
    ) {
      return res.status(400).json({
        message: "The selected instructor must be an active Instructor.",
      });
    }

    const existingCourse = await getCourseById(courseId);

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const course = await updateCourse(courseId, {
      instructorId,
      categoryId,
      title: title.trim(),
      description,
      thumbnail,
    });

    return res.status(200).json({
      message: "Course updated successfully.",
      course,
    });
  } catch (error) {
    console.error("Update course error:", error.message);
    return res.status(500).json({
      message: "Failed to update course.",
    });
  }
}

async function removeCourse(req, res) {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const existingCourse = await getCourseById(courseId);

    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found." });
    }

    const deletedFiles = await deleteCourse(courseId);
    const [submissionFileFailures, materialFileFailures] = await Promise.all([
      removeStoredFiles(
        deletedFiles.submissionFiles,
        path.join(__dirname, "../uploads/submissions"),
      ),
      removeStoredFiles(
        deletedFiles.materialFiles,
        path.join(__dirname, "../uploads/materials"),
      ),
    ]);
    const cleanupFailures = submissionFileFailures + materialFileFailures;

    return res.status(200).json({
      message: "Course and its learning data deleted successfully.",
      warning: cleanupFailures
        ? `${cleanupFailures} uploaded file(s) could not be removed from storage.`
        : null,
    });
  } catch (error) {
    console.error("Delete course error:", error.message);
    return res.status(500).json({
      message: "Failed to delete course and its related data.",
    });
  }
}

module.exports = {
  listCourses,
  addCourse,
  editCourse,
  removeCourse,
};
