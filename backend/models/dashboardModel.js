const { sql, connectDB } = require("../config/db");

async function getAdminDashboard() {
  const pool = await connectDB();

  const [statisticsResult, coursesResult, submissionsResult] = await Promise.all(
    [
      pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM Users WHERE Status = 'Active') AS ActiveUsers,
          (SELECT COUNT(*) FROM Users
           WHERE Role = 'Student' AND Status = 'Active') AS Students,
          (SELECT COUNT(*) FROM Users
           WHERE Role = 'Instructor' AND Status = 'Active') AS Instructors,
          (SELECT COUNT(*) FROM Courses
           WHERE Status = 'Active') AS ActiveCourses,
          (SELECT COUNT(*) FROM Enrollments
           WHERE Status = 'Active') AS ActiveEnrollments,
          (SELECT COUNT(*) FROM Submissions
           WHERE Grade IS NULL) AS UngradedSubmissions,
          (SELECT COUNT(*) FROM Submissions) AS TotalSubmissions
      `),
      pool.request().query(`
        SELECT TOP 6
          c.CourseID,
          c.Title,
          c.CreatedAt,
          u.FirstName + ' ' + u.LastName AS InstructorName,
          (SELECT COUNT(*)
           FROM Enrollments e
           WHERE e.CourseID = c.CourseID AND e.Status = 'Active') AS Students,
          (SELECT COUNT(*)
           FROM Assignments a
           WHERE a.CourseID = c.CourseID) AS Assignments
        FROM Courses c
        INNER JOIN Users u ON u.UserID = c.InstructorID
        WHERE c.Status = 'Active'
        ORDER BY c.CreatedAt DESC
      `),
      pool.request().query(`
        SELECT TOP 8
          s.SubmissionID,
          s.SubmittedAt,
          s.Grade,
          u.FirstName + ' ' + u.LastName AS StudentName,
          a.Title AS AssignmentTitle,
          a.CourseID,
          c.Title AS CourseTitle
        FROM Submissions s
        INNER JOIN Users u ON u.UserID = s.StudentID
        INNER JOIN Assignments a ON a.AssignmentID = s.AssignmentID
        INNER JOIN Courses c ON c.CourseID = a.CourseID
        WHERE s.Grade IS NULL
        ORDER BY s.SubmittedAt ASC
      `),
    ],
  );

  return {
    statistics: statisticsResult.recordset[0],
    recentCourses: coursesResult.recordset,
    ungradedSubmissions: submissionsResult.recordset,
  };
}

async function getInstructorDashboard(instructorId) {
  const pool = await connectDB();
  const request = () => pool.request().input("InstructorID", sql.Int, instructorId);

  const [statisticsResult, coursesResult, submissionsResult] = await Promise.all(
    [
      request().query(`
        SELECT
          (SELECT COUNT(*)
           FROM Courses
           WHERE InstructorID = @InstructorID
             AND Status = 'Active') AS ActiveCourses,
          (SELECT COUNT(DISTINCT e.StudentID)
           FROM Courses c
           INNER JOIN Enrollments e ON e.CourseID = c.CourseID
           WHERE c.InstructorID = @InstructorID
             AND c.Status = 'Active'
             AND e.Status = 'Active') AS Students,
          (SELECT COUNT(*)
           FROM Submissions s
           INNER JOIN Assignments a ON a.AssignmentID = s.AssignmentID
           INNER JOIN Courses c ON c.CourseID = a.CourseID
           WHERE c.InstructorID = @InstructorID
             AND c.Status = 'Active'
             AND s.Grade IS NULL) AS UngradedSubmissions,
          (SELECT COUNT(*)
           FROM Assignments a
           INNER JOIN Courses c ON c.CourseID = a.CourseID
           WHERE c.InstructorID = @InstructorID
             AND c.Status = 'Active') AS TotalAssignments,
          (SELECT COUNT(*)
           FROM Submissions s
           INNER JOIN Assignments a ON a.AssignmentID = s.AssignmentID
           INNER JOIN Courses c ON c.CourseID = a.CourseID
           WHERE c.InstructorID = @InstructorID
             AND c.Status = 'Active') AS TotalSubmissions
      `),
      request().query(`
        SELECT
          c.CourseID,
          c.Title,
          c.Description,
          (SELECT COUNT(*)
           FROM Enrollments e
           WHERE e.CourseID = c.CourseID
             AND e.Status = 'Active') AS Students,
          (SELECT COUNT(*)
           FROM Assignments a
           WHERE a.CourseID = c.CourseID) AS Assignments,
          (SELECT COUNT(*)
           FROM Submissions s
           INNER JOIN Assignments a ON a.AssignmentID = s.AssignmentID
           WHERE a.CourseID = c.CourseID
             AND s.Grade IS NULL) AS UngradedSubmissions
        FROM Courses c
        WHERE c.InstructorID = @InstructorID
          AND c.Status = 'Active'
        ORDER BY c.CreatedAt DESC
      `),
      request().query(`
        SELECT TOP 10
          s.SubmissionID,
          s.SubmittedAt,
          u.FirstName + ' ' + u.LastName AS StudentName,
          u.Email AS StudentEmail,
          a.AssignmentID,
          a.Title AS AssignmentTitle,
          a.CourseID,
          c.Title AS CourseTitle
        FROM Submissions s
        INNER JOIN Users u ON u.UserID = s.StudentID
        INNER JOIN Assignments a ON a.AssignmentID = s.AssignmentID
        INNER JOIN Courses c ON c.CourseID = a.CourseID
        WHERE c.InstructorID = @InstructorID
          AND c.Status = 'Active'
          AND s.Grade IS NULL
        ORDER BY s.SubmittedAt ASC
      `),
    ],
  );

  return {
    statistics: statisticsResult.recordset[0],
    courses: coursesResult.recordset,
    ungradedSubmissions: submissionsResult.recordset,
  };
}

async function getStudentDashboard(studentId) {
  const pool = await connectDB();
  const request = () => pool.request().input("StudentID", sql.Int, studentId);

  const [statisticsResult, progressResult, assignmentsResult, submissionsResult] =
    await Promise.all([
      request().query(`
        SELECT
          (SELECT COUNT(*)
           FROM Enrollments e
           INNER JOIN Courses c ON c.CourseID = e.CourseID
           WHERE e.StudentID = @StudentID
             AND e.Status = 'Active'
             AND c.Status = 'Active') AS EnrolledCourses,
          (SELECT COUNT(DISTINCT p.LessonID)
           FROM Progress p
           INNER JOIN Enrollments e
             ON e.StudentID = p.StudentID
             AND e.CourseID = p.CourseID
             AND e.Status = 'Active'
           INNER JOIN Courses c
             ON c.CourseID = p.CourseID
             AND c.Status = 'Active'
           WHERE p.StudentID = @StudentID
             AND p.Completed = 1) AS CompletedLessons,
          (SELECT COUNT(*)
           FROM Submissions
           WHERE StudentID = @StudentID) AS SubmittedAssignments,
          (SELECT COUNT(*)
           FROM QuizAttempts
           WHERE StudentID = @StudentID) AS QuizAttempts,
          (SELECT COUNT(*)
           FROM Assignments a
           INNER JOIN Enrollments e ON e.CourseID = a.CourseID
           INNER JOIN Courses c ON c.CourseID = a.CourseID
           WHERE e.StudentID = @StudentID
             AND e.Status = 'Active'
             AND c.Status = 'Active'
             AND NOT EXISTS (
               SELECT 1
               FROM Submissions s
               WHERE s.AssignmentID = a.AssignmentID
                 AND s.StudentID = @StudentID
             )) AS PendingAssignments,
          (SELECT COUNT(*)
           FROM Assignments a
           INNER JOIN Enrollments e ON e.CourseID = a.CourseID
           INNER JOIN Courses c ON c.CourseID = a.CourseID
           WHERE e.StudentID = @StudentID
             AND e.Status = 'Active'
             AND c.Status = 'Active'
             AND a.DueDate >= CONVERT(date, GETDATE())
             AND a.DueDate < DATEADD(day, 1, CONVERT(date, GETDATE()))
             AND NOT EXISTS (
               SELECT 1 FROM Submissions s
               WHERE s.AssignmentID = a.AssignmentID
                 AND s.StudentID = @StudentID
             )) AS DueToday,
          (SELECT COUNT(*)
           FROM Assignments a
           INNER JOIN Enrollments e ON e.CourseID = a.CourseID
           INNER JOIN Courses c ON c.CourseID = a.CourseID
           WHERE e.StudentID = @StudentID
             AND e.Status = 'Active'
             AND c.Status = 'Active'
             AND a.DueDate >= DATEADD(day, 1, CONVERT(date, GETDATE()))
             AND NOT EXISTS (
               SELECT 1 FROM Submissions s
               WHERE s.AssignmentID = a.AssignmentID
                 AND s.StudentID = @StudentID
             )) AS UpcomingAssignments,
          (SELECT COUNT(*)
           FROM Assignments a
           INNER JOIN Enrollments e ON e.CourseID = a.CourseID
           INNER JOIN Courses c ON c.CourseID = a.CourseID
           WHERE e.StudentID = @StudentID
             AND e.Status = 'Active'
             AND c.Status = 'Active'
             AND a.DueDate < CONVERT(date, GETDATE())
             AND NOT EXISTS (
               SELECT 1 FROM Submissions s
               WHERE s.AssignmentID = a.AssignmentID
                 AND s.StudentID = @StudentID
             )) AS OverdueAssignments
      `),
      request().query(`
        SELECT
          c.CourseID,
          c.Title AS CourseTitle,
          c.Thumbnail,
          COUNT(DISTINCT l.LessonID) AS TotalLessons,
          COUNT(DISTINCT CASE
            WHEN p.Completed = 1 THEN l.LessonID
          END) AS CompletedLessons
        FROM Enrollments e
        INNER JOIN Courses c ON c.CourseID = e.CourseID
        LEFT JOIN Lessons l ON l.CourseID = c.CourseID
        LEFT JOIN Progress p
          ON p.StudentID = e.StudentID
          AND p.CourseID = c.CourseID
          AND p.LessonID = l.LessonID
        WHERE e.StudentID = @StudentID
          AND e.Status = 'Active'
          AND c.Status = 'Active'
        GROUP BY c.CourseID, c.Title, c.Thumbnail
        ORDER BY c.Title
      `),
      request().query(`
        SELECT TOP 40
          a.AssignmentID,
          a.CourseID,
          a.Title,
          a.Description,
          a.DueDate,
          a.MaxPoints,
          c.Title AS CourseTitle,
          u.FirstName + ' ' + u.LastName AS InstructorName,
          CASE
            WHEN a.DueDate IS NULL THEN 'NoDeadline'
            WHEN a.DueDate < CONVERT(date, GETDATE()) THEN 'Overdue'
            WHEN a.DueDate < DATEADD(day, 1, CONVERT(date, GETDATE())) THEN 'Today'
            ELSE 'Upcoming'
          END AS DeadlineStatus
        FROM Assignments a
        INNER JOIN Enrollments e ON e.CourseID = a.CourseID
        INNER JOIN Courses c ON c.CourseID = a.CourseID
        INNER JOIN Users u ON u.UserID = c.InstructorID
        WHERE e.StudentID = @StudentID
          AND e.Status = 'Active'
          AND c.Status = 'Active'
          AND NOT EXISTS (
            SELECT 1
            FROM Submissions s
            WHERE s.AssignmentID = a.AssignmentID
              AND s.StudentID = @StudentID
          )
        ORDER BY
          CASE
            WHEN a.DueDate IS NULL THEN 3
            WHEN a.DueDate < CONVERT(date, GETDATE()) THEN 2
            ELSE 1
          END,
          a.DueDate,
          a.Title
      `),
      request().query(`
        SELECT TOP 12
          s.SubmissionID,
          s.AssignmentID,
          s.FileURL,
          s.SubmittedAt,
          s.Grade,
          s.Feedback,
          a.Title AS AssignmentTitle,
          a.MaxPoints,
          a.CourseID,
          c.Title AS CourseTitle
        FROM Submissions s
        INNER JOIN Assignments a ON a.AssignmentID = s.AssignmentID
        INNER JOIN Courses c ON c.CourseID = a.CourseID
        WHERE s.StudentID = @StudentID
        ORDER BY s.SubmittedAt DESC
      `),
    ]);

  const courses = progressResult.recordset.map((course) => {
    const totalLessons = Number(course.TotalLessons);
    const completedLessons = Number(course.CompletedLessons);

    return {
      ...course,
      totalLessons,
      completedLessons,
      progress:
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 100),
    };
  });

  const assignments = assignmentsResult.recordset;

  return {
    statistics: statisticsResult.recordset[0],
    courses,
    dueToday: assignments.filter((item) => item.DeadlineStatus === "Today"),
    upcomingAssignments: assignments.filter(
      (item) => item.DeadlineStatus === "Upcoming",
    ),
    overdueAssignments: assignments.filter(
      (item) => item.DeadlineStatus === "Overdue",
    ),
    noDeadlineAssignments: assignments.filter(
      (item) => item.DeadlineStatus === "NoDeadline",
    ),
    recentSubmissions: submissionsResult.recordset,
  };
}

module.exports = {
  getAdminDashboard,
  getInstructorDashboard,
  getStudentDashboard,
};
