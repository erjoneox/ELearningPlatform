const { connectDB } = require("../config/db");
const sql = require("mssql");

async function getAllCourses() {
  const pool = await connectDB();

  const result = await pool.request().query(`
        SELECT
            c.CourseID,
            c.Title,
            c.Description,
            c.Thumbnail,
            c.CreatedAt,
            c.Status,
            c.InstructorID,
            c.CategoryID,
            cat.Name AS CategoryName,
            u.FirstName + ' ' + u.LastName AS InstructorName
        FROM Courses c
        INNER JOIN Categories cat
            ON c.CategoryID = cat.CategoryID
        INNER JOIN Users u
            ON c.InstructorID = u.UserID
        WHERE c.Status = 'Active'
        ORDER BY c.CreatedAt DESC
    `);

  return result.recordset;
}

async function createCourse(instructorId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("instructorId", require("mssql").Int, instructorId)
    .input("categoryId", require("mssql").Int, data.categoryId)
    .input("title", require("mssql").NVarChar(200), data.title)
    .input(
      "description",
      require("mssql").NVarChar(require("mssql").MAX),
      data.description || null,
    )
    .input("thumbnail", require("mssql").NVarChar(500), data.thumbnail || null)
    .query(`
            INSERT INTO Courses
                (InstructorID, CategoryID, Title, Description,
                 Thumbnail, Status)
            OUTPUT
                INSERTED.CourseID,
                INSERTED.InstructorID,
                INSERTED.CategoryID,
                INSERTED.Title,
                INSERTED.Description,
                INSERTED.Thumbnail,
                INSERTED.CreatedAt,
                INSERTED.Status
            VALUES
                (@instructorId, @categoryId, @title, @description,
                 @thumbnail, 'Active')
        `);

  return result.recordset[0];
}

async function getCourseById(courseId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("courseId", require("mssql").Int, courseId).query(`
            SELECT CourseID, InstructorID, CategoryID,
                   Title, Description, Thumbnail, CreatedAt, Status
            FROM Courses
            WHERE CourseID = @courseId
        `);

  return result.recordset[0] || null;
}

async function updateCourse(courseId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("courseId", sql.Int, courseId)
    .input("instructorId", sql.Int, data.instructorId)
    .input("categoryId", sql.Int, data.categoryId)
    .input("title", sql.NVarChar(200), data.title)
    .input(
      "description",
      sql.NVarChar(sql.MAX),
      data.description || null,
    )
    .input("thumbnail", sql.NVarChar(500), data.thumbnail || null)
    .query(`
            UPDATE Courses
            SET InstructorID = @instructorId,
                CategoryID = @categoryId,
                Title = @title,
                Description = @description,
                Thumbnail = @thumbnail
            OUTPUT
                INSERTED.CourseID,
                INSERTED.InstructorID,
                INSERTED.CategoryID,
                INSERTED.Title,
                INSERTED.Description,
                INSERTED.Thumbnail,
                INSERTED.Status
            WHERE CourseID = @courseId
        `);

  return result.recordset[0] || null;
}

async function deleteCourse(courseId) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const submissionFileRows = await new sql.Request(transaction)
      .input("courseId", sql.Int, courseId).query(`
        DELETE submissionFile
        OUTPUT DELETED.FileURL
        FROM SubmissionFiles AS submissionFile
        INNER JOIN Submissions AS submission
          ON submission.SubmissionID = submissionFile.SubmissionID
        INNER JOIN Assignments AS assignment
          ON assignment.AssignmentID = submission.AssignmentID
        WHERE assignment.CourseID = @courseId
      `);

    const submissionRows = await new sql.Request(transaction)
      .input("courseId", sql.Int, courseId).query(`
        DELETE submission
        OUTPUT DELETED.FileURL
        FROM Submissions AS submission
        INNER JOIN Assignments AS assignment
          ON assignment.AssignmentID = submission.AssignmentID
        WHERE assignment.CourseID = @courseId
      `);

    await new sql.Request(transaction).input("courseId", sql.Int, courseId)
      .query(`
        DELETE FROM Assignments
        WHERE CourseID = @courseId;

        DELETE attempt
        FROM QuizAttempts AS attempt
        INNER JOIN Quizzes AS quiz ON quiz.QuizID = attempt.QuizID
        WHERE quiz.CourseID = @courseId;

        DELETE optionRow
        FROM QuestionOptions AS optionRow
        INNER JOIN Questions AS question
          ON question.QuestionID = optionRow.QuestionID
        INNER JOIN Quizzes AS quiz ON quiz.QuizID = question.QuizID
        WHERE quiz.CourseID = @courseId;

        DELETE question
        FROM Questions AS question
        INNER JOIN Quizzes AS quiz ON quiz.QuizID = question.QuizID
        WHERE quiz.CourseID = @courseId;

        DELETE FROM Quizzes WHERE CourseID = @courseId;
        DELETE FROM Progress WHERE CourseID = @courseId;

        IF OBJECT_ID(N'dbo.CourseNotifications', N'U') IS NOT NULL
          EXEC sys.sp_executesql
            N'DELETE FROM dbo.CourseNotifications WHERE CourseID = @courseId',
            N'@courseId INT',
            @courseId = @courseId;
      `);

    const materialFiles = await new sql.Request(transaction)
      .input("courseId", sql.Int, courseId).query(`
        DELETE material
        OUTPUT DELETED.FileURL
        FROM Materials AS material
        INNER JOIN Lessons AS lesson ON lesson.LessonID = material.LessonID
        WHERE lesson.CourseID = @courseId
      `);

    await new sql.Request(transaction).input("courseId", sql.Int, courseId)
      .query(`
        DELETE FROM Lessons WHERE CourseID = @courseId;
        DELETE FROM Enrollments WHERE CourseID = @courseId;
        DELETE FROM Courses WHERE CourseID = @courseId;
      `);

    await transaction.commit();

    return {
      submissionFiles: [
        ...new Set([
          ...submissionFileRows.recordset.map((row) => row.FileURL),
          ...submissionRows.recordset.map((row) => row.FileURL),
        ]),
      ].filter(Boolean),
      materialFiles: materialFiles.recordset.map((row) => row.FileURL),
    };
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }

    throw error;
  }
}

module.exports = {
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
};
