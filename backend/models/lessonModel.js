const { connectDB } = require("../config/db");
const sql = require("mssql");
const { Transaction, Request } = require("mssql");

async function getLessonsByCourse(courseId) {
  const pool = await connectDB();

  const result = await pool.request().input("courseId", sql.Int, courseId)
    .query(`
            SELECT
                LessonID,
                CourseID,
                Title,
                Description,
                VideoURL,
                OrderNumber,
                CreatedAt
            FROM Lessons
            WHERE CourseID = @courseId
            ORDER BY OrderNumber ASC
        `);

  return result.recordset;
}

async function createLesson(courseId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("courseId", sql.Int, courseId)
    .input("title", sql.NVarChar(200), data.title)
    .input("description", sql.NVarChar(sql.MAX), data.description || null)
    .input("videoURL", sql.NVarChar(500), data.videoURL || null)
    .input("orderNumber", sql.Int, data.orderNumber).query(`
            INSERT INTO Lessons
                (CourseID, Title, Description, VideoURL, OrderNumber)
            OUTPUT
                INSERTED.LessonID,
                INSERTED.CourseID,
                INSERTED.Title,
                INSERTED.Description,
                INSERTED.VideoURL,
                INSERTED.OrderNumber,
                INSERTED.CreatedAt
            VALUES
                (@courseId, @title, @description, @videoURL, @orderNumber)
        `);

  return result.recordset[0];
}

async function updateLesson(lessonId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("lessonId", sql.Int, lessonId)
    .input("title", sql.NVarChar(200), data.title)
    .input("description", sql.NVarChar(sql.MAX), data.description)
    .input("videoURL", sql.NVarChar(500), data.videoURL)
    .input("orderNumber", sql.Int, data.orderNumber).query(`
      UPDATE Lessons
      SET Title = @title,
          Description = @description,
          VideoURL = @videoURL,
          OrderNumber = @orderNumber
      OUTPUT
        INSERTED.LessonID,
        INSERTED.CourseID,
        INSERTED.Title,
        INSERTED.Description,
        INSERTED.VideoURL,
        INSERTED.OrderNumber,
        INSERTED.CreatedAt
      WHERE LessonID = @lessonId
    `);

  return result.recordset[0] || null;
}

async function deleteLesson(lessonId) {
  const pool = await connectDB();
  const transaction = new Transaction(pool);

  await transaction.begin();

  try {
    const materialResult = await new Request(transaction)
      .input("lessonId", sql.Int, lessonId).query(`
        DELETE FROM Materials
        OUTPUT DELETED.FileURL
        WHERE LessonID = @lessonId
      `);

    await new Request(transaction)
      .input("lessonId", sql.Int, lessonId).query(`
        DELETE FROM Progress
        WHERE LessonID = @lessonId
      `);

    await new Request(transaction)
      .input("lessonId", sql.Int, lessonId).query(`
        UPDATE Assignments
        SET LessonID = NULL
        WHERE LessonID = @lessonId
      `);

    await new Request(transaction)
      .input("lessonId", sql.Int, lessonId).query(`
        UPDATE Quizzes
        SET LessonID = NULL
        WHERE LessonID = @lessonId
      `);

    await new Request(transaction)
      .input("lessonId", sql.Int, lessonId).query(`
        DELETE FROM Lessons
        WHERE LessonID = @lessonId
      `);

    await transaction.commit();

    return materialResult.recordset.map((material) => material.FileURL);
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }

    throw error;
  }
}

async function getLessonById(lessonId) {
  const pool = await connectDB();

  const result = await pool.request().input("lessonId", sql.Int, lessonId)
    .query(`
            SELECT LessonID, CourseID, Title, Description,
                   VideoURL, OrderNumber, CreatedAt
            FROM Lessons
            WHERE LessonID = @lessonId
        `);

  return result.recordset[0] || null;
}

module.exports = {
  getLessonsByCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonById,
};
