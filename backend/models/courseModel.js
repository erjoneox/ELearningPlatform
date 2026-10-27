const { connectDB } = require("../config/db");

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
    .input("courseId", require("mssql").Int, courseId)
    .input("categoryId", require("mssql").Int, data.categoryId)
    .input("title", require("mssql").NVarChar(200), data.title)
    .input(
      "description",
      require("mssql").NVarChar(require("mssql").MAX),
      data.description || null,
    )
    .input("thumbnail", require("mssql").NVarChar(500), data.thumbnail || null)
    .query(`
            UPDATE Courses
            SET CategoryID = @categoryId,
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

module.exports = {
  getAllCourses,
  createCourse,
  getCourseById,
  updateCourse,
};
