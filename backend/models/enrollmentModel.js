const sql = require("mssql");
const { connectDB } = require("../config/db");

async function enrollStudent(studentId, courseId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("studentId", require("mssql").Int, studentId)
    .input("courseId", require("mssql").Int, courseId).query(`
            INSERT INTO Enrollments
                (StudentID, CourseID, EnrolledAt, Status)
            OUTPUT
                INSERTED.EnrollmentID,
                INSERTED.StudentID,
                INSERTED.CourseID,
                INSERTED.EnrolledAt,
                INSERTED.Status
            SELECT
                @studentId,
                @courseId,
                GETDATE(),
                'Active'
            WHERE EXISTS (
                SELECT 1
                FROM Courses
                WHERE CourseID = @courseId
                  AND Status = 'Active'
            )
        `);

  return result.recordset[0] || null;
}
async function unenrollStudent(studentId, courseId) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const enrollment = await new sql.Request(transaction)
      .input("StudentID", sql.Int, studentId)
      .input("CourseID", sql.Int, courseId).query(`
        SELECT EnrollmentID
        FROM Enrollments
        WHERE StudentID = @StudentID
          AND CourseID = @CourseID;
      `);

    if (enrollment.recordset.length === 0) {
      await transaction.rollback();
      return false;
    }

    // Fshij progresin e mësimeve
    await new sql.Request(transaction)
      .input("StudentID", sql.Int, studentId)
      .input("CourseID", sql.Int, courseId).query(`
        DELETE FROM Progress
        WHERE StudentID = @StudentID
          AND CourseID = @CourseID;
      `);

    // Fshij dorëzimet e detyrave të këtij kursi
    await new sql.Request(transaction)
      .input("StudentID", sql.Int, studentId)
      .input("CourseID", sql.Int, courseId).query(`
        DELETE FROM Submissions
        WHERE StudentID = @StudentID
          AND AssignmentID IN (
            SELECT AssignmentID
            FROM Assignments
            WHERE CourseID = @CourseID
          );
      `);

    // Fshij tentimet dhe rezultatet e kuizeve të këtij kursi
    await new sql.Request(transaction)
      .input("StudentID", sql.Int, studentId)
      .input("CourseID", sql.Int, courseId).query(`
        DELETE FROM QuizAttempts
        WHERE StudentID = @StudentID
          AND QuizID IN (
            SELECT QuizID
            FROM Quizzes
            WHERE CourseID = @CourseID
          );
      `);

    // Në fund, fshij regjistrimin në kurs
    await new sql.Request(transaction)
      .input("StudentID", sql.Int, studentId)
      .input("CourseID", sql.Int, courseId).query(`
        DELETE FROM Enrollments
        WHERE StudentID = @StudentID
          AND CourseID = @CourseID;
      `);

    await transaction.commit();
    return true;
  } catch (error) {
    if (transaction._aborted !== true) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Gabim gjatë anulimit të transaksionit:", rollbackError);
      }
    }

    throw error;
  }
}

async function getStudentEnrollments(studentId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("studentId", require("mssql").Int, studentId).query(`
            SELECT
                e.EnrollmentID,
                e.EnrolledAt,
                e.Status AS EnrollmentStatus,
                c.CourseID,
                c.Title,
                c.Description,
                c.Thumbnail,
                cat.Name AS CategoryName,
                u.FirstName + ' ' + u.LastName AS InstructorName
            FROM Enrollments e
            INNER JOIN Courses c
                ON c.CourseID = e.CourseID
            INNER JOIN Categories cat
                ON cat.CategoryID = c.CategoryID
            INNER JOIN Users u
                ON u.UserID = c.InstructorID
            WHERE e.StudentID = @studentId
            ORDER BY e.EnrolledAt DESC
        `);

  return result.recordset;
}

async function enrollmentExists(studentId, courseId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("studentId", require("mssql").Int, studentId)
    .input("courseId", require("mssql").Int, courseId).query(`
            SELECT EnrollmentID
            FROM Enrollments
            WHERE StudentID = @studentId
              AND CourseID = @courseId
        `);

  return result.recordset.length > 0;
}

module.exports = {
  enrollStudent,
  unenrollStudent,
  getStudentEnrollments,
  enrollmentExists,
};
