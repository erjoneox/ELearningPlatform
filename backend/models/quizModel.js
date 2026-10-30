const { connectDB } = require("../config/db");
const sql = require("mssql");

async function getQuizzesByCourse(courseId) {
  const pool = await connectDB();

  const result = await pool.request().input("courseId", sql.Int, courseId)
    .query(`
      SELECT
        q.QuizID,
        q.CourseID,
        q.LessonID,
        q.Title,
        q.Description,
        q.CreatedAt,
        COUNT(DISTINCT question.QuestionID) AS QuestionCount
      FROM Quizzes q
      LEFT JOIN Questions question ON question.QuizID = q.QuizID
      WHERE q.CourseID = @courseId
      GROUP BY
        q.QuizID,
        q.CourseID,
        q.LessonID,
        q.Title,
        q.Description,
        q.CreatedAt
      ORDER BY q.CreatedAt DESC
    `);

  return result.recordset;
}

async function createQuizWithQuestions(courseId, data) {
  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);
  const pointsPerQuestion = Number((100 / data.questions.length).toFixed(4));

  await transaction.begin();

  try {
    const quizResult = await new sql.Request(transaction)
      .input("courseId", sql.Int, courseId)
      .input("lessonId", sql.Int, data.lessonId)
      .input("title", sql.NVarChar(200), data.title)
      .input("description", sql.NVarChar(sql.MAX), data.description)
      .query(`
        INSERT INTO Quizzes (CourseID, LessonID, Title, Description)
        OUTPUT
          INSERTED.QuizID,
          INSERTED.CourseID,
          INSERTED.LessonID,
          INSERTED.Title,
          INSERTED.Description,
          INSERTED.CreatedAt
        VALUES (@courseId, @lessonId, @title, @description)
      `);

    const quiz = quizResult.recordset[0];

    for (const question of data.questions) {
      const questionResult = await new sql.Request(transaction)
        .input("quizId", sql.Int, quiz.QuizID)
        .input("questionText", sql.NVarChar(sql.MAX), question.questionText)
        .input("points", sql.Decimal(9, 4), pointsPerQuestion).query(`
          INSERT INTO Questions (QuizID, QuestionText, Points)
          OUTPUT INSERTED.QuestionID
          VALUES (@quizId, @questionText, @points)
        `);

      const questionId = questionResult.recordset[0].QuestionID;

      for (const option of question.options) {
        await new sql.Request(transaction)
          .input("questionId", sql.Int, questionId)
          .input("optionText", sql.NVarChar(500), option.optionText)
          .input("isCorrect", sql.Bit, option.isCorrect).query(`
            INSERT INTO QuestionOptions
              (QuestionID, OptionText, IsCorrect)
            VALUES
              (@questionId, @optionText, @isCorrect)
          `);
      }
    }

    await transaction.commit();

    return {
      ...quiz,
      QuestionCount: data.questions.length,
      PointsPerQuestion: pointsPerQuestion,
    };
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }

    throw error;
  }
}

async function getQuizById(quizId) {
  const pool = await connectDB();

  const result = await pool.request().input("quizId", sql.Int, quizId).query(`
    SELECT QuizID, CourseID, LessonID, Title, Description, CreatedAt
    FROM Quizzes
    WHERE QuizID = @quizId
  `);

  return result.recordset[0] || null;
}

async function getQuestionsForStudent(quizId) {
  const pool = await connectDB();

  const result = await pool.request().input("quizId", sql.Int, quizId).query(`
    SELECT
      q.QuestionID,
      q.QuestionText,
      q.Points,
      o.OptionID,
      o.OptionText
    FROM Questions q
    INNER JOIN QuestionOptions o ON o.QuestionID = q.QuestionID
    WHERE q.QuizID = @quizId
    ORDER BY q.QuestionID, o.OptionID
  `);

  const questions = new Map();

  for (const row of result.recordset) {
    if (!questions.has(row.QuestionID)) {
      questions.set(row.QuestionID, {
        questionId: row.QuestionID,
        questionText: row.QuestionText,
        points: Number(row.Points),
        options: [],
      });
    }

    questions.get(row.QuestionID).options.push({
      optionId: row.OptionID,
      optionText: row.OptionText,
    });
  }

  return [...questions.values()];
}

async function getQuestionsForGrading(quizId) {
  const pool = await connectDB();

  const result = await pool.request().input("quizId", sql.Int, quizId).query(`
    SELECT
      q.QuestionID,
      q.QuestionText,
      q.Points,
      o.OptionID,
      o.OptionText,
      o.IsCorrect
    FROM Questions q
    INNER JOIN QuestionOptions o ON o.QuestionID = q.QuestionID
    WHERE q.QuizID = @quizId
    ORDER BY q.QuestionID, o.OptionID
  `);

  return result.recordset;
}

async function createAttempt(quizId, studentId, score) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("quizId", sql.Int, quizId)
    .input("studentId", sql.Int, studentId)
    .input("score", sql.Decimal(9, 4), score).query(`
      INSERT INTO QuizAttempts
        (QuizID, StudentID, Score, StartedAt, CompletedAt)
      OUTPUT
        INSERTED.AttemptID,
        INSERTED.QuizID,
        INSERTED.StudentID,
        INSERTED.Score,
        INSERTED.StartedAt,
        INSERTED.CompletedAt
      VALUES
        (@quizId, @studentId, @score, GETDATE(), GETDATE())
    `);

  return result.recordset[0];
}

async function getStudentAttempts(studentId) {
  const pool = await connectDB();

  const result = await pool.request().input("studentId", sql.Int, studentId)
    .query(`
      SELECT
        attempt.AttemptID,
        attempt.QuizID,
        quiz.Title AS QuizTitle,
        quiz.CourseID,
        course.Title AS CourseTitle,
        attempt.Score,
        attempt.StartedAt,
        attempt.CompletedAt
      FROM QuizAttempts attempt
      INNER JOIN Quizzes quiz ON quiz.QuizID = attempt.QuizID
      INNER JOIN Courses course ON course.CourseID = quiz.CourseID
      WHERE attempt.StudentID = @studentId
      ORDER BY attempt.CompletedAt DESC
    `);

  return result.recordset;
}

module.exports = {
  getQuizzesByCourse,
  createQuizWithQuestions,
  getQuizById,
  getQuestionsForStudent,
  getQuestionsForGrading,
  createAttempt,
  getStudentAttempts,
};
