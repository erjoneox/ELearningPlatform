const {
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourse,
} = require("../models/courseModel");

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

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message: "A valid categoryId and title are required.",
      });
    }

    const course = await createCourse(req.user.userId, {
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
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message: "A valid categoryId and title are required.",
      });
    }

    const existingCourse = await getCourseById(courseId);

    if (!existingCourse) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const isAdmin = req.user.role === "Admin";
    const isOwner = existingCourse.InstructorID === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: "You can only edit your own courses.",
      });
    }

    const course = await updateCourse(courseId, {
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

module.exports = {
  listCourses,
  addCourse,
  editCourse,
};
