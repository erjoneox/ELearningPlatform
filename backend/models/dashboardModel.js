const { sql, connectDB } = require("../config/db");

async function getAdminDashboard() {
  const pool = await connectDB();

  const [statisticsResult, coursesResult] = await Promise.all([
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
           WHERE Status = 'Active') AS ActiveEnrollments
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
    ]);

  return {
    statistics: statisticsResult.recordset[0],
    recentCourses: coursesResult.recordset,
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
          c.Thumbnail AS Thumbnail,
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

  const [
    statisticsResult,
    progressResult,
    assignmentsResult,
    submissionsResult,
    quizzesResult,
    materialsResult,
  ] = await Promise.all([
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
      request().query(`
        SELECT
          quiz.QuizID,
          quiz.CourseID,
          quiz.LessonID,
          quiz.Title,
          quiz.DurationMinutes,
          quiz.ScheduledStartAt,
          course.Title AS CourseTitle,
          CASE
            WHEN quiz.ScheduledStartAt IS NOT NULL
              AND quiz.ScheduledStartAt > SYSUTCDATETIME()
            THEN 'Scheduled'
            WHEN activeAttempt.AttemptID IS NOT NULL
            THEN 'InProgress'
            ELSE 'Available'
          END AS QuizStatus,
          activeAttempt.AttemptID
        FROM dbo.Quizzes AS quiz
        INNER JOIN dbo.Courses AS course
          ON course.CourseID = quiz.CourseID
         AND course.Status = 'Active'
        INNER JOIN dbo.Enrollments AS enrollment
          ON enrollment.CourseID = quiz.CourseID
         AND enrollment.StudentID = @StudentID
         AND enrollment.Status = 'Active'
        OUTER APPLY (
          SELECT TOP (1)
            attempt.AttemptID,
            attempt.StartedAt,
            attempt.CompletedAt
          FROM dbo.QuizAttempts AS attempt
          WHERE attempt.QuizID = quiz.QuizID
            AND attempt.StudentID = @StudentID
          ORDER BY attempt.StartedAt DESC, attempt.AttemptID DESC
        ) AS activeAttempt
        WHERE NOT EXISTS (
          SELECT 1
          FROM dbo.QuizAttempts AS completedAttempt
          WHERE completedAttempt.QuizID = quiz.QuizID
            AND completedAttempt.StudentID = @StudentID
            AND completedAttempt.CompletedAt IS NOT NULL
        )
          AND (
            quiz.ScheduledStartAt IS NULL
            OR quiz.DurationMinutes IS NULL
            OR DATEADD(
              MINUTE,
              quiz.DurationMinutes,
              quiz.ScheduledStartAt
            ) > SYSUTCDATETIME()
          )
          AND (
            activeAttempt.AttemptID IS NULL
            OR quiz.DurationMinutes IS NULL
            OR DATEADD(
              MINUTE,
              quiz.DurationMinutes,
              COALESCE(quiz.ScheduledStartAt, activeAttempt.StartedAt)
            ) > SYSUTCDATETIME()
          )
        ORDER BY
          CASE
            WHEN quiz.ScheduledStartAt IS NULL THEN 1
            ELSE 0
          END,
          quiz.ScheduledStartAt,
          quiz.CreatedAt DESC
      `),
      request().query(`
        SELECT
          material.MaterialID,
          material.LessonID,
          lesson.CourseID,
          material.Title,
          material.FileURL,
          material.MaterialType,
          material.CreatedAt,
          lesson.Title AS LessonTitle,
          course.Title AS CourseTitle,
          instructor.FirstName + ' ' + instructor.LastName AS InstructorName
        FROM dbo.Materials AS material
        INNER JOIN dbo.Lessons AS lesson
          ON lesson.LessonID = material.LessonID
        INNER JOIN dbo.Courses AS course
          ON course.CourseID = lesson.CourseID
         AND course.Status = 'Active'
        INNER JOIN dbo.Users AS instructor
          ON instructor.UserID = course.InstructorID
         AND instructor.Role = 'Instructor'
         AND instructor.Status = 'Active'
        INNER JOIN dbo.Enrollments AS enrollment
          ON enrollment.CourseID = course.CourseID
         AND enrollment.StudentID = @StudentID
         AND enrollment.Status = 'Active'
        WHERE material.CreatedAt >= DATEADD(HOUR, -24, SYSDATETIME())
          AND material.CreatedAt <= SYSDATETIME()
        ORDER BY material.CreatedAt DESC
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
    upcomingQuizzes: quizzesResult.recordset,
    recentMaterials: materialsResult.recordset,
  };
}

module.exports = {
  getAdminDashboard,
  getInstructorDashboard,
  getStudentDashboard,
};
