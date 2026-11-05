const { connectDB } = require("../config/db");
const sql = require("mssql");

async function updateAssignment(assignmentId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("assignmentId", sql.Int, assignmentId)
    .input("lessonId", sql.Int, data.lessonId)
    .input("title", sql.NVarChar(200), data.title)
    .input("description", sql.NVarChar(sql.MAX), data.description)
    .input("dueDate", sql.DateTime2, data.dueDate)
    .input("maxPoints", sql.Int, data.maxPoints).query(`
      UPDATE Assignments
      SET LessonID = @lessonId,
          Title = @title,
          Description = @description,
          DueDate = @dueDate,
          MaxPoints = @maxPoints
      OUTPUT
        INSERTED.AssignmentID,
        INSERTED.CourseID,
        INSERTED.LessonID,
        INSERTED.Title,
        INSERTED.Description,
        INSERTED.DueDate,
        INSERTED.MaxPoints,
        INSERTED.CreatedAt
      WHERE AssignmentID = @assignmentId
        AND NOT EXISTS (
          SELECT 1
          FROM Submissions
          WHERE AssignmentID = @assignmentId
            AND Grade > @maxPoints
        )
    `);

  return result.recordset[0] || null;
}

async function deleteAssignment(assignmentId) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const filesResult = await new sql.Request(transaction)
      .input("assignmentId", sql.Int, assignmentId).query(`
        DELETE FROM SubmissionFiles
        OUTPUT DELETED.FileURL
        WHERE SubmissionID IN (
          SELECT SubmissionID
          FROM Submissions
          WHERE AssignmentID = @assignmentId
        )
      `);

    const submissionResult = await new sql.Request(transaction)
      .input("assignmentId", sql.Int, assignmentId).query(`
        DELETE FROM Submissions
        OUTPUT DELETED.FileURL
        WHERE AssignmentID = @assignmentId
      `);

    await new sql.Request(transaction)
      .input("assignmentId", sql.Int, assignmentId).query(`
        DELETE FROM Assignments
        WHERE AssignmentID = @assignmentId
      `);

    await transaction.commit();

    return [
      ...new Set([
        ...filesResult.recordset.map((file) => file.FileURL),
        ...submissionResult.recordset.map((submission) => submission.FileURL),
      ]),
    ].filter(Boolean);
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }

    throw error;
  }
}

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
        s.Feedback,
        JSON_QUERY((
          SELECT sf.SubmissionFileID, sf.FileURL
          FROM SubmissionFiles sf
          WHERE sf.SubmissionID = s.SubmissionID
          ORDER BY sf.SubmissionFileID
          FOR JSON PATH
        )) AS Files
      FROM Submissions s
      INNER JOIN Users u
        ON u.UserID = s.StudentID
      WHERE s.AssignmentID = @assignmentId
      ORDER BY s.SubmittedAt DESC
    `);

  return result.recordset.map((submission) => ({
    ...submission,
    Files: JSON.parse(submission.Files || "[]"),
  }));
}

async function getSubmissionById(submissionId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("submissionId", sql.Int, submissionId).query(`
      SELECT
        s.SubmissionID,
        s.StudentID,
        s.FileURL,
        s.Grade,
        a.CourseID
      FROM Submissions s
      INNER JOIN Assignments a
        ON a.AssignmentID = s.AssignmentID
      WHERE s.SubmissionID = @submissionId
    `);

  return result.recordset[0] || null;
}

async function getSubmissionFileById(submissionId, submissionFileId) {
  const pool = await connectDB();

  const result = await pool.request()
    .input("submissionId", sql.Int, submissionId)
    .input("submissionFileId", sql.Int, submissionFileId).query(`
      SELECT
        s.SubmissionID,
        s.StudentID,
        sf.FileURL,
        a.CourseID
      FROM SubmissionFiles sf
      INNER JOIN Submissions s
        ON s.SubmissionID = sf.SubmissionID
      INNER JOIN Assignments a
        ON a.AssignmentID = s.AssignmentID
      WHERE s.SubmissionID = @submissionId
        AND sf.SubmissionFileID = @submissionFileId
    `);

  return result.recordset[0] || null;
}

async function submitAssignment(assignmentId, studentId, fileURLs) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const result = await new sql.Request(transaction)
      .input("assignmentId", sql.Int, assignmentId)
      .input("studentId", sql.Int, studentId)
      .input("fileURL", sql.NVarChar(500), fileURLs[0]).query(`
      INSERT INTO Submissions (AssignmentID, StudentID, FileURL, SubmittedAt)
      OUTPUT
        INSERTED.SubmissionID,
        INSERTED.AssignmentID,
        INSERTED.StudentID,
        INSERTED.FileURL,
        INSERTED.SubmittedAt,
        INSERTED.Grade,
        INSERTED.Feedback
      SELECT
        @assignmentId,
        @studentId,
        @fileURL,
        SYSDATETIME()
      WHERE EXISTS (
        SELECT 1
        FROM Assignments
        WHERE AssignmentID = @assignmentId
          AND (DueDate IS NULL OR DueDate >= SYSUTCDATETIME())
      )
    `);

    const submission = result.recordset[0];
    if (!submission) {
      await transaction.rollback();
      return null;
    }

    for (const fileURL of fileURLs) {
      await new sql.Request(transaction)
        .input("submissionId", sql.Int, submission.SubmissionID)
        .input("fileURL", sql.NVarChar(500), fileURL).query(`
          INSERT INTO SubmissionFiles (SubmissionID, FileURL)
          VALUES (@submissionId, @fileURL)
        `);
    }

    await transaction.commit();
    return { ...submission, Files: fileURLs };
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }
    throw error;
  }
}

async function updateSubmissionFiles(submissionId, studentId, fileURLs) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const current = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId)
      .input("studentId", sql.Int, studentId).query(`
        SELECT
          s.SubmissionID,
          s.Grade,
          CASE
            WHEN a.DueDate IS NULL OR a.DueDate >= SYSUTCDATETIME() THEN 1
            ELSE 0
          END AS CanEdit
        FROM Submissions AS s WITH (UPDLOCK, ROWLOCK)
        INNER JOIN Assignments AS a
          ON a.AssignmentID = s.AssignmentID
        WHERE s.SubmissionID = @submissionId
          AND s.StudentID = @studentId
      `);

    if (
      !current.recordset[0] ||
      current.recordset[0].Grade != null ||
      current.recordset[0].CanEdit !== 1
    ) {
      await transaction.rollback();
      return null;
    }

    const previousFiles = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId).query(`
        DELETE FROM SubmissionFiles
        OUTPUT DELETED.FileURL
        WHERE SubmissionID = @submissionId
      `);

    for (const fileURL of fileURLs) {
      await new sql.Request(transaction)
        .input("submissionId", sql.Int, submissionId)
        .input("fileURL", sql.NVarChar(500), fileURL).query(`
          INSERT INTO SubmissionFiles (SubmissionID, FileURL)
          VALUES (@submissionId, @fileURL)
        `);
    }

    const updated = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId)
      .input("fileURL", sql.NVarChar(500), fileURLs[0]).query(`
        UPDATE Submissions
        SET FileURL = @fileURL,
            SubmittedAt = SYSDATETIME()
        OUTPUT
          INSERTED.SubmissionID,
          INSERTED.AssignmentID,
          INSERTED.StudentID,
          INSERTED.FileURL,
          INSERTED.SubmittedAt,
          INSERTED.Grade,
          INSERTED.Feedback
        WHERE SubmissionID = @submissionId
      `);

    await transaction.commit();
    return {
      submission: { ...updated.recordset[0], Files: fileURLs },
      replacedFileURLs: previousFiles.recordset.map((file) => file.FileURL),
    };
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }
    throw error;
  }
}

async function removeSubmissionFile(submissionId, studentId, submissionFileId) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const submissionResult = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId)
      .input("studentId", sql.Int, studentId).query(`
        SELECT
          s.SubmissionID,
          s.Grade,
          CASE
            WHEN a.DueDate IS NULL OR a.DueDate >= SYSUTCDATETIME() THEN 1
            ELSE 0
          END AS CanEdit
        FROM Submissions AS s WITH (UPDLOCK, ROWLOCK)
        INNER JOIN Assignments AS a
          ON a.AssignmentID = s.AssignmentID
        WHERE s.SubmissionID = @submissionId
          AND s.StudentID = @studentId
      `);
    const submission = submissionResult.recordset[0];

    if (!submission) {
      await transaction.rollback();
      return { status: "not_found" };
    }

    if (submission.Grade != null) {
      await transaction.rollback();
      return { status: "graded" };
    }

    if (submission.CanEdit !== 1) {
      await transaction.rollback();
      return { status: "deadline_passed" };
    }

    const fileResult = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId)
      .input("submissionFileId", sql.Int, submissionFileId).query(`
        SELECT SubmissionFileID, FileURL
        FROM SubmissionFiles
        WHERE SubmissionID = @submissionId
          AND SubmissionFileID = @submissionFileId
      `);

    if (!fileResult.recordset[0]) {
      await transaction.rollback();
      return { status: "file_not_found" };
    }

    const countResult = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId).query(`
        SELECT COUNT(*) AS FileCount
        FROM SubmissionFiles
        WHERE SubmissionID = @submissionId
      `);

    if (countResult.recordset[0].FileCount <= 1) {
      await transaction.rollback();
      return { status: "last_file" };
    }

    const removed = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId)
      .input("submissionFileId", sql.Int, submissionFileId).query(`
        DELETE FROM SubmissionFiles
        OUTPUT DELETED.FileURL
        WHERE SubmissionID = @submissionId
          AND SubmissionFileID = @submissionFileId
      `);
    const nextFile = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId).query(`
        SELECT TOP (1) FileURL
        FROM SubmissionFiles
        WHERE SubmissionID = @submissionId
        ORDER BY SubmissionFileID
      `);
    await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId)
      .input("fileURL", sql.NVarChar(500), nextFile.recordset[0].FileURL)
      .query(`
        UPDATE Submissions
        SET FileURL = @fileURL
        WHERE SubmissionID = @submissionId
      `);

    await transaction.commit();
    return {
      status: "removed",
      fileURL: removed.recordset[0].FileURL,
    };
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }
    throw error;
  }
}

async function deleteStudentSubmission(submissionId, studentId) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const submissionResult = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId)
      .input("studentId", sql.Int, studentId).query(`
        SELECT
          s.SubmissionID,
          s.Grade,
          CASE
            WHEN a.DueDate IS NULL OR a.DueDate >= SYSUTCDATETIME() THEN 1
            ELSE 0
          END AS CanEdit
        FROM Submissions AS s WITH (UPDLOCK, ROWLOCK)
        INNER JOIN Assignments AS a
          ON a.AssignmentID = s.AssignmentID
        WHERE s.SubmissionID = @submissionId
          AND s.StudentID = @studentId
      `);
    const submission = submissionResult.recordset[0];

    if (!submission) {
      await transaction.rollback();
      return { status: "not_found" };
    }

    if (submission.Grade != null) {
      await transaction.rollback();
      return { status: "graded" };
    }

    if (submission.CanEdit !== 1) {
      await transaction.rollback();
      return { status: "deadline_passed" };
    }

    const files = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId).query(`
        DELETE FROM SubmissionFiles
        OUTPUT DELETED.FileURL
        WHERE SubmissionID = @submissionId
      `);
    const legacyRow = await new sql.Request(transaction)
      .input("submissionId", sql.Int, submissionId).query(`
        DELETE FROM Submissions
        OUTPUT DELETED.FileURL
        WHERE SubmissionID = @submissionId
      `);

    await transaction.commit();
    return {
      status: "deleted",
      fileURLs: [
        ...new Set([
          ...files.recordset.map((file) => file.FileURL),
          ...legacyRow.recordset.map((row) => row.FileURL),
        ]),
      ].filter(Boolean),
    };
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }
    throw error;
  }
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
        JSON_QUERY((
          SELECT sf.SubmissionFileID, sf.FileURL
          FROM SubmissionFiles sf
          WHERE sf.SubmissionID = s.SubmissionID
          ORDER BY sf.SubmissionFileID
          FOR JSON PATH
        )) AS Files,
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

  return result.recordset.map((submission) => ({
    ...submission,
    Files: JSON.parse(submission.Files || "[]"),
  }));
}

module.exports = {
  getAssignmentsByCourse,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentById,
  getSubmissionsByAssignment,
  getSubmissionById,
  getSubmissionFileById,
  submitAssignment,
  updateSubmissionFiles,
  removeSubmissionFile,
  deleteStudentSubmission,
  gradeSubmission,
  getSubmissionsByStudent,
};
