const { connectDB } = require("../config/db");

async function getAllCategories() {
  const pool = await connectDB();

  const result = await pool.request().query(`
    SELECT CategoryID, Name, Description
    FROM Categories
    ORDER BY Name
  `);

  return result.recordset;
}

async function createCategory(name, description) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("name", require("mssql").NVarChar(100), name)
    .input(
      "description",
      require("mssql").NVarChar(500),
      description,
    )
    .query(`
      INSERT INTO Categories (Name, Description)
      OUTPUT INSERTED.CategoryID, INSERTED.Name, INSERTED.Description
      SELECT @name, @description
      WHERE NOT EXISTS (
        SELECT 1
        FROM Categories
        WHERE LOWER(Name) = LOWER(@name)
      )
    `);

  return result.recordset[0] || null;
}

module.exports = {
  getAllCategories,
  createCategory,
};
