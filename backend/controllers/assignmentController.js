const {
  getAssignmentsByCourse,
  createAssignment,
  getAssignmentById,
  getSubmissionsByAssignment,
  getSubmissionById,
  submitAssignment,
  gradeSubmission,
  getSubmissionsByStudent,
} = require("../models/assignmentModel");

const { getCourseById } = require("../models/courseModel");
const { getLessonById } = require("../models/lessonModel");
const { connectDB } = require("../config/db");

const sql = require("mssql");
const fs = require("fs/promises");
const path = require("path");

async function hasEnrollment(studentId, courseId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("studentId", sql.Int, studentId)
    .input("courseId", sql.Int, courseId).query(`
      SELECT EnrollmentID
      FROM Enrollments
      WHERE StudentID = @studentId
        AND CourseID = @courseId
        AND Status = 'Active'
    `);

  return result.recordset.length > 0;
}

function canManageCourse(course, user) {
  return (
    user.role === "Admin" ||
    (user.role === "Instructor" &&
      Number(course.InstructorID) === Number(user.userId))
  );
}

async function removeUploadedFile(file) {
  if (!file?.path) return;

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to remove uploaded file:", error.message);
    }
  }
}

async function listAssignments(req, res) {
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

    if (req.user.role === "Student") {
      const enrolled = await hasEnrollment(req.user.userId, courseId);

      if (!enrolled) {
        return res.status(403).json({
          message: "You must be enrolled in this course.",
        });
      }
    } else if (!canManageCourse(course, req.user)) {
      return res.status(403).json({
        message: "You cannot access these assignments.",
      });
    }

    const assignments = await getAssignmentsByCourse(courseId);

    return res.status(200).json({ assignments });
  } catch (error) {
    console.error("List assignments error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve assignments.",
    });
  }
}

async function addAssignment(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const { lessonId, title, description, dueDate, maxPoints } = req.body;

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isInteger(maxPoints) ||
      maxPoints <= 0 ||
      maxPoints > 100
    ) {
      return res.status(400).json({
        message: "Valid course ID, title and maxPoints from 1 to 100 are required.",
      });
    }

    if (
      dueDate != null &&
      (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate)))
    ) {
      return res.status(400).json({
        message: "Invalid dueDate.",
      });
    }

    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (!canManageCourse(course, req.user)) {
      return res.status(403).json({
        message: "You cannot manage assignments for this course.",
      });
    }

    let parsedLessonId = null;

    if (lessonId != null && lessonId !== "") {
      parsedLessonId = Number(lessonId);

      if (!Number.isInteger(parsedLessonId) || parsedLessonId <= 0) {
        return res.status(400).json({
          message: "Invalid lesson ID.",
        });
      }

      const lesson = await getLessonById(parsedLessonId);

      if (!lesson || Number(lesson.CourseID) !== courseId) {
        return res.status(400).json({
          message: "The lesson must belong to this course.",
        });
      }
    }

    const assignment = await createAssignment(courseId, {
      lessonId: parsedLessonId,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : null,
      dueDate: dueDate || null,
      maxPoints,
    });

    return res.status(201).json({
      message: "Assignment created successfully.",
      assignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error.message);

    return res.status(500).json({
      message: "Failed to create assignment.",
    });
  }
}

async function listSubmissions(req, res) {
  try {
    const assignmentId = Number(req.params.assignmentId);

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return res.status(400).json({
        message: "Invalid assignment ID.",
      });
    }

    const assignment = await getAssignmentById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found.",
      });
    }

    const course = await getCourseById(assignment.CourseID);

    if (!course || !canManageCourse(course, req.user)) {
      return res.status(403).json({
        message: "You cannot view these submissions.",
      });
    }

    const submissions = await getSubmissionsByAssignment(assignmentId);

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("List submissions error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve submissions.",
    });
  }
}

async function submitWork(req, res) {
  const uploadedFile = req.file;

  try {
    const assignmentId = Number(req.params.assignmentId);

    if (!Number.isInteger(assignmentId) || assignmentId <= 0 || !uploadedFile) {
      await removeUploadedFile(uploadedFile);

      return res.status(400).json({
        message: "Valid assignment ID and a file are required.",
      });
    }

    const assignment = await getAssignmentById(assignmentId);

    if (!assignment) {
      await removeUploadedFile(uploadedFile);

      return res.status(404).json({
        message: "Assignment not found.",
      });
    }

    const course = await getCourseById(assignment.CourseID);

    if (!course || course.Status !== "Active") {
      await removeUploadedFile(uploadedFile);

      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const enrolled = await hasEnrollment(req.user.userId, assignment.CourseID);

    if (!enrolled) {
      await removeUploadedFile(uploadedFile);

      return res.status(403).json({
        message: "You must be enrolled in this course.",
      });
    }

    if (assignment.DueDate && new Date() > new Date(assignment.DueDate)) {
      await removeUploadedFile(uploadedFile);

      return res.status(400).json({
        message: "The assignment deadline has passed.",
      });
    }

    const fileURL = `/uploads/submissions/${uploadedFile.filename}`;

    const submission = await submitAssignment(
      assignmentId,
      req.user.userId,
      fileURL,
    );

    return res.status(201).json({
      message: "Assignment submitted successfully.",
      submission,
    });
  } catch (error) {
    await removeUploadedFile(uploadedFile);

    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        message: "You have already submitted this assignment.",
      });
    }

    console.error("Submit assignment error:", error.message);

    return res.status(500).json({
      message: "Failed to submit assignment.",
    });
  }
}

async function downloadSubmission(req, res) {
  try {
    const submissionId = Number(req.params.submissionId);

    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return res.status(400).json({
        message: "Invalid submission ID.",
      });
    }

    const submission = await getSubmissionById(submissionId);

    if (!submission) {
      return res.status(404).json({
        message: "Submission not found.",
      });
    }

    const isOwner =
      req.user.role === "Student" &&
      Number(submission.StudentID) === Number(req.user.userId);

    if (!isOwner) {
      const course = await getCourseById(submission.CourseID);

      if (!course || !canManageCourse(course, req.user)) {
        return res.status(403).json({
          message: "You cannot access this submission.",
        });
      }
    }

    const filename = path.posix.basename(submission.FileURL || "");

    if (!filename || filename === "." || filename === "/") {
      return res.status(404).json({
        message: "Submission file not found.",
      });
    }

    const filePath = path.join(__dirname, "../uploads/submissions", filename);

    return res.download(filePath, filename, (error) => {
      if (error) {
        if (error.code === "ENOENT") {
          return res.status(404).json({
            message: "Submission file not found.",
          });
        }

        console.error("Download submission error:", error.message);

        if (!res.headersSent) {
          res.status(500).json({
            message: "Failed to download submission.",
          });
        }
      }
    });
  } catch (error) {
    console.error("Download submission error:", error.message);

    return res.status(500).json({
      message: "Failed to download submission.",
    });
  }
}

async function gradeWork(req, res) {
  try {
    const submissionId = Number(req.params.submissionId);
    const { grade, feedback } = req.body;

    if (
      !Number.isInteger(submissionId) ||
      submissionId <= 0 ||
      !Number.isInteger(grade) ||
      grade < 0 ||
      grade > 100
    ) {
      return res.status(400).json({
        message: "A valid submission ID and grade from 0 to 100 are required.",
      });
    }

    const pool = await connectDB();

    const check = await pool
      .request()
      .input("submissionId", sql.Int, submissionId).query(`
        SELECT
          s.SubmissionID,
          a.CourseID,
          a.MaxPoints
        FROM Submissions s
        INNER JOIN Assignments a
          ON a.AssignmentID = s.AssignmentID
        WHERE s.SubmissionID = @submissionId
      `);

    const submissionInfo = check.recordset[0];

    if (!submissionInfo) {
      return res.status(404).json({
        message: "Submission not found.",
      });
    }

    if (grade > submissionInfo.MaxPoints) {
      return res.status(400).json({
        message: "Grade cannot exceed the assignment maximum points.",
      });
    }

    const course = await getCourseById(submissionInfo.CourseID);

    if (!course || !canManageCourse(course, req.user)) {
      return res.status(403).json({
        message: "You cannot grade this submission.",
      });
    }

    const submission = await gradeSubmission(
      submissionId,
      grade,
      typeof feedback === "string" ? feedback.trim() : null,
    );

    return res.status(200).json({
      message: "Submission graded successfully.",
      submission,
    });
  } catch (error) {
    console.error("Grade submission error:", error.message);

    return res.status(500).json({
      message: "Failed to grade submission.",
    });
  }
}

async function listMySubmissions(req, res) {
  try {
    const submissions = await getSubmissionsByStudent(req.user.userId);

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("List my submissions error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve your submissions.",
    });
  }
}

module.exports = {
  listAssignments,
  addAssignment,
  listSubmissions,
  submitWork,
  downloadSubmission,
  gradeWork,
  listMySubmissions,
};
