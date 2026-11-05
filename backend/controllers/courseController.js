const {
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require("../models/courseModel");
const { getUserById } = require("../models/userModel");
const path = require("path");
const {
  removeStoredUploadFile,
  resolveStoredUploadPath,
} = require("../utils/storedUploadPath");

function canManageCourse(course, user) {
  return (
    user?.role === "Admin" ||
    (user?.role === "Instructor" &&
      Number(course?.InstructorID) === Number(user.userId))
  );
}

async function removeStoredFiles(fileURLs, uploadDirectory) {
  let failures = 0;
  const resolvedDirectory = path.resolve(uploadDirectory);

  for (const fileURL of fileURLs.filter(Boolean)) {
    const filePath = resolveStoredUploadPath(fileURL, resolvedDirectory);

    if (!filePath) {
      console.error("Refusing to remove a file outside its upload directory.");
      failures += 1;
      continue;
    }

    if (!(await removeStoredUploadFile(fileURL, resolvedDirectory))) {
      console.error("Failed to remove course file.");
      failures += 1;
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
    const { categoryId, title, description, thumbnail } = req.body;
    const instructorId =
      req.user.role === "Admin" ? Number(req.body.instructorId) : req.user.userId;

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      (req.user.role === "Admin" &&
        (!Number.isInteger(instructorId) || instructorId <= 0)) ||
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      (description != null && typeof description !== "string") ||
      (thumbnail != null &&
        (typeof thumbnail !== "string" || thumbnail.length > 500))
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
    const { categoryId, title, description, thumbnail } = req.body;

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      (req.user.role === "Admin" &&
        (!Number.isInteger(Number(req.body.instructorId)) ||
          Number(req.body.instructorId) <= 0)) ||
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      (description != null && typeof description !== "string") ||
      (thumbnail != null &&
        (typeof thumbnail !== "string" || thumbnail.length > 500))
    ) {
      return res.status(400).json({
        message: "A valid categoryId, instructorId, and title are required.",
      });
    }

    const existingCourse = await getCourseById(courseId);

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!canManageCourse(existingCourse, req.user)) {
      return res.status(403).json({
        message: "You can only edit courses assigned to your instructor account.",
      });
    }

    const instructorId =
      req.user.role === "Admin"
        ? Number(req.body.instructorId)
        : existingCourse.InstructorID;
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

    if (!canManageCourse(existingCourse, req.user)) {
      return res.status(403).json({
        message: "You can only delete courses assigned to your instructor account.",
      });
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
