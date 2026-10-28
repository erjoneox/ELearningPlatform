const { connectDB } = require("../config/db");
const sql = require("mssql");

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
  getLessonById,
};
