const {
  enrollStudent,
  getStudentEnrollments,
  enrollmentExists,
  unenrollStudent,
} = require("../models/enrollmentModel");

async function enroll(req, res) {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    const studentId = req.user.userId;

    const alreadyEnrolled = await enrollmentExists(studentId, courseId);

    if (alreadyEnrolled) {
      return res.status(409).json({
        message: "You are already enrolled in this course.",
      });
    }

    const enrollment = await enrollStudent(studentId, courseId);

    if (!enrollment) {
      return res.status(404).json({
        message: "Active course not found.",
      });
    }

    return res.status(201).json({
      message: "Enrollment successful.",
      enrollment,
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        message: "You are already enrolled in this course.",
      });
    }

    console.error("Enrollment error:", error.message);

    return res.status(500).json({
      message: "Failed to enroll in course.",
    });
  }
}

async function unenroll(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const studentId = req.user.userId;

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "ID e kursit nuk është valide.",
      });
    }

    const unenrolled = await unenrollStudent(studentId, courseId);

    if (!unenrolled) {
      return res.status(404).json({
        message: "Nuk jeni i regjistruar në këtë kurs.",
      });
    }

    return res.status(200).json({
      message: "Jeni çregjistruar me sukses nga kursi.",
    });
  } catch (error) {
    console.error("Gabim gjatë çregjistrimit:", error);

    return res.status(500).json({
      message: "Ndodhi një gabim gjatë çregjistrimit nga kursi.",
    });
  }
}

async function myEnrollments(req, res) {
  try {
    const enrollments = await getStudentEnrollments(req.user.userId);

    return res.status(200).json({ enrollments });
  } catch (error) {
    console.error("Get enrollments error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve enrollments.",
    });
  }
}

module.exports = {
  enroll,
  myEnrollments,
  unenroll,
};
