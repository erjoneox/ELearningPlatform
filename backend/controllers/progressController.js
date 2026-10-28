const progressModel = require("../models/progressModel");

async function completeLesson(req, res) {
  try {
    const studentId = req.user.userId;
    const lessonId = Number(req.params.lessonId);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({
        message: "ID e mësimit nuk është valide.",
      });
    }

    const lesson = await progressModel.getLessonForAccess(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Mësimi nuk u gjet.",
      });
    }

    const course = await progressModel.getCourseForAccess(lesson.CourseID);

    if (!course || course.Status !== "Active") {
      return res.status(404).json({
        message: "Kursi nuk është i disponueshëm.",
      });
    }

    const enrolled = await progressModel.isStudentEnrolled(
      studentId,
      lesson.CourseID,
    );

    if (!enrolled) {
      return res.status(403).json({
        message: "Duhet të jesh i regjistruar në këtë kurs.",
      });
    }

    await progressModel.markLessonCompleted(
      studentId,
      lesson.CourseID,
      lessonId,
    );

    return res.status(200).json({
      message: "Mësimi u shënua si i përfunduar.",
    });
  } catch (error) {
    console.error("Complete lesson error:", error);

    return res.status(500).json({
      message: "Ndodhi një gabim gjatë ruajtjes së progresit.",
    });
  }
}
async function uncompleteLesson(req, res) {
  try {
    const studentId = req.user.userId;
    const lessonId = Number(req.params.lessonId);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({
        message: "ID e mësimit nuk është valide.",
      });
    }

    const lesson = await progressModel.getLessonForAccess(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Mësimi nuk u gjet.",
      });
    }

    const course = await progressModel.getCourseForAccess(lesson.CourseID);

    if (!course || course.Status !== "Active") {
      return res.status(404).json({
        message: "Kursi nuk është i disponueshëm.",
      });
    }

    const enrolled = await progressModel.isStudentEnrolled(
      studentId,
      lesson.CourseID,
    );

    if (!enrolled) {
      return res.status(403).json({
        message: "Duhet të jesh i regjistruar në këtë kurs.",
      });
    }

    await progressModel.markLessonUncompleted(
      studentId,
      lesson.CourseID,
      lessonId,
    );

    return res.status(200).json({
      message: "Përfundimi i mësimit u anulua me sukses.",
    });
  } catch (error) {
    console.error("Uncomplete lesson error:", error);

    return res.status(500).json({
      message: "Ndodhi një gabim gjatë përditësimit të progresit.",
    });
  }
}

async function getMyCourseProgress(req, res) {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "ID e kursit nuk është valide.",
      });
    }

    const course = await progressModel.getCourseForAccess(courseId);

    if (!course || course.Status !== "Active") {
      return res.status(404).json({
        message: "Kursi nuk u gjet ose nuk është aktiv.",
      });
    }

    const enrolled = await progressModel.isStudentEnrolled(
      req.user.userId,
      courseId,
    );

    if (!enrolled) {
      return res.status(403).json({
        message: "Nuk je i regjistruar në këtë kurs.",
      });
    }

    const progress = await progressModel.getCourseProgress(
      req.user.userId,
      courseId,
    );

    return res.status(200).json(progress);
  } catch (error) {
    console.error("Get course progress error:", error);

    return res.status(500).json({
      message: "Nuk u arrit të merret progresi i kursit.",
    });
  }
}

async function getMyCourses(req, res) {
  try {
    const courses = await progressModel.getMyCoursesProgress(req.user.userId);

    return res.status(200).json(courses);
  } catch (error) {
    console.error("Get my courses progress error:", error);

    return res.status(500).json({
      message: "Nuk u arrit të merret progresi i kurseve.",
    });
  }
}

async function getStudentsProgress(req, res) {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        message: "ID e kursit nuk është valide.",
      });
    }

    const course = await progressModel.getCourseForAccess(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Kursi nuk u gjet.",
      });
    }

    if (req.user.role !== "Admin" && course.InstructorID !== req.user.userId) {
      return res.status(403).json({
        message: "Nuk ke leje për të parë progresin e këtij kursi.",
      });
    }

    const students = await progressModel.getStudentsCourseProgress(courseId);

    return res.status(200).json(students);
  } catch (error) {
    console.error("Get students progress error:", error);

    return res.status(500).json({
      message: "Nuk u arrit të merret progresi i studentëve.",
    });
  }
}

module.exports = {
  completeLesson,
  uncompleteLesson,
  getMyCourseProgress,
  getMyCourses,
  getStudentsProgress,
};
