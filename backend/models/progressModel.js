const { sql, connectDB } = require("../config/db");

async function markLessonCompleted(studentId, courseId, lessonId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("StudentID", sql.Int, studentId)
    .input("CourseID", sql.Int, courseId)
    .input("LessonID", sql.Int, lessonId).query(`
            MERGE INTO Progress WITH (HOLDLOCK) AS target
            USING (
                SELECT
                    @StudentID AS StudentID,
                    @CourseID AS CourseID,
                    @LessonID AS LessonID
            ) AS source
            ON target.StudentID = source.StudentID
               AND target.CourseID = source.CourseID
               AND target.LessonID = source.LessonID
            WHEN MATCHED THEN
                UPDATE SET
                    Completed = 1,
                    CompletedAt = COALESCE(
                        target.CompletedAt,
                        GETDATE()
                    )
            WHEN NOT MATCHED THEN
                INSERT (
                    StudentID,
                    CourseID,
                    LessonID,
                    Completed,
                    CompletedAt
                )
                VALUES (
                    source.StudentID,
                    source.CourseID,
                    source.LessonID,
                    1,
                    GETDATE()
                );
        `);

  return result.rowsAffected;
}

async function getCourseProgress(studentId, courseId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("StudentID", sql.Int, studentId)
    .input("CourseID", sql.Int, courseId).query(`
            SELECT
                l.LessonID,
                l.Title AS LessonTitle,
                l.OrderNumber,
                CAST(
                    COALESCE(p.Completed, 0) AS BIT
                ) AS Completed,
                p.CompletedAt
            FROM Lessons l
            LEFT JOIN Progress p
                ON p.LessonID = l.LessonID
                AND p.CourseID = l.CourseID
                AND p.StudentID = @StudentID
            WHERE l.CourseID = @CourseID
            ORDER BY l.OrderNumber;
        `);

  const lessons = result.recordset;
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((lesson) => lesson.Completed).length;

  return {
    courseId: Number(courseId),
    totalLessons,
    completedLessons,
    percentage:
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100),
    lessons,
  };
}

async function getMyCoursesProgress(studentId) {
  const pool = await connectDB();

  const result = await pool.request().input("StudentID", sql.Int, studentId)
    .query(`
            SELECT
                c.CourseID,
                c.Title AS CourseTitle,
                COUNT(DISTINCT l.LessonID) AS TotalLessons,
                COUNT(DISTINCT CASE
                    WHEN p.Completed = 1 THEN p.LessonID
                END) AS CompletedLessons
            FROM Enrollments e
            INNER JOIN Courses c
                ON c.CourseID = e.CourseID
            LEFT JOIN Lessons l
                ON l.CourseID = c.CourseID
            LEFT JOIN Progress p
                ON p.StudentID = e.StudentID
                AND p.CourseID = c.CourseID
                AND p.LessonID = l.LessonID
            WHERE e.StudentID = @StudentID
              AND e.Status = 'Active'
              AND c.Status = 'Active'
            GROUP BY c.CourseID, c.Title
            ORDER BY c.Title;
        `);

  return result.recordset.map((course) => {
    const totalLessons = Number(course.TotalLessons);
    const completedLessons = Number(course.CompletedLessons);

    return {
      courseId: course.CourseID,
      courseTitle: course.CourseTitle,
      totalLessons,
      completedLessons,
      percentage:
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 100),
    };
  });
}

async function getCourseForAccess(courseId) {
  const pool = await connectDB();

  const result = await pool.request().input("CourseID", sql.Int, courseId)
    .query(`
            SELECT CourseID, InstructorID, Status
            FROM Courses
            WHERE CourseID = @CourseID;
        `);

  return result.recordset[0] || null;
}

async function getLessonForAccess(lessonId) {
  const pool = await connectDB();

  const result = await pool.request().input("LessonID", sql.Int, lessonId)
    .query(`
            SELECT LessonID, CourseID
            FROM Lessons
            WHERE LessonID = @LessonID;
        `);

  return result.recordset[0] || null;
}

async function isStudentEnrolled(studentId, courseId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("StudentID", sql.Int, studentId)
    .input("CourseID", sql.Int, courseId).query(`
            SELECT TOP 1 EnrollmentID
            FROM Enrollments
            WHERE StudentID = @StudentID
              AND CourseID = @CourseID
              AND Status = 'Active';
        `);

  return result.recordset.length > 0;
}

async function getStudentsCourseProgress(courseId) {
  const pool = await connectDB();

  const result = await pool.request().input("CourseID", sql.Int, courseId)
    .query(`
            SELECT
                u.UserID AS StudentID,
                u.FirstName,
                u.LastName,
                u.Email,
                COUNT(DISTINCT l.LessonID) AS TotalLessons,
                COUNT(DISTINCT CASE
                    WHEN p.Completed = 1 THEN p.LessonID
                END) AS CompletedLessons
            FROM Enrollments e
            INNER JOIN Users u
                ON u.UserID = e.StudentID
            LEFT JOIN Lessons l
                ON l.CourseID = e.CourseID
            LEFT JOIN Progress p
                ON p.StudentID = e.StudentID
                AND p.CourseID = e.CourseID
                AND p.LessonID = l.LessonID
            WHERE e.CourseID = @CourseID
              AND e.Status = 'Active'
            GROUP BY
                u.UserID,
                u.FirstName,
                u.LastName,
                u.Email
            ORDER BY u.LastName, u.FirstName;
        `);

  return result.recordset.map((student) => {
    const totalLessons = Number(student.TotalLessons);
    const completedLessons = Number(student.CompletedLessons);

    return {
      studentId: student.StudentID,
      firstName: student.FirstName,
      lastName: student.LastName,
      email: student.Email,
      totalLessons,
      completedLessons,
      percentage:
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 100),
    };
  });
}
async function markLessonUncompleted(studentId, courseId, lessonId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("StudentID", sql.Int, studentId)
    .input("CourseID", sql.Int, courseId)
    .input("LessonID", sql.Int, lessonId).query(`
      UPDATE Progress
      SET
        Completed = 0,
        CompletedAt = NULL
      WHERE StudentID = @StudentID
        AND CourseID = @CourseID
        AND LessonID = @LessonID;
    `);

  return result.rowsAffected;
}

module.exports = {
  markLessonCompleted,
  markLessonUncompleted,
  getCourseProgress,
  getMyCoursesProgress,
  getCourseForAccess,
  getLessonForAccess,
  isStudentEnrolled,
  getStudentsCourseProgress,
};
