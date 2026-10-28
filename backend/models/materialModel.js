const { connectDB } = require("../config/db");
const sql = require("mssql");

async function getMaterialsByLesson(lessonId) {
  const pool = await connectDB();

  const result = await pool.request().input("lessonId", sql.Int, lessonId)
    .query(`
            SELECT
                MaterialID,
                LessonID,
                Title,
                FileURL,
                MaterialType,
                CreatedAt
            FROM Materials
            WHERE LessonID = @lessonId
            ORDER BY CreatedAt DESC
        `);

  return result.recordset;
}

async function createMaterial(lessonId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("lessonId", sql.Int, lessonId)
    .input("title", sql.NVarChar(200), data.title)
    .input("fileURL", sql.NVarChar(500), data.fileURL)
    .input("materialType", sql.NVarChar(50), data.materialType).query(`
            INSERT INTO Materials
                (LessonID, Title, FileURL, MaterialType)
            OUTPUT
                INSERTED.MaterialID,
                INSERTED.LessonID,
                INSERTED.Title,
                INSERTED.FileURL,
                INSERTED.MaterialType,
                INSERTED.CreatedAt
            VALUES
                (@lessonId, @title, @fileURL, @materialType)
        `);

  return result.recordset[0];
}

module.exports = {
  getMaterialsByLesson,
  createMaterial,
};
