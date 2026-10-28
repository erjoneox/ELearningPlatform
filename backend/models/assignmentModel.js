const { connectDB } = require("../config/db");
const sql = require("mssql");

async function getAssignmentsByCourse(courseId) {
  const pool = await connectDB();

  const result = await pool.request().input("courseId", sql.Int, courseId)
    .query(`
      SELECT
        AssignmentID,
        CourseID,
        LessonID,
        Title,
        Description,
        DueDate,
        MaxPoints,
        CreatedAt
      FROM Assignments
      WHERE CourseID = @courseId
      ORDER BY CreatedAt DESC
    `);

  return result.recordset;
}

async function createAssignment(courseId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("courseId", sql.Int, courseId)
    .input("lessonId", sql.Int, data.lessonId ?? null)
    .input("title", sql.NVarChar(200), data.title)
    .input("description", sql.NVarChar(sql.MAX), data.description || null)
    .input("dueDate", sql.DateTime2, data.dueDate || null)
    .input("maxPoints", sql.Int, data.maxPoints).query(`
      INSERT INTO Assignments (
        CourseID,
        LessonID,
        Title,
        Description,
        DueDate,
        MaxPoints
      )
      OUTPUT
        INSERTED.AssignmentID,
        INSERTED.CourseID,
        INSERTED.LessonID,
        INSERTED.Title,
        INSERTED.Description,
        INSERTED.DueDate,
        INSERTED.MaxPoints,
        INSERTED.CreatedAt
      VALUES (
        @courseId,
        @lessonId,
        @title,
        @description,
        @dueDate,
        @maxPoints
      )
    `);

  return result.recordset[0];
}

async function getAssignmentById(assignmentId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("assignmentId", sql.Int, assignmentId).query(`
      SELECT *
      FROM Assignments
      WHERE AssignmentID = @assignmentId
    `);

  return result.recordset[0] || null;
}

async function getSubmissionsByAssignment(assignmentId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("assignmentId", sql.Int, assignmentId).query(`
      SELECT
        s.SubmissionID,
        s.AssignmentID,
        s.StudentID,
        u.FirstName,
        u.LastName,
        u.Email,
        s.FileURL,
        s.SubmittedAt,
        s.Grade,
        s.Feedback
      FROM Submissions s
      INNER JOIN Users u
        ON u.UserID = s.StudentID
      WHERE s.AssignmentID = @assignmentId
      ORDER BY s.SubmittedAt DESC
    `);

  return result.recordset;
}

async function submitAssignment(assignmentId, studentId, fileURL) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("assignmentId", sql.Int, assignmentId)
    .input("studentId", sql.Int, studentId)
    .input("fileURL", sql.NVarChar(500), fileURL).query(`
      INSERT INTO Submissions (
        AssignmentID,
        StudentID,
        FileURL,
        SubmittedAt
      )
      OUTPUT
        INSERTED.SubmissionID,
        INSERTED.AssignmentID,
        INSERTED.StudentID,
        INSERTED.FileURL,
        INSERTED.SubmittedAt,
        INSERTED.Grade,
        INSERTED.Feedback
      VALUES (
        @assignmentId,
        @studentId,
        @fileURL,
        GETDATE()
      )
    `);

  return result.recordset[0];
}

async function gradeSubmission(submissionId, grade, feedback) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("submissionId", sql.Int, submissionId)
    .input("grade", sql.Int, grade)
    .input("feedback", sql.NVarChar(sql.MAX), feedback || null).query(`
      UPDATE Submissions
      SET
        Grade = @grade,
        Feedback = @feedback
      OUTPUT
        INSERTED.SubmissionID,
        INSERTED.AssignmentID,
        INSERTED.StudentID,
        INSERTED.Grade,
        INSERTED.Feedback
      WHERE SubmissionID = @submissionId
    `);

  return result.recordset[0] || null;
}

async function getSubmissionsByStudent(studentId) {
  const pool = await connectDB();

  const result = await pool.request().input("studentId", sql.Int, studentId)
    .query(`
      SELECT
        s.SubmissionID,
        s.AssignmentID,
        s.StudentID,
        s.FileURL,
        s.SubmittedAt,
        s.Grade,
        s.Feedback,
        a.Title AS AssignmentTitle,
        a.Description AS AssignmentDescription,
        a.DueDate,
        a.MaxPoints,
        a.CourseID,
        c.Title AS CourseTitle
      FROM Submissions s
      INNER JOIN Assignments a
        ON a.AssignmentID = s.AssignmentID
      INNER JOIN Courses c
        ON c.CourseID = a.CourseID
      WHERE s.StudentID = @studentId
      ORDER BY s.SubmittedAt DESC
    `);

  return result.recordset;
}

module.exports = {
  getAssignmentsByCourse,
  createAssignment,
  getAssignmentById,
  getSubmissionsByAssignment,
  submitAssignment,
  gradeSubmission,
  getSubmissionsByStudent,
};
